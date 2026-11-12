import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as curriculum from "../content/curriculum.js";
import * as progressModule from "../content/progress.js";

const source = (await readFile(new URL("../app.js", import.meta.url), "utf8"))
  .replace(/^import\s*\{[\s\S]*?\}\s*from\s*"\.\/content\/curriculum\.js";\s*/, "")
  .replace(/^import\s*\{[\s\S]*?\}\s*from\s*"\.\/content\/progress\.js";\s*/, "");
const session = new Map();
const store = new Map();
const listeners = {};
const app = { innerHTML: "" };
const context = {
  ...curriculum, ...progressModule, URLSearchParams, console, setTimeout, clearTimeout,
  window: { location: { hash: "#/" }, localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k,v) => store.set(k,v), removeItem: (k) => store.delete(k) }, sessionStorage: { getItem: (k) => session.get(k) ?? null, setItem: (k,v) => session.set(k,v) }, addEventListener() {} },
  document: { querySelector: (s) => s === "#app" ? app : null, addEventListener: (type,fn) => { listeners[type] = fn; }, title: "" },
  requestAnimationFrame() {},
};
vm.createContext(context);
vm.runInContext(source + `\nglobalThis.test = { renderLibrary, renderSources, renderUnit, rememberUnit, handleAction, getRoute, lessonFocusAfterAction, setProgress: (value) => progress = value, setFilter: (v) => libraryFilter = v, setQuery: (v) => libraryQuery = v, getFilter: () => libraryFilter, getQuery: () => libraryQuery };`, context);
const t = context.test;
const rules = { path: "/library", query: new URLSearchParams("view=rules") };
assert.match(t.renderLibrary(rules), /volley momentum/);
assert.match(t.renderLibrary(rules), /server score, receiver score, then server number/);
assert.match(t.renderLibrary(rules), /reviewed 2026-09-01/);
assert.equal(t.renderSources(["missing"]), "");
assert.equal(t.renderSources(), "");
const sources = new Set(curriculum.sourceRegister.map((source) => source.id));
for (const entry of curriculum.libraryEntries) {
  assert.ok(entry.summary?.trim(), `${entry.id} must have an explicit summary`);
  assert.ok(entry.sourceIds?.length && entry.sourceIds.every((id) => sources.has(id)), `${entry.id} must have valid sources`);
}
const bounce = curriculum.libraryEntries.find((entry) => entry.id === "two-bounce-guide");
assert.match(bounce.summary, /serve bounce/);
assert.match(bounce.summary, /return bounce/);
const adaptive = curriculum.libraryEntries.find((entry) => entry.id === "adaptive-guide");
assert.match(adaptive.summary, /wheelchair/i);
assert.ok(adaptive.sourceIds.includes("R11"));
t.setQuery("nothing-matches-here");
assert.match(t.renderLibrary(rules), /0 results/);
t.setFilter("Official rule");
t.handleAction({ target: { closest: () => ({ dataset: { action: "library-clear" } }) } });
assert.equal(t.getFilter(), "All topics");
assert.equal(t.getQuery(), "");
const orientation = curriculum.getLesson("court-orientation");
const state = progressModule.createFreshProgress();
t.setProgress(state);
context.window.location.hash = "#/lesson/court-orientation";
const firstPage = orientation.pages[0];
progressModule.recordPage(state, orientation.id, firstPage.id);
assert.equal(t.lessonFocusAfterAction(orientation, firstPage, false), "[data-lesson-heading]");
context.window.location.hash = "#/lesson/court-orientation?page=why-court";
assert.equal(t.lessonFocusAfterAction(orientation, firstPage, false), '.lesson-footer [data-cta-priority="primary"]');
assert.equal(t.lessonFocusAfterAction(orientation, firstPage, true), ".lesson-page .feedback");
const unit = curriculum.curriculumUnits[0];
t.rememberUnit(unit.id, false);
assert.equal(JSON.parse(session.get("learn-pickleball:unit-disclosures"))[unit.id], false);
assert.doesNotMatch(t.renderUnit(unit), /data-unit-id="[^"]+" open/);
t.rememberUnit(unit.id, true);
assert.match(t.renderUnit(unit), /data-unit-id="[^"]+" open/);

// Exercise the actual action handlers and the focus target after each render.
// This DOM stub checks rendered targets and handler integration; browser and
// screen-reader testing are still needed for full interaction validation.
globalThis.window = context.window;
let focused = null;
context.requestAnimationFrame = (callback) => callback();
context.document.querySelector = (selector) => {
  if (selector === "#app") return app;
  const exists = {
    "[data-lesson-heading]": /data-lesson-heading/.test(app.innerHTML),
    ".lesson-page .feedback": /class="feedback" role="status"/.test(app.innerHTML),
    '[data-action="sticker-dismiss"]': /data-action="sticker-dismiss"/.test(app.innerHTML),
    "#main-content": /id="main-content"/.test(app.innerHTML),
  }[selector];
  return exists ? { focus: () => { focused = selector; } } : null;
};
const act = (dataset) => t.handleAction({ target: { closest: () => ({ dataset }) } });
const journey = progressModule.createFreshProgress();
t.setProgress(journey);
context.window.location.hash = "#/lesson/court-orientation";
act({ action: "page-complete", lesson: orientation.id, page: "why-court" });
assert.equal(focused, "[data-lesson-heading]", "advancing a reading page focuses the new heading");
assert.match(app.innerHTML, /data-lesson-heading>Name the lines/);
assert.deepEqual([...journey.lessonProgress[orientation.id].requiredPages], ["why-court"]);

for (const page of orientation.pages.filter((item) => item.required && item.id !== "court-recall")) {
  progressModule.recordPage(journey, orientation.id, page.id);
}
context.window.location.hash = "#/lesson/court-orientation?page=court-recall";
act({ action: "page-answer", lesson: orientation.id, page: "court-recall", index: "0" });
assert.equal(focused, ".lesson-page .feedback", "an incorrect answer focuses its feedback");
assert.equal(journey.lessonProgress[orientation.id].conceptUnderstood, false);
act({ action: "page-answer", lesson: orientation.id, page: "court-recall", index: "1" });
assert.equal(focused, '[data-action="sticker-dismiss"]', "the earned keepsake takes focus first");
assert.equal(journey.lessonProgress[orientation.id].conceptUnderstood, true);
act({ action: "sticker-dismiss" });
assert.equal(focused, ".lesson-page .feedback", "closing the keepsake returns focus to the answered page");
const savedJourney = progressModule.loadProgress(new Set(curriculum.curriculumUnits.flatMap((item) => item.lessons.map((lesson) => lesson.id))));
assert.equal(savedJourney.lessonProgress[orientation.id].conceptUnderstood, true, "completion survives reload");
assert.equal(savedJourney.lessonProgress[orientation.id].attempts["court-recall-check"].count, 2);

context.window.sessionStorage.setItem = () => { throw new Error("unavailable"); };
t.rememberUnit(unit.id, false);
assert.doesNotMatch(t.renderUnit(unit), /data-unit-id="[^"]+" open/);
context.window.localStorage.setItem = () => { throw new Error("unavailable"); };
assert.equal(progressModule.saveProgress(progressModule.createFreshProgress()), false);
context.window.localStorage.getItem = () => "invalid json";
assert.equal(progressModule.loadProgress().version, 2);
console.log("P1 UX checks passed (summaries, filters, evidence and storage fallback).");
