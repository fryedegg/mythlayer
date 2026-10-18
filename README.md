# MythLayer website

The public marketing website for [MythLayer](https://mythlayer.com), a battlemap overlay and online virtual tabletop. The downloadable application is maintained separately and is available on [itch.io](https://mythlayer.itch.io/mythlayer).

## Preview locally

With Python 3 installed, run this command from the repository root:

```sh
python -m http.server 8000
```

Open http://localhost:8000 in a browser. Serve the repository root: navigation and asset paths begin at `/`, so opening individual HTML files directly is not a complete preview. No build step, package manager, account or API key is required.

Optional Google Analytics collection is restricted to the production HTTPS domain and remains disabled in a local preview. The consent controls still work for checking the interface. Never add customer information, payment exports, credentials or private analytics exports to this repository.

## Source layout

- `index.html` is the compact launch page. `features.html`, `watch.html`, `roadmap.html`, `team.html` and `faq.html` contain real static content and unique search metadata. Their default content remains useful without JavaScript.
- `site-r8.js` provides local tabs, legacy hash migration, motion preferences, gallery viewing, video controls and FAQ search. Ordinary page links support normal browser navigation.
- `site-r7.css` preserves the existing logo, orange/gold branding and layout. `seo-r8.css` adds fitting for the optimized video previews. `fonts-r8.css` uses the same font families and weights in WOFF2 format.
- `campaign-tags-r8.js` validates and preserves the approved campaign labels. Register new campaign labels before publishing new promotional links.
- `analytics-r8.js` implements optional, consent-gated GA4 page and interaction measurement. Keep the existing measurement ID, consent behavior and cross-domain itch.io integration when editing.
- `privacy.html`, `sitemap.xml` and `robots.txt` describe privacy choices and search discovery. Legacy aliases and the `/buy/` and `/social/` routes remain for existing links.
- `assets/` contains the original artwork and captures, native trailer clips, optimized motion previews, fonts and public roadmap used by these pages. The original SIL Open Font License notices are beside the WOFF2 fonts.

## Production hosting

Production remains on **Porkbun**. This repository stores the public website source; pushing here does not authorize changing the host, domain nameservers or hosting plan. The existing `CNAME` remains `mythlayer.com`.

Deploy new revision-specific scripts, styles, fonts and media before their referring HTML pages, then update the sitemap. Keep earlier revision assets on the host for visitors with cached pages. Back up changed production files before replacing them. Test the consent gate, normal navigation, campaign labels and website-to-itch.io session continuity after publishing. A store click is not a confirmed purchase.

The private implementation audit, screenshots, deployment backups and analytics account records are intentionally kept outside this public repository.
