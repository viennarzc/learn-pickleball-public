import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { getAllLessons, resolveLegacyLessonId } from "../content/curriculum.js";
import {
  APP_VERSION,
  STORE_KEY,
  clearProgress,
  createFreshProgress,
  getLessonProgress,
  loadProgress,
  recordAttempt,
  recordPage,
  recordPractice,
  saveProgress,
} from "../content/progress.js";

const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const index = await readFile(new URL("../index.html", import.meta.url), "utf8");
const publicPages = await Promise.all([
  "../learn-pickleball/index.html",
  "../learn-pickleball/kitchen-rules/index.html",
  "../learn-pickleball/serve-basics/index.html",
  "../learn-pickleball/two-bounce-rule/index.html",
  "../learn-pickleball/doubles-scoring/index.html",
].map((path) => readFile(new URL(path, import.meta.url), "utf8")));

const storage = new Map([["learn-pickleball", JSON.stringify({ completedLessons: ["court-kitchen"] })]]);
globalThis.window = { localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) } };
const lessonIds = new Set(getAllLessons().map((lesson) => lesson.id));
assert.equal(STORE_KEY, "learn-pickleball:v2", "Progress must use the v2 store key.");
assert.equal(APP_VERSION, 2, "Progress schema must be version 2.");
assert.deepEqual(loadProgress(lessonIds), createFreshProgress(), "A v1-only store must not migrate into v2 progress.");

const state = createFreshProgress();
assert.equal(state.courtKnowledgePassed, false, "Fresh v2 progress must require the Court Lab map check.");
recordPage(state, "court-orientation", "why-court");
recordAttempt(state, "court-orientation", "court-recall-check", true);
recordPractice(state, "court-orientation", "reading-only");
assert.equal(getLessonProgress(state, "court-orientation").requiredPages.length, 1, "Required pages must track independently.");
assert.equal(getLessonProgress(state, "court-orientation").attempts["court-recall-check"].correct, true, "Attempts must track correctness.");
assert.equal(state.practiceLogs.length, 1, "Practice logs must be voluntary and separate.");
saveProgress(state);
assert.equal(loadProgress(lessonIds).practiceLogs.length, 1, "v2 progress must reload.");
const staleCourtGate = createFreshProgress();
staleCourtGate.courtVisited = ["kitchen", "service", "baseline"];
staleCourtGate.courtExplored = true;
delete staleCourtGate.courtKnowledgePassed;
storage.set(STORE_KEY, JSON.stringify(staleCourtGate));
assert.equal(loadProgress(lessonIds).courtExplored, false, "Zone visits alone must not unlock Court Lab.");
clearProgress();
assert.ok(storage.has("learn-pickleball"), "Reset must leave the legacy v1 key untouched.");
assert.ok(!storage.has(STORE_KEY), "Reset must clear v2 only.");

for (const [key, label] of [["learn", "Learn"], ["practice", "Practice"], ["court", "Court Lab"], ["library", "Library"], ["progress", "Progress"]]) {
  assert.ok(app.includes(`"${key}", "${label}"`), `Navigation needs ${label}.`);
}
for (const route of ["/practice", "/court-lab", "/library", "/progress", "/skills", "/resources", "/achievements"]) assert.ok(app.includes(`"${route}"`) || app.includes(`'${route}'`), `Compatible route ${route} is missing.`);
for (const marker of ["renderLesson", "renderPractice", "renderCourt", "renderLibrary", "renderProgress", "renderInstructionalPlate", "data-action=\"page-answer\"", "data-action=\"practice-log\""]) assert.ok(app.includes(marker), `App is missing ${marker}.`);
for (const marker of ["renderCourtSvg", "tabindex=\"0\"", "court-zone", "kitchen-answer", "court-check-answer", "courtKnowledgePassed", "completeCourtLabGate", "court-mode", "event.key === \"Enter\""]) assert.ok(app.includes(marker), `Court Lab behavior is missing ${marker}.`);
assert.ok(app.includes('route.path === "/resources"'), "The legacy Resources route must open Rules & guides.");
for (const lesson of getAllLessons()) assert.ok(app.includes("href(`/lesson/${lesson.id}`)"), `${lesson.id} must render through the canonical generic lesson route.`);

for (const alias of ["court-kitchen", "gear-grip", "serve-basics", "two-bounce", "return-reset", "doubles-score", "side-out", "dink-volley", "court-position", "faults-calls", "open-play", "game-ready"]) {
  assert.ok(resolveLegacyLessonId(alias), `Legacy route ${alias} must resolve.`);
}
for (const canonical of ["court-orientation", "serve-placement", "opening-rally", "doubles-scoring"]) {
  assert.ok(publicPages.some((html) => html.includes(`#/lesson/${canonical}`)), `Public pages need a CTA to ${canonical}.`);
}
assert.match(index, /styles\.css\?v=\d+/, "The shell must load the refined visual system.");
assert.match(index, /app\.js\?v=\d+/, "The shell must load the v2 controller.");
assert.match(app, /data-nav-area=/, "Navigation needs stable semantic area attributes.");
assert.match(app, /data-cta-priority="primary"/, "Primary actions need stable CTA priority attributes.");
assert.match(app, /lesson-next-hint/, "Incomplete lesson pages need a non-competing next hint.");

console.log("App v2 checks passed (fresh store, aliases, entry surfaces, Court Lab, and public CTAs)." );
