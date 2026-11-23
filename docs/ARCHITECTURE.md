# Architecture and maintainer guide

Verified against the working tree on 2026-11-12. This describes the current implementation. [UI/UX recommendations](UI_UX_RECOMMENDATIONS.md) describe proposed future changes.

## System at a glance

Learn Pickleball is a static, browser-rendered learning app with separately authored public articles. It uses native JavaScript modules, HTML, and CSS—not React, a bundler, or a server-rendered framework. Vercel supplies hosting, request middleware, and two SEO response functions. Learning progress stays in browser local storage; there is no application account service, database, or progress API in this codebase.

```mermaid
flowchart TD
    B[Browser request] --> V[Vercel hosting and configured headers]
    V --> M[Routing middleware: proxy bot guard]
    M -->|allowed static request| S[HTML, JS, CSS, fonts and images]
    M -->|robots or sitemap rewrite| F[SEO functions]
    M -->|denied user agent| X[403 response]
    F --> R[SEO page registry and request origin]
    S --> A[Interactive app: app.js]
    S --> P[Public articles and seo.js]
    A --> C[Curriculum, sources, Library and aliases]
    A --> G[Progress module]
    G <--> L[Browser localStorage v2]
    A --> D[DOM rendering and delegated events]
```

The diagram groups infrastructure responsibilities; it is not a claim about the platform's exact internal processing order. Hash fragments are handled in the browser and are not sent to the server. Static local preview does not run the Vercel layer.

## Layers and ownership

| Layer | Owning files | Responsibility and boundary |
|---|---|---|
| App shell and presentation | [index.html](../index.html), [styles.css](../styles.css) | Loads the module, fonts/styles, skip link, storage notice, and live toast region. CSS handles responsive navigation and reduced motion. |
| Navigation routing | [routing/simple-router.js](../routing/simple-router.js) | The route table (`ROUTES`: path → view, nav tab, title, one comment per route), the navigation tabs (`NAV_ITEMS`), hash parsing, route matching with `:params`, and link building. It knows nothing about rendering or progress. |
| Rendering, interactions | [app.js](../app.js) | Maps each router view name to a render function, renders HTML strings into `#app`, handles delegated actions, selects the next lesson, enforces gates, and awards keepsakes. UI and domain orchestration currently share one module. |
| Learning content | [content/curriculum.js](../content/curriculum.js) | Seven units, 29 lessons (20 core), page/activity data, prerequisites, sources, entry routes, Library records, and old lesson aliases. Stable IDs connect content to persisted progress. |
| Local state | [content/progress.js](../content/progress.js), [content/progress-store.js](../content/progress-store.js) | Progress data helpers and lock-coordinated local storage updates, migration, and recovery. |
| Public discovery | [learn-pickleball/](../learn-pickleball/), [public.css](../public.css), [seo.js](../seo.js) | Static article content and metadata, with links into interactive lessons. Browser script adjusts canonical/social URLs to the current origin and adds JSON-LD. |
| SEO responses | [api/robots.js](../api/robots.js), [api/sitemap.js](../api/sitemap.js), [api/seo-pages.js](../api/seo-pages.js) | Plain-text robots and XML sitemap, sharing a six-URL registry including `/`. No learner state is involved. |
| Hosting and request policy | [vercel.json](../vercel.json), [.vercelignore](../.vercelignore), [middleware.js](../middleware.js), [proxy.js](../proxy.js) | Validation build, root static output, deployment exclusions, rewrites, security headers, and user-agent guard. Dashboard configuration is a separate operational concern. |
| Assets and checks | [assets/](../assets/), [scripts/](../scripts/), [package.json](../package.json) | Local images/fonts and executable integrity checks. The only declared package dependency is `@vercel/functions`; the lockfile pins installation resolution. |

### Browser flow

1. `index.html` loads `seo.js` and the `app.js` ES module. The app imports curriculum and progress helpers and loads normalized v2 state.
2. `render()` asks the router which view the hash points to, renders that screen, replaces `#app.innerHTML`, stores `lastViewedRoute`, updates the title, and optionally focuses the main region. A saved route is a record, not automatic full-session restoration.
3. Document-level click/input/keyboard handlers read `data-action` attributes. Progress actions acquire a Web Lock, update the latest stored state, and then render the committed result. `hashchange` clears transient answer selections and renders with main focus.
4. Completing all required lesson pages marks the concept understood. Optional references and voluntary practice do not block concept completion. Correct answers record completion; reading pages use an explicit completion action.
5. Next-lesson selection tries the active playlist, then a recommended unit, then the remaining available lessons. Prerequisites and diagnostic access govern availability. Completed lessons remain reviewable.

