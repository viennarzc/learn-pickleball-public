# UI/UX recommendations

Updated: 2026-11-12. Status: P1 is implemented; P2 has opt-in research prototypes, and P3 remains a proposal. Real-user, screen-reader, and duration validation remain outstanding.

## Basis and recommendation

The input is the local `design-review/synthetic-feedback.md`, particularly its five audience perspectives and reviewers 01–10. Those reactions are **synthetic hypotheses**, not interviews, observed usability results, or evidence of audience-wide preferences. That review compared earlier five-unit mockups; the current implementation has seven units, 29 lessons, and 20 core lessons. Use the current code as the implementation baseline.

**Recommend a hybrid, evolved from the current app:** Next Point's focused returning-user entry, Quiet Coach's expandable learning plan, and an optional Court Atlas overview for exploration. Keep direct access to lookup, practice, and completed lessons. Do not rebuild navigation around a single recommended activity.

| Direction | Best modeled fit | Tradeoff | Recommended role |
|---|---|---|---|
| Quiet Coach | QA, returning beginners, learners wanting context | A full syllabus can distract from the next action | Default Learn screen and semantic foundation |
| Court Atlas | Exploratory students and deeper study | Highest responsive, image-weight, and spatial-accessibility cost | Optional overview, after task-based validation |
| Next Point | Senior beginners and time-constrained learners | Can hide breadth, review, and urgent lookup | Returning home with visible full-path and lookup alternatives |

The source feedback remains a local review artifact and may not be present in a clean checkout. The decisions and rationale below are self-contained; no new dependency on those artifacts is required.

## What already exists

Inspection of [app.js](../app.js), [curriculum](../content/curriculum.js), and [progress storage](../content/progress.js) confirms:

- Home shows the recommended lesson's outcome, estimated duration, and Start or Resume action together after route selection, alongside full-path and lookup links. A separate strip repeats the duration. There is no separate Today route.
- Learn uses native expandable units with textual statuses, session-only disclosure choices, a Continue action, and a completed-lessons review entry.
- Library has search, topic filters, Visual skills and Rules & guides views, and explicit sourced summaries available before a full lesson is unlocked. Lesson pages expose sources and review dates.
- Placement already offers first-game essentials, beginner, consistency, and direct-lookup routes. Its diagnostic recommends Unit 4 or 6; this is self-placement, not a proficiency certification.
- Required-page completion and attempts persist locally. Optional practice is tracked separately. Lesson interactions restore focus to the current feedback or next content, with keepsake dialogs taking priority. Legacy lesson links resolve, but older progress is not migrated to v2.

These are foundations to refine, not missing features to recreate. The presence of code does not establish usability or accessibility compliance.

## Prioritized solutions

Priorities: **P1** = next improvement cycle; **P2** = follow after validation of P1; **P3** = prototype or research before committing to production. Rows 1–6 describe the implemented P1 direction; rows 7–8 have research prototypes only, and rows 9–10 remain proposals. Implementation does not establish usability or accessibility compliance.

