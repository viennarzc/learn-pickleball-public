# Learn Pickleball

A mobile-first prototype for learning pickleball through a guided path, interactive court, illustrated checks, short drills, a sourced technique library, and curated external resources.

## Project guides

- [Architecture and maintainer guide](docs/ARCHITECTURE.md): stack, layers, data flow, infrastructure, setup, and change paths.
- [UI/UX recommendations](docs/UI_UX_RECOMMENDATIONS.md): prioritized proposals based on synthetic feedback; proposed work is separate from current behavior.
- [Design QA report](docs/DESIGN_QA.md): visual and interaction review history.
- [Security policy](SECURITY.md): how to report a vulnerability privately.

## Illustration system

- Production direction and reusable prompt kernel: [`docs/ILLUSTRATION_STYLE_GUIDE.md`](docs/ILLUSTRATION_STYLE_GUIDE.md)
- Exact v2 generation recipe: [`docs/IMAGE_GENERATION_PROMPTS.md`](docs/IMAGE_GENERATION_PROMPTS.md)
- Sourced subject inventory and coverage manifest: [`docs/PICKLEBALL_VISUAL_CURRICULUM.md`](docs/PICKLEBALL_VISUAL_CURRICULUM.md)
- Web-optimized assets: `assets/illustrations/*.webp`
- Full-resolution generated masters: `assets/illustrations/*.png`

## Run locally

Serve the folder with any static server. For example:

```bash
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4173/`.

## Deploy to Vercel

This repository is ready to import as an **Other** framework project on Vercel. The included `vercel.json` validates the app during the build and applies response-security headers. The root `middleware.js` is the supported Vercel Routing Middleware entrypoint and runs the bot guard before static files are served.

The deployed interface is self-contained: it does not execute third-party scripts or request third-party fonts. Fredoka and Nunito are served from `assets/fonts/` under their included SIL Open Font License notices. Curated resource links still open only after a learner selects them.

The production posture supports search discovery without removing the scraper guard:

- Crawlable public lessons live at `/learn-pickleball/` and four topic URLs. They are regular HTML documents with unique titles, descriptions, social metadata, canonical links, and visible source attribution.
- `/robots.txt` and `/sitemap.xml` are Vercel functions. They derive the correct production origin from each request, so the sitemap never hard-codes a preview domain.
- Search engines and link-preview bots are not rejected merely because their user agent contains `bot`. The Routing Middleware returns `403` only for named AI collectors, common SEO-scraper products, command-line fetchers, and browser-automation clients.
- The app and public lesson pages use only same-origin scripts, styles, images, and fonts. No learner data is sent to third parties.

Before a public launch, configure the Vercel dashboard as well:

1. In **Bot Management**, set **Bot protection** to **Challenge**.
2. Set **AI bots** to **Deny**.
3. Add a Firewall custom rule that rate-limits sustained `GET` and `HEAD` traffic across the site, tuned to real learner traffic.

Those are the platform controls for high-volume or browser-impersonating scrapers; a public static site cannot prevent a determined client from copying files it is allowed to download. After the production domain is connected, add it to Google Search Console and Bing Webmaster Tools, submit `https://your-domain/sitemap.xml`, and inspect the public lesson URLs.

## Public SEO pages

| URL | Search intent |
|---|---|
| `/learn-pickleball/` | Free beginner pickleball lessons |
| `/learn-pickleball/kitchen-rules/` | What the kitchen/non-volley zone is |
| `/learn-pickleball/serve-basics/` | Where a pickleball serve goes |
| `/learn-pickleball/two-bounce-rule/` | What the two-bounce rule means |
| `/learn-pickleball/doubles-scoring/` | How to call a doubles score |

The interaction-heavy experience continues to use hash routes. The public articles are deliberately separate URLs so they can be crawled, shared, and ranked, while each routes learners into the matching interactive drill.

## Current app routes

| Route | Experience |
|---|---|
| `#/` | New-user landing or returning-user recommendation |
| `#/placement` | Four entry routes, including a five-question consistency diagnostic |
| `#/learn` | Seven-unit path: 20 core lessons and 9 optional deep dives |
| `#/lesson/<id>?page=<page-id>` | Lesson page; without a valid page selection, resumes the first incomplete required page |
| `#/practice` | Optional practice logging |
| `#/court-lab` | Court exploration, scenarios, and map knowledge check |
| `#/library?view=skills` | Searchable visual skills |
| `#/library?view=rules` | Searchable rules and guides with summaries, evidence links, and gated lesson links |
| `#/progress` | Local completion, practice, keepsakes, and reset |

Legacy routes remain supported: `#/court` and `#/quiz` open Court Lab; `#/skills` and `#/resources` open Library; `#/achievements` opens Progress. Old lesson IDs such as `court-kitchen`, `serve-basics`, `two-bounce`, and `doubles-score` resolve to current lessons, subject to current prerequisites.

Progress uses **`learn-pickleball:v2`** in browser local storage. Required pages and attempts persist; optional practice is recorded separately. Older progress is not migrated, and reset leaves older keys untouched. There is no account or cross-device sync. When writes fail, the app shows a notice and continues in memory; changes may be lost on reload.

## Completion and rewards

- Complete all required pages to mark a lesson's concept understood. Optional references and practice do not block completion.
- Court Lab requires all three zone categories plus the correct map check; visiting zones alone does not complete it.
- Selected concept completions award keepsakes; not every lesson awards a sticker.
- View keepsakes and progress at `#/progress`. Completed lessons remain available for review from Learn. Expanded units are remembered for the current browser session.
- The consistency diagnostic can recommend Unit 4 or 6 without pretending earlier lessons were completed. Optional deep dives also become available after core completion.

## Validation

```sh
npm ci
npm run check
```

The validation gate checks syntax, request policy, SEO, assets, curriculum, and v2 contracts. Browser interaction and accessibility testing remain separate; see the architecture guide.

## Content boundaries

- The current GPF and USA Pickleball rules are the factual baseline.
- Creator resources are attributed and opened at their original source.
- The current curriculum contains 29 lessons across seven units, rendered through shared lesson/page components. Locked lessons explain the requirement and offer a route back to the prerequisite or path.
- The original generated illustrations live in `assets/`. The supplied mood-board references are not shipped.
- Motion respects `prefers-reduced-motion`; when it is enabled, decorative animation is effectively disabled.

## License

The original app and tooling source code is licensed under the MIT License; see [`LICENSE`](LICENSE). This license does not cover lesson text or artwork. Bundled Fredoka and Nunito fonts remain under the SIL Open Font License notices in `assets/fonts/`, and third-party materials remain under their respective terms.
