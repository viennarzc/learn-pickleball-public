import assert from "node:assert/strict";
import {
  curriculumUnits,
  entryRoutes,
  getAllLessons,
  getLesson,
  libraryEntries,
  legacyLessonAliases,
  resolveLegacyLessonId,
  sourceRegister,
} from "../content/curriculum.js";

const lessons = getAllLessons();
const sourceIds = new Set(sourceRegister.map((source) => source.id));
const lessonIds = new Set(lessons.map((lesson) => lesson.id));

assert.equal(curriculumUnits.length, 7, "The refined path needs exactly seven units.");
assert.deepEqual(curriculumUnits.map((unit) => unit.number), [1, 2, 3, 4, 5, 6, 7], "Unit numbering must stay canonical.");
assert.equal(lessons.length, 29, "The refined path needs exactly 29 canonical lessons.");
assert.equal(new Set(lessons.map((lesson) => lesson.id)).size, lessons.length, "Lesson IDs must be unique.");
assert.equal(lessons.filter((lesson) => !lesson.optional).length, 20, "Units 1–5 must contain 20 core lessons.");
assert.equal(lessons.filter((lesson) => lesson.optional).length, 9, "Units 6–7 must contain 9 optional deep dives.");
assert.ok(curriculumUnits.slice(0, 5).every((unit) => !unit.optional && unit.lessons.every((lesson) => !lesson.optional)), "Core units cannot contain optional-only lessons.");
assert.ok(curriculumUnits.slice(5).every((unit) => unit.optional && unit.lessons.every((lesson) => lesson.optional)), "Deep-dive units must stay optional.");

for (const canonical of ["court-orientation", "serve-placement", "opening-rally", "doubles-scoring"]) {
  assert.ok(getLesson(canonical), `Public CTA destination ${canonical} must exist.`);
}
assert.ok(libraryEntries.length >= 8, "Library needs answer-shaped rule and guide records.");
for (const entry of libraryEntries) {
  assert.ok(entry.title && entry.description && entry.lessonId, "Each Library record needs an answer, description, and canonical lesson link.");
  assert.ok(lessonIds.has(entry.lessonId), `${entry.id} links to an unknown canonical lesson.`);
  assert.ok(entry.sourceIds.every((id) => sourceIds.has(id)), `${entry.id} needs valid source labels.`);
}

for (const lesson of lessons) {
  assert.ok(lesson.title && lesson.outcome && lesson.evidence, `${lesson.id} needs title, outcome, and evidence label.`);
  assert.ok(Array.isArray(lesson.sourceIds) && lesson.sourceIds.length, `${lesson.id} needs source metadata.`);
  assert.ok(Array.isArray(lesson.pages) && lesson.pages.length >= 3, `${lesson.id} needs variable-depth lesson pages.`);
  assert.ok(Array.isArray(lesson.adaptations) && lesson.adaptations.includes("reading-only"), `${lesson.id} needs a reading-only adaptation.`);
  assert.equal(new Set(lesson.pages.map((page) => page.id)).size, lesson.pages.length, `${lesson.id} has duplicate page IDs.`);
  const required = lesson.pages.filter((page) => page.required !== false);
  assert.ok(required.length >= 2, `${lesson.id} needs at least two required pages.`);
  assert.ok(required.some((page) => page.activity), `${lesson.id} needs a required activity or check.`);
  assert.ok(lesson.sourceIds.every((id) => sourceIds.has(id)), `${lesson.id} references an unknown lesson source.`);
  assert.ok((lesson.prerequisites || []).every((id) => lessonIds.has(id) && id !== lesson.id), `${lesson.id} has an invalid prerequisite.`);
  for (const page of lesson.pages) {
    const pageSources = page.sourceIds || lesson.sourceIds;
    assert.ok(pageSources.length && pageSources.every((id) => sourceIds.has(id)), `${lesson.id}/${page.id} has invalid source metadata.`);
    if (["drill", "practice"].includes(page.activity?.kind)) {
      assert.match(page.activity.practicePrompt || "", /reading-only/i, `${lesson.id}/${page.id} physical practice must have a reading-only route.`);
    }
  }
}

const instructionalPlates = lessons.flatMap((lesson) => lesson.pages.filter((page) => page.plate).map((page) => ({ lesson: lesson.id, page })));
assert.equal(instructionalPlates.length, 4, "The refined path needs four targeted instructional plates.");
for (const { page } of instructionalPlates) assert.equal(page.plate.items.length, 3, "Each instructional plate needs three readable decision cues.");

function visit(id, visiting = new Set(), visited = new Set()) {
  if (visited.has(id)) return;
  assert.ok(!visiting.has(id), `Prerequisite cycle at ${id}.`);
  visiting.add(id);
  for (const prerequisite of getLesson(id).prerequisites || []) visit(prerequisite, visiting, visited);
  visiting.delete(id);
  visited.add(id);
}
for (const lesson of lessons) visit(lesson.id);

assert.deepEqual(entryRoutes.map((route) => route.id), ["never-played", "first-game-essentials", "consistency", "specific-answer"], "All four entry routes must be preserved.");
const essentials = entryRoutes.find((route) => route.id === "first-game-essentials");
assert.equal(essentials.lessonIds.length, 10, "The First Game Essentials playlist must contain ten lessons.");
assert.ok(essentials.lessonIds.every((id) => lessonIds.has(id)), "The playlist may only use canonical lesson IDs.");

const legacyIds = ["court-kitchen", "gear-grip", "ready-position", "serve-basics", "two-bounce", "return-reset", "doubles-score", "side-out", "dink-volley", "court-position", "faults-calls", "open-play", "game-ready"];
assert.deepEqual(Object.keys(legacyLessonAliases).sort(), legacyIds.sort(), "Every existing legacy lesson alias must remain supported.");
for (const id of legacyIds) assert.ok(lessonIds.has(resolveLegacyLessonId(id)), `Legacy alias ${id} must resolve to a canonical lesson.`);

assert.ok(sourceRegister.every((source) => source.label && source.type && source.reviewed && source.url), "Every source needs type, label, date, and link metadata.");
for (const source of sourceRegister) {
  let url;
  try { url = new URL(source.url); } catch { assert.fail(`${source.id} needs a valid source URL`); }
  assert.equal(url.protocol, "https:", `${source.id} must use HTTPS rather than an executable or insecure URL scheme`);
  assert.ok(!url.username && !url.password, `${source.id} must not contain credentials`);
}
console.log(`Curriculum checks passed (${curriculumUnits.length} units, ${lessons.length} lessons, ${sourceRegister.length} sources).`);
