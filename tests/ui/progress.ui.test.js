import assert from "node:assert/strict";
import { after, before, it } from "node:test";
import { fileURLToPath } from "node:url";
import { launchBrowser } from "./browser.js";
import { startStaticServer } from "./static-server.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const OLD_KEY = "learn-pickleball:v2";
const NEW_KEY = `${OLD_KEY}:coordinated`;
const saved = `JSON.parse(localStorage.getItem(${JSON.stringify(NEW_KEY)}))`;
const hasPage = (id) => `${saved}?.progress.lessonProgress["court-orientation"]?.requiredPages.includes(${JSON.stringify(id)})`;
let browser;
let server;

before(async () => {
  server = await startStaticServer(ROOT);
  browser = await launchBrowser();
});
after(async () => { await browser?.close(); await server?.close(); });

async function openPair(firstHash, secondHash, secondOptions) {
  const first = await browser.newPage();
  const second = await first.newSibling(secondOptions);
  await Promise.all([first.goto(`${server.url}/${firstHash}`), second.goto(`${server.url}/${secondHash}`)]);
  await Promise.all([first.waitFor('!!document.querySelector("main")'), second.waitFor('!!document.querySelector("main")')]);
  return { first, second };
}

async function holdLock(page) {
  await page.evaluate(`new Promise((ready) => {
    navigator.locks.request(${JSON.stringify(`${NEW_KEY}:lock`)}, async () => {
      await new Promise((release) => { window.releaseProgressLock = release; ready(); });
    });
  })`);
}

async function waitForFirstPending(page) {
  await page.waitFor('navigator.locks.query().then(({ pending }) => pending.some((lock) => lock.name === "learn-pickleball:v2:coordinated:lock"))', { timeout: 10000 });
}

async function waitForPending(page, { timeout = 10000 } = {}) {
  await page.waitFor('navigator.locks.query().then(({ pending }) => pending.filter((lock) => lock.name === "learn-pickleball:v2:coordinated:lock").length >= 2)', { timeout });
}

async function waitForInitialCompletion(page, { timeout = 5000 } = {}) {
  // The storage write precedes the action's UI update. Wait for both before
  // navigating away and starting a reset in the same tab.
  await page.waitFor(`${hasPage("why-court")} && !!document.querySelector(".lesson-page .is-complete")`, { timeout });
}

it("waits for the page action to finish after its storage write", async () => {
  const initScript = `(() => {
    const request = navigator.locks.request.bind(navigator.locks);
    let delay = true;
    navigator.locks.request = (...args) => {
      const result = request(...args);
      if (!delay || args[0] !== "learn-pickleball:v2:coordinated:lock") return result;
      delay = false;
      return result.then((value) => new Promise((resolve) => { window.finishInitialSave = () => resolve(value); }));
    };
  })()`;
  const page = await browser.newPage({ initScript });
  try {
    await page.goto(`${server.url}/#/lesson/court-orientation?page=why-court`);
    await page.waitFor('!!document.querySelector(\'[data-action="page-complete"]\')');
    await page.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await page.waitFor(`${hasPage("why-court")} && typeof window.finishInitialSave === "function"`);
    await assert.rejects(waitForInitialCompletion(page, { timeout: 150 }), /Timed out/);
    await page.evaluate("window.finishInitialSave()");
    await waitForInitialCompletion(page);
  } finally {
    await page.evaluate("window.finishInitialSave?.()").catch(() => {});
    await page.close();
  }
});

