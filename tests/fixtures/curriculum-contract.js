/*
 * Curriculum contract: the ids and labels other code depends on.
 *
 * - Lesson, page and activity ids are persisted in learners' localStorage
 *   progress, and legacy ids still arrive through old links, so they must stay
 *   stable even when the curriculum data moves to a new source.
 * - Labels are short, user-facing choice/citation names that are treated as
 *   stable. Titles, summaries and body copy are deliberately NOT part of the
 *   contract; they are edited often.
 *
 * This file is the single place to update when the curriculum's ids or labels
 * change on purpose. Tests compare against it, not against the data source.
 */

export const units = [
  { id: "unit-1", number: 1, lessonIds: ["court-orientation", "equipment-safety", "ready-position", "kitchen-rule"] },
  { id: "unit-2", number: 2, lessonIds: ["serve-legally", "serve-placement", "two-bounce-opening", "opening-rally"] },
  { id: "unit-3", number: 3, lessonIds: ["doubles-scoring", "rotation-positions", "side-outs-formats"] },
  { id: "unit-4", number: 4, lessonIds: ["groundstrokes", "volleys", "dinks", "transition-movement", "drop-reset"] },
  { id: "unit-5", number: 5, lessonIds: ["partner-communication", "fair-calls", "open-play", "first-game-rehearsal"] },
  { id: "unit-6", number: 6, lessonIds: ["serve-return-purpose", "third-shot-choice", "dink-placement", "pace-reset-response", "transition-pressure"] },
  { id: "unit-7", number: 7, lessonIds: ["partner-systems", "lobs-overheads", "formats-inclusive", "match-review"] },
];

export const lessonIdsInPathOrder = units.flatMap((unit) => unit.lessonIds);

// Units 6 and 7 are optional deep dives; units 1–5 are the core path.
export const deepDiveUnitIds = ["unit-6", "unit-7"];
export const deepDiveLessonIds = units
  .filter((unit) => deepDiveUnitIds.includes(unit.id))
  .flatMap((unit) => unit.lessonIds);

export const entryRoutes = [
  { id: "never-played", label: "I have never played" },
  { id: "first-game-essentials", label: "I need to play soon" },
  { id: "consistency", label: "I play but lack consistency" },
  { id: "specific-answer", label: "I want a specific answer" },
];

export const playlists = {
  "first-game-essentials": [
    "court-orientation",
    "equipment-safety",
    "ready-position",
    "kitchen-rule",
    "serve-legally",
    "two-bounce-opening",
    "opening-rally",
    "doubles-scoring",
    "rotation-positions",
    "fair-calls",
    "first-game-rehearsal",
  ],
};

export const sources = [
  { id: "R1", label: "Official rule · USA Pickleball rules hub" },
  { id: "R2", label: "Official rule · 2026 rule changes" },
  { id: "R3", label: "Official rule · Global Pickleball Federation" },
  { id: "R4", label: "Governing-body guidance · Skill Level One" },
  { id: "R5", label: "Governing-body guidance · Beginner fundamentals" },
  { id: "R6", label: "Official rule / positioning guide" },
  { id: "R7", label: "Governing-body guidance · Sportsmanship" },
  { id: "R8", label: "Coaching guidance · Return and positioning" },
  { id: "R9", label: "Coaching guidance · Third shot" },
  { id: "R10", label: "Coaching guidance · Reset shot" },
  { id: "R11", label: "Official rule · Wheelchair and adaptive play" },
  { id: "R12", label: "Governing-body guidance · Skill Level Three" },
  { id: "R13", label: "Governing-body guidance · Skill Level Four" },
  { id: "C1", label: "Coach education · IPTPA" },
  { id: "C2", label: "Coach education · PCI" },
  { id: "P1", label: "Professional coaching perspective · Simone Jardim" },
  { id: "B1", label: "Book · Pickleball Fundamentals, 2nd ed." },
  { id: "B2", label: "Book · The Art of Pickleball" },
  { id: "L1", label: "Learning research · motor learning" },
  { id: "L2", label: "Learning research · retrieval practice" },
  { id: "L3", label: "Learning research · test-enhanced learning" },
  { id: "L4", label: "Learning research · predictable to variable practice" },
  { id: "H1", label: "Safety guidance · adult pickleball injuries" },
  { id: "H2", label: "Safety guidance · older adult players" },
];

export const libraryEntries = [
  { id: "court-guide", lessonId: "court-orientation" },
  { id: "kitchen-guide", lessonId: "kitchen-rule" },
  { id: "serve-guide", lessonId: "serve-legally" },
  { id: "two-bounce-guide", lessonId: "two-bounce-opening" },
  { id: "score-guide", lessonId: "doubles-scoring" },
  { id: "calls-guide", lessonId: "fair-calls" },
  { id: "adaptive-guide", lessonId: "open-play" },
  { id: "safety-guide", lessonId: "equipment-safety" },
  { id: "third-shot-guide", lessonId: "third-shot-choice" },
  { id: "formats-guide", lessonId: "formats-inclusive" },
];

export const refresherTopics = [
  { guideId: "serve-guide", pageId: "legal-serve-check" },
  { guideId: "two-bounce-guide", pageId: "opening-recall" },
  { guideId: "kitchen-guide", pageId: "kitchen-decisions" },
  { guideId: "score-guide", pageId: "score-call" },
];

export const instructionalPlates = [
  { lessonId: "serve-placement", pageId: "target-ladder", label: "Serve depth plate" },
  { lessonId: "third-shot-choice", pageId: "worked-compare", label: "Third-shot choice plate" },
  { lessonId: "pace-reset-response", pageId: "four-intentions", label: "Pace and reset plate" },
  { lessonId: "partner-systems", pageId: "switch-stack-poach", label: "Partner systems plate" },
];

// Old lesson ids from v1 links. A string maps straight to one lesson; an
// object sends the learner to the first unfinished lesson, then the default.
export const legacyAliases = {
  "court-kitchen": { defaultLessonId: "court-orientation", unfinished: ["court-orientation", "kitchen-rule"] },
  "gear-grip": { defaultLessonId: "equipment-safety", unfinished: ["equipment-safety", "ready-position"] },
  "ready-position": "ready-position",
  "serve-basics": { defaultLessonId: "serve-legally", unfinished: ["serve-legally", "serve-placement"] },
  "two-bounce": { defaultLessonId: "two-bounce-opening", unfinished: ["two-bounce-opening", "opening-rally"] },
  "return-reset": { defaultLessonId: "two-bounce-opening", unfinished: ["two-bounce-opening", "drop-reset"] },
  "doubles-score": "doubles-scoring",
  "side-out": { defaultLessonId: "rotation-positions", unfinished: ["rotation-positions", "side-outs-formats"] },
  "dink-volley": { defaultLessonId: "volleys", unfinished: ["volleys", "dinks"] },
  "court-position": { defaultLessonId: "transition-movement", unfinished: ["transition-movement", "partner-communication"] },
  "faults-calls": "fair-calls",
  "open-play": "open-play",
  "game-ready": "first-game-rehearsal",
};

// Ids that look like lookups but are not lessons or aliases. Includes names
// inherited from Object.prototype, which can arrive from a hand-typed URL.
export const unknownIds = ["", "unknown-lesson", "Court-Orientation", "unit-1", "R1", "court-guide", "constructor", "toString", "__proto__", "hasOwnProperty"];
