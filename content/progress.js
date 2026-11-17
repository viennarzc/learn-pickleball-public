export const APP_VERSION = 2;

const STORAGE = Object.freeze({
  namespace: "learn-pickleball",
  study: "study",
  versionPrefix: "v",
});

export const STORE_KEY = `${STORAGE.namespace}:${STORAGE.versionPrefix}${APP_VERSION}`;

export const STUDY_CONDITIONS = Object.freeze({
  BASELINE: "baseline",
  DISCOVERY: "discovery",
  ATLAS: "atlas",
});

export const COURT_ZONES = Object.freeze({
  KITCHEN: "kitchen",
  SERVICE: "service",
  BASELINE: "baseline",
});

const studyConditionValues = Object.freeze(Object.values(STUDY_CONDITIONS));
const courtZoneValues = Object.freeze(Object.values(COURT_ZONES));

export function studyCondition(search = "") {
  const condition = new URLSearchParams(search).get("study");
  return studyConditionValues.includes(condition) ? condition : null;
}

export function progressKey(condition) {
  return condition
    ? `${STORAGE.namespace}:${STORAGE.study}:${condition}:${STORAGE.versionPrefix}${APP_VERSION}`
    : STORE_KEY;
}

export function createFreshProgress() {
  return {
    version: APP_VERSION,
    entryRouteId: null,
    activePlaylistId: null,
    placementAnswers: {},
    diagnosticAnswers: {},
    lessonProgress: {},
    practiceLogs: [],
    courtVisited: [],
    courtKnowledgePassed: false,
    courtExplored: false,
    earnedStickers: [],
    lastViewedRoute: "#/",
  };
}

// --- Normalization helpers -------------------------------------------------
// Stored progress comes from localStorage, so every field may be missing,
// malformed, or left over from an older preview. Each helper below accepts a
// raw value and returns a safe value; normalizeProgress composes them in order.

const courtZoneSet = new Set(courtZoneValues);

export function isObject(value) {
  return Boolean(value) && typeof value === "object";
}

export function objectOrEmpty(value) {
  return isObject(value) ? value : {};
}

export function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

export function uniqueArrayOrEmpty(value) {
  return [...new Set(arrayOrEmpty(value))];
}

export function stringOrDefault(value, fallback) {
  return typeof value === "string" ? value : fallback;
}

// Step 1: only a progress object written by the current app version is kept.
export function isCurrentProgress(value) {
  return isObject(value) && value.version === APP_VERSION;
}

// Step 2a: drop stored lessons that no longer exist in the curriculum.
export function selectKnownLessons(lessonProgress, lessonIds) {
  return Object.entries(objectOrEmpty(lessonProgress))
    .filter(([id]) => lessonIds.has(id));
}

// Step 2b: give one stored lesson the same shape as a fresh lesson record.
export function normalizeLessonEntry(lesson) {
  const stored = objectOrEmpty(lesson);
  return {
    requiredPages: uniqueArrayOrEmpty(stored.requiredPages),
    optionalPages: uniqueArrayOrEmpty(stored.optionalPages),
    attempts: objectOrEmpty(stored.attempts),
    conceptUnderstood: stored.conceptUnderstood === true,
    practiceLogs: arrayOrEmpty(stored.practiceLogs),
  };
}

// Step 2: known lessons (2a) are normalized one by one (2b).
export function normalizeLessonProgress(lessonProgress, lessonIds) {
  const knownLessons = selectKnownLessons(lessonProgress, lessonIds);
  return Object.fromEntries(knownLessons.map(([id, lesson]) => [id, normalizeLessonEntry(lesson)]));
}

// Step 3a: keep each valid court zone once.
export function normalizeCourtVisited(courtVisited) {
  return uniqueArrayOrEmpty(courtVisited).filter((zone) => courtZoneSet.has(zone));
}

// Step 3b: depends on the *normalized* results of step 3a and the map check.
// Earlier v2 previews unlocked Court Lab after zone visits alone. A current
// completion always represents both spatial exploration and the map check.
export function isCourtExplored(courtExplored, courtKnowledgePassed, courtVisited) {
  return Boolean(courtExplored)
    && courtKnowledgePassed
    && courtVisited.length === courtZoneSet.size;
}

// Step 3: court fields must be normalized in this order (visited -> passed -> explored).
export function normalizeCourtProgress(value) {
  const courtVisited = normalizeCourtVisited(value.courtVisited);
  const courtKnowledgePassed = Boolean(value.courtKnowledgePassed);
  const courtExplored = isCourtExplored(value.courtExplored, courtKnowledgePassed, courtVisited);
  return { courtVisited, courtKnowledgePassed, courtExplored };
}

export function normalizeProgress(value, lessonIds = new Set()) {
  const fresh = createFreshProgress();
  if (!isCurrentProgress(value)) return fresh;
  return {
    ...fresh,
    entryRouteId: stringOrDefault(value.entryRouteId, fresh.entryRouteId),
    activePlaylistId: stringOrDefault(value.activePlaylistId, fresh.activePlaylistId),
    placementAnswers: objectOrEmpty(value.placementAnswers),
    diagnosticAnswers: objectOrEmpty(value.diagnosticAnswers),
    lessonProgress: normalizeLessonProgress(value.lessonProgress, lessonIds),
    practiceLogs: arrayOrEmpty(value.practiceLogs),
    ...normalizeCourtProgress(value),
    earnedStickers: uniqueArrayOrEmpty(value.earnedStickers),
    lastViewedRoute: stringOrDefault(value.lastViewedRoute, fresh.lastViewedRoute),
  };
}

