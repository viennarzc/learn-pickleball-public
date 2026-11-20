import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createProgressStore, coordinatedKey } from "../content/progress-store.js";
import { createFreshProgress, recordAttempt, recordPage, recordPractice } from "../content/progress.js";

const key = "learn-pickleball:v2";
const lessonIds = new Set(["court-orientation", "equipment-safety"]);

function memoryStorage() {
  const values = new Map();
  return {
    values,
    getItem: (name) => values.get(name) ?? null,
    setItem: (name, value) => values.set(name, String(value)),
    removeItem: (name) => values.delete(name),
  };
}

function serialLocks() {
  const queues = new Map();
  return {
    request(name, _options, operation) {
      const run = (queues.get(name) || Promise.resolve()).then(operation);
      queues.set(name, run.catch(() => {}));
      return run;
    },
  };
}

function stores(storage = memoryStorage(), locks = serialLocks()) {
  const options = { key, lessonIds, storage, locks };
  return { a: createProgressStore(options), b: createProgressStore(options), storage, locks };
}

describe("coordinated progress", () => {
  it("preserves simultaneous page, attempt, and practice updates from stale snapshots", async () => {
    const { a, b } = stores();
    const first = a.read();
    const second = b.read();
    const outcomes = await Promise.all([
      a.update(first.generation, (state) => recordPage(state, "court-orientation", "why-court")),
      b.update(second.generation, (state) => recordPage(state, "court-orientation", "name-lines")),
      a.update(first.generation, (state) => recordAttempt(state, "court-orientation", "check", false)),
      b.update(second.generation, (state) => recordAttempt(state, "court-orientation", "check", true)),
      a.update(first.generation, (state) => recordPractice(state, "court-orientation", "practice")),
      b.update(second.generation, (state) => recordPractice(state, "court-orientation", "practice")),
    ]);
    assert.ok(outcomes.every((result) => result.committed));
    const saved = a.read().progress;
    assert.deepEqual(saved.lessonProgress["court-orientation"].requiredPages, ["why-court", "name-lines"]);
    assert.deepEqual(saved.lessonProgress["court-orientation"].attempts.check, { count: 2, correct: true });
    assert.equal(saved.practiceLogs.length, 2);
    assert.equal(saved.lessonProgress["court-orientation"].practiceLogs.length, 2);
  });

  it("rejects an action queued before a reset and does not resurrect old progress", async () => {
    const { a, b } = stores();
    await a.update(0, (state) => recordPage(state, "court-orientation", "why-court"));
    const staleGeneration = b.read().generation;
    const [reset, stale] = await Promise.all([
      a.update(staleGeneration, () => {}, { reset: true }),
      b.update(staleGeneration, (state) => recordPage(state, "court-orientation", "name-lines")),
    ]);
    assert.equal(reset.committed, true);
    assert.equal(stale.status, "reset-conflict");
    assert.equal(a.read().generation, 1);
    assert.deepEqual(a.read().progress.lessonProgress, {});
    assert.equal((await b.update(1, (state) => recordPage(state, "court-orientation", "service-courts"))).committed, true);
    assert.deepEqual(a.read().progress.lessonProgress["court-orientation"].requiredPages, ["service-courts"]);
  });

  it("migrates a valid old record without changing it and preserves unknown lessons", async () => {
    const { a, storage } = stores();
    const old = createFreshProgress();
    recordPage(old, "court-orientation", "why-court");
    old.lessonProgress["future-lesson"] = { requiredPages: ["future-page"], extra: "keep" };
    const raw = JSON.stringify(old);
    storage.setItem(key, raw);
    assert.equal(a.read().progress.lessonProgress["future-lesson"].extra, "keep");
    await a.update(0, (state) => recordPage(state, "court-orientation", "name-lines"));
    assert.equal(storage.getItem(key), raw);
    assert.equal(a.read().progress.lessonProgress["future-lesson"].extra, "keep");
  });

  it("protects both copies when an old tab changes the legacy record", async () => {
    const { a, b, storage } = stores();
    const old = createFreshProgress();
    recordPage(old, "court-orientation", "why-court");
    storage.setItem(key, JSON.stringify(old));
    await a.update(0, (state) => recordPage(state, "court-orientation", "name-lines"));
    recordPage(old, "court-orientation", "service-courts");
    storage.setItem(key, JSON.stringify(old));
    assert.equal(b.read().status, "legacy-changed");
    assert.equal((await b.update(0, (state) => recordPage(state, "court-orientation", "another"))).status, "legacy-changed");
    const resolved = await b.resolveLegacy("legacy", b.read());
    assert.equal(resolved.committed, true);
    assert.equal(resolved.generation, 1);
    assert.deepEqual(resolved.progress.lessonProgress["court-orientation"].requiredPages, ["why-court", "service-courts"]);
    assert.deepEqual(resolved.record.recovery[0].progress.lessonProgress["court-orientation"].requiredPages, ["why-court", "name-lines"]);
    assert.equal(resolved.record.recovery[0].legacyRaw, JSON.stringify(old));
    assert.equal((await a.update(0, () => {})).status, "reset-conflict");
  });

  it("requires a fresh choice if the older-tab copy changes again", async () => {
    const { a, storage } = stores();
    await a.update(0, (state) => recordPage(state, "court-orientation", "why-court"));
    const legacy = createFreshProgress();
    recordPage(legacy, "court-orientation", "name-lines");
    storage.setItem(key, JSON.stringify(legacy));
    const shown = a.read();
    recordPage(legacy, "court-orientation", "service-courts");
    storage.setItem(key, JSON.stringify(legacy));
    const result = await a.resolveLegacy("legacy", shown);
    assert.equal(result.status, "legacy-changed");
    assert.equal(result.committed, undefined);
    assert.deepEqual(result.progress.lessonProgress["court-orientation"].requiredPages, ["why-court"]);
  });

  it("retains malformed or incompatible data instead of overwriting it", async () => {
    for (const raw of [
      "{broken",
      JSON.stringify({ version: 999 }),
      JSON.stringify({ version: 2, lessonProgress: { "court-orientation": { requiredPages: "not an array" } } }),
      JSON.stringify({ version: 2, lessonProgress: { "court-orientation": { attempts: { check: { count: "many", correct: true } } } } }),
    ]) {
      const { a, storage } = stores();
      storage.setItem(key, raw);
      assert.equal(a.read().status, "invalid");
      assert.equal((await a.update(0, () => {})).status, "invalid");
      assert.equal(storage.getItem(key), raw);
      assert.equal(storage.getItem(coordinatedKey(key)), null);
    }
    const { a, storage } = stores();
    storage.setItem(coordinatedKey(key), "{broken");
    assert.equal((await a.update(0, () => {})).status, "invalid");
    assert.equal(storage.getItem(coordinatedKey(key)), "{broken");
  });

  it("does not write without locks or when storage fails, including resets", async () => {
    const storage = memoryStorage();
    const unsupported = createProgressStore({ key, lessonIds, storage, locks: null });
    assert.equal((await unsupported.update(0, () => {})).status, "unsupported");
    assert.equal(storage.values.size, 0);
    const { a } = stores(storage);
    storage.setItem = () => { throw new Error("quota"); };
    assert.equal((await a.update(0, () => {}, { reset: true })).status, "unavailable");
    assert.equal(storage.getItem(coordinatedKey(key)), null);
  });

  it("keeps study keys independent", async () => {
    const { a, storage, locks } = stores();
    const study = createProgressStore({ key: "learn-pickleball:study:atlas:v2", lessonIds, storage, locks });
    await Promise.all([
      a.update(0, (state) => recordPage(state, "court-orientation", "why-court")),
      study.update(0, (state) => recordPage(state, "court-orientation", "name-lines")),
    ]);
    assert.deepEqual(a.read().progress.lessonProgress["court-orientation"].requiredPages, ["why-court"]);
    assert.deepEqual(study.read().progress.lessonProgress["court-orientation"].requiredPages, ["name-lines"]);
  });
});
