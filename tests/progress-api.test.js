import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  APP_VERSION,
  COURT_ZONES,
  STORE_KEY,
  STUDY_CONDITIONS,
  clearProgress,
  createFreshProgress,
  getLessonProgress,
  loadProgress,
  progressKey,
  recordAttempt,
  recordPage,
  saveProgress,
} from "../content/progress.js";

const LESSON = "court-orientation";
const OTHER_LESSON = "equipment-safety";
const lessonIds = new Set([LESSON, OTHER_LESSON]);
const studyKey = progressKey(STUDY_CONDITIONS.DISCOVERY);
const emptyLesson = Object.freeze({
  requiredPages: [],
  optionalPages: [],
  attempts: {},
  conceptUnderstood: false,
  practiceLogs: [],
});

// --- Test doubles -------------------------------------------------------------

// In-memory localStorage that behaves like the browser API (string values, null
// for missing keys) and records which keys were touched.
function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  const calls = [];
  return {
    values,
    calls,
    getItem(key) {
      calls.push(["getItem", key]);
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      calls.push(["setItem", key]);
      values.set(key, String(value));
    },
    removeItem(key) {
      calls.push(["removeItem", key]);
      values.delete(key);
    },
  };
}

// localStorage that throws on every call, like Safari private mode or a full quota.
function createFailingStorage(error = new DOMException("quota exceeded", "QuotaExceededError")) {
  const fail = () => { throw error; };
  return { getItem: fail, setItem: fail, removeItem: fail };
}

const originalWindow = globalThis.window;

function installWindow(windowValue) {
  if (windowValue === undefined) delete globalThis.window;
  else globalThis.window = windowValue;
}

function restoreWindow() {
  installWindow(originalWindow);
}

function useStorage(storage) {
  installWindow({ localStorage: storage });
  return storage;
}

function savedProgressWith(overrides = {}) {
  return { ...createFreshProgress(), ...overrides };
}

// Read helpers fail with a clear message instead of a TypeError when nothing was stored.
function storedLesson(progress, lessonId) {
  assert.ok(Object.hasOwn(progress.lessonProgress, lessonId), `lesson "${lessonId}" was not stored on progress`);
  return progress.lessonProgress[lessonId];
}

function readSaved(storage, key = STORE_KEY) {
  assert.ok(storage.values.has(key), `nothing was saved under "${key}"`);
  return JSON.parse(storage.values.get(key));
}

// --- Storage -------------------------------------------------------------------

