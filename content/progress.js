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

export function normalizeProgress(value, lessonIds = new Set()) {
  if (!value || value.version !== APP_VERSION || typeof value !== "object") return createFreshProgress();
  const base = createFreshProgress();
  const lessonProgress = value.lessonProgress && typeof value.lessonProgress === "object" ? value.lessonProgress : {};
  base.entryRouteId = typeof value.entryRouteId === "string" ? value.entryRouteId : null;
  base.activePlaylistId = typeof value.activePlaylistId === "string" ? value.activePlaylistId : null;
  base.placementAnswers = value.placementAnswers && typeof value.placementAnswers === "object" ? value.placementAnswers : {};
  base.diagnosticAnswers = value.diagnosticAnswers && typeof value.diagnosticAnswers === "object" ? value.diagnosticAnswers : {};
  base.lessonProgress = Object.fromEntries(Object.entries(lessonProgress)
    .filter(([id]) => lessonIds.has(id))
    .map(([id, item]) => [id, {
      requiredPages: Array.isArray(item?.requiredPages) ? [...new Set(item.requiredPages)] : [],
      optionalPages: Array.isArray(item?.optionalPages) ? [...new Set(item.optionalPages)] : [],
      attempts: item?.attempts && typeof item.attempts === "object" ? item.attempts : {},
      conceptUnderstood: Boolean(item?.conceptUnderstood),
      practiceLogs: Array.isArray(item?.practiceLogs) ? item.practiceLogs : [],
    }]));
  base.practiceLogs = Array.isArray(value.practiceLogs) ? value.practiceLogs : [];
  const validCourtZones = new Set(courtZoneValues);
  base.courtVisited = Array.isArray(value.courtVisited)
    ? [...new Set(value.courtVisited.filter((zone) => validCourtZones.has(zone)))]
    : [];
  base.courtKnowledgePassed = Boolean(value.courtKnowledgePassed);
  // Earlier v2 previews unlocked Court Lab after zone visits alone. A current
  // completion always represents both spatial exploration and the map check.
  base.courtExplored = Boolean(value.courtExplored)
    && base.courtKnowledgePassed
    && base.courtVisited.length === validCourtZones.size;
  base.earnedStickers = Array.isArray(value.earnedStickers) ? [...new Set(value.earnedStickers)] : [];
  base.lastViewedRoute = typeof value.lastViewedRoute === "string" ? value.lastViewedRoute : "#/";
  return base;
}

export function loadProgress(lessonIds, key = STORE_KEY) {
  try {
    return normalizeProgress(JSON.parse(window.localStorage.getItem(key)), lessonIds);
  } catch {
    return createFreshProgress();
  }
}

export function saveProgress(progress, key = STORE_KEY) {
  try {
    window.localStorage.setItem(key, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function clearProgress(key = STORE_KEY) {
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function getLessonProgress(progress, lessonId) {
  if (!progress.lessonProgress[lessonId]) {
    progress.lessonProgress[lessonId] = {
      requiredPages: [],
      optionalPages: [],
      attempts: {},
      conceptUnderstood: false,
      practiceLogs: [],
    };
  }
  return progress.lessonProgress[lessonId];
}

export function recordPage(progress, lessonId, pageId, { required = true } = {}) {
  const lesson = getLessonProgress(progress, lessonId);
  const target = required ? lesson.requiredPages : lesson.optionalPages;
  if (!target.includes(pageId)) target.push(pageId);
}

export function recordAttempt(progress, lessonId, activityId, correct) {
  const lesson = getLessonProgress(progress, lessonId);
  const previous = lesson.attempts[activityId] || { count: 0, correct: false };
  lesson.attempts[activityId] = { count: previous.count + 1, correct: previous.correct || Boolean(correct) };
  return lesson.attempts[activityId];
}

export function recordPractice(progress, lessonId, mode) {
  const entry = { lessonId, mode, at: new Date().toISOString() };
  getLessonProgress(progress, lessonId).practiceLogs.push(entry);
  progress.practiceLogs.push(entry);
  return entry;
}
