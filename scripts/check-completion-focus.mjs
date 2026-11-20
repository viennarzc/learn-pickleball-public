import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as scoring from "../content/scoring-walkthrough.js";
import * as curriculum from "../content/curriculum.js";
import * as routing from "../routing/simple-router.js";
import * as progressStoreModule from "../content/progress-store.js";
import * as progressModule from "../content/progress.js";

const source = (await readFile(new URL("../app.js", import.meta.url), "utf8"))
  .replace(/^import\s*\{[\s\S]*?\}\s*from\s*"\.\/[^"]+";\s*/gm, "");
const local = new Map();
const session = new Map();
const listeners = {};
const app = { innerHTML: "" };
const window = {
  navigator: { locks: { request: (_name, _options, callback) => Promise.resolve().then(callback) } },
  location: { hash: "#/", search: "?study=discovery" },
  localStorage: { getItem: (k) => local.get(k) ?? null, setItem: (k, v) => local.set(k, v), removeItem: (k) => local.delete(k) },
  sessionStorage: { getItem: (k) => session.get(k) ?? null, setItem: (k, v) => session.set(k, v), removeItem: (k) => session.delete(k) },
  history: { replaceState(_state, _title, url) { window.location.hash = url; } },
  addEventListener() {},
};
globalThis.window = window;
let focused = null;
const focusable = (id, dataset = {}) => ({ dataset, focus: () => { focused = id; } });
const context = {
  ...curriculum, ...progressModule, ...progressStoreModule, ...routing, ...scoring, URLSearchParams, console, setTimeout, clearTimeout, window,
  document: {
    title: "",
    addEventListener: (type, fn) => { listeners[type] = fn; },
    querySelector(selector) {
      if (selector === "#app") return app;
      const exists = {
        "#main-content": /id="main-content"/.test(app.innerHTML),
        "[data-lesson-heading]": /data-lesson-heading/.test(app.innerHTML),
        ".lesson-page .feedback": /class="feedback" role="status"/.test(app.innerHTML),
        '[data-action="sticker-dismiss"]': /data-action="sticker-dismiss"/.test(app.innerHTML),
        '.lesson-footer [data-cta-priority="primary"]': /<footer class="lesson-footer">[\s\S]*?data-cta-priority="primary"/.test(app.innerHTML),
      }[selector];
      return exists ? focusable(selector) : null;
    },
    querySelectorAll(selector) {
      if (selector !== '[data-action="court-zone"]') return [];
      return [...app.innerHTML.matchAll(/data-action="court-zone" data-zone="([^"]+)" data-category="([^"]+)"/g)]
        .map((match) => focusable(match[1], { action: "court-zone", zone: match[1], category: match[2] }));
    },
  },
  requestAnimationFrame: (callback) => callback(),
};
vm.createContext(context);
vm.runInContext(source + `\nglobalThis.test = { render, handleAction, setProgress: (value) => { progress = value; progressGeneration = 0; sessionOnly = false; window.localStorage.setItem(progressStore.recordKey, JSON.stringify({ schema: 1, generation: 0, progress: value, legacyRaw: window.localStorage.getItem(currentProgressKey), recovery: [] })); }, getProgress: () => progress };`, context);
const t = context.test;
const act = (dataset) => t.handleAction({ target: { closest: () => ({ dataset }) } });
const ids = new Set(curriculum.getAllLessons().map((lesson) => lesson.id));
function prepare(lesson, lastPage, explicit) {
  const state = progressModule.createFreshProgress();
  for (const page of lesson.pages.filter((item) => item.required !== false && item.id !== lastPage.id)) progressModule.recordPage(state, lesson.id, page.id);
  t.setProgress(state);
  window.location.hash = `#/lesson/${lesson.id}${explicit ? `?page=${lastPage.id}` : ""}`;
  return state;
}