describe("loadProgress", () => {
  let storage;
  beforeEach(() => { storage = useStorage(createMemoryStorage()); });
  afterEach(restoreWindow);

  it("returns fresh progress when nothing has been saved yet", () => {
    assert.deepEqual(loadProgress(lessonIds), createFreshProgress());
  });

  it("reads from the default store key when no key is given", () => {
    loadProgress(lessonIds);
    assert.deepEqual(storage.calls, [["getItem", STORE_KEY]]);
  });

  it("reads only the requested key, so study sessions stay separate", () => {
    storage.values.set(STORE_KEY, JSON.stringify(savedProgressWith({ lastViewedRoute: "#/normal" })));
    storage.values.set(studyKey, JSON.stringify(savedProgressWith({ lastViewedRoute: "#/study" })));

    assert.equal(loadProgress(lessonIds, studyKey).lastViewedRoute, "#/study");
    assert.equal(loadProgress(lessonIds).lastViewedRoute, "#/normal");
  });

  it("restores saved learner progress", () => {
    const saved = savedProgressWith({
      entryRouteId: "new-player",
      lessonProgress: { [LESSON]: { ...emptyLesson, requiredPages: ["why-court"], conceptUnderstood: true } },
      earnedStickers: ["court-explorer"],
      lastViewedRoute: "#/lesson/court-orientation",
    });
    storage.values.set(STORE_KEY, JSON.stringify(saved));

    assert.deepEqual(loadProgress(lessonIds), saved);
  });

  it("normalizes what it reads against the current lesson ids", () => {
    storage.values.set(STORE_KEY, JSON.stringify(savedProgressWith({
      lessonProgress: {
        [LESSON]: { requiredPages: ["why-court", "why-court"] },
        "removed-lesson": { requiredPages: ["old-page"] },
      },
      courtVisited: [COURT_ZONES.KITCHEN, "net"],
    })));

    const loaded = loadProgress(lessonIds);
    assert.deepEqual(Object.keys(loaded.lessonProgress), [LESSON]);
    assert.deepEqual(loaded.lessonProgress[LESSON].requiredPages, ["why-court"]);
    assert.deepEqual(loaded.courtVisited, [COURT_ZONES.KITCHEN]);
  });

  it("drops lesson progress when no lesson ids are given", () => {
    storage.values.set(STORE_KEY, JSON.stringify(savedProgressWith({
      lessonProgress: { [LESSON]: { ...emptyLesson, conceptUnderstood: true } },
    })));

    assert.deepEqual(loadProgress().lessonProgress, {});
  });

  it("starts fresh when saved data is from another app version", () => {
    storage.values.set(STORE_KEY, JSON.stringify(savedProgressWith({ version: APP_VERSION - 1, entryRouteId: "old" })));
    assert.deepEqual(loadProgress(lessonIds), createFreshProgress());
  });

  it("starts fresh when saved data is not valid JSON", () => {
    for (const corrupted of ["{not json", "", "undefined", "{\"version\":2"]) {
      storage.values.set(STORE_KEY, corrupted);
      assert.deepEqual(loadProgress(lessonIds), createFreshProgress(), `input: ${corrupted}`);
    }
  });

  it("starts fresh when saved JSON is not a progress object", () => {
    for (const stored of ["null", "2", "\"text\"", "[]", "true"]) {
      storage.values.set(STORE_KEY, stored);
      assert.deepEqual(loadProgress(lessonIds), createFreshProgress(), `input: ${stored}`);
    }
  });

  it("starts fresh when localStorage throws", () => {
    useStorage(createFailingStorage(new DOMException("denied", "SecurityError")));
    assert.deepEqual(loadProgress(lessonIds), createFreshProgress());
  });

  it("starts fresh when there is no window (storage unavailable)", () => {
    installWindow(undefined);
    assert.deepEqual(loadProgress(lessonIds), createFreshProgress());
  });

  it("returns a new object on each load, so in-memory edits are not shared", () => {
    storage.values.set(STORE_KEY, JSON.stringify(savedProgressWith({ earnedStickers: ["ready-set"] })));

    const first = loadProgress(lessonIds);
    first.earnedStickers.push("grip-guide");

    assert.deepEqual(loadProgress(lessonIds).earnedStickers, ["ready-set"]);
  });
});

describe("saveProgress", () => {
  let storage;
  beforeEach(() => { storage = useStorage(createMemoryStorage()); });
  afterEach(restoreWindow);

  it("writes progress as JSON under the default key and reports success", () => {
    const progress = savedProgressWith({ entryRouteId: "new-player" });

    assert.equal(saveProgress(progress), true);
    assert.deepEqual(storage.calls, [["setItem", STORE_KEY]]);
    assert.deepEqual(readSaved(storage), progress);
  });

  it("writes only to the requested key", () => {
    storage.values.set(STORE_KEY, "normal-progress");

    assert.equal(saveProgress(createFreshProgress(), studyKey), true);
    assert.equal(storage.values.get(STORE_KEY), "normal-progress");
    assert.ok(storage.values.has(studyKey));
  });

  it("replaces the previously saved progress", () => {
    saveProgress(savedProgressWith({ lastViewedRoute: "#/first" }));
    saveProgress(savedProgressWith({ lastViewedRoute: "#/second" }));

    assert.equal(readSaved(storage).lastViewedRoute, "#/second");
  });

  it("does not change the progress object it saves", () => {
    const progress = createFreshProgress();
    recordPage(progress, LESSON, "why-court");
    const before = structuredClone(progress);

    saveProgress(progress);

    assert.deepEqual(progress, before);
  });

  it("round-trips through loadProgress", () => {
    const progress = createFreshProgress();
    recordPage(progress, LESSON, "why-court");
    recordPage(progress, LESSON, "court-reference", { required: false });
    recordAttempt(progress, LESSON, "court-recall", true);

    saveProgress(progress);

    assert.deepEqual(loadProgress(lessonIds), progress);
  });

  it("reports failure when localStorage rejects the write", () => {
    useStorage(createFailingStorage());
    assert.equal(saveProgress(createFreshProgress()), false);
  });

  it("reports failure when there is no window", () => {
    installWindow(undefined);
    assert.equal(saveProgress(createFreshProgress()), false);
  });

  it("reports failure and writes nothing when progress cannot be serialized", () => {
    const circular = createFreshProgress();
    circular.self = circular;

    assert.equal(saveProgress(circular), false);
    assert.equal(storage.values.has(STORE_KEY), false);
  });
});

