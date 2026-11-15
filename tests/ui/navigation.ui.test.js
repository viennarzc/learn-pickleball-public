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
