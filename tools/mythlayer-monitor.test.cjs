'use strict';
const assert=require('node:assert/strict');
const {report,probe,check,stage,safeError}=require('./mythlayer-web-health.cjs');
const {summary,payload,publish}=require('./mythlayer-publish-health.cjs');
let passed=0;
function reset(){report.checks.length=0;report.recovered.length=0;}
async function test(name,fn){reset();await fn();passed++;console.log('PASS '+name);}
(async()=>{
 await test('transient interruption retries in isolation and records recovery',async()=>{
   await probe('page',attempt=>{stage('public document /features.html');if(attempt===1)throw Error('net::ERR_CONNECTION_RESET https://secret/?cookie=abc');check('title',true);},0);
   assert.equal(report.checks.length,1);assert.equal(report.recovered[0],'page');
 });
 await test('repeat network failure is incomplete with safe phase, never raw identifiers',async()=>{
   await probe('page',()=>{stage('public document /features.html');throw Error('net::ERR_CONNECTION_RESET https://secret/?_gl=private');},0);
   const c=report.checks[0];assert.equal(c.pass,null);assert.equal(c.kind,'monitor');assert.equal(c.detail.stage,'public document /features.html');assert.equal(c.detail.attempts,2);assert(!JSON.stringify(c).includes('private'));assert(!JSON.stringify(c).includes('https:'));
 });
 await test('one unavailable page does not prevent independent checks',async()=>{
   await probe('broken network',()=>{throw Error('timeout');},0);await probe('later page',()=>check('later title',true),0);
   assert.equal(report.checks.length,2);assert.equal(report.checks[1].pass,true);
 });
 await test('observed functional failure survives later network interruption and passing retry',async()=>{
   await probe('journey',attempt=>{if(attempt===1){check('wrong canonical',false);throw Error('network');}check('later title',true);},0);
   assert.equal(report.checks.filter(c=>c.pass===false).length,1);
 });
 await test('functional assertions are not silently retried away',async()=>{let attempts=0;await probe('content',()=>{attempts++;check('canonical',false);},0);assert.equal(attempts,1);assert.equal(summary(report).status,'failed');});
 await test('repeat server5xx remains actionable',async()=>{await probe('server',()=>{const e=Error('temporary');e.httpStatus=503;throw e;},0);assert.equal(report.checks[0].pass,false);assert.equal(report.checks[0].detail.status,503);});
 await test('missing result can never appear passed',()=>assert.equal(summary(null).status,'incomplete'));
 await test('fewer than full baseline assertions cannot appear passed',()=>assert.equal(summary({checks:[{pass:true}]}).status,'incomplete'));
 await test('external verification limits do not masquerade as core browser failure',()=>{const r={checks:[...Array.from({length:64},()=>({pass:true})),{name:'Discord invitation verifies',pass:null,kind:'external'},{name:'public itch page available',pass:null,kind:'external'}]};const x=summary(r);assert.equal(x.status,'passed');assert.equal(x.verified,64);assert.equal(x.externalUnverified,2);});
 await test('missing a core assertion still makes the run incomplete',()=>{assert.equal(summary({checks:[...Array.from({length:63},()=>({pass:true})),{pass:null,kind:'external'},{pass:null,kind:'external'}]}).status,'incomplete');});
 const env={GITHUB_REPOSITORY:'fryedegg/mythlayer',GITHUB_REF:'refs/heads/main',GITHUB_EVENT_NAME:'schedule',GITHUB_RUN_ID:'123',GITHUB_SHA:'a'.repeat(40),CHECK_JOB_RESULT:'success'};
 const good=JSON.stringify({status:'passed',verified:66,failed:0,unverified:0,recovered:1,names:[]});
 await test('publisher refuses pull requests and forks',()=>{assert.throws(()=>payload(good,{...env,GITHUB_EVENT_NAME:'pull_request'}));assert.throws(()=>payload(good,{...env,GITHUB_REPOSITORY:'other/repo'}));});
 await test('publisher rejects injected CI identities',()=>assert.throws(()=>payload(good,{...env,GITHUB_RUN_ID:'123?token=secret'})));
 await test('broken or absent job output becomes incomplete',()=>{assert.equal(payload('not JSON',env).status,'incomplete');assert.equal(payload(good,{...env,CHECK_JOB_RESULT:'failure'}).status,'incomplete');});
 await test('normal result includes fixed run URL, fresh time and recovered count',()=>{const r=payload(good,env,new Date('2026-10-24T12:00:00Z'));assert.equal(r.status,'passed');assert.equal(r.runUrl,'https://github.com/fryedegg/mythlayer/actions/runs/123');assert.equal(r.recovered,1);});
 await test('publisher token stays in headers, only expected status file is written',async()=>{
   const requests=[];const response=(status,body)=>({status,ok:status<400,json:async()=>body});
   const fake=async(url,options)=>{requests.push({url,options});if(url.includes('git/ref/heads/'))return response(404);if(options.method==='GET')return response(404);return response(201,{});};
   await publish(payload(good,env),'private-token',fake);
   assert.equal(requests.length,4);assert(requests.every(r=>!r.url.includes('private-token')&&r.options.headers.Authorization==='Bearer private-token'));
   const put=requests.find(r=>r.options.method==='PUT');const body=JSON.parse(put.options.body);assert.equal(body.branch,'web-health-status');assert(put.url.endsWith('/contents/latest.json'));assert(!Buffer.from(body.content,'base64').toString().includes('private-token'));
 });
 console.log(JSON.stringify({passed,liveApiCalls:0,liveEmailsSent:0}));
})().catch(error=>{console.error(error);process.exitCode=1;});
