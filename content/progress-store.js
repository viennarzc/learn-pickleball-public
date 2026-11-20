import { createFreshProgress, isCurrentProgress, normalizeProgress } from "./progress.js";

// The old key remains a recovery copy: tabs that loaded an earlier release do
// not know about our lock and must not be able to overwrite the new record.
export function coordinatedKey(key) {
  return `${key}:coordinated`;
}

const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const optionalField = (object, name, valid) => object[name] === undefined || valid(object[name]);
const stringArray = (value) => Array.isArray(value) && value.every((item) => typeof item === "string");

function validKnownFields(value, lessonIds) {
  if (!isRecord(value) || !isCurrentProgress(value)) return false;
  if (!["placementAnswers", "diagnosticAnswers", "lessonProgress"].every((name) => optionalField(value, name, isRecord))) return false;
  if (!["courtVisited", "earnedStickers"].every((name) => optionalField(value, name, stringArray))) return false;
  if (!optionalField(value, "practiceLogs", Array.isArray)) return false;
  if (!["courtExplored", "courtKnowledgePassed"].every((name) => optionalField(value, name, (item) => typeof item === "boolean"))) return false;
  if (!["entryRouteId", "activePlaylistId"].every((name) => optionalField(value, name, (item) => item === null || typeof item === "string"))) return false;
  if (!optionalField(value, "lastViewedRoute", (item) => typeof item === "string")) return false;
  return Object.entries(value.lessonProgress || {}).every(([id, lesson]) => {
    if (!lessonIds.has(id)) return true;
    if (!isRecord(lesson)) return false;
    if (!["requiredPages", "optionalPages"].every((name) => optionalField(lesson, name, stringArray))) return false;
    if (!optionalField(lesson, "practiceLogs", Array.isArray) || !optionalField(lesson, "attempts", isRecord)) return false;
    if (!optionalField(lesson, "conceptUnderstood", (item) => typeof item === "boolean")) return false;
    return Object.values(lesson.attempts || {}).every((attempt) => isRecord(attempt)
      && Number.isSafeInteger(attempt.count) && attempt.count >= 0 && typeof attempt.correct === "boolean");
  });
}

function normalizeStored(value, lessonIds) {
  if (!validKnownFields(value, lessonIds)) return null;
  const result = normalizeProgress(value, lessonIds);
  // Keep lessons unknown to this version so an older deployment cannot erase
  // them simply by saving another action.
  if (value.lessonProgress && typeof value.lessonProgress === "object" && !Array.isArray(value.lessonProgress)) {
    for (const [id, entry] of Object.entries(value.lessonProgress)) {
      if (!lessonIds.has(id)) Object.defineProperty(result.lessonProgress, id, { value: entry, enumerable: true, writable: true, configurable: true });
    }
  }
  return result;
}

function parseLegacy(raw, lessonIds) {
  if (raw === null) return createFreshProgress();
  try { return normalizeStored(JSON.parse(raw), lessonIds); } catch { return null; }
}

export function createProgressStore({ key, lessonIds, storage, locks }) {
  const recordKey = coordinatedKey(key);
  const lockName = `${recordKey}:lock`;

  function read() {
    try {
      const legacyRaw = storage.getItem(key);
      const raw = storage.getItem(recordKey);
      if (raw === null) {
        const progress = parseLegacy(legacyRaw, lessonIds);
        return progress
          ? { status: "ready", progress, generation: 0, legacyRaw, record: null }
          : { status: "invalid" };
      }
      let record;
      try { record = JSON.parse(raw); } catch { return { status: "invalid" }; }
      if (!record || record.schema !== 1 || !Number.isSafeInteger(record.generation) || record.generation < 0
          || !(typeof record.legacyRaw === "string" || record.legacyRaw === null)
          || !Array.isArray(record.recovery)) return { status: "invalid" };
      const progress = normalizeStored(record.progress, lessonIds);
      if (!progress) return { status: "invalid" };
      const legacyChanged = legacyRaw !== record.legacyRaw;
      return {
        status: legacyChanged ? "legacy-changed" : "ready", progress,
        generation: record.generation, legacyRaw, record,
        legacyProgress: legacyChanged ? parseLegacy(legacyRaw, lessonIds) : null,
      };
    } catch {
      return { status: "unavailable" };
    }
  }

  async function withLock(operation) {
    if (!locks || typeof locks.request !== "function") return { status: "unsupported" };
    try {
      return await locks.request(lockName, { mode: "exclusive" }, operation);
    } catch {
      return { status: "unavailable" };
    }
  }

  // `change` runs synchronously while the lock is held. It receives a fresh
  // copy read under the lock; the tab's stale snapshot is never written back.
  async function update(expectedGeneration, change, { reset = false } = {}) {
    return withLock(() => {
      const current = read();
      if (current.status !== "ready") return current;
      if (current.generation !== expectedGeneration) return { ...current, status: "reset-conflict" };
      const next = reset ? createFreshProgress() : current.progress;
      let value;
      try {
        value = change?.(next);
        const record = {
          schema: 1,
          generation: current.generation + (reset ? 1 : 0),
          progress: next,
          legacyRaw: current.legacyRaw,
          recovery: reset ? [] : (current.record?.recovery || []),
        };
        storage.setItem(recordKey, JSON.stringify(record));
        // An older tab does not honor our lock. Re-read after the write to
        // surface a legacy change rather than silently choosing either copy.
        const saved = read();
        return { ...saved, progress: saved.progress || next, generation: saved.generation ?? record.generation, value, committed: true };
      } catch {
        return { status: "unavailable" };
      }
    });
  }

  // A learner explicitly chooses between the two copies after closing/reloading
  // old tabs. Save both copies in the same atomic write before replacing one.
  async function resolveLegacy(choice, expected) {
    return withLock(() => {
      const current = read();
      if (current.status !== "legacy-changed") return current;
      if (!expected || expected.generation !== current.generation || expected.legacyRaw !== current.legacyRaw) return current;
      if (choice !== "current" && choice !== "legacy") return { status: "invalid-choice" };
      if (choice === "legacy" && !current.legacyProgress) return { ...current, status: "invalid-legacy" };
      const record = {
        schema: 1,
        generation: current.generation + 1,
        progress: choice === "legacy" ? current.legacyProgress : current.progress,
        legacyRaw: current.legacyRaw,
        recovery: [...current.record.recovery, { progress: current.progress, legacyRaw: current.legacyRaw }],
      };
      try {
        storage.setItem(recordKey, JSON.stringify(record));
        const saved = read();
        return { ...saved, progress: saved.progress || record.progress, generation: saved.generation ?? record.generation, committed: true };
      } catch {
        return { status: "unavailable" };
      }
    });
  }

  return { recordKey, read, update, resolveLegacy };
}