it("waits for two pending progress locks", async () => {
  const { first, second } = await openPair("#/", "#/");
  try {
    await holdLock(first);
    await second.evaluate('void navigator.locks.request("learn-pickleball:v2:coordinated:lock", () => {})');
    await first.waitFor('navigator.locks.query().then(({ pending }) => pending.filter((lock) => lock.name === "learn-pickleball:v2:coordinated:lock").length === 1)');
    await assert.rejects(waitForPending(first, { timeout: 150 }), /Timed out/);
    await second.evaluate('void navigator.locks.request("learn-pickleball:v2:coordinated:lock", () => {})');
    await waitForPending(first);
    await first.evaluate("window.releaseProgressLock()");
    await first.waitFor('navigator.locks.query().then(({ pending, held }) => ![...pending, ...held].some((lock) => lock.name === "learn-pickleball:v2:coordinated:lock"))');
  } finally {
    await first.evaluate("window.releaseProgressLock?.()").catch(() => {});
    await second.close();
    await first.close();
  }
});

it("keeps overlapping updates from two real tabs and does not save during navigation", async () => {
  const { first, second } = await openPair("#/lesson/court-orientation?page=why-court", "#/lesson/court-orientation?page=name-lines");
  try {
    await holdLock(first);
    await first.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await second.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await waitForPending(first);
    await first.evaluate("window.releaseProgressLock() ");
    try {
      await first.waitFor(`${hasPage("why-court")} && ${hasPage("name-lines")}`);
    } catch (error) {
      const state = await Promise.all([first, second].map((page) => page.evaluate(`({ saved: ${saved}, url: location.href, notice: document.querySelector("#storage-notice").textContent })`)));
      throw new Error(`${error.message}; tab states: ${JSON.stringify(state)}`);
    }
    await second.waitFor(`${hasPage("why-court")} && ${hasPage("name-lines")}`);
    const before = await first.evaluate(`localStorage.getItem(${JSON.stringify(NEW_KEY)})`);
    await second.evaluate('location.hash = "#/practice"');
    await second.waitFor('document.querySelector("main")?.dataset.view === "practice"');
    assert.equal(await first.evaluate(`localStorage.getItem(${JSON.stringify(NEW_KEY)})`), before);
    assert.deepEqual((await first.evaluate(saved)).progress.lessonProgress["court-orientation"].requiredPages.sort(), ["name-lines", "why-court"]);
    await Promise.all([first.evaluate('location.hash = "#/lesson/court-orientation?page=court-recall"'), second.evaluate('location.hash = "#/lesson/court-orientation?page=court-recall"')]);
    await Promise.all([first.waitFor('!!document.querySelector(\'[data-action="page-answer"]\')'), second.waitFor('!!document.querySelector(\'[data-action="page-answer"]\')')]);
    await holdLock(first);
    await first.evaluate('document.querySelector(\'[data-action="page-answer"][data-index="0"]\').click()');
    await second.evaluate('document.querySelector(\'[data-action="page-answer"][data-index="1"]\').click()');
    await waitForPending(first);
    await first.evaluate("window.releaseProgressLock()");
    await first.waitFor(`${saved}?.progress.lessonProgress["court-orientation"]?.attempts["court-recall-check"]?.count === 2`);
    assert.deepEqual((await first.evaluate(saved)).progress.lessonProgress["court-orientation"].attempts["court-recall-check"], { count: 2, correct: true });
    assert.deepEqual([...first.errors, ...second.errors], []);
  } finally { await second.close(); await first.close(); }
});

