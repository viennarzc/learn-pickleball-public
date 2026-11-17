import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  APP_VERSION,
  COURT_ZONES,
  arrayOrEmpty,
  createFreshProgress,
  isCourtExplored,
  isCurrentProgress,
  isObject,
  normalizeCourtProgress,
  normalizeCourtVisited,
  normalizeLessonEntry,
  normalizeLessonProgress,
  normalizeProgress,
  objectOrEmpty,
  selectKnownLessons,
  stringOrDefault,
  uniqueArrayOrEmpty,
} from "../content/progress.js";

const lessonIds = new Set(["court-orientation", "equipment-safety"]);
const allZones = Object.values(COURT_ZONES);
const emptyLesson = Object.freeze({
  requiredPages: [],
  optionalPages: [],
  attempts: {},
  conceptUnderstood: false,
  practiceLogs: [],
});
// Values that can appear after JSON.parse of a corrupted or hand-edited entry.
const nonObjects = [undefined, null, 0, 2, "", "text", true, false];

describe("primitive guards", () => {
  describe("isObject", () => {
    it("accepts plain objects and arrays", () => {
      assert.equal(isObject({}), true);
      assert.equal(isObject({ a: 1 }), true);
      assert.equal(isObject([]), true);
    });

    it("rejects null, undefined and primitives", () => {
      for (const value of nonObjects) assert.equal(isObject(value), false, `${String(value)} is not an object`);
    });
  });

  describe("objectOrEmpty", () => {
    it("returns the same object reference when given an object", () => {
      const answers = { goal: "first-game" };
      assert.equal(objectOrEmpty(answers), answers);
    });

    it("returns an empty object for non-objects", () => {
      for (const value of nonObjects) assert.deepEqual(objectOrEmpty(value), {});
    });

    it("returns a new empty object each time so callers never share state", () => {
      const first = objectOrEmpty(null);
      first.leak = true;
      assert.deepEqual(objectOrEmpty(null), {});
    });
  });

  describe("arrayOrEmpty", () => {
    it("returns the same array reference when given an array", () => {
      const logs = [{ mode: "wall" }];
      assert.equal(arrayOrEmpty(logs), logs);
    });

    it("returns an empty array for non-arrays, including array-like values", () => {
      for (const value of [...nonObjects, {}, { length: 1, 0: "a" }]) assert.deepEqual(arrayOrEmpty(value), []);
    });
  });

  describe("uniqueArrayOrEmpty", () => {
    it("removes duplicates and keeps first-seen order", () => {
      assert.deepEqual(uniqueArrayOrEmpty(["b", "a", "b", "c", "a"]), ["b", "a", "c"]);
    });

    it("returns a copy rather than the original array", () => {
      const stickers = ["ready-set"];
      const result = uniqueArrayOrEmpty(stickers);
      assert.deepEqual(result, stickers);
      assert.notEqual(result, stickers);
    });

    it("returns an empty array for non-arrays", () => {
      for (const value of [...nonObjects, {}]) assert.deepEqual(uniqueArrayOrEmpty(value), []);
    });
  });

  describe("stringOrDefault", () => {
    it("keeps any string, including an empty string", () => {
      assert.equal(stringOrDefault("#/lesson/a", "#/"), "#/lesson/a");
      assert.equal(stringOrDefault("", "#/"), "");
    });

    it("uses the fallback for non-strings", () => {
      for (const value of [undefined, null, 0, true, {}, []]) {
        assert.equal(stringOrDefault(value, "#/"), "#/");
        assert.equal(stringOrDefault(value, null), null);
      }
    });
  });
});

describe("isCurrentProgress (step 1)", () => {
  it("accepts an object saved with the current app version", () => {
    assert.equal(isCurrentProgress({ version: APP_VERSION }), true);
    assert.equal(isCurrentProgress(createFreshProgress()), true);
  });

  it("rejects older, newer, missing or mistyped versions", () => {
    for (const version of [APP_VERSION - 1, APP_VERSION + 1, undefined, null, String(APP_VERSION)]) {
      assert.equal(isCurrentProgress({ version }), false, `version ${String(version)}`);
    }
  });

  it("rejects non-object values, even the bare version number", () => {
    for (const value of [...nonObjects, APP_VERSION, []]) assert.equal(isCurrentProgress(value), false);
  });
});