Unit disclosure choices are retained in session storage with an in-memory fallback; the Back to path link returns focus to the lesson row. Other DOM-local focus state is not automatically durable. Keep escaped text interpolation and accessible focus behavior intact when adding renderers. User-facing strings and content are currently English; there is no localization framework.

### Routes and compatibility

| Canonical route | Purpose |
|---|---|
| `#/` | New-user landing or returning recommendation, depending on selected entry route |
| `#/placement` | Four entry choices; consistency route includes a five-question diagnostic |
| `#/learn` | Expandable seven-unit course |
| `#/lesson/<id>?page=<page-id>` | Generic lesson renderer; without a valid page selection, chooses the first incomplete required page, or the first page when complete |
| `#/practice` | Optional practice logging |
| `#/court-lab` | Court exploration, serve/kitchen scenarios, and knowledge check |
| `#/library?view=skills` / `?view=rules` | Visual skills or rules/guides search and filtering |
| `#/progress` | Completion, practice, keepsakes, and reset |

Compatibility routes: `#/home` opens home; `#/court` and `#/quiz` open Court Lab; `#/skills` and `#/resources` open Library (Resources defaults to rules); `#/achievements` opens Progress. Old lesson IDs resolve through `legacyLessonAliases`; some choose the first unfinished replacement lesson. Canonical IDs take precedence. An alias can still lead to a locked lesson: compatibility does not bypass prerequisites. Unknown routes/lessons show recovery links.

**Link compatibility is not data migration.** Keep aliases when renaming curriculum IDs, and separately design any progress migration. Do not assume every path mentioned by a helper is a supported screen: the route dispatch in `render()` is authoritative.

### Progress and failure behavior

The current app stores v2 progress in **`learn-pickleball:v2:coordinated`**. On the first saved action it copies the previous `learn-pickleball:v2` record and leaves that original in place for older tabs and recovery. Each study condition gets its own coordinated key and lock. The record also tracks a reset generation and any copies retained after resolving an older-tab conflict.

- A short-lived exclusive Web Lock serializes each action's read, update, and write. Rendering and navigation do not save progress. Storage events refresh other tabs but are not used for mutual exclusion. An action queued before a reset is rejected when its generation is stale.
- Older tabs do not use the lock. If their legacy key changes after migration, new tabs pause writes and ask the learner to reload older tabs and choose a copy. Both copies are retained in the coordinated record; the Progress page can download them as JSON. Repeated changes by an old tab trigger the choice again.
- Malformed or incompatible records are not overwritten. If safe storage or Web Locks are unavailable, learning can continue in memory for that tab, with a notice that changes will not survive a reload. A failed reset leaves the displayed and stored progress unchanged.
- Reset writes fresh coordinated progress and advances its generation; it clears conflict recovery copies but leaves the pre-update v2 copy and v1 data in local storage. Storage is origin- and browser-specific, with no account or cross-device sync.
- Unknown lesson records are preserved by the coordinated store, although normalizing known fields is not comprehensive schema validation. The old `loadProgress` and `saveProgress` helpers remain for legacy contracts and must not be used for current app writes.
- Required-page progress and attempts persist; current answer selections, Library query/filter state, active court feedback, and modal state are transient; unit disclosure choices live only for the browser session. Reload is not exact visual-session restoration.
- Court Lab completion requires visits to kitchen, service, and baseline plus the correct map check. That gate also completes linked Court Lab lesson pages. Normalization invalidates earlier v2 exploration-only completion.
- Selected concept completions award keepsakes; not every lesson has a sticker. Practice records are separate from concept completion and are not a skill rating.

No service worker or offline app cache is implemented. Local progress persistence should not be described as guaranteed offline availability.

## Hosting, SEO, and infrastructure

Vercel configuration uses `framework: null`, `buildCommand: npm run check`, and `outputDirectory: .`. The build validates source; it does not compile a bundle or generate a separate distribution folder. Treat deployable repository content as potentially public. `.gitignore` keeps local notes from ordinary Git staging, while `.vercelignore` excludes internal documentation from deployment uploads; neither rule removes files already committed from Git history.

`middleware.js` re-exports the guard from `proxy.js` and matches all paths. The guard returns a no-store 403 for its explicit automation user-agent patterns, otherwise calls `next()`. It deliberately avoids generic “bot” matching, but includes common headless/automation clients, which can affect deployed browser tests. It is neither authentication nor robust protection against spoofed user agents.

Configured headers restrict scripts/styles/fonts/network connections to the same origin, disallow framing and objects, disable selected device permissions, prevent MIME sniffing, and set referrer and cross-origin policies. Inline or third-party assets may require policy changes; inspect the browser console before weakening a policy to make a feature work.