it("rejects a stale action queued behind a reset", async () => {
  const { first, second } = await openPair("#/lesson/court-orientation?page=why-court", "#/lesson/court-orientation?page=name-lines");
  try {
    await first.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await waitForInitialCompletion(first);
    await second.waitFor(hasPage("why-court"));
    await first.evaluate('location.hash = "#/progress"');
    await first.waitFor('document.querySelector("main")?.dataset.view === "progress"');
    await first.evaluate('document.querySelector(\'[data-action="reset-arm"]\').click()');
    await first.waitFor('!!document.querySelector(\'[data-action="reset-confirm"]\')');
    await holdLock(first);
    await first.evaluate('document.querySelector(\'[data-action="reset-confirm"]\').click()');
    await waitForFirstPending(first);
    await second.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await waitForPending(first);
    await first.evaluate("window.releaseProgressLock()");
    try {
      await first.waitFor(`${saved}?.generation === 1`);
    } catch (error) {
      const states = await Promise.all([first, second].map((page) => page.evaluate(`(async () => ({
        url: location.href,
        saved: localStorage.getItem("learn-pickleball:v2:coordinated"),
        notice: { hidden: document.querySelector("#storage-notice").hidden, text: document.querySelector("#storage-notice").textContent },
        locks: await navigator.locks.query(),
      }))()`)));
      throw new Error(`${error.message}; tab states: ${JSON.stringify(states)}; browser errors: ${JSON.stringify([...first.errors, ...second.errors])}`, { cause: error });
    }
    await second.waitFor('!document.querySelector("#storage-notice").hidden');
    const record = await first.evaluate(saved);
    assert.equal(record.generation, 1);
    assert.deepEqual(record.progress.lessonProgress, {});
    assert.match(await second.evaluate('document.querySelector("#storage-notice").textContent'), /changed in another tab/);
  } finally { await second.close(); await first.close(); }
});

it("keeps the reset-conflict warning through delayed notifications until a retry succeeds", async () => {
  // Delay only the app's reset storage event, so it arrives after the queued
  // stale action has already been rejected and its warning has appeared.
  const initScript = `(() => {
    const add = window.addEventListener;
    window.addEventListener = function(type, listener, options) {
      if (type !== "storage") return add.call(this, type, listener, options);
      return add.call(this, type, function(event) {
        if (event.key === "learn-pickleball:v2:coordinated" && JSON.parse(event.newValue || "null")?.generation === 1) {
          window.delayedResetEvent = () => listener.call(window, event);
        } else listener.call(window, event);
      }, options);
    };
  })()`;
  const { first, second } = await openPair("#/lesson/court-orientation?page=why-court", "#/lesson/court-orientation?page=name-lines", { initScript });
  try {
    await first.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await waitForInitialCompletion(first);
    await first.evaluate('location.hash = "#/progress"');
    await first.waitFor('document.querySelector("main")?.dataset.view === "progress"');
    await first.evaluate('document.querySelector(\'[data-action="reset-arm"]\').click()');
    await first.waitFor('!!document.querySelector(\'[data-action="reset-confirm"]\')');
    await holdLock(first);
    await first.evaluate('document.querySelector(\'[data-action="reset-confirm"]\').click()');
    await waitForFirstPending(first);
    await second.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await waitForPending(first);
    await first.evaluate("window.releaseProgressLock()");
    await second.waitFor('!document.querySelector("#storage-notice").hidden');
    await second.waitFor('typeof window.delayedResetEvent === "function"');
    assert.match(await second.evaluate('document.querySelector("#storage-notice").textContent'), /changed in another tab/);
    assert.deepEqual((await second.evaluate(saved)).progress.lessonProgress, {});

    await second.evaluate('window.delayedResetEvent(); window.dispatchEvent(new Event("pageshow"))');
    assert.equal(await second.evaluate('document.querySelector("#storage-notice").hidden'), false);
    assert.match(await second.evaluate('document.querySelector("#storage-notice").textContent'), /changed in another tab/);

    // An older-tab conflict takes priority, then the reset warning reappears
    // after the learner has resolved that separate conflict.
    await first.evaluate(`localStorage.setItem("learn-pickleball:v2", JSON.stringify({ ...JSON.parse(localStorage.getItem("learn-pickleball:v2:coordinated")).progress, entryRouteId: "never-played" }))`);
    await second.waitFor('!document.querySelector("[data-storage-recovery]").hidden');
    await second.evaluate('document.querySelector(\'[data-action="legacy-keep"]\').click()');
    await second.waitFor(`${saved}?.generation === 2 && !document.querySelector("#storage-notice").hidden && document.querySelector("#storage-notice").textContent.includes("changed in another tab")`);

    await second.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await second.waitFor(`${hasPage("name-lines")} && document.querySelector("#storage-notice").hidden`);
    assert.equal((await second.evaluate(saved)).generation, 2);
  } finally {
    await first.evaluate("window.releaseProgressLock?.()").catch(() => {});
    await second.close();
    await first.close();
  }
});