describe("selectKnownLessons (step 2a)", () => {
  it("keeps only lessons that exist in the curriculum", () => {
    const stored = { "court-orientation": { a: 1 }, "removed-lesson": { b: 2 }, "equipment-safety": null };
    assert.deepEqual(selectKnownLessons(stored, lessonIds), [
      ["court-orientation", { a: 1 }],
      ["equipment-safety", null],
    ]);
  });

  it("passes the raw lesson value through untouched for the next step", () => {
    const lesson = { requiredPages: ["x", "x"] };
    const [[, selected]] = selectKnownLessons({ "court-orientation": lesson }, lessonIds);
    assert.equal(selected, lesson);
  });

  it("returns no entries when no lesson ids are known", () => {
    assert.deepEqual(selectKnownLessons({ "court-orientation": {} }, new Set()), []);
  });

  it("returns no entries for missing or malformed lesson progress", () => {
    for (const value of nonObjects) assert.deepEqual(selectKnownLessons(value, lessonIds), []);
  });
});

describe("normalizeLessonEntry (step 2b)", () => {
  it("keeps a valid lesson and deduplicates page lists", () => {
    const attempts = { "court-recall": { count: 2, correct: true } };
    const practiceLogs = [{ lessonId: "court-orientation", mode: "wall", at: "2024-01-01T00:00:00.000Z" }];

    assert.deepEqual(normalizeLessonEntry({
      requiredPages: ["why-court", "lines", "why-court"],
      optionalPages: ["court-reference", "court-reference"],
      attempts,
      conceptUnderstood: true,
      practiceLogs,
    }), {
      requiredPages: ["why-court", "lines"],
      optionalPages: ["court-reference"],
      attempts,
      conceptUnderstood: true,
      practiceLogs,
    });
  });

  it("returns the empty lesson shape for missing or non-object lessons", () => {
    for (const value of nonObjects) assert.deepEqual(normalizeLessonEntry(value), emptyLesson);
  });

  it("replaces each malformed field with its default", () => {
    assert.deepEqual(normalizeLessonEntry({
      requiredPages: "why-court",
      optionalPages: { 0: "court-reference" },
      attempts: "court-recall",
      conceptUnderstood: 0,
      practiceLogs: null,
    }), emptyLesson);
  });

  it("keeps conceptUnderstood only when it is a boolean true", () => {
    assert.equal(normalizeLessonEntry({ conceptUnderstood: true }).conceptUnderstood, true);
    assert.equal(normalizeLessonEntry({ conceptUnderstood: "yes" }).conceptUnderstood, false);
    assert.equal(normalizeLessonEntry({ conceptUnderstood: "" }).conceptUnderstood, false);
  });

  it("drops fields that are not part of the lesson shape", () => {
    assert.deepEqual(Object.keys(normalizeLessonEntry({ legacyScore: 10 })), Object.keys(emptyLesson));
  });
});

describe("normalizeLessonProgress (step 2 = 2a then 2b)", () => {
  it("filters unknown lessons and normalizes the remaining ones", () => {
    assert.deepEqual(normalizeLessonProgress({
      "court-orientation": { requiredPages: ["why-court", "why-court"], conceptUnderstood: 1 },
      "equipment-safety": null,
      "removed-lesson": { requiredPages: ["old-page"] },
    }, lessonIds), {
      "court-orientation": { ...emptyLesson, requiredPages: ["why-court"], conceptUnderstood: false },
      "equipment-safety": emptyLesson,
    });
  });

  it("matches composing selectKnownLessons with normalizeLessonEntry", () => {
    const stored = { "court-orientation": { optionalPages: ["a", "a"] }, other: {} };
    const expected = Object.fromEntries(selectKnownLessons(stored, lessonIds)
      .map(([id, lesson]) => [id, normalizeLessonEntry(lesson)]));
    assert.deepEqual(normalizeLessonProgress(stored, lessonIds), expected);
  });

  it("returns an empty map for missing or malformed lesson progress", () => {
    for (const value of nonObjects) assert.deepEqual(normalizeLessonProgress(value, lessonIds), {});
  });
});

