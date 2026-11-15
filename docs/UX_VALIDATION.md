# UX validation plan

The feedback in `design-review/synthetic-feedback.md` is synthetic. The following sessions are intended to gather real evidence; no sessions or results are claimed here. The local review file may not exist in a clean checkout. See [UI/UX recommendations](UI_UX_RECOMMENDATIONS.md) for the decisions and hypotheses.

## Before the sessions

- Recruit people with different levels of pickleball experience, including first-time and returning learners. Include participants who use a keyboard, enlarged text, or a screen reader when possible. Ask about access needs rather than assuming them from age.
- Use a test build and a disposable browser profile. Prepare fresh, partially completed, and completed progress states. Keep any test data separate from a participant's own progress.
- Record the build or commit, device, browser, zoom, input method, and the progress state used for each task. Obtain consent before recording and avoid collecting unnecessary personal information.
- Keep consent forms, recordings, identifiable notes, and raw participant data outside this repository. Only publish anonymized summaries when they are appropriate to share.
- Have participants think aloud if comfortable. Do not point out controls or teach the interface during the task; record any assistance separately.

## P1 tasks

Give each participant the task in their own words without naming the screen or button. Observe completion, wrong turns, hesitation, assistance, and what they say they expect. Ask about confidence after each task; record elapsed time if useful, without treating speed as the only measure of success.

| Scenario | Task | Evidence to capture |
| --- | --- | --- |
| Returning learner, partial progress | Continue learning where you left off. Explain what will be saved and how long the lesson might take. | Destination, understanding of browser-only storage and next incomplete required page, and expectations of the displayed estimate. |
| First-time learner | Find the kitchen rule and explain where to check its source. | Search terms, whether the summary answers the question, source discovery, and understanding of a gated full lesson. |
| Partial progress | Find and revisit a completed lesson, then return to the path. | Whether review is found, focus and open-unit behavior, and whether completion remains intact. |
| Lesson with a check | Complete a reading page, answer a question incorrectly and then correctly, and continue. | Orientation after each change, perception of feedback and page heading, and ability to operate and dismiss a keepsake dialog. |
| Small screen or enlarged text | Find scoring information and navigate back to learning. | Clipped or obscured content, horizontal scrolling, keyboard focus, and effort required to use controls. |

For duration estimates, separately measure complete lessons with consenting learners and record optional practice and interruptions. Do not present the current ranges as validated until enough observations support a content-owner review.

## P2 comparison

Test practical-goal discovery and the optional Atlas as prototypes before committing to production. Compare each prototype with the existing Learn list. Keep the same curriculum, progress state, tasks, and device conditions, and vary the presentation order between participants to reduce learning effects. The existing Court Atlas image is an older, five-unit static mock; the seven-unit interactive study variant below is the test condition. No real-participant or screen-reader results are claimed.

### Conditions and setup

| Condition | Minimum testable experience | Starting point |
| --- | --- | --- |
| A: current experience | Current Learn, placement, Library, and lesson destinations. | `/?study=baseline#/learn` |
| B: practical-goal discovery prototype | Learn entry points for the existing first-game and consistency routes, plus skill discovery by situation with existing level guidance. | `/?study=discovery#/learn` |
| C: optional Atlas prototype | An optional seven-unit illustrated overview with an ordered text structure and lesson destinations. The normal expandable path remains available. | `/?study=atlas#/learn` |

Test A against B for the first two tasks and A against C for the orientation tasks. Do not compare a working destination in A with a dead end in B or C and interpret that as a design failure. If a prototype simulates a destination, use equivalent content and record the simulation; do not claim it verifies real progress or prerequisites. Record the build or prototype version for each condition. The current entry routes and lesson IDs are in [curriculum.js](../content/curriculum.js); the Atlas must represent all seven current units rather than the older mock's five.

Use the repository's documented local server, `python3 -m http.server 4173 --bind 127.0.0.1`, and append each path above to `http://127.0.0.1:4173`. The query parameter precedes the hash and stays in place during in-app navigation. The variants use `learn-pickleball:study:baseline:v2`, `learn-pickleball:study:discovery:v2`, and `learn-pickleball:study:atlas:v2`, with separate session disclosure keys. They do not read or reset the normal `learn-pickleball:v2` key. An absent or unrecognized condition uses the normal app.