describe("clearProgress", () => {
  let storage;
  beforeEach(() => { storage = useStorage(createMemoryStorage()); });
  afterEach(restoreWindow);

  it("removes the default key and reports success", () => {
    storage.values.set(STORE_KEY, JSON.stringify(createFreshProgress()));

    assert.equal(clearProgress(), true);
    assert.deepEqual(storage.calls, [["removeItem", STORE_KEY]]);
    assert.equal(storage.values.has(STORE_KEY), false);
  });

  it("removes only the requested key", () => {
    storage.values.set(STORE_KEY, "normal-progress");
    storage.values.set(studyKey, "study-progress");
    storage.values.set("unrelated", "keep-me");

    assert.equal(clearProgress(studyKey), true);
    assert.deepEqual([...storage.values.keys()], [STORE_KEY, "unrelated"]);
  });

  it("succeeds when there is nothing to clear", () => {
    assert.equal(clearProgress(), true);
    assert.equal(clearProgress(), true);
  });

  it("makes the next load start fresh", () => {
    const progress = createFreshProgress();
    recordPage(progress, LESSON, "why-court");
    saveProgress(progress);

    clearProgress();

    assert.deepEqual(loadProgress(lessonIds), createFreshProgress());
  });

  it("reports failure when localStorage throws", () => {
    useStorage(createFailingStorage());
    assert.equal(clearProgress(), false);
  });

  it("reports failure when there is no window", () => {
    installWindow(undefined);
    assert.equal(clearProgress(), false);
  });
});

// --- In-memory progress updates --------------------------------------------------

describe("getLessonProgress", () => {
  it("creates an empty lesson record on first access and stores it on progress", () => {
    const progress = createFreshProgress();

    const lesson = getLessonProgress(progress, LESSON);

    assert.deepEqual(lesson, emptyLesson);
    assert.equal(storedLesson(progress, LESSON), lesson);
  });

  it("returns the same record on later calls instead of resetting it", () => {
    const progress = createFreshProgress();
    const first = getLessonProgress(progress, LESSON);
    first.requiredPages.push("why-court");

    const second = getLessonProgress(progress, LESSON);

    assert.equal(second, first);
    assert.deepEqual(second.requiredPages, ["why-court"]);
  });

  it("returns an existing (loaded) record unchanged", () => {
    const existing = { ...emptyLesson, requiredPages: ["why-court"], conceptUnderstood: true };
    const progress = savedProgressWith({ lessonProgress: { [LESSON]: existing } });

    assert.equal(getLessonProgress(progress, LESSON), existing);
    assert.deepEqual(existing, { ...emptyLesson, requiredPages: ["why-court"], conceptUnderstood: true });
  });

  it("gives each lesson its own independent lists", () => {
    const progress = createFreshProgress();
    const first = getLessonProgress(progress, LESSON);
    const second = getLessonProgress(progress, OTHER_LESSON);

    first.requiredPages.push("why-court");
    first.attempts.recall = { count: 1, correct: true };

    assert.deepEqual(second, emptyLesson);
    assert.notEqual(first.practiceLogs, second.practiceLogs);
  });

  it("does not create records for other lessons or touch other progress fields", () => {
    const progress = createFreshProgress();

    getLessonProgress(progress, LESSON);

    assert.deepEqual(Object.keys(progress.lessonProgress), [LESSON]);
    assert.deepEqual({ ...progress, lessonProgress: {} }, createFreshProgress());
  });
});

describe("recordPage", () => {
  it("records a page as required by default", () => {
    const progress = createFreshProgress();

    recordPage(progress, LESSON, "why-court");

    assert.deepEqual(storedLesson(progress, LESSON).requiredPages, ["why-court"]);
    assert.deepEqual(storedLesson(progress, LESSON).optionalPages, []);
  });

  it("records a page as required when required is true", () => {
    const progress = createFreshProgress();

    recordPage(progress, LESSON, "why-court", { required: true });

    assert.deepEqual(storedLesson(progress, LESSON).requiredPages, ["why-court"]);
  });

  it("records a page as optional when required is false", () => {
    const progress = createFreshProgress();

    recordPage(progress, LESSON, "court-reference", { required: false });

    assert.deepEqual(storedLesson(progress, LESSON).requiredPages, []);
    assert.deepEqual(storedLesson(progress, LESSON).optionalPages, ["court-reference"]);
  });

  it("ignores a page that was already recorded and keeps first-seen order", () => {
    const progress = createFreshProgress();

    recordPage(progress, LESSON, "why-court");
    recordPage(progress, LESSON, "lines");
    recordPage(progress, LESSON, "why-court");
    recordPage(progress, LESSON, "court-reference", { required: false });
    recordPage(progress, LESSON, "court-reference", { required: false });

    assert.deepEqual(storedLesson(progress, LESSON).requiredPages, ["why-court", "lines"]);
    assert.deepEqual(storedLesson(progress, LESSON).optionalPages, ["court-reference"]);
  });

  it("adds to a lesson that was loaded from storage", () => {
    const progress = savedProgressWith({
      lessonProgress: { [LESSON]: { ...emptyLesson, requiredPages: ["why-court"] } },
    });

    recordPage(progress, LESSON, "lines");
    recordPage(progress, LESSON, "why-court");

    assert.deepEqual(storedLesson(progress, LESSON).requiredPages, ["why-court", "lines"]);
  });

  it("only changes the lesson it was given", () => {
    const progress = createFreshProgress();
    getLessonProgress(progress, OTHER_LESSON);

    recordPage(progress, LESSON, "why-court");

    assert.deepEqual(storedLesson(progress, OTHER_LESSON), emptyLesson);
  });

  it("does not mark the lesson as understood", () => {
    const progress = createFreshProgress();

    recordPage(progress, LESSON, "why-court");

    assert.equal(storedLesson(progress, LESSON).conceptUnderstood, false);
  });
});