it("does not dismiss the warning for an action queued before the warning appeared", async () => {
  const { first, second } = await openPair("#/lesson/court-orientation?page=why-court", "#/lesson/court-orientation?page=name-lines");
  try {
    await second.evaluate(`window.sawResetEvent = false; window.addEventListener("storage", (event) => {
      if (event.key === "learn-pickleball:v2:coordinated" && JSON.parse(event.newValue || "null")?.generation === 1) window.sawResetEvent = true;
    })`);
    await first.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await waitForInitialCompletion(first);
    await first.evaluate('location.hash = "#/progress"');
    await first.waitFor('document.querySelector("main")?.dataset.view === "progress"');
    await first.evaluate('document.querySelector(\'[data-action="reset-arm"]\').click()');
    await first.waitFor('!!document.querySelector(\'[data-action="reset-confirm"]\')');
    await holdLock(first);
    await first.evaluate('document.querySelector(\'[data-action="reset-confirm"]\').click()');
    await waitForFirstPending(first);
    await first.evaluate('void navigator.locks.request("learn-pickleball:v2:coordinated:lock", () => new Promise((release) => { window.releaseBetween = release; }))');
    await second.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await first.waitFor('navigator.locks.query().then(({ pending }) => pending.filter((lock) => lock.name === "learn-pickleball:v2:coordinated:lock").length >= 3)');
    await first.evaluate("window.releaseProgressLock()");
    await first.waitFor('typeof window.releaseBetween === "function"');
    await second.waitFor("window.sawResetEvent");

    // This action captures the new generation, but was queued before the first
    // action reported its conflict. Its success must not dismiss that notice.
    await second.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await first.evaluate("window.releaseBetween()");
    await second.waitFor(`${hasPage("name-lines")} && !!document.querySelector(".lesson-page .is-complete")`);
    assert.equal(await second.evaluate('document.querySelector("#storage-notice").hidden'), false);
    assert.match(await second.evaluate('document.querySelector("#storage-notice").textContent'), /changed in another tab/);

    await second.evaluate('location.hash = "#/lesson/court-orientation?page=why-court"');
    await second.waitFor('document.querySelector(\'[data-action="page-complete"]\')?.dataset.page === "why-court"');
    await second.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await second.waitFor(`${hasPage("why-court")} && document.querySelector("#storage-notice").hidden`);
  } finally {
    await first.evaluate("window.releaseProgressLock?.(); window.releaseBetween?.()").catch(() => {});
    await second.close();
    await first.close();
  }
});

it("stops for a changed older-tab copy and preserves both when the learner chooses", async () => {
  const { first, second } = await openPair("#/lesson/court-orientation?page=why-court", "#/lesson/court-orientation?page=name-lines");
  try {
    await first.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await first.waitFor(hasPage("why-court"));
    await second.waitFor(hasPage("why-court"));
    await first.evaluate(`localStorage.setItem(${JSON.stringify(OLD_KEY)}, JSON.stringify({ ...${saved}.progress, entryRouteId: "never-played" }))`);
    await second.waitFor('!document.querySelector("[data-storage-recovery]").hidden');
    await second.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    assert.equal(await second.evaluate(hasPage("name-lines")), false);
    await second.evaluate('document.querySelector(\'[data-action="legacy-keep"]\').click()');
    await second.waitFor(`${saved}?.recovery.length === 1`);
    const record = await second.evaluate(saved);
    assert.equal(record.progress.entryRouteId, null);
    assert.equal(JSON.parse(record.recovery[0].legacyRaw).entryRouteId, "never-played");
    assert.deepEqual(record.recovery[0].progress.lessonProgress["court-orientation"].requiredPages, ["why-court"]);
    await second.evaluate('location.hash = "#/progress"');
    await second.waitFor('!!document.querySelector(\'[data-action="download-recovery"]\')');
    await second.evaluate(`(() => {
      const create = URL.createObjectURL;
      URL.createObjectURL = (blob) => { window.recoveryBlob = blob; return create(blob); };
      HTMLAnchorElement.prototype.click = function() { window.recoveryFilename = this.download; };
      document.querySelector('[data-action="download-recovery"]').click();
    })()`);
    assert.equal(await second.evaluate("window.recoveryFilename"), "learn-pickleball-recovery.json");
    const backup = await second.evaluate("window.recoveryBlob.text().then(JSON.parse)");
    assert.equal(JSON.parse(backup.copies[0].legacyRaw).entryRouteId, "never-played");
  } finally { await second.close(); await first.close(); }
});