const reading = curriculum.getLesson("equipment-safety");
const readingLast = reading.pages.filter((page) => page.required !== false).at(-1);
for (const explicit of [false, true]) {
  const state = prepare(reading, readingLast, explicit);
  await act({ action: "page-complete", lesson: reading.id, page: readingLast.id });
  assert.equal(window.location.hash, `#/lesson/${reading.id}?page=${readingLast.id}`);
  assert.equal(window.location.search, "?study=discovery");
  assert.ok(app.innerHTML.includes(`data-lesson-heading>${readingLast.title}`));
  assert.match(app.innerHTML, /Next: /, "optional content remains reachable");
  assert.equal(focused, '.lesson-footer [data-cta-priority="primary"]');
  assert.equal(t.getProgress().lessonProgress[reading.id].conceptUnderstood, true);
  assert.equal(JSON.parse(local.get(progressStoreModule.coordinatedKey(progressModule.progressKey("discovery")))).progress.lessonProgress[reading.id].conceptUnderstood, true);
  window.location.hash = `#/lesson/${reading.id}`;
  t.render();
  assert.ok(app.innerHTML.includes(`data-lesson-heading>${reading.pages[0].title}`), "review opens the first page");
}

const finalLesson = curriculum.getLesson("ready-position");
const finalPage = finalLesson.pages.at(-1);
const finalState = prepare(finalLesson, finalPage, false);
progressModule.getLessonProgress(finalState, "equipment-safety").conceptUnderstood = true;
t.setProgress(finalState);
await act({ action: "page-complete", lesson: finalLesson.id, page: finalPage.id });
assert.equal(window.location.hash, `#/lesson/${finalLesson.id}?page=${finalPage.id}`);
assert.match(app.innerHTML, /Next lesson: |See progress/);
assert.equal(focused, '[data-action="sticker-dismiss"]');
await act({ action: "sticker-dismiss" });
assert.equal(focused, '.lesson-footer [data-cta-priority="primary"]');

const answerLesson = curriculum.getLesson("court-orientation");
const answerPage = answerLesson.pages.find((page) => page.id === "court-recall");
for (const explicit of [false, true]) {
  const state = prepare(answerLesson, answerPage, explicit);
  await act({ action: "page-answer", lesson: answerLesson.id, page: answerPage.id, index: "0" });
  assert.equal(t.getProgress().lessonProgress[answerLesson.id].conceptUnderstood, false);
  await act({ action: "page-answer", lesson: answerLesson.id, page: answerPage.id, index: "1" });
  assert.equal(window.location.hash, `#/lesson/${answerLesson.id}?page=${answerPage.id}`);
  assert.equal(focused, '[data-action="sticker-dismiss"]');
  assert.match(app.innerHTML, /Next: /);
  await act({ action: "sticker-dismiss" });
  assert.equal(focused, ".lesson-page .feedback");
  assert.equal(t.getProgress().lessonProgress[answerLesson.id].conceptUnderstood, true);
  assert.equal(JSON.parse(local.get(progressStoreModule.coordinatedKey(progressModule.progressKey("discovery")))).progress.lessonProgress[answerLesson.id].attempts[answerPage.activity.id].count, 2);
}

const courtState = progressModule.createFreshProgress();
t.setProgress(courtState);
window.location.hash = "#/court-lab";
t.render();
for (const [zone, category, key] of [["top-kitchen", "kitchen", "Enter"], ["top-left-service", "service", " "], ["top-baseline", "baseline", "Enter"]]) {
  let prevented = false;
  const target = { dataset: { action: "court-zone", zone, category }, closest: () => target };
  await listeners.keydown({ target, key, preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(focused, zone, `${zone} remains focused`);
  assert.ok(t.getProgress().courtVisited.includes(category));
}
await act({ action: "court-zone", zone: "bottom-kitchen", category: "kitchen" });
assert.equal(focused, "bottom-kitchen", "mouse activation restores focus too");
await act({ action: "court-mode", mode: "check" });
assert.match(app.innerHTML, /Where does this serve land/);
await act({ action: "court-check-answer", answer: "right" });
assert.equal(t.getProgress().courtExplored, true);
assert.equal(focused, '[data-action="sticker-dismiss"]');
console.log("Completion and Court Lab focus checks passed.");
