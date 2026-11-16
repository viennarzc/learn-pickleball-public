import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as scoring from "../content/scoring-walkthrough.js";
import * as curriculum from "../content/curriculum.js";
import * as routing from "../routing/simple-router.js";
import * as progressModule from "../content/progress.js";

const source = (await readFile(new URL("../app.js", import.meta.url), "utf8"))
  .replace(/^import\s*\{[\s\S]*?\}\s*from\s*"\.\/[^"]+";\s*/gm, "");
const session = new Map();
const store = new Map();
const listeners = {};
const app = { innerHTML: "" };
const context = {
  ...curriculum, ...progressModule, ...routing, ...scoring, URLSearchParams, console, setTimeout, clearTimeout,
  window: { location: { hash: "#/" }, localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k,v) => store.set(k,v), removeItem: (k) => store.delete(k) }, sessionStorage: { getItem: (k) => session.get(k) ?? null, setItem: (k,v) => session.set(k,v) }, addEventListener() {} },
  document: { querySelector: (s) => s === "#app" ? app : null, addEventListener: (type,fn) => { listeners[type] = fn; }, title: "" },
  requestAnimationFrame() {},
};
vm.createContext(context);
vm.runInContext(source + `\nglobalThis.test = { render, renderLibrary, renderSources, renderUnit, rememberUnit, handleAction, getRoute, lessonFocusAfterAction, setProgress: (value) => progress = value, setFilter: (v) => libraryFilter = v, setQuery: (v) => libraryQuery = v, getFilter: () => libraryFilter, getQuery: () => libraryQuery };`, context);
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

const refreshPath = "#/library?view=refresher";
const navigate = (hash) => {
  context.window.location.hash = hash;
  t.render();
  return app.innerHTML;
};
const newcomer = progressModule.createFreshProgress();
t.setProgress(newcomer);
assert.match(navigate("#/"), /href="#\/placement">Start learning/);
assert.match(app.innerHTML, /href="#\/library\?view=refresher">Quick refresher/);
assert.match(navigate("#/learn"), /href="#\/placement">Choose a learning goal/);
assert.match(navigate("#/placement"), /I’m new to pickleball/);
assert.match(app.innerHTML, /I’m preparing for my first game/);
for (const [goal, result] of [["never-played", "Start: Court orientation"], ["first-game-essentials", "See First Game Essentials"]]) {
  act({ action: "set-entry", entry: goal });
  assert.ok(app.innerHTML.includes(result));
  act({ action: "placement-restart" });
}

const directStart = progressModule.createFreshProgress();
progressModule.recordPage(directStart, "court-orientation", "why-court");
t.setProgress(directStart);
assert.match(navigate("#/"), /Resume lesson/);
assert.match(app.innerHTML, /href="#\/placement">Choose a learning goal/);
assert.match(navigate("#/learn"), /Continue: Court orientation/);
assert.match(app.innerHTML, /href="#\/placement">Choose a learning goal/);
assert.match(navigate("#/placement"), /I’m preparing for my first game/);
act({ action: "set-entry", entry: "first-game-essentials" });
assert.equal(directStart.entryRouteId, "first-game-essentials");
assert.equal(directStart.activePlaylistId, "first-game-essentials");
assert.deepEqual([...directStart.lessonProgress["court-orientation"].requiredPages], ["why-court"]);
navigate("#/lesson/court-orientation");
assert.match(app.innerHTML, /data-lesson-heading>Name the lines/);