describe("normalizeCourtVisited (step 3a)", () => {
  it("keeps valid zones once, in first-visited order", () => {
    assert.deepEqual(
      normalizeCourtVisited([COURT_ZONES.BASELINE, COURT_ZONES.KITCHEN, COURT_ZONES.BASELINE]),
      [COURT_ZONES.BASELINE, COURT_ZONES.KITCHEN],
    );
  });

  it("removes unknown zones and non-string entries", () => {
    assert.deepEqual(
      normalizeCourtVisited(["net", COURT_ZONES.SERVICE, null, 3, { zone: "kitchen" }, "KITCHEN"]),
      [COURT_ZONES.SERVICE],
    );
  });

  it("returns an empty list for non-arrays", () => {
    for (const value of [...nonObjects, {}]) assert.deepEqual(normalizeCourtVisited(value), []);
  });
});

describe("isCourtExplored (step 3b)", () => {
  it("is true only when the flag is set, the map check passed and every zone was visited", () => {
    assert.equal(isCourtExplored(true, true, allZones), true);
  });

  it("is false when any single condition is missing", () => {
    assert.equal(isCourtExplored(false, true, allZones), false, "flag not set");
    assert.equal(isCourtExplored(true, false, allZones), false, "map check not passed (legacy unlock)");
    assert.equal(isCourtExplored(true, true, allZones.slice(1)), false, "a zone is missing");
    assert.equal(isCourtExplored(true, true, []), false, "no zones visited");
  });

  it("treats a truthy stored flag as set and always returns a boolean", () => {
    assert.equal(isCourtExplored("yes", true, allZones), true);
    assert.equal(isCourtExplored(undefined, true, allZones), false);
    assert.equal(isCourtExplored(1, false, allZones), false);
  });
});

describe("normalizeCourtProgress (step 3 = 3a, then passed, then 3b)", () => {
  it("marks the court explored when every requirement is met", () => {
    assert.deepEqual(normalizeCourtProgress({
      courtVisited: allZones,
      courtKnowledgePassed: true,
      courtExplored: true,
    }), { courtVisited: allZones, courtKnowledgePassed: true, courtExplored: true });
  });

  it("checks completeness against the normalized zones, not the raw list", () => {
    // Three raw entries but only one real zone: counting the raw list would wrongly unlock Court Lab.
    const duplicates = normalizeCourtProgress({
      courtVisited: [COURT_ZONES.KITCHEN, COURT_ZONES.KITCHEN, COURT_ZONES.KITCHEN],
      courtKnowledgePassed: true,
      courtExplored: true,
    });
    assert.deepEqual(duplicates.courtVisited, [COURT_ZONES.KITCHEN]);
    assert.equal(duplicates.courtExplored, false);

    const unknownZones = normalizeCourtProgress({
      courtVisited: [COURT_ZONES.KITCHEN, COURT_ZONES.SERVICE, "net"],
      courtKnowledgePassed: true,
      courtExplored: true,
    });
    assert.equal(unknownZones.courtExplored, false);
  });

  it("uses the coerced courtKnowledgePassed value when deciding courtExplored", () => {
    const truthy = normalizeCourtProgress({ courtVisited: allZones, courtKnowledgePassed: "yes", courtExplored: true });
    assert.equal(truthy.courtKnowledgePassed, true);
    assert.equal(truthy.courtExplored, true);

    const falsy = normalizeCourtProgress({ courtVisited: allZones, courtKnowledgePassed: 0, courtExplored: true });
    assert.equal(falsy.courtKnowledgePassed, false);
    assert.equal(falsy.courtExplored, false);
  });

  it("revokes a legacy unlock that happened without the map check", () => {
    assert.deepEqual(normalizeCourtProgress({ courtVisited: allZones, courtExplored: true }), {
      courtVisited: allZones,
      courtKnowledgePassed: false,
      courtExplored: false,
    });
  });

  it("defaults every court field when nothing was stored", () => {
    assert.deepEqual(normalizeCourtProgress({}), {
      courtVisited: [],
      courtKnowledgePassed: false,
      courtExplored: false,
    });
  });
});

