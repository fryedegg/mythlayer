/* Controlled public campaign labels shared by website and legacy purchase links. */
(()=>{
'use strict';
  const sourceLabels = new Set(['instagram','tiktok','youtube','facebook','threads','x','reddit','discord','github','supercon','newsletter','partner','analytics_qa']);
  const mediumLabels = new Set(['social','paid_social','video','community','referral','offline','email','qa']);
  const campaignLabels = new Set(['evergreen','feature_showcase','roadmap_update','release_update','supercon_2026','2026_10_paid_test','implementation_2026_10_18']);
  const contentLabels = new Set(['profile_bio_website','profile_bio_direct_purchase','story_trailer_a','story_features_a','page_website','page_direct_purchase','post_trailer_a','profile_website_anchor','profile_direct_purchase_anchor','profile_website','channel_profile_website','channel_profile_direct_purchase','longform_description_a','longform_pinned_comment_a','product_post_a','welcome_channel_website','roadmap_announcement_a','release_announcement_direct_purchase_a','public_readme_website','public_release_website_a','booth_sign_qr','takehome_flyer_qr','ad_test_a','link_in_bio','profile','page_learn_more','verification']);
  // Update these controlled labels alongside the campaign link register.
  // Never forward arbitrary query values, buyer data, download keys or ad-click IDs.
  function campaignParams(search = location.search) {
    const input = new URLSearchParams(search), output = new URLSearchParams();
    let source = input.get('utm_source') || '';
    source = ({ig:'instagram',fb:'facebook',twitter:'x'})[source] || source;
    let medium = input.get('utm_medium') || '';
    if (medium === 'organic_social') medium = 'social';
    if (sourceLabels.has(source)) output.set('utm_source', source);
    if (mediumLabels.has(medium)) output.set('utm_medium', medium);
    const campaign = input.get('utm_campaign') || '';
    if (campaignLabels.has(campaign) || /^release_\d{1,2}_\d{1,4}$/.test(campaign)) output.set('utm_campaign',campaign);
    const content = input.get('utm_content') || '';
    if (contentLabels.has(content)) output.set('utm_content',content);
    const campaignId = input.get('utm_id') || '';
    if (campaignLabels.has(campaignId)) output.set('utm_id',campaignId);
    // No registered keyword labels exist yet, so utm_term is deliberately omitted.
    return output;
  }
  const documentPaths = new Set(['/','/index.html','/features.html','/watch.html','/roadmap.html','/team.html','/faq.html','/privacy.html','/social/','/social/index.html','/about.html','/screenshots.html','/changelog.html','/buy','/buy/','/buy.html','/buy/index.html']);
  function internalParams() {
    const output=campaignParams(), incoming=new URLSearchParams(location.search);
    const linker=incoming.get('_gl') || '';
    // An incoming Google linker may survive a same-origin document hop. Store links
    // receive a fresh Google-generated linker on activation, never this copied value.
    if (/^[A-Za-z0-9.*_~-]{1,2048}$/.test(linker)) output.set('_gl',linker);
    if (incoming.get('ml_debug')==='1') output.set('ml_debug','1');
    return output;
  }
  function decorateAnchor(anchor) {
    const raw=anchor.getAttribute('href');
    if (!raw || raw.startsWith('#') || anchor.hasAttribute('download')) return;
    try {
      const url=new URL(raw,location.href);
      if(url.origin!==location.origin || !documentPaths.has(url.pathname)) return;
      url.search=internalParams().toString();
      anchor.href=url.href;
    } catch (_) {}
  }
  function decorateInternalLinks() {document.querySelectorAll('a[href]').forEach(decorateAnchor);}
  window.MLCampaign = Object.freeze({params:campaignParams,internalParams,decorateInternalLinks});
  decorateInternalLinks();
  document.addEventListener('click',event=>{const anchor=event.target.closest('a[href]');if(anchor)decorateAnchor(anchor);},true);
  document.addEventListener('auxclick',event=>{if(event.button===1){const anchor=event.target.closest('a[href]');if(anchor)decorateAnchor(anchor);}},true);

})();
