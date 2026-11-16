/*
 * Loads the real app.js into a sandbox with fake window/document, the same way
 * the scripts/check-*.mjs files do, so tests can visit URLs and see which view
 * app.js rendered. Each view function is wrapped to record that it ran.
 */
import { readFileSync, readdirSync } from "node:fs";
import vm from "node:vm";
import * as curriculum from "../../content/curriculum.js";
import * as progressModule from "../../content/progress.js";
import * as routing from "../../routing/simple-router.js";
import * as scoring from "../../content/scoring-walkthrough.js";

// Router view name -> app.js function that renders it.
export const VIEW_FUNCTIONS = {
  home: "renderHome",
  placement: "renderPlacement",
  learn: "renderLearn",
  scoring: "renderScoring",
  practice: "renderPractice",
  court: "renderCourt",
  library: "renderLibrary",
  progress: "renderProgress",
  lesson: "renderLesson",
  notFound: "renderNotFound",
};

export function loadApp({ hash = "#/", search = "" } = {}) {
  const source = readFileSync(new URL("../../app.js", import.meta.url), "utf8")
    .replace(/^import\s*\{[\s\S]*?\}\s*from\s*"\.\/[^"]+";\s*/gm, "");
  const local = new Map();
  const session = new Map();
  const listeners = {};
  const app = { innerHTML: "" };
  const window = {
    location: { hash, search },
    localStorage: { getItem: (k) => local.get(k) ?? null, setItem: (k, v) => local.set(k, v), removeItem: (k) => local.delete(k) },
    sessionStorage: { getItem: (k) => session.get(k) ?? null, setItem: (k, v) => session.set(k, v), removeItem: (k) => session.delete(k) },
    history: { replaceState: (_state, _title, url) => { window.location.hash = url; } },
    addEventListener: (type, fn) => { listeners[type] = fn; },
  };
  const document = {
    title: "",
    querySelector: (selector) => (selector === "#app" ? app : null),
    querySelectorAll: () => [],
    addEventListener() {},
  };
  const previousWindow = globalThis.window;
  globalThis.window = window; // content/progress.js reads storage through the global window
  const context = { ...curriculum, ...progressModule, ...routing, ...scoring, URLSearchParams, console, setTimeout, clearTimeout, window, document, requestAnimationFrame() {} };
  vm.createContext(context);
  vm.runInContext(source, context);

  const rendered = [];
  for (const [view, name] of Object.entries(VIEW_FUNCTIONS)) {
    const original = context[name];
    context[name] = (...args) => { rendered.push(view); return original(...args); };
  }

  // Current tab = the nav link marked aria-current (header and bottom bar).
  const currentNav = () => [...new Set([...app.innerHTML.matchAll(/data-nav-area="([a-z]+)" aria-current="page"/g)].map((m) => m[1]))];

  return {
    app,
    document,
    window,
    // Render a URL and report what happened.
    visit(url) {
      window.location.hash = url;
      rendered.length = 0;
      context.render();
      return { views: [...rendered], html: app.innerHTML, title: document.title, nav: currentNav() };
    },
    // Simulate the browser's hashchange event after a link click.
    followLink(url) {
      window.location.hash = url;
      rendered.length = 0;
      listeners.hashchange();
      return { views: [...rendered], nav: currentNav() };
    },
    // Call a top-level app.js function by name (e.g. recordLessonPage).
    call(name, ...args) {
      return context[name](...args);
    },
    dispose() {
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
    },
  };
}

// Deep links published on the public SEO pages (learn-pickleball/**/index.html).
export function publicPageDeepLinks() {
  const root = new URL("../../learn-pickleball/", import.meta.url);
  const folders = ["", ...readdirSafe(root)];
  const links = folders.flatMap((folder) => {
    const html = readFileSync(new URL(`${folder ? `${folder}/` : ""}index.html`, root), "utf8");
    return [...html.matchAll(/href="\/(#\/[^"]*)"/g)].map((match) => match[1].replaceAll("&amp;", "&"));
  });
  return [...new Set(links)].sort();
}

function readdirSafe(url) {
  return readdirSync(url, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}
