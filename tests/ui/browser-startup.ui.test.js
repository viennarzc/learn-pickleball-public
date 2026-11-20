import assert from "node:assert/strict";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { launchBrowser } from "./browser.js";

test("a browser that never starts is terminated when startup times out", { skip: process.platform === "win32" }, async () => {
  const dir = mkdtempSync(join(tmpdir(), "browser-startup-test-"));
  const executable = join(dir, "fake-browser");
  const pidFile = join(dir, "pid");
  const previous = process.env.BROWSER_TEST_PID_FILE;
  process.env.BROWSER_TEST_PID_FILE = pidFile;
  writeFileSync(executable, '#!/bin/sh\nprintf "%s" "$$" > "$BROWSER_TEST_PID_FILE"\nexec sleep 60\n');
  chmodSync(executable, 0o755);
  try {
    await assert.rejects(launchBrowser({ executablePath: executable, timeout: 1000 }), /Browser did not start/);
    const pid = Number(readFileSync(pidFile, "utf8"));
    assert.throws(() => process.kill(pid, 0), (error) => error.code === "ESRCH");
  } finally {
    if (previous === undefined) delete process.env.BROWSER_TEST_PID_FILE;
    else process.env.BROWSER_TEST_PID_FILE = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});
