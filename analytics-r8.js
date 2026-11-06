/* MythLayer marketing analytics. No application telemetry. */
(() => {
  'use strict';
  const MEASUREMENT_ID = 'G-4GM2LPTB4V';
  const CONSENT_KEY = 'mythlayer.website.analytics-consent.v1';
  const CONSENT_DAYS = 180;
  const production = location.protocol === 'https:' && /^(www\.)?mythlayer\.com$/.test(location.hostname);
  const debugMode = new URLSearchParams(location.search).get('ml_debug')==='1';
  const configured = /^G-[A-Z0-9]+$/.test(MEASUREMENT_ID);
  const denied = {analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'};
  const granted = {...denied,analytics_storage:'granted'};
  const routeTitles = {"home": "MythLayer | D&D Battlemap Overlay & Online VTT", "features": "MythLayer Features | Online VTT & Digital Battlemap Tools", "watch": "Watch MythLayer | Trailer, Battlemap Videos & Real UI", "roadmap": "MythLayer Public Roadmap | Planned VTT & Table Features", "team": "Meet the MythLayer Team | MJ, Mrs.MythLayer & Pap", "faq": "MythLayer FAQ | Buying, Setup, Maps & Online Play", "privacy": "MythLayer — Website privacy", "social": "MythLayer · Supercon Loot Quest"};
  const pagePaths = {home:'/',features:'/features.html',watch:'/watch.html',roadmap:'/roadmap.html',team:'/team.html',faq:'/faq.html',privacy:'/privacy.html',social:'/social/'};
  const pathViews=Object.fromEntries(Object.entries(pagePaths).map(([view,path])=>[path,view]));
  Object.assign(pathViews,{'/index.html':'home','/social/index.html':'social'});
  const subviews = {features:['remote','table','build'],watch:['trailer','builder','gallery'],roadmap:['next','planned','touch','exploring']};
  const campaign = window.MLCampaign?.params() || new URLSearchParams();
  function validRoute(detail) {
    if (!detail || !Object.hasOwn(routeTitles, detail.view)) return null;
    const view = detail.view;
    const section = subviews[view]?.includes(detail.section) ? detail.section : (subviews[view]?.[0] || '');
    return {view,section,key:view + (section ? '/' + section : '')};
  }
  let route = null, lastMeasuredRoute = null, choice = null, tagStarted = false;
  let pageReferrer = safeReferrer();
  let panel, status, settingsOpener;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function(){window.dataLayer.push(arguments);};
  const gtag = (...args) => window.gtag(...args);
  // Basic consent: these are an in-memory queue only; Google is not loaded until acceptance.
  gtag('consent','default',denied);
  gtag('set','ads_data_redaction',true);
  gtag('set','url_passthrough',false);
  function readChoice() {
    try {
      const value = JSON.parse(localStorage.getItem(CONSENT_KEY) || 'null');
      if (value && ['granted','denied'].includes(value.state) && Number.isFinite(value.at) &&
          value.at <= Date.now() && Date.now()-value.at < CONSENT_DAYS*86400000) return value.state;
    } catch (_) {}
    return null;
  }
  function saveChoice(state) {
    try { localStorage.setItem(CONSENT_KEY,JSON.stringify({state,at:Date.now()})); } catch (_) {}
  }
  function cleanAnalyticsCookies() {
    for (const part of document.cookie.split(';')) {
      const name = part.trim().split('=')[0];
      if (!/^_ga(?:_|$)|^_gid$|^_gat(?:_|$)/.test(name)) continue;
      for (const domain of ['',location.hostname,'.'+location.hostname,'mythlayer.com','.mythlayer.com']) {
        document.cookie = name+'=; Max-Age=0; path=/; SameSite=Lax'+(domain?'; domain='+domain:'');
      }
    }
  }
  function safeReferrer() {
    try {
      const u=new URL(document.referrer);
      if(!['http:','https:'].includes(u.protocol))return '';
      if(/^(www\.)?mythlayer\.com$/.test(u.hostname) && pathViews[u.pathname]) {
        const safe=new URL(pagePaths[pathViews[u.pathname]],'https://mythlayer.com/');
        safe.search=window.MLCampaign?.params(u.search).toString() || '';
        return safe.href;
      }
      return u.origin+'/';
    } catch (_) {return '';}
  }
  function pageLocation() {
    const url=new URL(pagePaths[route?.view] || '/','https://mythlayer.com/');
    url.search=campaign.toString();
    if(route?.section && route.section!==subviews[route.view]?.[0])url.hash=route.section;
    return url.href;
  }
  function pageFields() {
    return {page_location:pageLocation(),page_referrer:pageReferrer,page_title:routeTitles[route?.view || 'home']};
  }
  function canSend() { return production && configured && tagStarted && choice==='granted'; }
  function send(name, details={}) {
    if (!canSend() || !route) return;
    gtag('event',name,{
      send_to:MEASUREMENT_ID,...(debugMode?{debug_mode:true}:{}),...pageFields(),
      view_name:route.view,subview_name:route.section||'not_applicable',
      normalized_route_key:route.key,site_revision:'8.0',environment:'production',
      consent_state:'granted',...details
    });
  }
  function measureRoute() {
    if (!canSend() || !route) return;
    // Defaults for GA's automatic session/engagement events also use sanitized fields.
    gtag('set',pageFields());
    if (!lastMeasuredRoute || route.view!==lastMeasuredRoute.view) send('page_view');
    else if (route.key!==lastMeasuredRoute.key) send('tab_select',{previous_subview_name:lastMeasuredRoute.section||'not_applicable',navigation_cause:'router'});
    lastMeasuredRoute = {...route};
  }
  function startTag() {
    if (!production || !configured || tagStarted || choice!=='granted' || !route) return;
    window['ga-disable-'+MEASUREMENT_ID] = false;
    tagStarted = true;
    gtag('consent','update',granted);
    gtag('set',pageFields());
    gtag('set','linker',{domains:['mythlayer.itch.io'],accept_incoming:true,decorate_forms:false});
    gtag('js',new Date());
    gtag('config',MEASUREMENT_ID,{
      send_page_view:false,...(debugMode?{debug_mode:true}:{}),allow_google_signals:false,allow_ad_personalization_signals:false,
      cookie_expires:CONSENT_DAYS*86400,cookie_update:false,cookie_flags:'SameSite=Lax;Secure'
    });
    const script = document.createElement('script');
    script.id='ml-google-analytics';script.async=true;
    script.referrerPolicy='origin';
    script.src='https://www.googletagmanager.com/gtag/js?id='+MEASUREMENT_ID;
    document.head.append(script);
    measureRoute();
  }
  function renderStatus() {
    if (status) status.textContent = choice==='granted'?'Analytics is allowed on this browser.':choice==='denied'?'Analytics is declined on this browser.':'Analytics is off until you choose.';
  }
  function setChoice(state, persist=true) {
    const wasLoaded = tagStarted;
    choice=state;
    if (persist) saveChoice(state);
    if (state==='granted') startTag();
    else {
      // Disable measurement BEFORE updating consent. Reload unloads an already-loaded tag.
      window['ga-disable-'+MEASUREMENT_ID] = true;
      if (tagStarted) gtag('consent','update',denied);
      cleanAnalyticsCookies();
      document.querySelectorAll('a[href*="mythlayer.itch.io"]').forEach(a=>{
        const url=new URL(a.href);url.searchParams.delete('_gl');a.href=url.href;
      });
      lastMeasuredRoute=null;
    }
    renderStatus();
    if (panel) panel.hidden=true;
    settingsOpener?.focus({preventScroll:true});
    if (state==='denied' && wasLoaded) location.reload();
  }
  function showSettings(opener) {
    settingsOpener=opener || null;
    panel.hidden=false;renderStatus();panel.focus({preventScroll:false});
  }
  function makeConsentUI() {
    panel=document.createElement('section');
    panel.className='ml-consent';panel.id='ml-analytics-choice';panel.tabIndex=-1;
    panel.setAttribute('role','region');panel.setAttribute('aria-labelledby','ml-consent-title');
    panel.innerHTML='<div><h2 id="ml-consent-title">Help us improve MythLayer’s website?</h2><p>Optional Google Analytics helps us understand visits, campaign sources and which site features people use. It uses analytics cookies. Your choice does not affect the website or the MythLayer app. <a href="/privacy.html">Privacy details</a></p><p id="ml-consent-status" class="ml-consent-status" role="status"></p></div><div class="ml-consent-actions"><button type="button" data-ml-consent="granted">Allow analytics</button><button type="button" data-ml-consent="denied">Decline analytics</button></div>';
    status=panel.querySelector('#ml-consent-status');
    panel.querySelectorAll('[data-ml-consent]').forEach(b=>b.addEventListener('click',()=>setChoice(b.dataset.mlConsent)));
    document.body.append(panel);
    document.querySelectorAll('[data-analytics-settings]').forEach(button=>button.addEventListener('click',()=>showSettings(button)));
    panel.hidden=choice!==null;
    renderStatus();
  }
  // No persistent first-touch or visitor IDs are created by this code.
  // Non-identifying, allowlisted campaign labels survive the website -> store hop.
  document.querySelectorAll('a[href^="https://mythlayer.itch.io/mythlayer"]').forEach(a=>{
    const url=new URL(a.href);
    campaign.forEach((value,key)=>url.searchParams.set(key,value));
    a.href=url.href;
  });
  window.addEventListener('mythlayer:route',event=>{
    const next=validRoute(event.detail);
    if (!next) return;
    if (canSend() && lastMeasuredRoute && route && next.view!==route.view) pageReferrer=pageLocation();
    route=next;
    if(choice==='granted'&&!tagStarted)startTag();else measureRoute();
  });
  const placements = [
    ['#lnk-buy','supercon_store'],
    ['#lnk-ig-follow','supercon_instagram'],
    ['#lnk-tt','supercon_tiktok'],
    ['#lnk-yt','supercon_youtube'],
    ['#lnk-x','supercon_x'],
    ['.nav-actions a[href*="itch.io"]','header_store'],
    ['.nav-actions a[href*="discord"]','header_discord'],
    ['.home-actions a[href*="itch.io"]','home_hero_store'],
    ['.home-bottom a[href*="discord"]','home_bottom_discord'],
    ['.feature-cta a[href*="itch.io"]','features_store'],
    ['.team-hello a[href*="discord"]','team_discord'],
    ['.footer a[href*="discord"]','footer_discord'],
    ['.pdf-download','roadmap_pdf'],
    ['#use-youtube','watch_youtube_player'],
    ['.video-options a[href*="youtube"]','watch_youtube_external']
  ];
  const placementMap=new WeakMap();
  placements.forEach(([selector,id])=>document.querySelectorAll(selector).forEach(el=>placementMap.set(el,id)));
  const socialProfiles = {
    'https://www.instagram.com/mythlayer/':'instagram','https://www.tiktok.com/@mythlayer':'tiktok',
    'https://www.youtube.com/@MythLayerStudios':'youtube','https://www.facebook.com/mythlayerpage2/':'facebook',
    'https://www.threads.com/@mythlayer':'threads','https://x.com/MythLayer':'x','https://x.com/mythlayer':'x',
    'https://www.reddit.com/user/MythLayer/':'reddit'
  };
  function trackActivation(event) {
    if (event.type==='auxclick' && event.button!==1) return;
    const anchor=event.target.closest('a,button');
    if (!anchor) return;
    if (anchor.id==='use-youtube') {
      send('youtube_open',{placement_id:'watch_youtube_player',video_id:'official_trailer',destination_category:'embedded_player'});return;
    }
    if (anchor.tagName!=='A') return;
    const url=new URL(anchor.href,location.href);
    const base=url.origin+url.pathname;
    const placement=placementMap.get(anchor)||(anchor.closest('.faq-list')?'faq_answer':anchor.closest('.footer')?'footer_profile':'site_link');
    if ((url.hostname==='mythlayer.itch.io'&&url.pathname==='/mythlayer') || (url.origin===location.origin&&['/buy','/buy/','/buy.html'].includes(url.pathname)))
      send('itch_click',{placement_id:placement,destination_id:'itch_mythlayer'});
    else if (base==='https://discord.gg/NKJcFsMxc7'||base==='https://discord.com/invite/NKJcFsMxc7')
      send('discord_click',{placement_id:placement,destination_id:'discord_mythlayer'});
    else if (socialProfiles[base])
      send('social_click',{placement_id:route?.view==='social'?placement:'footer_'+socialProfiles[base],platform:socialProfiles[base],destination_id:socialProfiles[base]+'_mythlayer'});
    else if (url.hostname==='www.youtube.com'&&((url.pathname==='/watch'&&url.searchParams.get('v')==='u7PX02baS2w')||url.pathname==='/shorts/u7PX02baS2w'))
      send('youtube_open',{placement_id:placement,video_id:'official_trailer',destination_category:'external_video'});
    else if (base==='https://www.instagram.com/reel/DamQvguud_c/')
      send('outbound_link',{placement_id:'supercon_instagram_reel',destination_id:'instagram_trailer_reel',destination_category:'social_post'});
    else if (url.origin===location.origin&&url.pathname==='/assets/site-20261017-r5/public-roadmap.pdf')
      send('roadmap_pdf_click',{placement_id:'roadmap_pdf',document_id:'public_roadmap_2026_10_17',delivery_mode:'download_link'});
    else if (base==='https://github.com/SCHUGRWS'||base==='https://www.instagram.com/rwsschug/')
      send('outbound_link',{placement_id:'faq_contributor',destination_id:url.hostname==='github.com'?'contributor_github':'contributor_instagram',destination_category:'contributor'});
  }
  document.addEventListener('click',trackActivation,true);
  document.addEventListener('auxclick',trackActivation,true);
  const faqItems=[...document.querySelectorAll('.faq-list > details')];
  faqItems.forEach((entry,index)=>entry.querySelector('summary')?.addEventListener('click',()=>{
    if (!entry.open) send('faq_open',{faq_id:'faq_'+String(index+1).padStart(2,'0')});
  }));
  let searchTimer, lastSearch='';
  const faqSearch=document.querySelector('#faq-search');
  faqSearch?.addEventListener('input',()=>{
    clearTimeout(searchTimer);
    searchTimer=setTimeout(()=>{
      const query=faqSearch.value.trim();
      if (!query || query===lastSearch) {if(!query)lastSearch='';return;}
      lastSearch=query;
      const count=faqItems.filter(entry=>!entry.hidden).length;
      send('faq_search',{query_length_bucket:query.length<=10?'1_10':query.length<=30?'11_30':'31_plus',
        search_result_count_bucket:count===0?'zero':count<=5?'1_5':count<=15?'6_15':'16_plus'});
    },600);
  });
  const videos = [
    ['.online-choice video','online_preview','ambient_autoplay'],
    ['#trailer-video','official_trailer','deliberate'],
    ['#builder-video','world_building','deliberate'],
    ['.table-choice video','table_preview','ambient_autoplay'],
    ['.map-choice video','world_preview','ambient_autoplay'],
    ['#dialog-video','fog_exploration','gallery_preview']
  ];
  videos.forEach(([selector,videoId,mode])=>{
    const video=document.querySelector(selector);if(!video)return;
    let started=false,finished=false,seeking=false,previous=0,milestones=new Set();
    function details(){return {video_id:videoId,video_provider:'native',playback_mode:mode};}
    video.addEventListener('emptied',()=>{started=false;finished=false;previous=0;milestones.clear();});
    video.addEventListener('playing',()=>{
      if (finished) {started=false;finished=false;milestones.clear();}
      previous=video.currentTime;
      if (!started) {
        started=true;
        send('video_start',{...details(),muted:video.muted,duration_bucket:video.duration<15?'under_15s':video.duration<60?'15_60s':video.duration<300?'1_5min':'over_5min'});
      }
    });
    video.addEventListener('seeking',()=>{seeking=true;});
    video.addEventListener('seeked',()=>{seeking=false;previous=video.currentTime;});
    video.addEventListener('timeupdate',()=>{
      const current=video.currentTime,duration=video.duration;
      if (started&&!seeking&&!video.paused&&mode!=='ambient_autoplay'&&Number.isFinite(duration)&&duration>0&&current>=previous&&current-previous<=5) {
        [25,50,75].forEach(percent=>{
          const boundary=duration*percent/100;
          if (!milestones.has(percent)&&previous<boundary&&current>=boundary) {
            milestones.add(percent);send('video_progress',{...details(),video_percent:percent});
          }
        });
      }
      previous=current;
    });
    video.addEventListener('ended',()=>{
      if (started&&!finished&&mode!=='ambient_autoplay') send('video_complete',details());
      finished=true;
    });
  });
  choice=readChoice();
  if (choice!=='granted') {window['ga-disable-'+MEASUREMENT_ID]=true;cleanAnalyticsCookies();}
  makeConsentUI();
  const documentView=pathViews[location.pathname] || document.body.dataset.page || document.body.dataset.analyticsPage || 'home';
  const hashParts=location.hash.replace(/^#\/?/,'').split('/');
  const routerViews=['home','features','watch','roadmap','team','faq'];
  const legacyView=routerViews.includes(hashParts[0])?hashParts[0]:null;
  // The old root/#view URLs migrate to their real document before collection.
  const migrating=routerViews.includes(documentView) && legacyView && legacyView!==documentView;
  const initialSection=legacyView?hashParts[1]:hashParts[0];
  if(!migrating)route=validRoute({view:documentView,section:initialSection || document.body.dataset.defaultSection});
  if (choice==='granted') startTag();
  window.addEventListener('pageshow',event=>{
    if(!event.persisted)return;
    const next=readChoice(),hadTag=tagStarted;
    if(next!==choice) {
      setChoice(next==='granted'?'granted':'denied',false);
      if(choice!=='granted'||(!hadTag&&tagStarted))return;
    }
    if(canSend()){lastMeasuredRoute=null;measureRoute();}
  });
  window.addEventListener('storage',event=>{
    if(event.key!==CONSENT_KEY)return;
    const next=readChoice();
    // Expired/cleared consent defaults to off. Do not rewrite another tab's preference.
    setChoice(next==='granted'?'granted':'denied',false);
  });
})();