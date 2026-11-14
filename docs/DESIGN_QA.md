# Learn Pickleball Design QA

## Comparison target

- Source visual truth:
  - `[local review artifact]` — desktop card hierarchy, bold typography, generous whitespace, bright modular color fields.
  - `[local review artifact]` — mobile learning-path progression and persistent bottom navigation.
  - `[local review artifact]` — top-down court geometry.
  - `[local review artifact]` — inclusive, high-energy editorial sports illustration.
- Approved interpretation: synthesize the references into an original lofi product rather than clone any single source.
- Local-only QA evidence (intentionally untracked):
  - `[local review artifact]`
  - `[local review artifact]`
  - `[local review artifact]`
- Combined comparison evidence (intentionally untracked):
  - `[local review artifact]`
  - `[local review artifact]`
  - `[local review artifact]`

## Viewports and normalization

| Comparison | Source pixels | Implementation pixels / CSS viewport | Density handling |
|---|---:|---:|---|
| Desktop home | 1920 × 1320 | 1280 × 900 at 1280 × 900 CSS px | Source aspect-filled and center-cropped to 1280 × 900; both compared at 1×. |
| Mobile path | 1200 × 2596 | 360 × 800 at 360 × 800 CSS px | Source aspect-filled and center-cropped to 360 × 800; both compared at 1×. |
| Court Lab | 474 × 632 | 360 × 800 at 360 × 800 CSS px | Source aspect-fitted and padded to 360 × 800; both compared at 1×. |

States compared: returning-user desktop home, placed learner mobile path before sample completion, and mobile Court Lab after exploring all required zones.

## Fidelity review

- **Fonts and typography:** Heavy display headings, compact metadata, and readable body copy preserve the source hierarchy. System font fallbacks are intentional for a dependency-free lofi build; exact branded Uxcel or Duolingo typography is out of scope.
- **Spacing and layout rhythm:** Desktop keeps large editorial whitespace and modular card regions. Mobile collapses to a single readable column with a fixed four-item bottom navigation. No horizontal overflow was found at 360, 768, or 1280 CSS px.
- **Colors and visual tokens:** Off-white, ink, court green, citrus yellow, coral, sky, and violet are consistently tokenized. Statuses retain text labels, so color is not the only signal.
- **Image quality and asset fidelity:** The original vector athlete scene is sharp at both responsive sizes and follows the inclusive, energetic editorial direction. The interactive court preserves top-down geometry while using the approved provisional palette.
- **Copy and content:** The interface consistently promises a free, 2–3 minute, first-game-ready experience. Locked prerequisites and third-party sources are labeled honestly.
- **Interaction and accessibility:** Placement, path overrides, court hotspots, service and kitchen feedback, quiz pass/fail/retry, resource filters, unknown routes, persistence, reset confirmation, and no-login reward reveals were exercised in the browser. Court hotspots respond to Enter. Sticker reveals use an inert background, a labelled modal, a close action, Escape support, and return focus to main content. Visible interactive targets measured at least 44 px at 360, 768, and 1280 px. Focus styling, semantic headings, accessible names, reduced-motion handling, and non-color status labels are present.

Focused regions were required and compared because progression density and court geometry are too small to judge reliably from the desktop full view alone. The mobile path and Court Lab comparison files provide that evidence.

## Findings and iteration history

- **Iteration 1 — P2: three mobile feature-card links were only 26 px tall.**
  - Fix: changed these links to 44 px inline-flex targets.
  - Post-fix evidence: a browser measurement of all visible links, buttons, selects, and court buttons at 360 px returned no target below 44 px.
- **Iteration 1 — P2: a failed retake after an earlier passing score could visually report the next preview as locked.**
  - Fix: result messaging and status now preserve the previously unlocked state while still reporting the current attempt.
  - Post-fix evidence: a 0/4 retake after a stored 4/4 pass displayed “Your earlier pass still counts” and kept the next preview OPEN.
- No P0 or P1 issues were found.
- **Iteration 2 — P2: generated hero cards extended 2 px past the tablet viewport.**
  - Fix: constrained tablet-only floating-card offsets without changing the desktop composition.
  - Post-fix evidence: `scrollWidth === clientWidth` at 360, 768, and 1280 CSS px.
