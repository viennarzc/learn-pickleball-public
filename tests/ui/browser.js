/*
 * Tiny browser driver for UI tests, using the Chrome DevTools Protocol (the
 * protocol Playwright and Puppeteer use underneath) over Node's built-in
 * WebSocket. No npm dependencies; needs Chrome or Chromium installed.
 *
 *   const browser = await launchBrowser();
 *   const page = await browser.newPage({ width: 390, height: 844, mobile: true });
 *   await page.goto(url); await page.tap(".bottom-nav a"); await page.close();
 *   await browser.close();
 *
 * Set CHROME_PATH to use a specific browser binary.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    ...playwrightChromium("/opt/pw-browsers"),
    ...playwrightChromium(join(process.env.HOME ?? "", ".cache/ms-playwright")),
    "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean);
  return candidates.find((path) => existsSync(path)) ?? null;
}

function playwrightChromium(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => /^chromium-\d+$/.test(name)).sort().reverse()
    .map((name) => join(dir, name, "chrome-linux", "chrome"));
}

export async function launchBrowser({ executablePath = findChrome(), timeout = 10_000 } = {}) {
  if (!executablePath) throw new Error("Chrome/Chromium not found. Install it or set CHROME_PATH.");
  const profile = mkdtempSync(join(tmpdir(), "ui-tests-"));
  const child = spawn(executablePath, [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--no-sandbox",
    "--disable-background-networking", "--disable-extensions", "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });

  const endpoint = await new Promise((done, fail) => {
    let log = "";
    const timer = setTimeout(() => fail(new Error(`Browser did not start:\n${log}`)), timeout);
    child.stderr.on("data", (chunk) => {
      log += chunk;
      const found = log.match(/DevTools listening on (ws:\/\/\S+)/);
      if (found) { clearTimeout(timer); done(found[1]); }
    });
    child.on("exit", (code) => { clearTimeout(timer); fail(new Error(`Browser exited (${code}):\n${log}`)); });
  });

  const cdp = await connect(endpoint);
  return {
    newPage: (viewport) => openPage(cdp, viewport),
    async close() {
      // Wait for the process to exit before deleting its profile folder;
      // Chrome keeps writing to it while shutting down.
      const exited = child.exitCode !== null ? Promise.resolve() : new Promise((done) => child.once("exit", done));
      await cdp.send("Browser.close").catch(() => {});
      cdp.close();
      const forced = setTimeout(() => child.kill("SIGKILL"), 5_000);
      await exited;
      clearTimeout(forced);
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    },
  };
}

// One WebSocket to the browser; commands are matched to replies by id.
async function connect(endpoint) {
  const socket = new WebSocket(endpoint);
  await new Promise((done, fail) => { socket.onopen = done; socket.onerror = fail; });
  let nextId = 0;
  const pending = new Map();
  const listeners = new Set();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id !== undefined) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(`${message.error.message}`));
      else resolve(message.result);
    } else for (const listener of listeners) listener(message);
  };
  return {
    send(method, params = {}, sessionId) {
      const id = ++nextId;
      socket.send(JSON.stringify({ id, method, params, sessionId }));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    on: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    close: () => socket.close(),
  };
}

// A page in its own browser context, so storage starts empty for every page.
async function openPage(cdp, { width = 1280, height = 800, mobile = false, reducedMotion = false } = {}) {
  const { browserContextId } = await cdp.send("Target.createBrowserContext");
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank", browserContextId });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (method, params) => cdp.send(method, params, sessionId);
  const errors = [];
  const stop = cdp.on((message) => {
    if (message.sessionId !== sessionId) return;
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") errors.push(message.params.entry.text);
  });
  await Promise.all([send("Page.enable"), send("Runtime.enable"), send("Log.enable")]);
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: mobile ? 3 : 1, mobile });
  if (reducedMotion) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  if (mobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });

  async function evaluate(expression) {
    const { result, exceptionDetails } = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  }

  // Centre of the element, after checking a user could actually hit it:
  // it exists, has a size, is scrolled into view and is not covered.
  async function hitPoint(selector) {
    const point = await evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return { error: "no element matches" };
      element.scrollIntoView({ block: "center", inline: "center" });
      const box = element.getBoundingClientRect();
      if (!box.width || !box.height) return { error: "element is not visible" };
      const x = box.left + box.width / 2, y = box.top + box.height / 2;
      const hit = document.elementFromPoint(x, y);
      if (!hit || (hit !== element && !element.contains(hit))) return { error: "element is covered by " + (hit?.outerHTML.slice(0, 80) ?? "nothing") };
      return { x, y };
    })()`);
    if (point.error) throw new Error(`${selector}: ${point.error}`);
    return point;
  }

  return {
    errors,
    evaluate,
    async goto(url) {
      const loaded = new Promise((done) => {
        const off = cdp.on((message) => {
          if (message.sessionId === sessionId && message.method === "Page.loadEventFired") { off(); done(); }
        });
      });
      await send("Page.navigate", { url });
      await loaded;
    },
    // Polls a JS expression until it is truthy.
    async waitFor(expression, { timeout = 5_000, interval = 25 } = {}) {
      const deadline = Date.now() + timeout;
      for (;;) {
        if (await evaluate(expression)) return;
        if (Date.now() > deadline) throw new Error(`Timed out after ${timeout} ms waiting for: ${expression}`);
        await new Promise((done) => setTimeout(done, interval));
      }
    },
    // Mouse click, as on desktop.
    async click(selector) {
      const { x, y } = await hitPoint(selector);
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
    },
    // Finger tap, as on a phone (needs a page opened with mobile: true).
    async tap(selector) {
      const { x, y } = await hitPoint(selector);
      await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    },
    async close() {
      stop();
      await cdp.send("Target.disposeBrowserContext", { browserContextId }).catch(() => {});
    },
  };
}
