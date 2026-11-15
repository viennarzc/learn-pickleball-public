import assert from "node:assert/strict";
import test from "node:test";
import {
  APP_VERSION,
  COURT_ZONES,
  STORE_KEY,
  STUDY_CONDITIONS,
  clearProgress,
  createFreshProgress,
  getLessonProgress,
  loadProgress,
  normalizeProgress,
  progressKey,
  recordAttempt,
  recordPage,
  recordPractice,
  saveProgress,
  studyCondition,
} from "../content/progress.js";

const lessonIds = new Set(["court-orientation", "equipment-safety"]);

function withLocalStorage(localStorage, callback) {
  const previousWindow = globalThis.window;
  globalThis.window = { localStorage };

  try {
    callback();
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
}

test("study conditions and storage keys keep their existing public values", () => {
  const supportedConditions = [
    [STUDY_CONDITIONS.BASELINE, "baseline"],
    [STUDY_CONDITIONS.DISCOVERY, "discovery"],
    [STUDY_CONDITIONS.ATLAS, "atlas"],
  ];

  assert.equal(STORE_KEY, "learn-pickleball:v2");

  for (const [condition, value] of supportedConditions) {
    assert.equal(studyCondition(`?study=${value}`), condition);
    assert.equal(progressKey(condition), `learn-pickleball:study:${value}:v2`);
  }

  assert.equal(studyCondition(""), null);
  assert.equal(studyCondition("?study=unknown"), null);
  assert.equal(progressKey(null), STORE_KEY);
});

test("fresh progress objects have independent nested state", () => {
  const first = createFreshProgress();
  const second = createFreshProgress();

  recordPage(first, "court-orientation", "why-court");
  first.placementAnswers.goal = "first-game";
  getLessonProgress(first, "equipment-safety").requiredPages.push("safe-court");

  assert.deepEqual(second.lessonProgress, {});
  assert.deepEqual(second.placementAnswers, {});
});

test("normalization filters lesson and court-zone data and enforces the court gate", () => {
  const normalized = normalizeProgress({
    version: APP_VERSION,
    lessonProgress: {
      "court-orientation": {
        requiredPages: ["why-court", "why-court"],
        optionalPages: ["court-reference", "court-reference"],
        attempts: { "court-recall": { count: 2, correct: true } },
        conceptUnderstood: true,
        practiceLogs: [],
      },
      "removed-lesson": { requiredPages: ["old-page"] },
    },
    courtVisited: [
      COURT_ZONES.KITCHEN,
      "unknown-zone",
      COURT_ZONES.KITCHEN,
      COURT_ZONES.BASELINE,
    ],
    courtKnowledgePassed: true,
    courtExplored: true,
  }, lessonIds);

  assert.deepEqual(normalized.lessonProgress["court-orientation"].requiredPages, ["why-court"]);
  assert.deepEqual(normalized.lessonProgress["court-orientation"].optionalPages, ["court-reference"]);
  assert.equal(normalized.lessonProgress["court-orientation"].conceptUnderstood, true);
  assert.deepEqual(normalized.courtVisited, [COURT_ZONES.KITCHEN, COURT_ZONES.BASELINE]);
  assert.equal(normalized.courtExplored, false);
  assert.equal(Object.hasOwn(normalized.lessonProgress, "removed-lesson"), false);
  assert.deepEqual(normalizeProgress({ version: APP_VERSION - 1 }, lessonIds), createFreshProgress());

  const completeCourt = normalizeProgress({
    version: APP_VERSION,
    courtVisited: Object.values(COURT_ZONES),
    courtKnowledgePassed: true,
    courtExplored: true,
  }, lessonIds);
  assert.equal(completeCourt.courtExplored, true);

  const missingMapCheck = normalizeProgress({
    version: APP_VERSION,
    courtVisited: Object.values(COURT_ZONES),
    courtKnowledgePassed: false,
    courtExplored: true,
  }, lessonIds);
  assert.equal(missingMapCheck.courtExplored, false);
});

test("page completion separates required and optional pages and avoids duplicates", () => {
  const progress = createFreshProgress();
  const lesson = getLessonProgress(progress, "court-orientation");

  recordPage(progress, "court-orientation", "why-court");
  recordPage(progress, "court-orientation", "why-court");
  recordPage(progress, "court-orientation", "court-reference", { required: false });

  assert.deepEqual(lesson.requiredPages, ["why-court"]);
  assert.deepEqual(lesson.optionalPages, ["court-reference"]);
});

test("attempt counts increase while a correct result remains recorded", () => {
  const progress = createFreshProgress();

  recordAttempt(progress, "court-orientation", "court-recall", false);
  recordAttempt(progress, "court-orientation", "court-recall", true);
  const finalAttempt = recordAttempt(progress, "court-orientation", "court-recall", false);

  assert.deepEqual(finalAttempt, { count: 3, correct: true });
});

test("practice is recorded in both logs without completing the lesson", () => {
  const progress = createFreshProgress();
  const entry = recordPractice(progress, "court-orientation", "reading-only");

  assert.equal(progress.practiceLogs[0], entry);
  assert.equal(getLessonProgress(progress, "court-orientation").practiceLogs[0], entry);
  assert.equal(Number.isNaN(Date.parse(entry.at)), false);
  assert.equal(getLessonProgress(progress, "court-orientation").conceptUnderstood, false);
});

test("storage helpers round-trip progress and handle storage failures", () => {
  const values = new Map();
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };

  withLocalStorage(localStorage, () => {
    const progress = createFreshProgress();
    recordPage(progress, "court-orientation", "why-court");
    assert.equal(saveProgress(progress), true);
    assert.deepEqual(loadProgress(lessonIds), progress);
    assert.equal(clearProgress(), true);
    assert.equal(values.has(STORE_KEY), false);
  });

  const unavailableStorage = {
    getItem() { throw new Error("storage unavailable"); },
    setItem() { throw new Error("storage unavailable"); },
    removeItem() { throw new Error("storage unavailable"); },
  };

  withLocalStorage(unavailableStorage, () => {
    assert.deepEqual(loadProgress(lessonIds), createFreshProgress());
    assert.equal(saveProgress(createFreshProgress()), false);
    assert.equal(clearProgress(), false);
  });
});