- Iteration 2 also replaced the coded hero with three original generated pickleball illustrations, added rounded display/body fonts, optional motion, image-supported kitchen questions, and three playable follow-on drills.
- **Iteration 3 — P2: Technique-library artwork inherited its image `height` attribute and was visibly cropped inside card frames.**
  - Fix: each artwork frame now has a stable 16:10 stage and uses `object-fit: contain`, preserving the complete generated teaching set even where source aspect ratios differ.
  - Post-fix evidence: at 360, 1090, and 1280 px, cards had no horizontal overflow and rendered complete contained art.
- **Iteration 3 — P2: level badges looked actionable but were static.**
  - Fix: converted every level badge into a 44 px related-course link and added a text course action to each visual card.
- Post-fix evidence: all 15 cards expose working course routes; the “Start here” control for “Build a ready position” opened the matching course lesson.
- **Iteration 4 — P2: Technique sets with taller source canvases were squeezed into a shared 16:10 frame and had no delivery fallback.**
  - Fix: each visual card now uses its source canvas ratio; a failed WebP request automatically retries with its matching PNG master, then presents an explicit unavailable state if both fail.
  - Post-fix evidence: every one of the 15 delivery images loaded at its native ratio with no browser errors.

## Browser verification

- Happy path passed: Home → Placement → Recommended Path → Sample Lesson → three-zone Court Lab → 4/4 Quiz → unlocked Unit 2 lesson.
- Wrong and correct service-placement feedback passed.
- Wrong and correct kitchen-scenario feedback passed.
- Quiz immediate feedback, perfect-score state, failed retake state, and persistence after reload passed.
- Five curated resources rendered; combined filters produced and recovered from the empty state correctly.
- Unknown-route screen and browser Back behavior passed.
- Reset confirmation was opened and cancelled without clearing the stored QA state.
- Responsive widths 360, 768, and 1280 had matching client and scroll widths.
- Browser console warnings/errors checked after the final reload: none.
- Expanded learning path passed: kitchen quiz → diagonal serve target → two-bounce ordered sequence → doubles-score call → Return & reset lesson.
- Generated kitchen artwork loaded successfully in the authored lesson, and each kitchen quiz question exposed concise image alt text and a visual cue caption.
- Reward loop passed: first-time Court Lab exploration awarded Court Explorer; a 4/4 kitchen check awarded Kitchen Keeper plus Kitchen Ace; serving, two-bounce, score, and guided lessons each awarded their linked sticker and exposed the next step. The collection persisted after reload, while unearned course stickers remained visible as upcoming.
- Reward album responsive checks passed: no horizontal overflow at 360, 768, or 1280 px; the collection used 1, 2, and 3 columns respectively; no visible interactive target measured below 44 px.

## Final result

final result: passed

## Quiet Coach hierarchy and lime refinement — 2 Sep 2026

- Visual references reviewed: `[local review artifact]` and `[local review artifact]` (lesson header and footer states).
- Titles now render at Fredoka 600 with more relaxed wrapping; supporting navigation and button labels are lighter.
- Lime tokens (`#C7F36A`, `#EEF9C6`, `#2A390C`) are used for current markers, instructional highlights, and status cues while green remains the only filled primary CTA.
- Lesson footer state check passed: incomplete required page shows `Mark page complete` plus a quiet continuation hint; completed page shows one `Next` action; optional pages remain non-blocking.
- In-app browser checks passed at 320, 390, 768, 1280, and 1440 px: no horizontal overflow, one visible primary CTA per tested state, and one visible active navigation item.

### Final result

final result: passed

## Illustration-system expansion — 19 Aug 2026

- Added a documented v2 illustration system, locked prompt kernel, evidence labels, file/alt-text conventions, and asset QC checklist.
- Added a sourced visual-curriculum inventory spanning equipment, grips, stances, footwork, strokes, advanced play, common habits, attire, partner positioning, safety, rules, etiquette, and adaptive play.
- Generated and visually inspected 15 original instructional sets. Full-resolution PNG masters remain in `assets/illustrations/`; 1280 px WebP delivery assets total approximately 1 MB.
- The live `#/skills` route exposes all 15 sets, 12 category filters, accessible alt text, non-color evidence labels, review dates, and direct source links.
- Category-filter test passed: selecting Safety rendered exactly “Dress for the court, not the photo” and “Prepare, pace, and recover”; selecting All restored all 15.
- All 15 lazy-loaded WebP images completed with non-zero natural dimensions and no broken sources after a full-page scroll.
- `node --check app.js` passed and all 15 illustration data references resolved to files.
- Browser route checks passed for Home, Placement, Learn, Technique, Court Lab, Resources, Progress, and the unknown-route state.
- Responsive measurements passed:
  - 360 px: one 328 px card column, 44 px filter buttons, 55 px bottom-navigation targets, no horizontal overflow.
  - 768 px: two 357 px card columns, mobile bottom navigation, no horizontal overflow.
  - 1280 px: two-column library, full desktop navigation, no horizontal overflow.