| # / priority | Problem and feedback basis | Proposed solution | Tradeoff and dependencies | Concrete validation |
|---|---|---|---|---|
| 1 · P1 | Learners want one clear action without losing breadth (03, 07, 08). | Refine existing returning home: place outcome, actual duration range, and Start/Resume together. Keep View full path and Find a rule or skill as quiet actions. Use current next-lesson selection; keep a useful review/library state when nothing remains. | Retains navigation and avoids a new Today route. Depends on reliable completion and duration data; never hard-code “six minutes.” | Fresh, partial, playlist, diagnostic, and all-complete states show one primary action. Ask learners to resume and explain the expected time before clicking. |
| 2 · P1 | Full-path context and repetition must remain easy (01, 04, 08). | Keep native unit disclosures; compact the introductory hero so the current unit is easier to reach. Add a clear Review completed lessons entry and preserve the user's expanded units when returning from a lesson. | More state to maintain; scope disclosure state to the session initially. Preserve textual statuses and deep links. | Open two units, review a completed lesson, return, and verify expansion and focus. Check that reviewing never reduces completion. |
| 3 · P1 | Enlarged text and mobile use can expose hidden actions or cramped labels (01–05). | Target 18px instructional/supporting copy, 44px interactive targets, clear Back/Next/Repeat labels, and vertical mobile layouts. Reduce oversized headings before reducing body text. Keep explanations beside images and essential status in words. | More vertical content is acceptable; avoid sticky controls that obscure the last answer. Requires keyboard, zoom, and screen-reader testing, not visual judgment alone. | Test 320px, 390px, tablet portrait/landscape, desktop at 200% zoom, keyboard-only use, and reduced motion. No clipped controls or page-level horizontal scrolling; verify dialog focus and completion announcements. |
| 4 · P1 | Urgent lookup should not require following the whole path (06, 09, 10). | Expose Find a rule or skill from Learn, retain Library search, and add familiar topic terms to course-oriented labels. Make rule summaries useful before a gated full lesson; label that distinction. Add visible clear-search/filter actions and result counts. | Search can dominate the page if overemphasized. Reuse the existing source register and Library entries; do not silently bypass lesson completion gates. | From Learn, find kitchen momentum and doubles scoring without completing prerequisites. Test no results, filter switching, keyboard focus, and return from a result. |
| 5 · P1 | Trust depends on realistic time and persistence promises (02, 07). | State that progress is saved in this browser, without sync. Preserve recorded pages and attempts; describe Resume as continuing at the next incomplete required page. Test durations with learners and revise estimates. | Page-level persistence is not a full interaction snapshot. Do not promise every selection or exact position survives. Storage schema changes require explicit compatibility handling. | Complete a page, reload, and resume; repeat with unavailable/corrupt storage. Verify the fallback notice and compare measured lesson times with displayed ranges. |
| 6 · P1 | Rules and coaching advice can look equally authoritative (10). | Standardize evidence type, named source link, and reviewed date across detail views. Replace generic Open source wording with the source name where practical; explain level labels in plain language. | More metadata can distract; keep it compact but available as text. Requires content-owner review of claims and dates, not merely a UI restyle. | Ask learners to distinguish an official rule from coaching guidance and locate its source. Check missing-source handling and readable metadata at zoom. |
| 7 · P2 | Practical goals and advanced study are easy to overlook (08, 09). | Surface the existing first-game route and consistency placement from Learn. Add level/situation discovery to Library and explicit related drills/common mistakes where content supports them. | Additional choices increase scanning. Reuse the existing four entry routes; defer formal test-out claims until an assessment is validated. | Compare first-game preparation and intermediate reset/partner-play tasks. Confirm placement changes do not mark foundations completed or erase earlier progress. |
| 8 · P2 | Exploration benefits from a visual overview (02, 05, 09). | Prototype an optional Atlas view using all seven current units. Use a vertical illustrated journey on mobile and an equivalent ordered text structure. Retain the expandable list as the default. | Largest image/performance and responsive cost. Requires a visual prototype and user testing before production; reuse existing art and reserve image space. | Compare topic-finding and course-orientation tasks against the list. Test slow/failed images and small screens; retain the Atlas only if it improves orientation without reducing task success. |
| 9 · P3 | Learners may want to save references and compare mechanics (07, 09, 10). | Prototype local bookmarks with a Saved view, then a two-item technique comparison with stacked mobile captions. Keep Save distinct from completed or understood. | Adds persistence, removal, empty-state, and content-pairing work. No account or sync is implied. Validate demand before changing the storage model. | Ask returning learners to retrieve a saved rule and explain a movement difference. Test deleted/renamed content IDs, keyboard use, and stacked reading order. |
| 10 · P3 | Some beginners may benefit from audio or alternative instruction (senior segment, 03). | Trial optional user-initiated narration for one lesson, with equivalent text and captions for any video. Retain untimed, manually advanced instruction. | Requires editorial/audio maintenance and accessible controls. Avoid autoplay and a new media platform until the benefit is demonstrated. | Test with learners who use enlarged text or prefer listening. Verify pause/replay, transcript equivalence, and completion without audio. |

## Delivery and research sequence

Use the [UX validation plan](UX_VALIDATION.md) to run the tasks and record evidence before deciding whether to ship P2.

1. Establish a baseline with the same five tasks: resume, find a rule/skill, explain progress/locks, revisit a completed lesson, and use the experience on a small phone or at 200% zoom. Include beginner, returning, time-constrained, and advanced participants; do not treat age as a proxy for ability.
2. Deliver P1 in small changes, preserving routes and existing v2 data. Compare task success, hesitation, wrong turns, time to action, and confidence against the baseline. Prefer task evidence over mock preference voting.
3. Validate P2 prototypes before adding another persistent screen or discovery system. Keep P3 separate from launch requirements.
4. Before each release, run the repository checks and a browser state matrix: empty, partial, locked, complete, missing-image, storage-unavailable, invalid deep-link, and interrupted-session cases. Include focus, screen-reader announcements, and reduced motion. Set an image/interaction performance baseline before introducing Atlas assets.

**Success criterion:** learners can start or resume with one primary action, reach lookup and completed material without hunting, understand the state and evidence, and finish the same tasks at enlarged text sizes. Synthetic feedback sets the questions; real task performance decides which changes remain.
