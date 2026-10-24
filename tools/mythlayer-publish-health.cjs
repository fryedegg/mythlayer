'use strict';
// Publishes only sanitized, already-public test results. Token exists only in the trusted CI publisher job.
const fs=require('node:fs');
const repository='fryedegg/mythlayer',branch='web-health-status',path='latest.json';
function summary(report) {
  const checks=report&&Array.isArray(report.checks)?report.checks:[];
  const verified=checks.filter(c=>c.pass===true).length,failed=checks.filter(c=>c.pass===false).length;
  const unverified=checks.filter(c=>c.pass===null).length;
  const externalUnverified=checks.filter(c=>c.pass===null&&c.kind==='external').length;
  const names=checks.filter(c=>c.pass!==true).map(c=>String(c.name||'Unknown check').replace(/[^a-zA-Z0-9 /_.()-]/g,'').slice(0,100)).slice(0,30);
  return {status:failed?'failed':unverified>externalUnverified||verified+externalUnverified<66?'incomplete':'passed',verified,failed,unverified,externalUnverified,
    recovered:report&&Array.isArray(report.recovered)?report.recovered.length:0,names};
}
function payload(input,env,now=new Date()) {
  if(env.GITHUB_REPOSITORY!==repository||env.GITHUB_REF!=='refs/heads/main'||!['schedule','workflow_dispatch'].includes(env.GITHUB_EVENT_NAME))throw Error('Trusted main publication only');
  if(!/^\d+$/.test(env.GITHUB_RUN_ID||'')||!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA||''))throw Error('Invalid CI identity');
  let data;try{data=JSON.parse(input||'{}');}catch{data={};}
  data.externalUnverified=data.externalUnverified||0;
  const valid=['passed','failed','incomplete'].includes(data.status)&&['verified','failed','unverified','externalUnverified','recovered'].every(k=>Number.isSafeInteger(data[k])&&data[k]>=0&&data[k]<=500);
  if(!valid)data={status:'incomplete',verified:0,failed:0,unverified:1,externalUnverified:0,recovered:0,names:['Browser job did not produce a valid result']};
  const names=(Array.isArray(data.names)?data.names:[]).map(s=>String(s).replace(/[^a-zA-Z0-9 /_.()-]/g,'').slice(0,100)).slice(0,30);
  let status=data.failed?'failed':data.unverified>data.externalUnverified||data.verified+data.externalUnverified<66||env.CHECK_JOB_RESULT!=='success'?'incomplete':data.status;
  return {schema:'mythlayer-web-health/v2',checkedAt:now.toISOString(),runId:env.GITHUB_RUN_ID,
    runUrl:'https://github.com/'+repository+'/actions/runs/'+env.GITHUB_RUN_ID,commit:env.GITHUB_SHA,
    status,verified:data.verified,failed:data.failed,unverified:data.unverified,externalUnverified:data.externalUnverified,recovered:data.recovered,names};
}
async function publish(data,token,request=fetch) {
  if(!token)throw Error('Missing ephemeral CI token');
  async function api(route,method='GET',body) {
    for(let attempt=0;attempt<2;attempt++) {
      try {
        const r=await request('https://api.github.com/repos/'+repository+'/'+route,{method,
          headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','Content-Type':'application/json','X-GitHub-Api-Version':'2022-11-28'},
          ...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
        if(r.status>=500&&attempt===0){await new Promise(r=>setTimeout(r,1000));continue;}
        if(r.status===404)return null;
        if(!r.ok)throw Error('GitHub status '+r.status);
        return await r.json();
      }catch(error){if(attempt===0){await new Promise(r=>setTimeout(r,1000));continue;}throw Error('Status publication request failed');}
    }
  }
  if(!await api('git/ref/heads/'+branch))await api('git/refs','POST',{ref:'refs/heads/'+branch,sha:data.commit});
  const existing=await api('contents/'+path+'?ref='+branch);
  if(existing){
    let previous;try{previous=JSON.parse(Buffer.from(existing.content,'base64').toString('utf8'));}catch{}
    if(previous&&Date.parse(previous.checkedAt)>Date.parse(data.checkedAt))return 'Newer status retained';
  }
  await api('contents/'+path,'PUT',{branch,message:'Update public web-health status for run '+data.runId,
    ...(existing?{sha:existing.sha}:{}),content:Buffer.from(JSON.stringify(data,null,2)+'\n').toString('base64')});
  return 'Sanitized web-health status published';
}
async function main(){
  if(process.argv.includes('--summary')){
    let report;try{report=JSON.parse(fs.readFileSync('web-health-result.json','utf8'));}catch{}
    const result=JSON.stringify(summary(report));
    if(process.env.GITHUB_OUTPUT)fs.appendFileSync(process.env.GITHUB_OUTPUT,'summary='+result+'\n');
    else console.log(result);
  }else console.log(await publish(payload(process.env.STATUS_SUMMARY,process.env),process.env.GITHUB_TOKEN));
}
module.exports={summary,payload,publish};
if(require.main===module)main().catch(()=>{console.error('Could not publish sanitized health status; check this publisher job.');process.exitCode=1;});