- Temporary viewport overrides were reset after verification.

## Quiet Coach v2 curriculum implementation — 1 Sep 2026

### Source and implementation evidence

- **Source visual target:** `design-review/refined-plan.png` — approved Quiet Coach Learn-path mock at 1440 × 1024.
- **Implementation render:** `/private/tmp/learn-v2-plan-1440.png` — fresh-v2 Learn route at the same 1440 × 1024 viewport.
- **Combined comparison:** `/private/tmp/design-qa-compare-final.png` — source and browser-rendered implementation examined side by side in one input.
- **App-wide captures:** `design-review/current-v2/desktop/` at 1280 px and `design-review/current-v2/mobile/` at 390 px. The seven route states are Learn, Practice, Court Lab, Library, Progress, a variable-depth lesson, and a public rule guide.

| Surface | Dimensions / state | Result |
|---|---|---|
| Quiet Coach comparison | 1440 × 1024, fresh Learn path | Passed: warm paper, Fredoka/Nunito hierarchy, hairline dividers, open path rows, and contained four-player stance illustration match the approved direction. |
| Responsive app shell | 320, 390, 768, 1280, 1440 CSS px | Passed: no horizontal overflow, one visible active navigation item, and no content-ending overlap with the fixed mobile navigation. |
| 2× reflow proxy | 640 CSS px narrow-layout proxy | Passed: Library filters wrap, lesson shell reflows, and Court Lab controls remain labelled. |
| Public SEO pages | Five pages at the same five widths | Passed: canonical metadata, source/review labels, public nav, and revised canonical lesson CTAs remain present. |

### Interaction and accessibility verification

- All 29 canonical lesson routes rendered; 20 are core and nine are optional deep dives. Required retrieval checks gate **Concept understood**; practice and reading-only routes remain non-blocking.
- Fresh v2 storage uses `learn-pickleball:v2`; a v1-only store is ignored, and reset leaves v1 untouched.
- All legacy lesson aliases resolve. `#/skills` opens Visual skills, `#/resources` opens Rules & guides, and `#/achievements` opens Progress.
- Court Lab retains labelled keyboard-accessible SVG zones. Visiting kitchen, service, and baseline now opens a separate Court check; the correct diagonal-service answer unlocks the return-to-lesson action and Court Explorer reward. Serve and kitchen feedback both remain available.
- At 390 px, the fixed bottom navigation intersects the long court while the page is at its initial scroll position, but the lower baseline was scrolled into a fully visible, clickable region above the navigation; it is not unreachable or permanently covered. All four Court Lab tabs fit without clipping.
- Keyboard Enter/Space still activates SVG zones. Focus rings, textual equivalents, non-color statuses, 44 px controls, reduced-motion rules, and source labels were confirmed in the rendered app.
- Browser console error check after the final responsive pass returned no errors.

### Findings and final pass

- **Resolved P2 — Learn hero was using the rally image and inherited figure spacing in the initial comparison.** The final implementation uses the approved four-player stance asset, zero figure margin, surface background, and `object-fit: contain`. The post-fix side-by-side comparison above confirms complete artwork with the intended quiet composition.
- **Resolved P1 — Court Lab previously unlocked after zone visits alone.** Completion now requires both the three required zones and the explicit Court check; its success writes the activity attempt, marks the Court Lab lesson page complete, and exposes the contextual return link.
- **Resolved P2 — Legacy Resources and sitemap review consistency.** Resources now defaults to Rules & guides, all SEO page `lastmod` values match 2026-09-01, and each public page carries the matching source/review date.
- No open P0, P1, or P2 issues remain. The deliberate differences from the static mock are the fresh-progress state and the mobile five-area navigation, both required by the approved product plan.

### Final result

final result: passed
