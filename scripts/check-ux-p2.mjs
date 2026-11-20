import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as scoring from "../content/scoring-walkthrough.js";
import * as curriculum from "../content/curriculum.js";
import * as routing from "../routing/simple-router.js";
import * as progressStoreModule from "../content/progress-store.js";
import * as storage from "../content/progress.js";

const code = (await readFile(new URL("../app.js", import.meta.url), "utf8"))
  .replace(/^import\s*\{[\s\S]*?\}\s*from\s*"\.\/[^"]+";\s*/gm, "");
const local = new Map();
const session = new Map();
const localStorage = { getItem: (key) => local.get(key) ?? null, setItem: (key, value) => local.set(key, value), removeItem: (key) => local.delete(key) };
const sessionStorage = { getItem: (key) => session.get(key) ?? null, setItem: (key, value) => session.set(key, value), removeItem: (key) => session.delete(key) };
const ids = new Set(curriculum.getAllLessons().map((item) => item.id));
const normal = storage.createFreshProgress();
storage.recordPage(normal, "court-orientation", "why-court");
local.set(storage.STORE_KEY, JSON.stringify(normal));
const normalBefore = local.get(storage.STORE_KEY);

function start(search, hash = "#/learn") {
  const app = { innerHTML: "" };
  const window = { navigator: { locks: { request: (_name, _options, callback) => Promise.resolve().then(callback) } }, location: { search, hash }, localStorage, sessionStorage, addEventListener() {}, history: { replaceState(_state, _title, url) { window.location.hash = url; } } };
  globalThis.window = window;
  const context = { ...curriculum, ...storage, ...progressStoreModule, ...routing, ...scoring, URLSearchParams, console, setTimeout, clearTimeout, window, document: { querySelector: (selector) => selector === "#app" ? app : null, addEventListener() {}, title: "" }, requestAnimationFrame() {} };
  vm.createContext(context);
  vm.runInContext(code + `\nglobalThis.test = { render, handleAction, rememberUnit, situations, getProgress: () => progress, seedProgress: (value) => { progress = value; progressGeneration = 0; sessionOnly = false; window.localStorage.setItem(progressStore.recordKey, JSON.stringify({ schema: 1, generation: 0, progress: value, legacyRaw: window.localStorage.getItem(currentProgressKey), recovery: [] })); } };`, context);
  return { app, window, ...context.test, act(dataset) { return context.test.handleAction({ target: { closest: () => ({ dataset }) } }); } };
}

assert.equal(storage.studyCondition("?study=atlas"), "atlas");
assert.equal(storage.studyCondition("?study=unknown"), null);
assert.equal(storage.progressKey(null), storage.STORE_KEY);
const baseline = start("?study=baseline");
assert.doesNotMatch(baseline.app.innerHTML, /Choose what helps today|Explore the course Atlas/);
assert.deepEqual(baseline.getProgress().lessonProgress, {});
baseline.rememberUnit("unit-1", false);
assert.ok(session.has("learn-pickleball:study:baseline:unit-disclosures"));
const baselineBefore = local.get(storage.progressKey("baseline"));