`/robots.txt` and `/sitemap.xml` rewrite to functions. They derive an origin from forwarded/host headers, constrain the protocol and host format, and fall back to `https://localhost` for invalid/missing hosts. Responses use a one-hour shared-cache lifetime with stale-while-revalidate. The sitemap registry and `updated` dates are maintained manually.

Public HTML pages are independently authored, not generated from the curriculum. Keep article wording, canonical lesson links, source references, and metadata aligned when content changes. Static metadata contains a fallback production origin; `seo.js` rewrites some URLs only after JavaScript executes. Verify raw HTML as well as rendered metadata when changing domains.

### Operational responsibilities

| Responsibility | Repository provides | Maintainer must verify outside the code |
|---|---|---|
| Deployment | Build/output configuration and lockfile | Vercel project linkage, branch, Node runtime, domain/DNS, actual deployed revision |
| Request protection | User-agent guard and headers | Dashboard Bot Management, AI-bot policy, firewall/rate limits, and preview access policy |
| Search discovery | Public HTML, robots/sitemap functions | Production canonical URLs, crawler access, Search Console/Bing registration and sitemap submission |
| Release health | Local checks | Preview/browser smoke tests, deployment logs, and production error responses |

Dashboard settings are not proven by configuration files or README instructions. No dedicated application analytics or error-reporting SDK is wired into the inspected app. A secret-scan workflow is also present under `.github/workflows/`; verify its remote execution separately. Its presence does not establish that the application checks run in GitHub CI.

## Local setup and maintenance

Use Node/npm for checks and Python 3 (or another static server) for preview. The package does not declare a Node engine version; align your local Node version with the verified Vercel runtime rather than assuming a pinned version.

```sh
npm ci
npm run check
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/`. The static server supports the app and public HTML, but not Vercel middleware, response headers, function rewrites, or dashboard rules. Verify those through an authorized Vercel preview. No application credentials are needed for basic static preview.

### Checks and their limits

`npm run check` is the current build gate. It performs JavaScript syntax checks and runs proxy, SEO, font, sticker, curriculum, and app-v2 checks. These include content integrity, progress helper behavior, legacy alias expectations, source-level rendering contracts, and focused P1 summary, filter, evidence, and storage-fallback checks. They are not a full browser integration suite or accessibility certification.

`npm run test:ui` (run in GitHub Actions, but not in the Vercel build gate) runs `tests/ui/` in headless Chrome/Chromium through the DevTools Protocol, with no npm dependencies. It covers navigation at desktop and phone widths and real tabs sharing storage, including simultaneous updates, resets, older-tab conflicts, and failed writes. Set `CHROME_PATH` if Chrome is not found.

The v2 gate is the maintained validation entry point. Do not treat every script in `scripts/` as an actively supported command.

For UI changes, additionally exercise fresh/partial/complete progress, locked and legacy links, storage failure, Court Lab gates, modal focus, keyboard input, small screens, zoom, reduced motion, and failed images. For infrastructure changes, verify live headers, allowed/denied request behavior, and robots/sitemap responses. Use `git diff --check` for documentation and patch hygiene.

### Where to make common changes

| Change | Work path and checks |
|---|---|
| Add or revise a lesson | Update curriculum data, unique lesson/page IDs, prerequisites, source IDs, and art. Reuse a supported activity renderer or add an explicit branch in the app. Run curriculum/app checks and complete the lesson manually. |
| Rename or remove content | Preserve legacy aliases and assess stored IDs/page completion before editing. A renamed ID can disappear during normalization; aliases alone do not move progress. |
| Change completion or storage | Separate rendering rules from progress helpers, define compatibility behavior, and test fresh, saved, malformed, unavailable, and reset cases. |
| Add a page or route | Add one commented entry to `ROUTES` in `routing/simple-router.js` and a render function for its view in the `views` map in `app.js` `render()`. Run `npm test` (routing compatibility, unit, and app-routing integration tests). |
| Change navigation or layout | Update `NAV_ITEMS`/`ROUTES`, titles, focus behavior, and CSS together. Exercise direct and legacy URLs. |
| Add a public article | Author HTML and metadata, update the SEO registry, connect canonical interactive links, and run SEO checks. Verify both raw and rendered page output. |
| Replace artwork or fonts | Follow the [illustration guide](ILLUSTRATION_STYLE_GUIDE.md), [generation recipe](IMAGE_GENERATION_PROMPTS.md), and [visual inventory](PICKLEBALL_VISUAL_CURRICULUM.md). Keep font licenses and useful alt text. WebP copies exist, but current curriculum references often use PNG; existence alone does not mean optimized assets are served. |

Keep this guide synchronized when routes, schema, deployment configuration, or the validation gate change. Content source review dates describe editorial records; this document does not independently certify the current accuracy of sports rules or linked external sources.
