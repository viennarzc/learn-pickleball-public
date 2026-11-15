/*
 * Unit tests for content/curriculum.js.
 *
 * Rules for this file:
 * - Only the public exports are used, so the tests keep passing if the data
 *   moves to another source (JSON, CMS, API) behind the same exports.
 * - Assertions compare ids and labels only. Titles and other copy are never
 *   asserted because they change often.
 * - Expected values come from tests/fixtures/curriculum-contract.js.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  curriculumUnits,
  entryRoutes,
  getAllLessons,
  getLesson,
  getUnitForLesson,
  legacyLessonAliases,
  libraryEntries,
  refresherTopics,
  resolveLegacyLessonId,
  sourceRegister,
} from "../content/curriculum.js";
import * as contract from "./fixtures/curriculum-contract.js";

const ids = (items) => items.map((item) => item.id);
const pick = (items, keys) => items.map((item) => Object.fromEntries(keys.map((key) => [key, item[key]])));
const duplicates = (values) => values.filter((value, index) => values.indexOf(value) !== index);

const legacyOnlyIds = Object.keys(contract.legacyAliases).filter((id) => !contract.lessonIdsInPathOrder.includes(id));
const stringAliases = Object.entries(contract.legacyAliases).filter(([, alias]) => typeof alias === "string");
const progressAliases = Object.entries(contract.legacyAliases).filter(([, alias]) => typeof alias !== "string");
const unitIdByLesson = new Map(contract.units.flatMap((unit) => unit.lessonIds.map((lessonId) => [lessonId, unit])));

describe("curriculumUnits", () => {
  it("lists the units by id and number in path order", () => {
    assert.deepEqual(pick(curriculumUnits, ["id", "number"]), pick(contract.units, ["id", "number"]));
  });

  it("lists each unit's lesson ids in learning order", () => {
    const actual = curriculumUnits.map((unit) => ({ id: unit.id, lessonIds: ids(unit.lessons) }));
    assert.deepEqual(actual, pick(contract.units, ["id", "lessonIds"]));
  });

  it("marks only the deep-dive units as optional", () => {
    assert.deepEqual(ids(curriculumUnits.filter((unit) => unit.optional)), contract.deepDiveUnitIds);
  });
});

describe("getAllLessons", () => {
  it("returns every lesson id once, in path order", () => {
    assert.deepEqual(ids(getAllLessons()), contract.lessonIdsInPathOrder);
  });

  it("tags each lesson with its unit id and unit number", () => {
    for (const lesson of getAllLessons()) {
      const unit = unitIdByLesson.get(lesson.id);
      assert.deepEqual({ unitId: lesson.unitId, unitNumber: lesson.unitNumber }, { unitId: unit.id, unitNumber: unit.number }, lesson.id);
    }
  });

  it("marks deep-dive lessons optional and core lessons required", () => {
    assert.deepEqual(ids(getAllLessons().filter((lesson) => lesson.optional)), contract.deepDiveLessonIds);
    assert.ok(getAllLessons().every((lesson) => typeof lesson.optional === "boolean"));
  });

  it("returns fresh lesson objects, so callers cannot change the curriculum", () => {
    const first = getAllLessons();
    first[0].id = "changed";
    first[0].unitId = "changed";

    assert.deepEqual(ids(getAllLessons()), contract.lessonIdsInPathOrder);
    assert.equal(getAllLessons()[0].unitId, "unit-1");
    assert.deepEqual(ids(curriculumUnits[0].lessons), contract.units[0].lessonIds);
  });

  it("keeps page ids unique within each lesson", () => {
    for (const lesson of getAllLessons()) {
      assert.deepEqual(duplicates(ids(lesson.pages)), [], lesson.id);
    }
  });

  it("keeps attempt keys (activity id, or page id when absent) unique within each lesson", () => {
    // progress.js stores attempts per lesson under `activity.id || page.id`.
    for (const lesson of getAllLessons()) {
      const keys = lesson.pages.filter((page) => page.activity).map((page) => page.activity.id || page.id);
      assert.deepEqual(duplicates(keys), [], lesson.id);
    }
  });
});

describe("getLesson", () => {
  it("finds every lesson by id together with its unit id", () => {
    for (const lessonId of contract.lessonIdsInPathOrder) {
      const lesson = getLesson(lessonId);
      assert.ok(lesson, `${lessonId} not found`);
      assert.deepEqual({ id: lesson.id, unitId: lesson.unitId }, { id: lessonId, unitId: unitIdByLesson.get(lessonId).id });
    }
  });

  it("returns null for ids that are not lessons", () => {
    for (const id of contract.unknownIds) assert.equal(getLesson(id), null, JSON.stringify(id));
  });

  it("returns null when no id is given", () => {
    assert.equal(getLesson(), null);
    assert.equal(getLesson(null), null);
  });

  it("does not resolve legacy ids (that is resolveLegacyLessonId's job)", () => {
    for (const legacyId of legacyOnlyIds) assert.equal(getLesson(legacyId), null, legacyId);
  });

  it("returns a copy, so changing it does not affect the next lookup", () => {
    getLesson("kitchen-rule").id = "changed";
    assert.equal(getLesson("kitchen-rule")?.id, "kitchen-rule");
  });
});

describe("getUnitForLesson", () => {
  it("returns the unit that contains each lesson", () => {
    for (const lessonId of contract.lessonIdsInPathOrder) {
      assert.equal(getUnitForLesson(lessonId)?.id, unitIdByLesson.get(lessonId).id, lessonId);
    }
  });

  it("returns null for unknown, legacy-only, or missing ids", () => {
    for (const id of [...contract.unknownIds, ...legacyOnlyIds, undefined]) {
      assert.equal(getUnitForLesson(id), null, JSON.stringify(id));
    }
  });
});

describe("resolveLegacyLessonId", () => {
  it("maps a one-to-one alias straight to its lesson, whatever is completed", () => {
    for (const [legacyId, lessonId] of stringAliases) {
      assert.equal(resolveLegacyLessonId(legacyId), lessonId, legacyId);
      assert.equal(resolveLegacyLessonId(legacyId, contract.lessonIdsInPathOrder), lessonId, legacyId);
    }
  });

  it("sends a learner with nothing completed to the first unfinished lesson", () => {
    for (const [legacyId, alias] of progressAliases) {
      assert.equal(resolveLegacyLessonId(legacyId, []), alias.unfinished[0], legacyId);
    }
  });

  it("uses an empty completion list when none is given", () => {
    assert.equal(resolveLegacyLessonId("court-kitchen"), "court-orientation");
  });

  it("skips lessons the learner already completed", () => {
    assert.equal(resolveLegacyLessonId("court-kitchen", ["court-orientation"]), "kitchen-rule");
    assert.equal(resolveLegacyLessonId("dink-volley", ["volleys"]), "dinks");
  });

  it("falls back to the default lesson once every unfinished lesson is completed", () => {
    for (const [legacyId, alias] of progressAliases) {
      assert.equal(resolveLegacyLessonId(legacyId, alias.unfinished), alias.defaultLessonId, legacyId);
    }
  });

  it("accepts completed lesson ids as a Set and ignores unrelated ids", () => {
    assert.equal(resolveLegacyLessonId("court-kitchen", new Set(["court-orientation", "dinks"])), "kitchen-rule");
    assert.equal(resolveLegacyLessonId("court-kitchen", ["dinks", "unknown"]), "court-orientation");
  });

  it("returns null for canonical lesson ids that are not legacy aliases", () => {
    assert.equal(resolveLegacyLessonId("kitchen-rule"), null);
    assert.equal(resolveLegacyLessonId("court-orientation"), null);
  });

  it("returns null for unknown ids", () => {
    for (const id of ["", "unknown-lesson", "Court-Kitchen", undefined, null]) {
      assert.equal(resolveLegacyLessonId(id), null, JSON.stringify(id));
    }
  });

  it("returns null for ids that match built-in object property names", () => {
    for (const id of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      assert.equal(resolveLegacyLessonId(id), null, JSON.stringify(id));
    }
  });
});

describe("legacyLessonAliases", () => {
  it("keeps every legacy id and its targets", () => {
    assert.deepEqual(Object.keys(legacyLessonAliases).sort(), Object.keys(contract.legacyAliases).sort());
    for (const [legacyId, alias] of Object.entries(contract.legacyAliases)) {
      assert.deepEqual(legacyLessonAliases[legacyId], alias, legacyId);
    }
  });
});

describe("entryRoutes", () => {
  it("offers the entry choices by id and label in display order", () => {
    assert.deepEqual(pick(entryRoutes, ["id", "label"]), contract.entryRoutes);
  });

  it("keeps each playlist's lesson ids in order", () => {
    for (const [routeId, lessonIds] of Object.entries(contract.playlists)) {
      assert.deepEqual(entryRoutes.find((route) => route.id === routeId)?.lessonIds, lessonIds, routeId);
    }
  });
});

describe("sourceRegister", () => {
  it("lists every source by id and label", () => {
    assert.deepEqual(pick(sourceRegister, ["id", "label"]), contract.sources);
  });

  it("uses unique ids and unique labels", () => {
    assert.deepEqual(duplicates(ids(sourceRegister)), []);
    assert.deepEqual(duplicates(sourceRegister.map((source) => source.label)), []);
  });
});

describe("libraryEntries", () => {
  it("links each library entry id to its lesson id", () => {
    assert.deepEqual(pick(libraryEntries, ["id", "lessonId"]), contract.libraryEntries);
  });
});

describe("refresherTopics", () => {
  it("points each refresher at its library guide id and lesson page id", () => {
    assert.deepEqual(pick(refresherTopics, ["guideId", "pageId"]), contract.refresherTopics);
  });
});

describe("instructional plates", () => {
  it("appear on the expected lesson pages with the expected labels", () => {
    const plates = getAllLessons().flatMap((lesson) => lesson.pages
      .filter((page) => page.plate)
      .map((page) => ({ lessonId: lesson.id, pageId: page.id, label: page.plate.label })));
    assert.deepEqual(plates, contract.instructionalPlates);
  });
});