Use disposable browser profiles or resettable test fixtures. For a fresh state, open each condition, use Progress → Reset this device’s v2 learning progress, and confirm. For a partial fixture, complete the same required pages in each condition; alternatively, in a disposable profile on the same origin, copy the study key created for one condition to the other study keys using browser developer tools, then reload each condition and verify visible lesson availability. Copy only between the three study keys, never from or to the normal v2 key. Reset also clears that condition's session-only unit disclosure choices. Do not use the participant's regular browser profile.

The first-game route begins with `court-orientation`; the consistency check recommends Unit 4 or 6 depending on answers and is not a rating. The current app may gate a full lesson; reaching and understanding that gate can be a valid outcome for a topic-finding task. The variants are functional research interfaces, not validated production features. Reaching an Atlas lesson uses the same prerequisite gates as the current path.

Alternate the order across sessions (A then B/C for one participant; B/C then A for the next). Use comparable task prompts and topic pairs in the second condition to reduce memory effects. Record condition order and any facilitation; this small exploratory comparison will not remove all learning effects. Pilot the procedure before recruiting the main sessions.

### Moderator task cards

Read only the prompt and scenario to participants; the checks are for the moderator. Start each task at the assigned Learn entry. Stop on completion, when the participant gives up, or after a consistent pre-agreed time limit. If assistance is needed, record the point and exact hint; do not count an assisted completion as independent success.

| Task and scenario | Participant prompt | Independent success and observations |
| --- | --- | --- |
| First game, fresh state | “You are playing for the first time soon. Find a suitable way to prepare and tell me what you would start with.” | Finds First Game Essentials or an equivalent explicit route and identifies court orientation as the first lesson. Record alternative routes and expectations, including the fact that the existing time estimate has not been validated. |
| Consistency, returning state | “You have played a few times but your shots are inconsistent. Find a way to decide what to work on next.” | Finds the consistency check and understands it suggests a focus rather than awarding a rating. Record whether the result is Unit 4 or 6 and whether the participant can explain the next step. |
| Skill discovery, returning state | “You want help with a ball that is hard to attack. Find a relevant lesson or practice idea.” | Reaches a relevant reset or drop lesson, or its understandable prerequisite gate. Record search terms, wrong turns, and whether the gate makes sense. |
| Course orientation, fresh state | “Find where you would learn about scoring, then find where you would learn about playing with others. Explain where those fit in the course.” | Finds both topics and describes their relative positions using the displayed seven-unit sequence. Record confusion about unit order or status. Use a different equivalent topic pair for the second condition. |
| Accessible orientation | Repeat an orientation task at a narrow viewport and with prototype images unavailable; use the participant's preferred input and access settings. | Finds the topics using text and controls, without relying on an image. Record overflow, blocked controls, focus order, and any assistance. Keyboard observations do not substitute for screen-reader testing. |

The P2 prototype must not modify real progress during these sessions unless it is specifically built and checked for that purpose. Separately, in the current app and any functional implementation, compare a disposable profile's `learn-pickleball:v2` progress before and after changing placement: previously completed pages and concept status must remain intact, and the new route must not mark foundations complete. Placement fields and route selection are expected to change. Do not infer this persistence behavior from a static mock.

### Session record

Copy this template for each task and condition. Use a participant code rather than a name in shared notes.

```text
Participant code / date:
Build or prototype / condition / order:
Device, browser, viewport or zoom, input and access settings:
Progress fixture / task:
Outcome: independent / assisted / incomplete / not run
Time to outcome (optional):
Destination and path taken:
Wrong turns, hesitation, accessibility barriers, or exact assistance:
Participant explanation and confidence:
Observation versus facilitator interpretation:
Follow-up or prototype limitation:
```

After sessions, compare independent completions and observed barriers by task and condition; preserve individual context and do not turn a few sessions into a numerical claim of superiority. Retain the list as the default unless evidence supports improved orientation without reduced task success or unresolved accessibility barriers. Revise and retest if findings conflict or a prototype limitation affected a result. Treat a small exploratory study as directional evidence, not a statistical proof.

## Record and act on findings

For each observation, note the task, build, conditions, what happened, impact, and whether the participant needed help. Separate observed behavior from interpretation. Group recurring issues, identify conflicting observations, and decide whether to revise, retest, or defer each proposal. Screen-reader testing requires an actual screen reader and user interaction; keyboard or automated checks alone do not establish screen-reader usability.
