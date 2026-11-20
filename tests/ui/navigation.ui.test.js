/*
 * UI tests: primary navigation, starting from the root page.
 *
 * Runs the real app in headless Chrome/Chromium. For every navigation tab, a
 * fresh page (empty storage) opens the root URL, the tab is clicked (desktop
 * header) or tapped (mobile bottom bar) at its on-screen position, and the
 * test checks that the app landed on the right page:
 *   - the URL hash is the tab's destination
 *   - the page rendered is the expected view (<main data-view="…">)
 *   - the tapped tab, and only that tab, is marked as the current page
 *   - no JavaScript errors occurred
 *
 * Run with `npm run test:ui`. Needs Chrome/Chromium (set CHROME_PATH if it is
 * not found automatically).
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { launchBrowser } from "./browser.js";
import { startStaticServer } from "./static-server.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

// What each tab must open. Written out on purpose rather than read from the
// router, so a routing mistake cannot leak into the expectations.
const TABS = [
  { id: "learn", hash: "#/learn", view: "learn" },
  { id: "practice", hash: "#/practice", view: "practice" },
  { id: "court", hash: "#/court-lab", view: "court" },
  { id: "library", hash: "#/library?view=skills", view: "library" },
  { id: "progress", hash: "#/progress", view: "progress" },
];

// Below 900px only the bottom bar is shown; from 900px only the header nav.
const DEVICES = [
  { name: "desktop header nav (mouse click)", nav: ".desktop-nav", hiddenNav: ".bottom-nav", viewport: { width: 1280, height: 800 }, action: "click", verb: "clicking" },
  { name: "mobile bottom bar (touch tap)", nav: ".bottom-nav", hiddenNav: ".desktop-nav", viewport: { width: 390, height: 844, mobile: true }, action: "tap", verb: "tapping" },
];

// Snapshot of what the user sees: URL, rendered view, current tab(s).
const screenState = (nav) => `({
  hash: location.hash,
  view: document.querySelector("main#main-content")?.dataset.view ?? null,
  current: [...document.querySelectorAll(${JSON.stringify(`${nav} [aria-current="page"]`)})].map((link) => link.dataset.navArea),
})`;

let server;
let browser;
before(async () => {
  server = await startStaticServer(ROOT);
  browser = await launchBrowser();
});
after(async () => {
  await browser?.close();
  await server?.close();
});

// Polls what the user sees until it matches `expected` (or time runs out),
// then asserts, so a failure shows actual vs expected plus any JS errors.
async function expectScreen(page, nav, expected, { timeout = 5_000 } = {}) {
  const deadline = Date.now() + timeout;
  let actual = await page.evaluate(screenState(nav));
  while (!isDeepStrictEqual(actual, expected) && Date.now() < deadline) {
    await new Promise((done) => setTimeout(done, 25));
    actual = await page.evaluate(screenState(nav));
  }
  assert.deepEqual(actual, expected, page.errors.length ? `JavaScript errors: ${page.errors.join(" | ")}` : undefined);
}

// Opens the root page in a fresh context and waits until the app rendered it.
async function openRoot(device) {
  const page = await browser.newPage(device.viewport);
  await page.goto(`${server.url}/`);
  await page.waitFor(`document.querySelector("main#main-content")?.dataset.view === "home"`);
  return page;
}

for (const device of DEVICES) {
  describe(device.name, () => {
    it("shows all five tabs on the root page, in the visible nav only", async () => {
      const page = await openRoot(device);
      try {
        const visible = await page.evaluate(`({
          shown: [...document.querySelectorAll(${JSON.stringify(`${device.nav} [data-nav-area]`)})].filter((link) => link.getBoundingClientRect().width > 0).map((link) => link.dataset.navArea),
          hiddenNavShown: [...document.querySelectorAll(${JSON.stringify(`${device.hiddenNav} [data-nav-area]`)})].some((link) => link.getBoundingClientRect().width > 0),
        })`);
        assert.deepEqual(visible, { shown: TABS.map((tab) => tab.id), hiddenNavShown: false });
        await expectScreen(page, device.nav, { hash: "", view: "home", current: ["learn"] });
      } finally {
        await page.close();
      }
    });

    for (const tab of TABS) {
      it(`${device.verb} "${tab.id}" on the root page opens ${tab.hash}`, async () => {
        const page = await openRoot(device);
        try {
          await expectScreen(page, device.nav, { hash: "", view: "home", current: ["learn"] });
          await page[device.action](`${device.nav} [data-nav-area="${tab.id}"]`);
          await expectScreen(page, device.nav, { hash: tab.hash, view: tab.view, current: [tab.id] });
          assert.deepEqual(page.errors, [], "JavaScript errors");
        } finally {
          await page.close();
        }
      });
    }
  });
}

const scoringControl = (control) => `[data-scoring-control="${control}"]`;
const walkDiagram = '[data-scoring-diagram]';
const scoringState = `({
  call: [...document.querySelectorAll("[data-scoring-call] strong")].map((number) => +number.textContent),
  server: document.querySelector(".scoring-player.is-serving span")?.textContent,
  side: document.querySelector(".scoring-player.is-serving")?.dataset.side,
})`;

async function expectScoringState(page, expected) {
  await page.waitFor(`JSON.stringify(${scoringState}) === ${JSON.stringify(JSON.stringify(expected))}`);
  assert.deepEqual(await page.evaluate(scoringState), expected);
}

it("opens the ungated doubles walkthrough from Library and reveals the next server", async () => {
  const page = await browser.newPage();
  try {
    await page.goto(`${server.url}/#/library?view=rules`);
    await page.waitFor('document.querySelector("main")?.dataset.view === "library"');
    await page.click("[data-scoring-link]");
    await page.waitFor('document.querySelector("main")?.dataset.view === "scoring"');
    await page.waitFor('!!document.querySelector(".scoring-court")');
    await page.evaluate('document.documentElement.style.scrollBehavior = "auto"');

    for (const [call, server, side] of [
      [[0, 0, 2], "Mira", "right"],
      [[1, 0, 2], "Mira", "left"],
      [[0, 1, 1], "Leo", "right"],
      [[0, 1, 2], "Sam", "left"],
      [[1, 1, 2], "Sam", "right"],
    ]) {
      await page.click(scoringControl("next"));
      await expectScoringState(page, { call, server, side });
    }
    await page.click(scoringControl("next"));
    await page.waitFor('!document.querySelector("[data-scoring-choices]").hidden');
    assert.equal(await page.evaluate('document.querySelector("[data-scoring-count]").textContent'), "Step 6 of 6");
    assert.equal(await page.evaluate('document.querySelector("[data-scoring-choices]").hidden'), false);
    assert.deepEqual(await page.evaluate(scoringState), { call: [1, 1, 2], server: "Sam", side: "right" });
    await page.click('[data-scoring-answer="1"]');
    await expectScoringState(page, { call: [1, 1, 1], server: "Jo", side: "right" });
    assert.equal(await page.evaluate('document.querySelector("[data-scoring-feedback]").textContent'), "Correct.");
    assert.equal(await page.evaluate('document.querySelector(".scoring-track").style.getPropertyValue("--scoring-progress")'), "100%");
    assert.deepEqual(page.errors, []);
  } finally {
    await page.close();
  }
});

it("opens from Keep Score on mobile and stops singles autoplay at the prediction", async () => {
  // Control only the walkthrough's 4.8-second timer so the test cannot race a
  // delayed browser or CI worker while it pauses and restarts autoplay.
  const initScript = `(() => {
    const schedule = window.setTimeout.bind(window);
    const cancel = window.clearTimeout.bind(window);
    const pending = new Map();
    let nextId = 1000000;
    window.setTimeout = (callback, delay, ...args) => {
      if (delay !== 4800) return schedule(callback, delay, ...args);
      const id = nextId++;
      pending.set(id, () => callback(...args));
      return id;
    };
    window.clearTimeout = (id) => { if (pending.has(id)) pending.delete(id); else cancel(id); };
    window.advanceScoringTimer = () => {
      const [id, callback] = pending.entries().next().value || [];
      if (!callback) throw new Error("No scoring timer is pending");
      pending.delete(id);
      callback();
    };
  })()`;
  const page = await browser.newPage({ width: 390, height: 844, mobile: true, initScript });
  try {
    await page.goto(`${server.url}/#/learn`);
    await page.waitFor('document.querySelector("main")?.dataset.view === "learn"');
    const unit = '[data-unit-id="unit-3"]';
    await page.evaluate(`document.documentElement.style.scrollBehavior = "auto"`);
    await page.tap(`${unit} > summary`);
    await page.tap(`${unit} [data-scoring-link]`);
    await page.waitFor('document.querySelector("main")?.dataset.view === "scoring"');
    await page.tap('[data-scoring-format="singles"]');
    await page.tap(scoringControl("auto"));
    await page.waitFor(`document.querySelector('${scoringControl("auto")}').textContent === "Pause autoplay"`);
    await page.evaluate("window.advanceScoringTimer()");
    await page.waitFor('document.querySelector("[data-scoring-count]").textContent === "Step 2 of 6"', { timeout: 8000 });
    assert.deepEqual(await page.evaluate(scoringState), { call: [1, 0], server: "Mira", side: "left" });
    await page.tap(scoringControl("auto"));
    await page.waitFor(`document.querySelector('${scoringControl("auto")}').textContent === "Autoplay"`);
    assert.equal(await page.evaluate(`document.querySelector('${scoringControl("auto")}').textContent`), "Autoplay");
    for (let rally = 0; rally < 3; rally += 1) {
      await page.tap(scoringControl("next"));
      await page.waitFor(`document.querySelector("[data-scoring-count]").textContent === "Step ${rally + 3} of 6"`);
    }
    assert.deepEqual(await page.evaluate(scoringState), { call: [2, 1], server: "Leo", side: "right" });
    await page.tap(scoringControl("auto"));
    await page.waitFor(`document.querySelector('${scoringControl("auto")}').textContent === "Pause autoplay"`);
    await page.evaluate("window.advanceScoringTimer()");
    await page.waitFor('!document.querySelector("[data-scoring-choices]").hidden', { timeout: 8000 });
    assert.equal(await page.evaluate(`document.querySelector('${scoringControl("auto")}').hidden`), true);
    await page.tap('[data-scoring-answer="0"]');
    await expectScoringState(page, { call: [1, 2], server: "Mira", side: "left" });
    assert.match(await page.evaluate('document.querySelector("[data-scoring-feedback]").textContent'), /You chose Mira, from the right/);
    assert.equal(await page.evaluate("document.documentElement.scrollWidth"), 390);
    assert.deepEqual(page.errors, []);
  } finally {
    await page.close();
  }
});

for (const viewport of [
  { width: 390, height: 844, mobile: true },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
  { width: 390, height: 844, mobile: true, reducedMotion: true },
]) {
  it(`shows each serve in its opposite service court at ${viewport.width}px${viewport.reducedMotion ? " with reduced motion" : ""}`, async () => {
    const page = await browser.newPage(viewport);
    try {
      await page.goto(`${server.url}/#/scoring`);
      await page.waitFor('document.querySelector("main")?.dataset.view === "scoring"');
      await page.evaluate('document.documentElement.style.scrollBehavior = "auto"');
      assert.equal(await page.evaluate(`!!document.querySelector('${walkDiagram} .scoring-serve-ball')`), false);
      for (const format of ["doubles", "singles"]) {
        if (format === "singles") await page.click('[data-scoring-format="singles"]');
        for (let step = 0; step < 5; step++) {
          await page.click(scoringControl("next"));
          const actual = await page.evaluate(`(() => {
            const diagram = document.querySelector('[data-scoring-diagram]');
            const ball = diagram.querySelector('.scoring-serve-ball');
            const player = diagram.querySelector('.scoring-player.is-serving');
            const court = diagram.querySelector('.scoring-court').getBoundingClientRect();
            const animation = ball.getAnimations()[0];
            if (animation) { animation.pause(); animation.currentTime = 0; }
            const start = ball.getBoundingClientRect();
            const startX = (start.left + start.width / 2 - court.left) / court.width;
            if (animation) animation.currentTime = 1200;
            const b = ball.getBoundingClientRect();
            const x = (b.left + b.width / 2 - court.left) / court.width;
            const y = (b.top + b.height / 2 - court.top) / court.height;
            return { team: ball.dataset.servingTeam, side: ball.dataset.servingSide,
              playerTeam: player.dataset.team, playerSide: player.dataset.side,
              startX, x, y, animated: !!animation, width: document.documentElement.scrollWidth };
          })()`);
          assert.equal(actual.team, actual.playerTeam);
          assert.equal(actual.side, actual.playerSide);
          const leftColumn = (actual.team === "blue") === (actual.side === "left");
          if (actual.animated) assert.ok(leftColumn ? actual.startX > 0 && actual.startX < .5 : actual.startX > .5 && actual.startX < 1);
          assert.ok(leftColumn ? actual.x > .5 && actual.x < 1 : actual.x > 0 && actual.x < .5);
          assert.ok(actual.team === "blue" ? actual.y > 0 && actual.y < .34 : actual.y > .66 && actual.y < 1);
          assert.equal(actual.animated, !viewport.reducedMotion);
          assert.equal(actual.width, viewport.width);
        }
        await page.click(scoringControl("next"));
        assert.equal(await page.evaluate(`!!document.querySelector('${walkDiagram} .scoring-serve-ball')`), false);
        await page.click('[data-scoring-answer="1"]');
        assert.equal(await page.evaluate(`!!document.querySelector('${walkDiagram} .scoring-serve-ball')`), true);
        await page.click(scoringControl("back"));
        assert.equal(await page.evaluate(`!!document.querySelector('${walkDiagram} .scoring-serve-ball')`), true);
      }
      assert.deepEqual(page.errors, []);
    } finally {
      await page.close();
    }
  });
}

it("simulates scoring, service handoffs, scenarios and game completion", async () => {
  const page = await browser.newPage({ width: 390, height: 844, mobile: true });
  try {
    await page.goto(`${server.url}/#/scoring`);
    await page.waitFor('!!document.querySelector("[data-sim-diagram] .scoring-court")');
    await page.evaluate('document.documentElement.style.scrollBehavior = "auto"');
    const state = () => page.evaluate(`({call: [...document.querySelectorAll('[data-sim-call] strong')].map(x => +x.textContent), server: document.querySelector('[data-sim-diagram] .is-serving span')?.textContent, status: document.querySelector('[data-sim-status]').textContent})`);
    assert.deepEqual((await state()).call, [0, 0, 2]);
    await page.click('[data-sim-winner="serving"]');
    assert.deepEqual((await state()).call, [1, 0, 2]);
    await page.click('[data-sim-winner="receiving"]');
    assert.equal((await state()).server, "Leo");
    await page.click('[data-sim-winner="receiving"]');
    assert.equal((await state()).server, "Sam");
    await page.click('[data-sim-winner="receiving"]');
    assert.equal((await state()).server, "Jo");
    await page.click('[data-sim-scenario="partner"]');
    assert.equal((await state()).server, "Leo");
    await page.click('[data-sim-scenario="sideout"]');
    assert.equal((await state()).server, "Sam");
    await page.click('[data-sim-format="singles"]');
    assert.deepEqual((await state()).call, [0, 0]);
    await page.click('[data-sim-scenario="odd"]');
    assert.deepEqual((await state()).call, [1, 0]);
    await page.click('[data-sim-winner="receiving"]');
    assert.equal((await state()).server, "Leo");
    await page.click('[data-sim-reset]');
    for (let i = 0; i < 11; i++) await page.click('[data-sim-winner="serving"]');
    assert.match((await state()).status, /Blue wins 11–0/);
    assert.equal(await page.evaluate('document.querySelector("[data-sim-winner=serving]").disabled'), true);
    await page.click('[data-sim-reset]');
    assert.deepEqual((await state()).call, [0, 0]);
    assert.deepEqual(page.errors, []);
  } finally { await page.close(); }
});