describe("recordAttempt", () => {
  it("records a first correct attempt", () => {
    const progress = createFreshProgress();

    assert.deepEqual(recordAttempt(progress, LESSON, "court-recall", true), { count: 1, correct: true });
  });

  it("records a first wrong attempt", () => {
    const progress = createFreshProgress();

    assert.deepEqual(recordAttempt(progress, LESSON, "court-recall", false), { count: 1, correct: false });
  });

  it("stores the attempt on the lesson and returns that stored record", () => {
    const progress = createFreshProgress();

    const attempt = recordAttempt(progress, LESSON, "court-recall", true);

    assert.equal(storedLesson(progress, LESSON).attempts["court-recall"], attempt);
  });

  it("counts every attempt", () => {
    const progress = createFreshProgress();

    recordAttempt(progress, LESSON, "court-recall", false);
    recordAttempt(progress, LESSON, "court-recall", false);
    const third = recordAttempt(progress, LESSON, "court-recall", false);

    assert.deepEqual(third, { count: 3, correct: false });
  });

  it("keeps correct once it has been answered correctly", () => {
    const progress = createFreshProgress();

    recordAttempt(progress, LESSON, "court-recall", false);
    recordAttempt(progress, LESSON, "court-recall", true);
    const afterWrong = recordAttempt(progress, LESSON, "court-recall", false);

    assert.deepEqual(afterWrong, { count: 3, correct: true });
  });

  it("stores correct as a boolean even for truthy or falsy input", () => {
    const progress = createFreshProgress();

    assert.equal(recordAttempt(progress, LESSON, "a", 1).correct, true);
    assert.equal(recordAttempt(progress, LESSON, "b", undefined).correct, false);
    assert.equal(recordAttempt(progress, LESSON, "c", "").correct, false);
  });

  it("tracks each activity separately", () => {
    const progress = createFreshProgress();

    recordAttempt(progress, LESSON, "court-recall", true);
    recordAttempt(progress, LESSON, "court-recall", false);
    recordAttempt(progress, LESSON, "court-map-check", false);

    assert.deepEqual(storedLesson(progress, LESSON).attempts, {
      "court-recall": { count: 2, correct: true },
      "court-map-check": { count: 1, correct: false },
    });
  });

  it("tracks the same activity id separately per lesson", () => {
    const progress = createFreshProgress();

    recordAttempt(progress, LESSON, "check", true);
    recordAttempt(progress, OTHER_LESSON, "check", false);

    assert.deepEqual(storedLesson(progress, LESSON).attempts.check, { count: 1, correct: true });
    assert.deepEqual(storedLesson(progress, OTHER_LESSON).attempts.check, { count: 1, correct: false });
  });

  it("continues from an attempt that was loaded from storage", () => {
    const progress = savedProgressWith({
      lessonProgress: { [LESSON]: { ...emptyLesson, attempts: { "court-recall": { count: 4, correct: true } } } },
    });

    assert.deepEqual(recordAttempt(progress, LESSON, "court-recall", false), { count: 5, correct: true });
  });

  it("does not record the page or mark the lesson understood", () => {
    const progress = createFreshProgress();

    recordAttempt(progress, LESSON, "court-recall", true);

    assert.deepEqual(storedLesson(progress, LESSON).requiredPages, []);
    assert.equal(storedLesson(progress, LESSON).conceptUnderstood, false);
  });
});