describe("normalizeProgress", () => {
  it("returns fresh progress for missing, non-object or wrong-version data", () => {
    const invalid = [
      ...nonObjects,
      [],
      APP_VERSION,
      {},
      { version: APP_VERSION - 1, entryRouteId: "old" },
      { version: APP_VERSION + 1, entryRouteId: "future" },
      { version: String(APP_VERSION), entryRouteId: "string-version" },
    ];
    for (const value of invalid) assert.deepEqual(normalizeProgress(value, lessonIds), createFreshProgress());
  });

  it("returns a new object on each call so resets never share state", () => {
    const first = normalizeProgress(null, lessonIds);
    first.placementAnswers.goal = "leak";
    first.courtVisited.push(COURT_ZONES.KITCHEN);
    assert.deepEqual(normalizeProgress(null, lessonIds), createFreshProgress());
  });

  it("keeps a fully valid saved progress unchanged", () => {
    const attempts = { "court-recall": { count: 1, correct: true } };
    const log = { lessonId: "court-orientation", mode: "wall", at: "2024-01-01T00:00:00.000Z" };
    const saved = {
      ...createFreshProgress(),
      entryRouteId: "new-player",
      activePlaylistId: "kitchen-basics",
      placementAnswers: { goal: "first-game" },
      diagnosticAnswers: { kitchen: "unsure" },
      lessonProgress: {
        "court-orientation": {
          requiredPages: ["why-court"],
          optionalPages: ["court-reference"],
          attempts,
          conceptUnderstood: true,
          practiceLogs: [log],
        },
      },
      practiceLogs: [log],
      courtVisited: allZones,
      courtKnowledgePassed: true,
      courtExplored: true,
      earnedStickers: ["court-explorer"],
      lastViewedRoute: "#/lesson/court-orientation",
    };

    assert.deepEqual(normalizeProgress(structuredClone(saved), lessonIds), saved);
  });

  it("keeps the same key order as fresh progress so saved JSON stays stable", () => {
    const normalized = normalizeProgress({ lastViewedRoute: "#/x", courtExplored: true, version: APP_VERSION }, lessonIds);
    assert.deepEqual(Object.keys(normalized), Object.keys(createFreshProgress()));
  });

  it("drops unknown top-level fields", () => {
    const normalized = normalizeProgress({ version: APP_VERSION, completedLessons: ["court-kitchen"] }, lessonIds);
    assert.equal(Object.hasOwn(normalized, "completedLessons"), false);
  });

  it("replaces every malformed field with its fresh default", () => {
    assert.deepEqual(normalizeProgress({
      version: APP_VERSION,
      entryRouteId: 42,
      activePlaylistId: { id: "kitchen" },
      placementAnswers: "first-game",
      diagnosticAnswers: null,
      lessonProgress: ["court-orientation"],
      practiceLogs: { 0: {} },
      courtVisited: "kitchen",
      courtKnowledgePassed: 0,
      courtExplored: "",
      earnedStickers: "ready-set",
      lastViewedRoute: null,
    }, lessonIds), createFreshProgress());
  });

  it("deduplicates earned stickers and court zones", () => {
    const normalized = normalizeProgress({
      version: APP_VERSION,
      earnedStickers: ["ready-set", "grip-guide", "ready-set"],
      courtVisited: [COURT_ZONES.SERVICE, COURT_ZONES.SERVICE],
    }, lessonIds);
    assert.deepEqual(normalized.earnedStickers, ["ready-set", "grip-guide"]);
    assert.deepEqual(normalized.courtVisited, [COURT_ZONES.SERVICE]);
  });

  it("keeps an empty-string route instead of falling back to the home route", () => {
    assert.equal(normalizeProgress({ version: APP_VERSION, lastViewedRoute: "" }, lessonIds).lastViewedRoute, "");
  });

  it("drops all lesson progress when called without lesson ids", () => {
    const normalized = normalizeProgress({
      version: APP_VERSION,
      lessonProgress: { "court-orientation": { conceptUnderstood: true } },
    });
    assert.deepEqual(normalized.lessonProgress, {});
  });

  it("uses the lesson and court step results for its lessonProgress and court fields", () => {
    const stored = {
      version: APP_VERSION,
      lessonProgress: {
        "court-orientation": { requiredPages: ["a", "a"] },
        "removed-lesson": {},
      },
      courtVisited: [...allZones, COURT_ZONES.KITCHEN, "net"],
      courtKnowledgePassed: true,
      courtExplored: true,
    };
    const normalized = normalizeProgress(stored, lessonIds);
    const { courtVisited, courtKnowledgePassed, courtExplored } = normalized;

    assert.deepEqual(normalized.lessonProgress, normalizeLessonProgress(stored.lessonProgress, lessonIds));
    assert.deepEqual({ courtVisited, courtKnowledgePassed, courtExplored }, normalizeCourtProgress(stored));
    assert.equal(courtExplored, true);
  });
});