const discovery = start("?study=discovery");
assert.match(discovery.app.innerHTML, /Prepare for my first game/);
assert.match(discovery.app.innerHTML, /Build consistency/);
for (const situation of discovery.situations) {
  assert.ok(situation.lessons.length);
  for (const id of situation.lessons) assert.ok(curriculum.getLesson(id), `Unknown situation lesson ${id}`);
  discovery.window.location.hash = `#/library?view=skills&situation=${situation.id}`;
  discovery.render();
  for (const id of situation.lessons) assert.ok(discovery.app.innerHTML.includes(`#/lesson/${id}`), `${situation.id} is missing ${id}`);
  assert.match(discovery.app.innerHTML, /not your rating/);
}
await discovery.act({ action: "library-clear" });
assert.equal(discovery.window.location.hash, "#/library?view=skills");
assert.match(discovery.app.innerHTML, /29 results/);
discovery.window.location.hash = "#/lesson/drop-reset";
discovery.render();
assert.match(discovery.app.innerHTML, /comes after a short foundation/);
discovery.window.location.hash = "#/learn";
const saved = discovery.getProgress();
storage.recordPage(saved, "court-orientation", "why-court");
storage.recordAttempt(saved, "court-orientation", "sample", true);
discovery.seedProgress(saved);
await discovery.act({ action: "study-entry", entry: "first-game-essentials" });
assert.equal(discovery.window.location.hash, "#/placement");
discovery.render();
assert.match(discovery.app.innerHTML, /First Game Essentials/);
assert.deepEqual([...saved.lessonProgress["court-orientation"].requiredPages], ["why-court"]);
assert.equal(saved.lessonProgress["court-orientation"].attempts.sample.count, 1);
for (const value of [0, 1, 2]) {
  discovery.window.location.hash = "#/learn";
  await discovery.act({ action: "study-entry", entry: "consistency" });
  for (const [index, id] of ["serve", "rally", "score", "control", "pressure"].entries()) {
    discovery.render();
    assert.match(discovery.app.innerHTML, new RegExp(`Consistency check · ${index + 1} of 5`));
    await discovery.act({ action: "diagnostic-answer", question: id, value: String(value) });
  }
  assert.match(discovery.app.innerHTML, /Your starting view/);
  assert.equal(discovery.getProgress().placementAnswers.recommendedUnit, value === 2 ? 6 : 4);
  assert.match(discovery.app.innerHTML, new RegExp(`points to Unit ${value === 2 ? 6 : 4}`));
}
assert.equal(local.get(storage.STORE_KEY), normalBefore);
assert.ok(local.has(progressStoreModule.coordinatedKey(storage.progressKey("discovery"))));
assert.deepEqual(JSON.parse(local.get(progressStoreModule.coordinatedKey(storage.progressKey("discovery")))).progress.lessonProgress["court-orientation"].requiredPages, ["why-court"]);
discovery.rememberUnit("unit-1", true);
discovery.window.location.hash = "#/progress";
await discovery.act({ action: "reset-confirm" });
assert.equal(local.get(storage.STORE_KEY), normalBefore);
assert.equal(local.get(storage.progressKey("baseline")), baselineBefore);
assert.equal(session.has("learn-pickleball:study:discovery:unit-disclosures"), false);
assert.deepEqual(discovery.getProgress().lessonProgress, {});

const atlas = start("?study=atlas", "#/learn?view=atlas");
assert.deepEqual(atlas.getProgress().lessonProgress, {});
assert.match(atlas.app.innerHTML, /Course Atlas/);
assert.match(atlas.app.innerHTML, /Show learning path/);
for (const unit of curriculum.curriculumUnits) {
  assert.ok(atlas.app.innerHTML.includes(unit.title));
  for (const lesson of unit.lessons) assert.ok(atlas.app.innerHTML.includes(`#/lesson/${lesson.id}`));
}
assert.equal((atlas.app.innerHTML.match(/class="atlas-unit"/g) || []).length, 7);
const originalImage = curriculum.curriculumUnits[0].lessons[0].illustration;
curriculum.curriculumUnits[0].lessons[0].illustration = { src: "missing-study-image.png", alt: "" };
atlas.render();
assert.match(atlas.app.innerHTML, /missing-study-image\.png/);
assert.match(atlas.app.innerHTML, /Know the Court/);
assert.match(atlas.app.innerHTML, /Court orientation/);
curriculum.curriculumUnits[0].lessons[0].illustration = originalImage;
assert.equal(local.get(storage.STORE_KEY), normalBefore);
const normalApp = start("");
assert.doesNotMatch(normalApp.app.innerHTML, /Research prototype|Choose what helps today|Explore the course Atlas/);
assert.ok(normalApp.getProgress().lessonProgress["court-orientation"]);
globalThis.window = { localStorage: { getItem() { throw Error("blocked"); }, setItem() { throw Error("blocked"); }, removeItem() { throw Error("blocked"); } } };
assert.equal(storage.loadProgress(ids, storage.progressKey("atlas")).version, 2);
assert.equal(storage.saveProgress(storage.createFreshProgress(), storage.progressKey("atlas")), false);
assert.equal(storage.clearProgress(storage.progressKey("atlas")), false);
console.log("P2 study checks passed (conditions, isolation, discovery, diagnostic and Atlas).");