export function loadProgress(lessonIds, key = STORE_KEY) {
  try {
    return normalizeProgress(JSON.parse(window.localStorage.getItem(key)), lessonIds);
  } catch {
    return createFreshProgress();
  }
}

// Runs one localStorage write and reports whether it succeeded. Storage can be
// missing (no window), blocked (private mode), or full, and progress may fail
// to serialize; callers show a notice instead of crashing.
function tryStorageWrite(write) {
  try {
    write(window.localStorage);
    return true;
  } catch {
    return false;
  }
}

export function saveProgress(progress, key = STORE_KEY) {
  return tryStorageWrite((storage) => storage.setItem(key, JSON.stringify(progress)));
}

export function clearProgress(key = STORE_KEY) {
  return tryStorageWrite((storage) => storage.removeItem(key));
}

// Clears only the given key (older keys such as v1 are left untouched) and
// returns fresh progress. The in-memory reset always succeeds; `cleared` is
// false when storage could not be updated, so callers can show a notice.
export function resetProgress(key = STORE_KEY) {
  const cleared = clearProgress(key);
  return { progress: createFreshProgress(), cleared };
}

function createFreshLessonProgress() {
  return {
    requiredPages: [],
    optionalPages: [],
    attempts: {},
    conceptUnderstood: false,
    practiceLogs: [],
  };
}

export function getLessonProgress(progress, lessonId) {
  if (!progress.lessonProgress[lessonId]) progress.lessonProgress[lessonId] = createFreshLessonProgress();
  return progress.lessonProgress[lessonId];
}

export function recordPage(progress, lessonId, pageId, { required = true } = {}) {
  const lesson = getLessonProgress(progress, lessonId);
  const pages = required ? lesson.requiredPages : lesson.optionalPages;
  if (!pages.includes(pageId)) pages.push(pageId);
}

export function recordAttempt(progress, lessonId, activityId, correct) {
  const lesson = getLessonProgress(progress, lessonId);
  const previous = lesson.attempts[activityId] || { count: 0, correct: false };
  const attempt = { count: previous.count + 1, correct: previous.correct || Boolean(correct) };
  lesson.attempts[activityId] = attempt;
  return attempt;
}

export function recordPractice(progress, lessonId, mode) {
  const entry = { lessonId, mode, at: new Date().toISOString() };
  getLessonProgress(progress, lessonId).practiceLogs.push(entry);
  progress.practiceLogs.push(entry);
  return entry;
}

// --- Lesson completion summary ---------------------------------------------
// Core and optional lessons are tracked separately. Optional deep dives must
// never count toward the core path, or the Learn page can report impossible
// totals such as "29 of 20 core concepts understood".

// A lesson is finished only when it has required pages and every one of them
// is recorded. A lesson with no required pages can never be finished, so an
// optional reference page alone can never complete (and count) a lesson.
export function hasCompletedRequiredPages(lessonProgress, requiredPageIds) {
  const required = arrayOrEmpty(requiredPageIds);
  const recorded = arrayOrEmpty(lessonProgress?.requiredPages);
  const hasRequiredPages = required.length > 0;
  const allRequiredRecorded = required.every((pageId) => recorded.includes(pageId));
  return hasRequiredPages && allRequiredRecorded;
}

export function isOptionalLesson(lesson) {
  return Boolean(lesson?.optional || lesson?.core === false);
}

// Reads stored progress without creating a lesson record (unlike getLessonProgress).
// Only a boolean true counts. Completion is sticky by design: once a lesson is
// complete it stays counted, even if a later curriculum update adds a required
// page, so learners never lose progress (or deep-dive access) after an update.
export function isConceptUnderstood(progress, lessonId) {
  return progress?.lessonProgress?.[lessonId]?.conceptUnderstood === true;
}

export function countCompleted(progress, lessons) {
  return {
    completed: lessons.filter((lesson) => isConceptUnderstood(progress, lesson.id)).length,
    total: lessons.length,
  };
}

// Each lesson id is counted once (its first entry decides core vs optional),
// and entries without an id are skipped, so completed can never exceed total.
export function uniqueLessons(lessons) {
  const seenIds = new Set();
  return arrayOrEmpty(lessons).filter((lesson) => {
    const id = lesson?.id;
    const hasStringId = typeof id === "string";
    const hasNonEmptyId = hasStringId && id.length > 0;
    const isDuplicateId = hasNonEmptyId && seenIds.has(id);
    const shouldKeep = hasNonEmptyId && !isDuplicateId;
    if (shouldKeep) seenIds.add(id);
    return shouldKeep;
  });
}

// Counts only lessons in the given curriculum, so stale stored ids never count.
export function summarizeLessonCompletion(progress, lessons, isOptional = isOptionalLesson) {
  const core = [];
  const optional = [];
  for (const lesson of uniqueLessons(lessons)) (isOptional(lesson) ? optional : core).push(lesson);
  return { core: countCompleted(progress, core), optional: countCompleted(progress, optional) };
}