it("does not report a successful reset when the write fails", async () => {
  const { first, second } = await openPair("#/lesson/court-orientation?page=why-court", "#/progress");
  try {
    await first.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await first.waitFor(hasPage("why-court"));
    await second.waitFor(hasPage("why-court"));
    await second.evaluate('document.querySelector(\'[data-action="reset-arm"]\').click()');
    await second.waitFor('!!document.querySelector(\'[data-action="reset-confirm"]\')');
    await second.evaluate(`(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(name, value) {
        if (name === "learn-pickleball:v2:coordinated") throw Error("quota");
        return original.call(this, name, value);
      };
    })()`);
    await second.evaluate('localStorage.setItem("unrelated-key", "still writable")');
    assert.equal(await second.evaluate('localStorage.getItem("unrelated-key")'), "still writable");
    await second.evaluate('document.querySelector(\'[data-action="reset-confirm"]\').click()');
    await second.waitFor('!document.querySelector("#storage-notice").hidden');
    assert.equal(await first.evaluate(hasPage("why-court")), true);
    assert.match(await second.evaluate('document.querySelector("#storage-notice").textContent'), /could not be reset/);
    assert.doesNotMatch(await second.evaluate('document.querySelector("#toast-region").textContent'), /Fresh v2/);
  } finally { await second.close(); await first.close(); }
});

it("keeps queued actions in memory after a transient write failure", async () => {
  const { first, second } = await openPair("#/lesson/court-orientation?page=why-court", "#/");
  try {
    await holdLock(first);
    await first.evaluate(`(() => {
      const original = Storage.prototype.setItem;
      window.writeAttempts = 0;
      Storage.prototype.setItem = function(name, value) {
        if (name === ${JSON.stringify(NEW_KEY)} && ++window.writeAttempts === 1) throw Error("quota");
        return original.call(this, name, value);
      };
    })()`);
    await first.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await first.evaluate('location.hash = "#/lesson/court-orientation?page=name-lines"');
    await first.waitFor('document.querySelector(\'[data-action="page-complete"]\')?.dataset.page === "name-lines"');
    await first.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await first.evaluate("window.releaseProgressLock()");
    await first.waitFor('!document.querySelector("#storage-notice").hidden && document.querySelector(".lesson-page .is-complete")');
    assert.equal(await first.evaluate("window.writeAttempts"), 1);
    assert.equal(await first.evaluate(`localStorage.getItem(${JSON.stringify(NEW_KEY)})`), null);
    await first.evaluate('location.hash = "#/lesson/court-orientation?page=why-court"');
    await first.waitFor('!!document.querySelector(".lesson-page .is-complete")');
  } finally { await second.close(); await first.close(); }
});

