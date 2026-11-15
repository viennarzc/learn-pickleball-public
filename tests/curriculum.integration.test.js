/*
 * Integration tests for content/curriculum.js.
 *
 * These check that the curriculum's collections agree with each other and that
 * the curriculum works together with content/progress.js the way app.js uses
 * them. Like the unit tests, they use only public exports and assert ids and
 * labels, never titles or copy.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  curriculumUnits,
  entryRoutes,
  getAllLessons,
  getLesson,
  legacyLessonAliases,
  libraryEntries,
  refresherTopics,
  resolveLegacyLessonId,
  sourceRegister,
} from "../content/curriculum.js";
import {
  createFreshProgress,
  getLessonProgress,
  normalizeProgress,
  recordAttempt,
  recordPage,
} from "../content/progress.js";
import * as contract from "./fixtures/curriculum-contract.js";

const lessons = getAllLessons();
const lessonIds = new Set(lessons.map((lesson) => lesson.id));
const sourceIds = new Set(sourceRegister.map((source) => source.id));
const pathIndex = new Map(lessons.map((lesson, index) => [lesson.id, index]));
const prerequisitesOf = (lessonId) => getLesson(lessonId)?.prerequisites ?? [];

// Mirrors app.js resolveLesson(): canonical id first, then a legacy alias.
function resolveLessonFromUrl(rawId, completedIds = []) {
  return getLesson(rawId) ?? getLesson(resolveLegacyLessonId(rawId, completedIds));
}

function completedLessonIds(progress) {
  return Object.entries(progress.lessonProgress)
    .filter(([, lesson]) => lesson.conceptUnderstood)
    .map(([lessonId]) => lessonId);
}

function complete(progress, lessonId) {
  getLessonProgress(progress, lessonId).conceptUnderstood = true;
}

// Completes lessons in the given order using real progress records and returns
// the first lesson whose prerequisites are not completed yet, or null.
function findFirstLockedLesson(lessonIdsInOrder) {
  const progress = createFreshProgress();
  for (const lessonId of lessonIdsInOrder) {
    const done = new Set(completedLessonIds(progress));
    const missing = prerequisitesOf(lessonId).filter((id) => !done.has(id));
    if (missing.length) return { lessonId, missing };
    complete(progress, lessonId);
  }
  return null;
}

// Same round trip as saveProgress + loadProgress, without needing localStorage.
function saveAndReload(progress) {
  return normalizeProgress(JSON.parse(JSON.stringify(progress)), lessonIds);
}

describe("curriculum cross-references", () => {
  it("every prerequisite is another known lesson", () => {
    for (const lesson of lessons) {
      for (const prerequisite of lesson.prerequisites ?? []) {
        assert.ok(lessonIds.has(prerequisite), `${lesson.id} requires unknown ${prerequisite}`);
        assert.notEqual(prerequisite, lesson.id, `${lesson.id} requires itself`);
      }
    }
  });

  it("prerequisites never form a cycle", () => {
    const done = new Set();
    const visit = (lessonId, trail = []) => {
      assert.ok(!trail.includes(lessonId), `cycle: ${[...trail, lessonId].join(" -> ")}`);
      if (done.has(lessonId)) return;
      for (const prerequisite of prerequisitesOf(lessonId)) visit(prerequisite, [...trail, lessonId]);
      done.add(lessonId);
    };
    for (const lesson of lessons) visit(lesson.id);
  });

  it("every prerequisite comes earlier in the learning path", () => {
    const late = lessons.flatMap((lesson) => (lesson.prerequisites ?? [])
      .filter((prerequisite) => pathIndex.get(prerequisite) > pathIndex.get(lesson.id))
      .map((prerequisite) => `${lesson.id} <- ${prerequisite}`));
    assert.deepEqual(late, []);
  });

  it("core lessons never require an optional deep-dive lesson", () => {
    const blocked = lessons
      .filter((lesson) => !lesson.optional)
      .flatMap((lesson) => (lesson.prerequisites ?? [])
        .filter((prerequisite) => getLesson(prerequisite).optional)
        .map((prerequisite) => `${lesson.id} <- ${prerequisite}`));
    assert.deepEqual(blocked, []);
  });

  it("every source id used by lessons, pages and library entries is in the source register", () => {
    const used = [
      ...lessons.flatMap((lesson) => (lesson.sourceIds ?? []).map((id) => [lesson.id, id])),
      ...lessons.flatMap((lesson) => lesson.pages.flatMap((page) => (page.sourceIds ?? []).map((id) => [`${lesson.id}/${page.id}`, id]))),
      ...libraryEntries.flatMap((entry) => (entry.sourceIds ?? []).map((id) => [entry.id, id])),
    ];
    assert.deepEqual(used.filter(([, id]) => !sourceIds.has(id)).map((pair) => pair.join(" -> ")), []);
  });

  it("every library entry links to a known lesson", () => {
    for (const entry of libraryEntries) assert.ok(lessonIds.has(entry.lessonId), `${entry.id} -> ${entry.lessonId}`);
  });

  it("every playlist lists only known lessons, each once", () => {
    for (const route of entryRoutes.filter((item) => item.lessonIds)) {
      assert.deepEqual(route.lessonIds.filter((id) => !lessonIds.has(id)), [], route.id);
      assert.equal(new Set(route.lessonIds).size, route.lessonIds.length, `${route.id} repeats a lesson`);
    }
  });

  it("every legacy alias target is a known lesson", () => {
    for (const [legacyId, alias] of Object.entries(legacyLessonAliases)) {
      const targets = typeof alias === "string" ? [alias] : [alias.defaultLessonId, ...alias.unfinished];
      assert.deepEqual(targets.filter((id) => !lessonIds.has(id)), [], legacyId);
    }
  });

  it("every refresher resolves guide -> lesson -> page, as app.js does at startup", () => {
    for (const topic of refresherTopics) {
      const guide = libraryEntries.find((entry) => entry.id === topic.guideId);
      assert.ok(guide, `${topic.guideId} is not a library entry`);
      const lesson = getLesson(guide.lessonId);
      assert.ok(lesson, `${guide.id} -> unknown lesson ${guide.lessonId}`);
      assert.ok(lesson.pages.some((page) => page.id === topic.pageId), `${lesson.id} has no page ${topic.pageId}`);
    }
  });

  it("every unit's lessons resolve back to that unit through getLesson", () => {
    for (const unit of curriculumUnits) {
      for (const { id } of unit.lessons) assert.equal(getLesson(id)?.unitId, unit.id, id);
    }
  });
});

describe("learner journeys (curriculum + progress)", () => {
  it("the core path can be completed in order without hitting a locked lesson", () => {
    const corePath = lessons.filter((lesson) => !lesson.optional).map((lesson) => lesson.id);
    assert.deepEqual(findFirstLockedLesson(corePath), null);
  });

  it("the full path, including deep dives, can be completed in order", () => {
    assert.deepEqual(findFirstLockedLesson(lessons.map((lesson) => lesson.id)), null);
  });

  it("each playlist can be followed in order without leaving the playlist", () => {
    for (const route of entryRoutes.filter((item) => item.lessonIds)) {
      assert.deepEqual(findFirstLockedLesson(route.lessonIds), null, `${route.id} playlist`);
    }
  });

  it("progress for every curriculum lesson, page and attempt survives save and reload", () => {
    const progress = createFreshProgress();
    for (const lesson of lessons) {
      for (const page of lesson.pages) {
        recordPage(progress, lesson.id, page.id, { required: page.required !== false });
        if (page.activity) recordAttempt(progress, lesson.id, page.activity.id || page.id, true);
      }
      complete(progress, lesson.id);
    }

    const reloaded = saveAndReload(progress);

    assert.deepEqual(Object.keys(reloaded.lessonProgress), contract.lessonIdsInPathOrder);
    assert.deepEqual(reloaded.lessonProgress, progress.lessonProgress);
  });

  it("progress stored under a legacy-only id is dropped on reload", () => {
    const legacyOnly = Object.keys(contract.legacyAliases).filter((id) => !lessonIds.has(id));
    const progress = createFreshProgress();
    for (const legacyId of legacyOnly) recordPage(progress, legacyId, "old-page");

    assert.deepEqual(saveAndReload(progress).lessonProgress, {});
  });

  it("a legacy link follows the learner's saved progress to the next unfinished lesson", () => {
    const progress = createFreshProgress();
    complete(progress, "court-orientation");
    const reloaded = saveAndReload(progress);

    assert.equal(resolveLessonFromUrl("court-kitchen", completedLessonIds(reloaded))?.id, "kitchen-rule");
  });

  it("every legacy link opens a lesson, for a new learner and for one who finished everything", () => {
    for (const completed of [[], contract.lessonIdsInPathOrder]) {
      for (const legacyId of Object.keys(contract.legacyAliases)) {
        assert.ok(lessonIds.has(resolveLessonFromUrl(legacyId, completed)?.id), legacyId);
      }
    }
  });

  it("a hand-typed lesson URL opens a lesson or nothing, and never throws", () => {
    for (const rawId of contract.unknownIds) {
      assert.equal(resolveLessonFromUrl(rawId), null, JSON.stringify(rawId));
    }
  });
});
