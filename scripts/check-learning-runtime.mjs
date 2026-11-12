import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
const listeners = {};
const elements = new Map();
const storage = new Map();

function makeElement() {
  return {
    hidden: false,
    innerHTML: "",
    classList: { add() {}, remove() {} },
    addEventListener(type, listener) {
      listeners[type] = listener;
    },
    focus() {},
  };
}

const app = makeElement();
const notice = makeElement();
const toast = makeElement();
elements.set("#app", app);
elements.set("#storage-notice", notice);
elements.set("#toast-region", toast);

const windowObject = {
  location: { hash: "#/" },
  addEventListener(type, listener) {
    listeners[`window:${type}`] = listener;
  },
  scrollTo() {},
};

const context = {
  console,
  URLSearchParams,
  Math,
  Set,
  Map,
  JSON,
  String,
  Number,
  Array,
  Object,
  localStorage: {
    setItem(key, value) { storage.set(key, value); },
    getItem(key) { return storage.get(key) ?? null; },
    removeItem(key) { storage.delete(key); },
  },
  window: windowObject,
  document: {
    querySelector(selector) {
      if (elements.has(selector)) return elements.get(selector);
      const element = makeElement();
      elements.set(selector, element);
      return element;
    },
  },
  requestAnimationFrame(callback) { callback(); },
  setTimeout,
  clearTimeout,
};

vm.runInNewContext(source, context, { filename: "app.js" });

function renderRoute(hash) {
  windowObject.location.hash = hash;
  listeners["window:hashchange"]?.();
}

function click(action, dataset = {}) {
  listeners.click({
    target: {
      closest() {
        return { dataset };
      },
    },
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function completePlacement() {
  renderRoute("#/placement");
  click("placement-answer", { action: "placement-answer", question: "experience", value: "new" });
  click("placement-answer", { action: "placement-answer", question: "rulesConfidence", value: "court" });
  click("placement-answer", { action: "placement-answer", question: "goal", value: "first-game" });
  assert(app.innerHTML.includes("See my recommended path"), "Placement did not reach its result state.");
}

function completeCourtCheck() {
  renderRoute("#/court");
  click("court-zone", { action: "court-zone", zone: "top-kitchen", category: "kitchen" });
  click("court-zone", { action: "court-zone", zone: "top-left-service", category: "service" });
  click("court-zone", { action: "court-zone", zone: "top-baseline", category: "baseline" });
  assert(app.innerHTML.includes("Start knowledge check"), "Court Lab did not unlock the knowledge check.");
  renderRoute("#/quiz");
  for (const answer of [1, 2, 1, 0]) {
    click("quiz-answer", { action: "quiz-answer", option: String(answer) });
    click("quiz-next", { action: "quiz-next" });
  }
  assert(app.innerHTML.includes("See the unlocked path"), "Kitchen knowledge check did not complete.");
  dismissReward();
}

function dismissReward() {
  if (app.innerHTML.includes('data-action="sticker-dismiss"')) click("sticker-dismiss", { action: "sticker-dismiss" });
}

function completeGuided(lesson, option) {
  renderRoute(`#/lesson/${lesson}`);
  assert(!app.innerHTML.includes("That page landed outside"), `${lesson} rendered as not found.`);
  click("guided-answer", { action: "guided-answer", lesson, option: String(option) });
  assert(app.innerHTML.includes("Completed"), `${lesson} did not complete after its correct answer.`);
  dismissReward();
}

assert(/href="#\/placement">Start learning<\/a>/.test(app.innerHTML), "Fresh header CTA did not start placement.");
assert(/href="#\/placement">Find my starting point/.test(app.innerHTML), "Fresh home CTA did not start placement.");
renderRoute("#/progress");
assert(/href="#\/placement">Find my starting point<\/a>/.test(app.innerHTML), "Fresh progress CTA did not start placement.");

completePlacement();
renderRoute("#/lesson/court-kitchen");
assert(app.innerHTML.includes('data-action="lesson-visual-open"'), "Course lessons must render tappable visual guides.");
click("lesson-visual-open", { action: "lesson-visual-open", lesson: "court-kitchen", visual: "kitchen-bounce" });
assert(app.innerHTML.includes('role="dialog"'), "Tapping a lesson visual did not open its expanded study view.");
assert(app.innerHTML.includes("What to notice") && app.innerHTML.includes("Avoid"), "Expanded lesson visual did not include practical guidance.");
click("lesson-visual-close", { action: "lesson-visual-close" });
completeCourtCheck();
renderRoute("#/learn");
assert(app.innerHTML.includes('href="#/preview/serve-basics"'), "The default path unlocked serving before the ready-position lesson was complete.");
completeGuided("gear-grip", 0);
completeGuided("ready-position", 0);

renderRoute("#/lesson/serve-basics");
click("serve-target", { action: "serve-target", target: "far-right" });
assert(app.innerHTML.includes("Completed"), "Serve drill did not complete.");
dismissReward();

renderRoute("#/learn");
assert(app.innerHTML.includes('style="--progress: 31%"'), "Progress ring did not scale four completed lessons across the 13-lesson path.");

renderRoute("#/lesson/two-bounce");
click("bounce-step", { action: "bounce-step", step: "0" });
click("bounce-step", { action: "bounce-step", step: "1" });
click("bounce-step", { action: "bounce-step", step: "2" });
assert(app.innerHTML.includes("Completed"), "Two-bounce drill did not complete.");
dismissReward();

renderRoute("#/learn");
assert(app.innerHTML.includes('href="#/preview/doubles-score"'), "The default path unlocked scoring before Return & reset was complete.");

completeGuided("return-reset", 0);

renderRoute("#/lesson/doubles-score");
click("score-answer", { action: "score-answer", score: "4 – 2 – 2" });
assert(app.innerHTML.includes("Completed"), "Score drill did not complete.");
dismissReward();

for (const lesson of ["side-out", "dink-volley", "court-position", "faults-calls", "open-play", "game-ready"]) completeGuided(lesson, 0);

renderRoute("#/learn");
assert((app.innerHTML.match(/>Complete<\/span>/g) || []).length === 13, "The completed path did not report all 13 lessons.");
assert(app.innerHTML.includes('style="--progress: 100%"'), "Progress ring did not reach 100% after all live lessons were complete.");
assert(!app.innerHTML.includes("Prototype preview"), "A dead prototype preview remains in the completed path.");

renderRoute("#/placement");
click("reset-arm", { action: "reset-arm" });
click("reset-confirm", { action: "reset-confirm" });
click("placement-answer", { action: "placement-answer", question: "experience", value: "regular" });
click("placement-answer", { action: "placement-answer", question: "rulesConfidence", value: "score" });
click("placement-answer", { action: "placement-answer", question: "goal", value: "technique" });
renderRoute("#/lesson/dink-volley");
assert(!app.innerHTML.includes("That page landed outside"), "Technique recommendation did not open its starting lesson.");

renderRoute("#/placement");
click("reset-arm", { action: "reset-arm" });
click("reset-confirm", { action: "reset-confirm" });
click("placement-answer", { action: "placement-answer", question: "experience", value: "regular" });
click("placement-answer", { action: "placement-answer", question: "rulesConfidence", value: "score" });
click("placement-answer", { action: "placement-answer", question: "goal", value: "etiquette" });
renderRoute("#/lesson/faults-calls");
assert(!app.innerHTML.includes("That page landed outside"), "Etiquette recommendation did not open its starting lesson.");

console.log("Learning-runtime journey passed (placement → Court Lab → quiz → all 13 lessons).");
