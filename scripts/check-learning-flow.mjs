import fs from "node:fs";

const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const courseStart = source.indexOf("const courseUnits = [");
const courseEnd = source.indexOf("const stickerCatalog = [");
const courseSource = source.slice(courseStart, courseEnd);
const lessonIds = [...courseSource.matchAll(/\n {8}id: "([^"]+)"/g)].map((match) => match[1]);
const guidedStart = source.indexOf("const guidedLessonContent = {");
const guidedEnd = source.indexOf("const placementQuestions = [");
const guidedSource = source.slice(guidedStart, guidedEnd);
const guidedIds = [...guidedSource.matchAll(/\n\s+"([^"]+)": \{/g)].map((match) => match[1]);
const visualGuideStart = source.indexOf("const lessonVisualGuides = {");
const visualGuideEnd = source.indexOf("const guidedLessonContent = {");
const visualGuideSource = source.slice(visualGuideStart, visualGuideEnd);
const visualGuideEntries = [...visualGuideSource.matchAll(/^  "([^"]+)": \{ visualIds: \[([^\]]+)\]/gm)];
const specializedIds = ["court-kitchen", "serve-basics", "two-bounce", "doubles-score"];
const supportedIds = new Set([...guidedIds, ...specializedIds]);

if (!lessonIds.length) throw new Error("No course lessons found.");
if (courseSource.includes('availability: "preview"')) throw new Error("A course lesson is still marked preview-only.");

for (const lessonId of lessonIds) {
  if (!supportedIds.has(lessonId)) throw new Error(`No playable renderer or guided check for ${lessonId}.`);
}

if (visualGuideEntries.length !== lessonIds.length) throw new Error("Every lesson must have an expanded visual guide.");
for (const [, lessonId, visualIds] of visualGuideEntries) {
  if (!lessonIds.includes(lessonId)) throw new Error(`Visual guide references unknown lesson ${lessonId}.`);
  if (visualIds.split(",").length < 2) throw new Error(`${lessonId} needs at least two visual references.`);
}
for (const marker of ["data-action=\"lesson-visual-open\"", "data-action=\"lesson-visual-close\"", "What to notice", "<dt>Do</dt>", "<dt>Avoid</dt>", "<dt>Tip</dt>"]) {
  if (!source.includes(marker)) throw new Error(`Expanded visual detail is missing ${marker}.`);
}
if (!source.includes("renderLessonVisualStudy(lesson.id)")) throw new Error("Guided lessons must render their visual study section.");
for (const lessonId of specializedIds) {
  if (!source.includes(`renderLessonVisualStudy(\"${lessonId}\")`)) {
    throw new Error(`${lessonId} must render its visual study section.`);
  }
}

function lessonBlock(lessonId) {
  const start = courseSource.indexOf(`id: "${lessonId}"`);
  const nextLesson = courseSource.indexOf("\n      {", start + 1);
  return courseSource.slice(start, nextLesson === -1 ? undefined : nextLesson);
}

const defaultPathPrerequisites = [
  ["gear-grip", "court-kitchen"],
  ["ready-position", "gear-grip"],
  ["serve-basics", "ready-position"],
  ["two-bounce", "serve-basics"],
  ["return-reset", "two-bounce"],
  ["doubles-score", "return-reset"],
  ["side-out", "doubles-score"],
  ["dink-volley", "side-out"],
  ["court-position", "dink-volley"],
  ["faults-calls", "court-position"],
  ["open-play", "faults-calls"],
  ["game-ready", "open-play"],
];

for (const [lessonId, prerequisite] of defaultPathPrerequisites) {
  if (!lessonBlock(lessonId).includes(`prerequisites: ["${prerequisite}"]`)) {
    throw new Error(`${lessonId} must follow ${prerequisite} in the default learning path.`);
  }
}

if (!source.includes('id: "usap-partner-drills"') || !source.includes('practiceResourceId: "usap-partner-drills"')) {
  throw new Error("The official partner-drills resource must be linked from the course path.");
}

if (!source.includes('label for="resource-topic"') || !source.includes('label for="resource-format"')) {
  throw new Error("Resource filters must keep explicit programmatic labels.");
}

if ((courseSource.match(/achievementId:/g) || []).length !== lessonIds.length) throw new Error("A course lesson is missing its reward mapping.");

for (const action of ["guided-answer", "serve-target", "bounce-step", "score-answer"]) {
  if (!source.includes(`data-action=\"${action}\"`) || !source.includes(`action === \"${action}\"`)) {
    throw new Error(`Learning action ${action} is not both rendered and handled.`);
  }
}

console.log(`Learning-flow checks passed (${lessonIds.length} playable lessons; ${guidedIds.length} guided checks).`);
