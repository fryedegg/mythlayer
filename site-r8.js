'use strict';
const views=['home','features','watch','roadmap','team','faq'];
const titles={home:'Your table. Your adventure. Anywhere.',features:'The toolkit',watch:'See the magic',roadmap:'Public roadmap',team:'Meet the team',faq:'FAQ & project notes'};
const oldAssets='assets/site-20261017-r5/', assets='assets/site-20261017-r6/';
const preference=matchMedia('(prefers-reduced-motion: reduce)'),motionPreferenceKey='mythlayer.website.motion';
function defaultMotion(){return !preference.matches&&!matchMedia('(max-width:760px)').matches&&!navigator.connection?.saveData}
function readMotionChoice(value){return value==='play'?true:value==='pause'?false:null}
let motionOverride=null;
try{motionOverride=readMotionChoice(localStorage.getItem(motionPreferenceKey))}catch(_){}
const pageView=document.body.dataset.page||'home';
let currentView=pageView,currentRoute='',motionWanted=motionOverride===null?defaultMotion():motionOverride;
const menu=document.querySelector('.menu-toggle'),nav=document.querySelector('#nav-links');
function closeMenu(){menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation');nav.classList.remove('open')}
menu.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');nav.classList.toggle('open',open)});
function isShown(el){return !el.closest('[hidden]') && (!el.closest('dialog')||el.closest('dialog').open)}
function isInViewport(el){const r=el.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth}
function hydrateAmbient(video){if(video.dataset.hydrated)return;video.querySelectorAll('source[data-src]').forEach(source=>source.src=source.dataset.src);video.dataset.hydrated='true';video.load()}

function syncMotion(){
 document.querySelectorAll('[data-motion-toggle]').forEach(b=>{b.textContent=motionWanted?'PAUSE ANIMATIONS Ⅱ':'PLAY ANIMATIONS ▷';b.removeAttribute('aria-pressed');b.setAttribute('aria-label',motionWanted?'Pause animated previews':'Play animated previews')});
 document.querySelectorAll('img[data-motion-src]').forEach(img=>{const src=motionWanted&&!document.hidden&&isShown(img)?img.dataset.motionSrc:img.dataset.motionPoster;if(src&&img.getAttribute('src')!==src)img.src=src});
 document.querySelectorAll('.ambient-motion,.feature-motion').forEach(v=>{if(motionWanted&&!document.hidden&&isShown(v)&&isInViewport(v)){hydrateAmbient(v);v.play().catch(()=>{})}else v.pause()});
}
if('IntersectionObserver' in window){const ambientObserver=new IntersectionObserver(()=>syncMotion(),{threshold:0.05});document.querySelectorAll('.ambient-motion,.feature-motion').forEach(v=>ambientObserver.observe(v))}else{window.addEventListener('scroll',syncMotion,{passive:true})}
document.querySelectorAll('[data-motion-toggle]').forEach(b=>b.addEventListener('click',()=>{motionWanted=!motionWanted;motionOverride=motionWanted;try{localStorage.setItem(motionPreferenceKey,motionWanted?'play':'pause')}catch(_){}syncMotion()}));
preference.addEventListener('change',e=>{if(motionOverride===null)motionWanted=defaultMotion();syncMotion()});
window.addEventListener('storage',e=>{if(e.key!==motionPreferenceKey)return;motionOverride=readMotionChoice(e.newValue);motionWanted=motionOverride===null?defaultMotion():motionOverride;syncMotion()});
window.addEventListener('resize',()=>{if(motionOverride===null)motionWanted=defaultMotion();syncMotion()},{passive:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)document.querySelectorAll('video').forEach(v=>v.pause());syncMotion()});
const trailer=document.querySelector('#trailer-video'),youtubeSlot=document.querySelector('#youtube-slot'),dialog=document.querySelector('#image-dialog'),dialogImage=document.querySelector('#dialog-image'),dialogVideo=document.querySelector('#dialog-video');
function pauseMedia(){document.querySelectorAll('video').forEach(v=>v.pause());if(youtubeSlot){youtubeSlot.replaceChildren();youtubeSlot.hidden=true}if(trailer)trailer.hidden=false}
function activateTab(button,selector){document.querySelectorAll(selector).forEach(b=>{const active=b===button;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1})}
function imageData(img,data){img.src=data.image;img.alt=data.caption;if(data.gif){img.dataset.motionSrc=data.gif;img.dataset.motionPoster=data.image}else{delete img.dataset.motionSrc;delete img.dataset.motionPoster}}
function setFeature(key){
 document.querySelectorAll('[data-feature-container]').forEach(p=>p.hidden=p.dataset.featureContainer!==key);
 document.querySelectorAll('[data-feature-panel]').forEach(p=>p.hidden=p.dataset.featurePanel!==key);
 activateTab(document.querySelector('[data-feature="'+key+'"]'),'[data-feature]');
}
function setWatch(key){document.querySelectorAll('[data-watch-panel]').forEach(p=>p.hidden=p.dataset.watchPanel!==key);activateTab(document.querySelector('[data-watch="'+key+'"]'),'[data-watch]')}
const gallery=[{"category":"online","image":"assets/site-20261017-r6/online-party-poster.webp","gif":"assets/site-20261017-r6/online-party-fireball.gif","title":"The whole party, in play.","caption":"Staged in MythLayer V2.488.0: four player characters and multiple monsters, using the actual encounter tools.","mp4":"assets/site-20261017-r7/r8-online-party-fireball.mp4","webm":"assets/site-20261017-r7/r8-online-party-fireball.webm"},{"category":"spells","image":"assets/site-20261017-r6/spell-fireball-poster.webp","gif":"assets/site-20261017-r6/spell-fireball.gif","title":"Let the spell fly.","caption":"Actual MythLayer footage: Fireball and its animated area of effect.","mp4":"assets/site-20261017-r7/r8-spell-fireball.mp4","webm":"assets/site-20261017-r7/r8-spell-fireball.webm"},{"category":"toolkit","image":"assets/site-20261017-r5/ui-bestiary.webp","title":"Meet the next encounter.","caption":"Actual MythLayer Bestiary and token art."},{"category":"spells","image":"assets/site-20261017-r6/spell-ice-storm-poster.webp","gif":"assets/site-20261017-r6/spell-ice-storm.gif","title":"Ice Storm in motion.","caption":"Actual MythLayer footage: the complete Ice Storm effect.","mp4":"assets/site-20261017-r7/r8-spell-ice-storm.mp4","webm":"assets/site-20261017-r7/r8-spell-ice-storm.webm"},{"category":"weather","image":"assets/site-20261017-r6/weather-rain-poster.webp","gif":"assets/site-20261017-r6/weather-rain.gif","title":"Bring on the rain.","caption":"Actual MythLayer footage: live rain weather over a battlemap."},{"category":"weather","image":"assets/site-20261017-r6/fog-exploration-poster.webp","gif":"assets/site-20261017-r6/fog-exploration.gif","mp4":"assets/site-20261017-r6/fog-exploration.mp4","webm":"assets/site-20261017-r6/fog-exploration.webm","title":"Reveal the adventure.","caption":"Actual MythLayer fog footage: explore and reveal the map around the party."},{"category":"spells","image":"assets/site-20261017-r6/spell-cone-of-cold-poster.webp","gif":"assets/site-20261017-r6/spell-cone-of-cold.gif","title":"A Cone of Cold.","caption":"Actual MythLayer footage: a full animated Cone of Cold."}];
const galleryCards=[],galleryCategories=[['all','All'],['online','Online play'],['spells','Spells'],['weather','Fog & weather'],['toolkit','Toolkit']];
let galleryFilter='all',filteredGallery=gallery.slice(),galleryIndex=-1,dialogOpener=null;
for(const card of document.querySelectorAll('.gallery-card')){const button=card.querySelector('[data-gallery-index]');if(button)galleryCards.push({record:gallery[Number(button.dataset.galleryIndex)],card,button})}
function setGalleryFilter(key){
 galleryFilter=galleryCategories.some(([value])=>value===key)?key:'all';
 filteredGallery=gallery.filter(g=>galleryFilter==='all'||g.category===galleryFilter);
 galleryCards.forEach(({record,card})=>{card.hidden=!filteredGallery.includes(record)});
 document.querySelectorAll('[data-gallery-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.galleryFilter===galleryFilter)));
 const count=document.querySelector('#gallery-count'),label=galleryCategories.find(([value])=>value===galleryFilter)[1];
 if(count)count.textContent=filteredGallery.length+' scene'+(filteredGallery.length===1?'':'s')+(galleryFilter==='all'?' in the gallery.':' · '+label+'.');
 syncMotion();
}
document.querySelectorAll('[data-gallery-filter]').forEach(button=>button.addEventListener('click',()=>setGalleryFilter(button.dataset.galleryFilter)));
function setRoadmap(key){document.querySelectorAll('[data-roadmap-panel]').forEach(p=>p.hidden=p.dataset.roadmapPanel!==key);activateTab(document.querySelector('[data-roadmap="'+key+'"]'),'[data-roadmap]')}
const pagePaths={home:'/',features:'/features.html',watch:'/watch.html',roadmap:'/roadmap.html',team:'/team.html',faq:'/faq.html'};
const pageSections={features:['remote','table','build'],watch:['trailer','builder','gallery'],roadmap:['next','planned','touch','exploring']};
function parseRoute(raw){
 const parts=String(raw||'').replace(/^#/,'').split('/');
 const view=views.includes(parts[0])?parts[0]:pageView;
 const candidate=views.includes(parts[0])?parts[1]:parts[0];
 const options=pageSections[view]||[],section=options.includes(candidate)?candidate:(options[0]||'');
 return {view,section,key:view+(section?'/'+section:'')};
}
function destination(route){const url=new URL(pagePaths[route.view],location.origin);url.search=location.search;if(route.section)url.hash=route.section;return url.href}
function applyRoute(raw,focus=false,force=false){
 const route=parseRoute(raw);
 if(route.view!==pageView){location.replace(destination(route));return}
 if(!force&&route.key===currentRoute){closeMenu();return}
 pauseMedia();if(dialog.open)dialog.close();currentView=route.view;currentRoute=route.key;
 if(currentView==='features')setFeature(route.section);if(currentView==='watch')setWatch(route.section);if(currentView==='roadmap')setRoadmap(route.section);
 window.dispatchEvent(new CustomEvent('mythlayer:route',{detail:route}));closeMenu();syncMotion();
 if(focus)document.querySelector('#view-'+currentView+' h1')?.focus({preventScroll:true});
}
function navigate(raw,{replace=false,focus=true}={}){const route=parseRoute(raw);if(route.view!==pageView){location.assign(destination(route));return}const hash=route.section?'#'+route.section:'';if(location.hash!==hash)history[replace?'replaceState':'pushState']({},'',location.pathname+location.search+hash);applyRoute(hash,focus)}
document.querySelector('a[href="#content"]')?.addEventListener('click',()=>{const main=document.querySelector('#content');main.tabIndex=-1;main.focus()});
window.addEventListener('popstate',()=>applyRoute(location.hash,true));window.addEventListener('hashchange',()=>applyRoute(location.hash,true));
document.querySelectorAll('[data-feature]').forEach(b=>b.addEventListener('click',()=>navigate('features/'+b.dataset.feature,{focus:false})));
document.querySelectorAll('[data-watch]').forEach(b=>b.addEventListener('click',()=>navigate('watch/'+b.dataset.watch,{focus:false})));
document.querySelectorAll('[data-roadmap]').forEach(b=>b.addEventListener('click',()=>navigate('roadmap/'+b.dataset.roadmap,{focus:false})));
document.querySelectorAll('[role=tablist]').forEach(list=>list.addEventListener('keydown',e=>{const tabs=[...list.querySelectorAll('[role=tab]')],index=tabs.indexOf(document.activeElement);if(index<0)return;let next;if(e.key==='ArrowRight')next=(index+1)%tabs.length;if(e.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();tabs[next].focus();tabs[next].click()}}));
function playTrailer(){navigate('watch/trailer',{focus:false});youtubeSlot.replaceChildren();youtubeSlot.hidden=true;trailer.hidden=false;trailer.play().catch(()=>{})}
document.querySelector('#start-native-trailer')?.addEventListener('click',playTrailer);
document.querySelector('#use-youtube')?.addEventListener('click',()=>{trailer.pause();trailer.hidden=true;youtubeSlot.hidden=false;const frame=document.createElement('iframe');frame.src='https://www.youtube-nocookie.com/embed/u7PX02baS2w?autoplay=1&rel=0&playsinline=1';frame.title='MythLayer trailer on YouTube';frame.allow='autoplay; encrypted-media; picture-in-picture';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';youtubeSlot.replaceChildren(frame)});
function updateGalleryPosition(){
 const navigation=document.querySelector('#gallery-navigation'),position=document.querySelector('#gallery-position'),previous=document.querySelector('#gallery-prev'),next=document.querySelector('#gallery-next');
 const active=galleryIndex>=0&&galleryIndex<filteredGallery.length;
 if(navigation)navigation.hidden=!active;
 if(position)position.textContent=active?(galleryIndex+1)+' of '+filteredGallery.length+' · '+filteredGallery[galleryIndex].title:'';
 for(const button of [previous,next])if(button)button.disabled=!active||filteredGallery.length<2;
}
function openMedia(data,{galleryItem=false,opener=null}={}){
 if(!dialog.open)dialogOpener=opener||document.activeElement;
 if(!galleryItem)galleryIndex=-1;
 document.querySelector('#image-caption').textContent=data.caption||'';
 document.querySelector('#dialog-video-fallback')?.remove();
 dialogVideo.pause();dialogVideo.replaceChildren();dialogVideo.removeAttribute('src');
 dialogVideo.dataset.previewGif=data.gif||'';
 dialogVideo.hidden=!data.webm&&!data.mp4;dialogImage.hidden=!dialogVideo.hidden;
 document.querySelector('#dialog-motion-toggle').hidden=!dialogVideo.hidden||!data.gif;
 if(dialogVideo.hidden){imageData(dialogImage,{image:data.image,gif:data.gif,caption:data.caption||''});dialogVideo.load()}
 else{delete dialogImage.dataset.motionSrc;delete dialogImage.dataset.motionPoster;dialogImage.removeAttribute('src');dialogVideo.poster=data.image;for(const [key,type] of [['webm','video/webm'],['mp4','video/mp4']])if(data[key]){const source=document.createElement('source');source.src=data[key];source.type=type;dialogVideo.append(source)}dialogVideo.load()}
 updateGalleryPosition();
 if(!dialog.open)dialog.showModal();
 syncMotion();if(!dialogVideo.hidden&&motionWanted)dialogVideo.play().catch(()=>{});
}
function showGalleryItem(index){if(!filteredGallery.length)return;galleryIndex=(index+filteredGallery.length)%filteredGallery.length;openMedia(filteredGallery[galleryIndex],{galleryItem:true})}
document.addEventListener('click',e=>{const button=e.target.closest('[data-image]');if(!button)return;const originalIndex=Number(button.dataset.galleryIndex);if(button.hasAttribute('data-gallery-index')&&Number.isInteger(originalIndex)){const record=gallery[originalIndex];galleryIndex=filteredGallery.indexOf(record);if(galleryIndex>=0)openMedia(record,{galleryItem:true,opener:button})}else openMedia(button.dataset,{opener:button})});
document.querySelector('#gallery-prev')?.addEventListener('click',()=>showGalleryItem(galleryIndex-1));
document.querySelector('#gallery-next')?.addEventListener('click',()=>showGalleryItem(galleryIndex+1));
dialog.addEventListener('keydown',e=>{if(galleryIndex<0||e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||e.target.closest('video,audio,input,textarea,select,[contenteditable="true"],[role="slider"]'))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();showGalleryItem(galleryIndex+(e.key==='ArrowRight'?1:-1))}});
dialogVideo.addEventListener('error',()=>{if(!dialog.open||dialogVideo.hidden||document.querySelector('#dialog-video-fallback'))return;const note=document.createElement('p');note.id='dialog-video-fallback';note.className='video-fallback';note.setAttribute('role','status');note.textContent='This browser could not play the video. ';const target=dialogVideo.dataset.previewGif||dialogVideo.querySelector('source')?.getAttribute('src');if(target){const link=document.createElement('a');link.href=target;link.textContent=dialogVideo.dataset.previewGif?'Open the animated preview ↗':'Open the clip separately ↗';link.target='_blank';link.rel='noopener';note.append(link)}dialogVideo.after(note)});
dialogVideo.addEventListener('loadeddata',()=>document.querySelector('#dialog-video-fallback')?.remove());
document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{dialogVideo.pause();dialogImage.removeAttribute('data-motion-src');dialogImage.removeAttribute('data-motion-poster');dialogImage.removeAttribute('src');galleryIndex=-1;updateGalleryPosition();const opener=dialogOpener;dialogOpener=null;if(opener?.isConnected&&!opener.closest('[hidden]'))opener.focus({preventScroll:true});syncMotion()});
dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&nav.classList.contains('open')){closeMenu();menu.focus()}});
for(const video of document.querySelectorAll('#trailer-video,#builder-video'))video.addEventListener('error',()=>{const id=video.id+'-fallback';if(document.getElementById(id))return;const note=document.createElement('p');note.id=id;note.className='video-fallback';note.textContent='Your browser could not play this clip. ';const link=document.createElement('a');link.href=video.id==='trailer-video'?'https://www.youtube.com/watch?v=u7PX02baS2w':assets+'world-building.webm';link.textContent=video.id==='trailer-video'?'Watch the trailer on YouTube ↗':'Open the WebM clip ↗';link.target='_blank';link.rel='noopener';note.append(link);video.parentElement.append(note)});
const faqSearch=document.querySelector('#faq-search'),faqResults=document.querySelector('#faq-results'),faqClear=document.querySelector('#faq-clear');
const faqEntries=[...document.querySelectorAll('.faq-list > details')].map(entry=>({entry,text:normalizeSearch(entry.textContent)}));
function normalizeSearch(value){return String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim()}
function faqMatches(text,query){return query.split(/\s+/).every(term=>term.length>2?text.includes(term):new RegExp('(?:^|[^a-z0-9])'+term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:$|[^a-z0-9])').test(text))}
function filterFaq(){if(!faqSearch)return;const query=normalizeSearch(faqSearch.value);let matches=0;faqEntries.forEach(({entry,text})=>{const visible=!query||faqMatches(text,query);entry.hidden=!visible;entry.open=!!query&&visible;if(visible)matches++});if(faqResults)faqResults.textContent=query?(matches?matches+' answer'+(matches===1?'':'s')+' found.':'No answers found. Try online, touch or maps, or clear the search.'):'Browse all '+faqEntries.length+' questions.';if(faqClear)faqClear.disabled=!faqSearch.value}
faqSearch?.addEventListener('input',filterFaq);
faqSearch?.addEventListener('search',filterFaq);
faqSearch?.addEventListener('keydown',e=>{if(e.key==='Escape'&&faqSearch.value){e.preventDefault();faqSearch.value='';filterFaq()}});
faqClear?.addEventListener('click',()=>{if(!faqSearch)return;faqSearch.value='';filterFaq();faqSearch.focus()});
filterFaq();setGalleryFilter('all');applyRoute(location.hash,false,true);
window.MLCampaign?.decorateInternalLinks?.();
