'use strict';
// Public website checks only. No account session, checkout, downloads, or app build.
const fs = require('node:fs');
const origin = 'https://mythlayer.com';
const qa = {utm_source:'analytics_qa',utm_medium:'qa',utm_campaign:'implementation_2026_10_18',utm_content:'verification'};
const paths = ['/', '/features.html', '/watch.html', '/roadmap.html', '/team.html', '/faq.html', '/privacy.html'];
const report = {checkedAt:new Date().toISOString(),checks:[],recovered:[],conditions:{privateSessionUsed:false,collectorRequestsSuppressed:true,purchaseAttempted:false,downloadAttempted:false}};
let activeChecks=null,activeStage='start';
function check(name, pass, detail, kind='site') { (activeChecks||report.checks).push({name,pass:pass===null?null:!!pass,kind,...(detail?{detail}: {})}); }
function availability(name,status) {
  if(status===403||status===429)check(name,null,{status,note:'Automated verification blocked/rate-limited; destination not confirmed broken.'},'monitor');
  else check(name,status===200,{status});
}
function stage(name){activeStage=name;}
function safeError(error) {
  return {stage:activeStage,exceptionClass:/timeout/i.test(error.name+' '+error.message)?'timeout':/net::|network|socket|ECONN|ENOTFOUND/i.test(error.message)?'network':'browser',
    networkCode:(String(error.message).match(/(?:net::[A-Z_]+|ECONN[A-Z]+|ENOTFOUND)/)||[])[0]||null};
}
async function probe(name,operation,delay=1000) {
  for(let attempt=1;attempt<=2;attempt++) {
    activeChecks=[];activeStage='start';const began=Date.now();
    try {
      await operation(attempt);report.checks.push(...activeChecks);activeChecks=null;
      if(attempt===2)report.recovered.push(name);
      return;
    } catch(error) {
      // Never erase an observed functional failure even if later network work fails/retries.
      report.checks.push(...activeChecks.filter(c=>c.pass===false));activeChecks=null;
      if(attempt===1){await pause(delay);continue;}
      const detail={...safeError(error),attempts:2,elapsedMs:Date.now()-began};
      if(error.httpStatus)check(name+' HTTP available',false,{...detail,status:error.httpStatus});
      else check(name+' verification completed',null,detail,'monitor');
    }
  }
}
function transientStatus(status){if(status>=500){const error=new Error('Temporary HTTP status');error.httpStatus=status;throw error;}}
function campaignMatches(raw) { const u=new URL(raw); return Object.entries(qa).every(([k,v])=>u.searchParams.get(k)===v); }
const pause = ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn, timeout=18000) { const end=Date.now()+timeout; while(Date.now()<end) { if(fn())return true;await pause(200); }return !!fn(); }
async function journey(browser, route, navigation) {
  const context=await browser.newContext({viewport:{width:route==='/social/'?390:1440,height:1000},serviceWorkers:'block'});
  const events=[];let outbound=null;let errors=0;
  try {
    // Load the genuine Google tag, but stop every collector request at the browser boundary.
    await context.route('**/*',async intercepted=>{
      const request=intercepted.request(),u=new URL(request.url());
      const collector=/(^|\.)(google-analytics\.com|analytics\.google\.com|doubleclick\.net|googlesyndication\.com)$/.test(u.hostname)||(/(^|\.)google\.com$/.test(u.hostname)&&/\/(ccm|pagead)\//.test(u.pathname));
      if(collector) {
        const base=new URLSearchParams(u.search);
        for(const row of (request.postData()||'').split('\n')) {
          const p=new URLSearchParams(base);for(const [k,v] of new URLSearchParams(row))p.set(k,v);
          if(p.get('tid')==='G-4GM2LPTB4V'&&p.get('en'))events.push({name:p.get('en'),page:p.get('dl')||''});
        }
        return intercepted.fulfill({status:204,body:'',headers:{'access-control-allow-origin':'*'}});
      }
      if(u.hostname==='mythlayer.itch.io'&&request.isNavigationRequest()) {
        outbound=u;return intercepted.fulfill({status:200,contentType:'text/html',body:'<title>Test boundary: store navigation intercepted</title>'});
      }
      return intercepted.continue();
    });
    const page=await context.newPage();page.on('pageerror',()=>errors++);
    stage('landing');const start=new URL(route,origin);for(const [k,v]of Object.entries(qa))start.searchParams.set(k,v);
    await page.goto(start.href,{waitUntil:'domcontentloaded',timeout:45000});await pause(1500);
    check(route+' analytics off before consent',events.length===0);
    check(route+' Google tag absent before consent',await page.locator('#ml-google-analytics').count()===0);
    check(route+' analytics cookies absent before consent',(await context.cookies()).every(c=>!/^_ga(?:_|$)/.test(c.name)));
    stage('consent');await page.getByRole('button',{name:'Allow analytics',exact:true}).click();
    check(route+' consent starts one page view',await until(()=>events.filter(e=>e.name==='page_view').length===1));
    if(navigation) {
      stage('internal navigation');const link=page.locator('nav[aria-label="Main navigation"] a[data-nav="features"]');
      check('internal navigation has campaign',campaignMatches(await link.getAttribute('href')));
      await page.goto(await link.getAttribute('href'),{waitUntil:'domcontentloaded',timeout:45000});
      check('internal navigation preserves campaign',campaignMatches(page.url()));
      check('second document sends one page view',await until(()=>events.filter(e=>e.name==='page_view').length===2));
    }
    stage('store activation');const selector=route==='/social/'?'#lnk-buy':'.nav-actions a[href^="https://mythlayer.itch.io/mythlayer"]';
    const store=page.locator(selector);check(route+' one purchase CTA',await store.count()===1);
    const before=new URL(await store.getAttribute('href'),page.url());
    check(route+' purchase destination',before.origin==='https://mythlayer.itch.io'&&before.pathname==='/mythlayer');
    check(route+' purchase campaign before click',campaignMatches(before.href));
    await store.evaluate(a=>a.scrollIntoView({block:'center'}));
    await store.click({force:true});
    check(route+' store navigation observed',await until(()=>outbound!==null));
    check(route+' campaign on actual store activation',outbound&&campaignMatches(outbound.href));
    check(route+' fresh linker on actual store activation',outbound&&!!outbound.searchParams.get('_gl'));
    check(route+' one itch click emitted',await until(()=>events.filter(e=>e.name==='itch_click').length===1));
    check(route+' measured pages preserve campaign',events.filter(e=>e.name==='page_view').every(e=>campaignMatches(e.page)));
    check(route+' no runtime errors',errors===0);
  } finally {await context.close();}
}
async function publicChecks(browser) {
  for(const path of paths)await probe('Public page '+path,async()=>{
    const context=await browser.newContext({serviceWorkers:'block'});
    try {
      const page=await context.newPage();await page.route('**/*',r=>r.request().resourceType()==='document'?r.continue():r.abort());
      stage('public document '+path);
      const response=await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:20000});
      const code=response?response.status():0;transientStatus(code);
      if(code===403||code===429){check(path+' automated access',null,{status:code},'monitor');return;}
      check(path+' HTTP 200',code===200,{status:code});
      stage('document assertions '+path);
      check(path+' title',!!(await page.title()).trim());
      check(path+' self canonical',await page.locator('link[rel="canonical"]').getAttribute('href')===origin+path);
      if(path!=='/privacy.html')check(path+' indexable meta',await page.locator('meta[name="robots"],meta[name="googlebot"]').evaluateAll(nodes=>nodes.every(n=>!/(noindex|none)/i.test(n.content))));
      const invites=await page.locator('a[href^="https://discord.gg/"]').evaluateAll(nodes=>nodes.map(a=>a.getAttribute('href')));
      check(path+' Discord invitation',invites.length>0&&invites.every(href=>new URL(href).pathname==='/NKJcFsMxc7'));
    } finally {await context.close();}
  });
  for(const target of [{name:'public itch page available',url:'https://mythlayer.itch.io/mythlayer'},{name:'Discord invitation verifies',url:'https://discord.com/api/v10/invites/NKJcFsMxc7'}]) {
    await probe(target.name,async()=>{
      const context=await browser.newContext({serviceWorkers:'block'});
      try{stage('external availability');const response=await context.request.get(target.url,{timeout:20000});transientStatus(response.status());availability(target.name,response.status());}
      finally{await context.close();}
    });
  }
}
async function decline(browser) {
  const context=await browser.newContext({serviceWorkers:'block'});
  try {
    const page=await context.newPage();let collectors=0;
    await page.route('**/*',r=>{const u=new URL(r.request().url());if(/(^|\.)(google-analytics\.com|analytics\.google\.com|doubleclick\.net|googlesyndication\.com)$/.test(u.hostname)){collectors++;return r.fulfill({status:204,body:''});}return r.continue();});
    stage('decline landing');await page.goto(origin,{waitUntil:'domcontentloaded',timeout:30000});
    stage('decline control');await page.getByRole('button',{name:'Decline analytics',exact:true}).click();await pause(1200);
    check('declined consent stays off',collectors===0&&await page.locator('#ml-google-analytics').count()===0);
  } finally {await context.close();}
}
async function main(){
  let browser;
  try {
    const {chromium}=require(process.env.ML_PLAYWRIGHT_MODULE||'playwright');
    browser=await chromium.launch({headless:true,...(process.env.ML_BROWSER_CHANNEL?{channel:process.env.ML_BROWSER_CHANNEL}:{})});
    await publicChecks(browser);
    await probe('Desktop tracking',()=>journey(browser,'/',true));
    await probe('Mobile tracking',()=>journey(browser,'/social/',false));
    await probe('Declined consent',()=>decline(browser));
  }catch(error){activeChecks=null;check('Browser suite available',null,safeError(error),'monitor');}
  finally {
    if(browser)await browser.close().catch(()=>{});
    report.status=report.checks.some(c=>c.pass===false)?'failed':!report.checks.length||report.checks.some(c=>c.pass===null)?'incomplete':'passed';
    report.pass=report.status==='passed';
    report.warnings=report.checks.filter(c=>c.pass===null).map(c=>c.name);
    fs.writeFileSync('web-health-result.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
    if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## MythLayer web health\n\n'+report.status.toUpperCase()+' — '+report.checks.filter(c=>c.pass===true).length+' verified, '+report.checks.filter(c=>c.pass===false).length+' failed, '+report.warnings.length+' incomplete; '+report.recovered.length+' recovered retries.\n\n'+report.checks.filter(c=>c.pass!==true).map(c=>'- '+c.name+': '+(c.pass===false?'FAILED':'UNVERIFIED')+' '+JSON.stringify(c.detail||{})).join('\n')+'\n\nCollectors suppressed; no checkout, download, or synthetic purchase.\n');
    if(!report.pass)process.exitCode=1;
  }
}
module.exports={report,probe,check,stage,safeError};
if(require.main===module)main();