it("leaves unreadable saved progress untouched when a learner continues", async () => {
  const first = await browser.newPage();
  const second = await first.newSibling();
  try {
    await first.goto(`${server.url}/#/`);
    await first.evaluate(`localStorage.setItem(${JSON.stringify(OLD_KEY)}, "{broken")`);
    await second.goto(`${server.url}/#/lesson/court-orientation?page=why-court`);
    await second.waitFor('!document.querySelector("#storage-notice").hidden');
    assert.match(await second.evaluate('document.querySelector("#storage-notice").textContent'), /could not be read/);
    await second.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await second.waitFor('!!document.querySelector(".lesson-page .is-complete")');
    assert.equal(await second.evaluate(`localStorage.getItem(${JSON.stringify(OLD_KEY)})`), "{broken");
    assert.equal(await second.evaluate(`localStorage.getItem(${JSON.stringify(NEW_KEY)})`), null);
  } finally { await second.close(); await first.close(); }
});

it("continues in memory without making an unlocked write when Web Locks are unavailable", async () => {
  const page = await browser.newPage({ initScript: 'Object.defineProperty(navigator, "locks", { value: undefined })' });
  try {
    await page.goto(`${server.url}/#/lesson/court-orientation?page=why-court`);
    await page.waitFor('!document.querySelector("#storage-notice").hidden');
    assert.match(await page.evaluate('document.querySelector("#storage-notice").textContent'), /stay in this tab only/);
    await page.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await page.waitFor('!!document.querySelector(".lesson-page .is-complete")');
    assert.equal(await page.evaluate(`localStorage.getItem(${JSON.stringify(NEW_KEY)})`), null);
  } finally { await page.close(); }
});

it("keeps the Library search focused when another tab saves progress", async () => {
  const { first, second } = await openPair("#/lesson/court-orientation?page=why-court", "#/library?view=skills");
  try {
    await second.evaluate(`(() => {
      window.sawProgressEvent = false;
      window.addEventListener("storage", (event) => { if (event.key === ${JSON.stringify(NEW_KEY)}) window.sawProgressEvent = true; });
      const input = document.querySelector('[data-input="library-query"]');
      input.value = "court";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.focus();
      input.setSelectionRange(2, 2);
    })()`);
    await first.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await first.waitFor(hasPage("why-court"));
    await second.waitFor('window.sawProgressEvent && document.activeElement?.matches(\'[data-input="library-query"]\') && document.activeElement.selectionStart === 2');
    assert.equal(await second.evaluate('document.activeElement.value'), "court");
  } finally { await second.close(); await first.close(); }
});

it("moves focus to the lesson heading if another tab completes the focused page", async () => {
  const { first, second } = await openPair("#/lesson/court-orientation?page=why-court", "#/lesson/court-orientation?page=why-court");
  try {
    await second.evaluate('document.querySelector(\'[data-action="page-complete"]\').focus()');
    await first.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await second.waitFor('document.activeElement?.matches("[data-lesson-heading]")');
    assert.equal(await second.evaluate('!!document.querySelector(\'[data-action="page-complete"]\')'), false);
  } finally { await second.close(); await first.close(); }
});

it("does not restart the scoring walkthrough when another tab saves progress", async () => {
  const { first, second } = await openPair("#/lesson/court-orientation?page=why-court", "#/scoring");
  try {
    await second.evaluate(`(() => {
      window.sawProgressEvent = false;
      window.addEventListener("storage", (event) => { if (event.key === ${JSON.stringify(NEW_KEY)}) window.sawProgressEvent = true; });
      document.querySelector('[data-scoring-control="next"]').click();
      document.querySelector('[data-scoring-control="next"]').click();
    })()`);
    assert.equal(await second.evaluate('document.querySelector("[data-scoring-count]").textContent'), "Step 2 of 6");
    await first.evaluate('document.querySelector(\'[data-action="page-complete"]\').click()');
    await second.waitFor("window.sawProgressEvent");
    assert.equal(await second.evaluate('document.querySelector("[data-scoring-count]").textContent'), "Step 2 of 6");
  } finally { await second.close(); await first.close(); }
});
