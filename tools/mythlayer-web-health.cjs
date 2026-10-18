'use strict';
// Public website checks only. No account session, checkout, downloads, or app build.
const fs = require('node:fs');
const {chromium} = require(process.env.ML_PLAYWRIGHT_MODULE || 'playwright');
const origin = 'https://mythlayer.com';
const qa = {utm_source:'analytics_qa',utm_medium:'qa',utm_campaign:'implementation_2026_10_18',utm_content:'verification'};
const paths = ['/', '/features.html', '/watch.html', '/roadmap.html', '/team.html', '/faq.html', '/privacy.html'];
const report = {checkedAt:new Date().toISOString(),checks:[],conditions:{privateSessionUsed:false,collectorRequestsSuppressed:true,purchaseAttempted:false,downloadAttempted:false}};
function check(name, pass, detail) { report.checks.push({name,pass:!!pass,...(detail?{detail}: {})}); }
function availability(name, status) {
  if(status===403||status===429)report.checks.push({name,pass:null,detail:{status,note:'Automated verification blocked or rate-limited; not evidence of a broken destination.'}});
  else check(name,status===200,{status});
}
function campaignMatches(raw) { const u=new URL(raw); return Object.entries(qa).every(([k,v])=>u.searchParams.get(k)===v); }
const pause = ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(fn, timeout=18000) { const end=Date.now()+timeout; while(Date.now()<end) { if(fn())return true;await pause(200); }return !!fn(); }
async function journey(browser, route, navigation) {
  const context=await browser.newContext({viewport:{width:route==='/social/'?390:1440,height:1000},serviceWorkers:'block'});
  const events=[];let outbound=null;let errors=0;let stage='start';
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
    stage='landing';const start=new URL(route,origin);for(const [k,v]of Object.entries(qa))start.searchParams.set(k,v);
    await page.goto(start.href,{waitUntil:'domcontentloaded',timeout:45000});await pause(1500);
    check(route+' analytics off before consent',events.length===0);
    check(route+' Google tag absent before consent',await page.locator('#ml-google-analytics').count()===0);
    check(route+' analytics cookies absent before consent',(await context.cookies()).every(c=>!/^_ga(?:_|$)/.test(c.name)));
    stage='consent';await page.getByRole('button',{name:'Allow analytics',exact:true}).click();
    check(route+' consent starts one page view',await until(()=>events.filter(e=>e.name==='page_view').length===1));
    if(navigation) {
      stage='internal_navigation';const link=page.locator('nav[aria-label="Main navigation"] a[data-nav="features"]');
      check('internal navigation has campaign',campaignMatches(await link.getAttribute('href')));
      await page.goto(await link.getAttribute('href'),{waitUntil:'domcontentloaded',timeout:45000});
      check('internal navigation preserves campaign',campaignMatches(page.url()));
      check('second document sends one page view',await until(()=>events.filter(e=>e.name==='page_view').length===2));
    }
    stage='store';const selector=route==='/social/'?'#lnk-buy':'.nav-actions a[href^="https://mythlayer.itch.io/mythlayer"]';
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
  }catch(error) { check(route+' journey completes',false,{stage,error:'Browser step failed; no raw URL, cookie, client ID or browser log exported.'}); }
  finally {await context.close();}
}
async function publicChecks(browser) {
  const context=await browser.newContext({serviceWorkers:'block'});
  try {
    for(const path of paths) {
      const response=await context.request.get(origin+path,{timeout:30000,maxRedirects:0});
      check(path+' HTTP 200',response.status()===200,{status:response.status()});
      const page=await context.newPage();await page.route('**/*',r=>r.request().resourceType()==='document'?r.continue():r.abort());
      await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:30000});
      check(path+' title',!!(await page.title()).trim());
      check(path+' self canonical',await page.locator('link[rel="canonical"]').getAttribute('href')===origin+path);
      if(path!=='/privacy.html')check(path+' indexable meta',await page.locator('meta[name="robots"]').evaluateAll(nodes=>nodes.every(n=>!/(noindex|none)/i.test(n.content))));
      const expectedDiscord=await page.locator('a[href^="https://discord.gg/"]').evaluateAll(nodes=>nodes.map(a=>a.getAttribute('href')));
      check(path+' Discord invitation',expectedDiscord.length>0&&expectedDiscord.every(href=>new URL(href).pathname==='/NKJcFsMxc7'));
      await page.close();
    }
    const store=await context.request.get('https://mythlayer.itch.io/mythlayer',{timeout:30000});
    availability('public itch page available',store.status());
    const invite=await context.request.get('https://discord.com/api/v10/invites/NKJcFsMxc7',{timeout:30000});
    availability('Discord invitation verifies',invite.status());
  } finally {await context.close();}
}
(async()=>{
  let browser;
  try {
    browser=await chromium.launch({headless:true,...(process.env.ML_BROWSER_CHANNEL?{channel:process.env.ML_BROWSER_CHANNEL}:{})});
    await publicChecks(browser);
    await journey(browser,'/',true);
    await journey(browser,'/social/',false);
    const context=await browser.newContext({serviceWorkers:'block'});
    const page=await context.newPage();let collectors=0;
    await page.route('**/*',r=>{const u=new URL(r.request().url());if(/(^|\.)google-analytics\.com$/.test(u.hostname)){collectors++;return r.abort();}return r.continue();});
    await page.goto(origin,{waitUntil:'domcontentloaded'});await page.getByRole('button',{name:'Decline analytics',exact:true}).click();await pause(1200);
    check('declined consent stays off',collectors===0&&await page.locator('#ml-google-analytics').count()===0);
    await context.close();
  }catch(error) {check('suite completes',false,{error:'Network/browser setup failed; raw details intentionally not exported.'});}
  finally {
    if(browser)await browser.close();
    report.pass=report.checks.length>0&&report.checks.every(c=>c.pass!==false);
    report.warnings=report.checks.filter(c=>c.pass===null).map(c=>c.name);
    fs.writeFileSync('web-health-result.json',JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify(report,null,2));
    if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## MythLayer web health\n\n'+(report.pass?'No detected failures':'FAIL')+' — '+report.checks.filter(c=>c.pass===true).length+' verified checks; '+report.warnings.length+' unverified checks.\n\n'+report.checks.filter(c=>c.pass!==true).map(c=>'- '+c.name+': '+(c.pass===false?'FAIL':'UNVERIFIED')).join('\n')+'\n\nAnalytics collectors were intercepted. No checkout, download or synthetic purchase was performed.\n');
    for(const warning of report.warnings)console.log('::warning title=Verification unavailable::'+warning);
    if(!report.pass)process.exitCode=1;
  }
})();