const topicList = navigate(refreshPath);
assert.equal(navigate(`${refreshPath}&topic=unknown`), topicList);
for (const [guideId, article] of [
  ["serve-guide", "serve-basics"], ["two-bounce-guide", "two-bounce-rule"],
  ["kitchen-guide", "kitchen-rules"], ["score-guide", "doubles-scoring"],
]) {
  const topic = curriculum.refresherTopics.find((item) => item.guideId === guideId);
  const guide = curriculum.libraryEntries.find((entry) => entry.id === guideId);
  const page = curriculum.getLesson(guide.lessonId).pages.find((item) => item.id === topic.pageId);
  const topicUrl = `${refreshPath}&topic=${guideId}`;
  const topicHref = topicUrl.replace("&", "&amp;");
  assert.ok(topicList.includes(`href="${topicHref}"`));
  const detail = navigate(topicUrl);
  assert.ok(detail.includes(topic.title) && detail.includes(page.activity.prompt));
  assert.ok(detail.includes(curriculum.sourceRegister.find((source) => source.id === guide.sourceIds[0]).url));
  assert.match(detail, /<details class="refresher-check">/);
  assert.match(detail, /See lesson prerequisites/);
  assert.ok(navigate(`#/lesson/${guide.lessonId}`).includes(`href="${topicHref}">Review the basics`));
  const publicGuide = await readFile(new URL(`../learn-pickleball/${article}/index.html`, import.meta.url), "utf8");
  assert.ok(publicGuide.includes(`href="/${topicHref}">Try the quick check`));
}

const returning = progressModule.createFreshProgress();
returning.entryRouteId = "never-played";
returning.earnedStickers.push("court-explorer");
progressModule.recordPage(returning, orientation.id, firstPage.id);
progressModule.recordAttempt(returning, orientation.id, "court-recall-check", false);
t.setProgress(returning);
navigate(`${refreshPath}&topic=kitchen-guide`);
const storedBeforeReview = store.get(progressModule.STORE_KEY);
const feedback = { textContent: "" };
const choices = ["0", "1", "2"].map((index) => ({
  dataset: { action: "refresher-answer", index },
  setAttribute(name, value) { this[name] = value; },
  closest: () => question,
}));
const question = { querySelectorAll: () => choices, querySelector: () => feedback };
const answer = (option) => t.handleAction({ target: { closest: () => option } });
answer(choices[0]);
assert.match(feedback.textContent, /^Try again\. Volley momentum/);
answer(choices[1]);
assert.match(feedback.textContent, /^Correct\. Volley momentum/);
assert.deepEqual(choices.map((option) => option["aria-pressed"]), ["false", "true", "false"]);
assert.equal(store.get(progressModule.STORE_KEY), storedBeforeReview, "Refresher answers must leave local progress untouched");
assert.equal(JSON.stringify(returning), storedBeforeReview, "Refresher answers must also leave in-memory progress untouched");
assert.match(navigate("#/"), /href="#\/lesson\/court-orientation">Resume lesson/);
assert.match(navigate("#/lesson/court-orientation"), /data-lesson-heading>Name the lines/);
progressModule.getLessonProgress(returning, orientation.id).conceptUnderstood = true;
assert.match(navigate(`${refreshPath}&topic=kitchen-guide`), /Open full lesson/);
for (const lesson of curriculum.getAllLessons()) progressModule.getLessonProgress(returning, lesson.id).conceptUnderstood = true;
assert.match(navigate(`${refreshPath}&topic=kitchen-guide`), /Review full lesson/);
assert.match(navigate("#/"), /class="button button-primary" data-cta-priority="primary" href="#\/library\?view=refresher">Quick refresher/);
assert.match(app.innerHTML, /Review completed lessons/);

context.window.sessionStorage.setItem = () => { throw new Error("unavailable"); };
t.rememberUnit(unit.id, false);
assert.doesNotMatch(t.renderUnit(unit), /data-unit-id="[^"]+" open/);
context.window.localStorage.setItem = () => { throw new Error("unavailable"); };
assert.equal(progressModule.saveProgress(progressModule.createFreshProgress()), false);
context.window.localStorage.getItem = () => "invalid json";
assert.equal(progressModule.loadProgress().version, 2);
console.log("P1 UX checks passed (summaries, filters, onboarding, refreshers and storage fallback).");
