/* Preserve approved public campaign labels and the Google linker on legacy store entry URLs. */
(() => {
  'use strict';
  const target=new URL('https://mythlayer.itch.io/mythlayer');
  const campaign=window.MLCampaign?.params() || new URLSearchParams();
  campaign.forEach((value,key)=>target.searchParams.set(key,value));
  const linker=new URLSearchParams(location.search).get('_gl');
  if(linker && linker.length<=4096 && /^[a-zA-Z0-9*._-]+$/.test(linker)) target.searchParams.set('_gl',linker);
  document.querySelectorAll('a[href="https://mythlayer.itch.io/mythlayer"]').forEach(a=>a.href=target.href);
  setTimeout(()=>location.replace(target.href),3000);
})();
