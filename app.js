import {
  curriculumUnits,
  sourceRegister,
  libraryEntries,
  refresherTopics,
  legacyLessonAliases,
  entryRoutes,
  getAllLessons,
  getLesson,
  getUnitForLesson,
  resolveLegacyLessonId,
} from "./content/curriculum.js";
import {
  STUDY_CONDITIONS,
  COURT_ZONES,
  createFreshProgress,
  studyCondition,
  progressKey,
  getLessonProgress,
  recordPage,
  recordAttempt,
  recordPractice,
} from "./content/progress.js";
import { createProgressStore } from "./content/progress-store.js";
import { parseRoute, matchRoute, href, titled, NAV_ITEMS } from "./routing/simple-router.js";
import { renderScoringWalkthrough, mountScoringWalkthrough } from "./content/scoring-walkthrough.js";

const lessons = getAllLessons();
const lessonIds = new Set(lessons.map((lesson) => lesson.id));
const study = studyCondition(window.location.search);
const currentProgressKey = progressKey(study);
const sourceEntries = Array.isArray(sourceRegister)
  ? sourceRegister
  : Object.entries(sourceRegister).map(([id, source]) => ({ id, ...source }));
const sourceById = new Map(sourceEntries.map((source) => [source.id, source]));
const routeEntries = Array.isArray(entryRoutes) ? entryRoutes : Object.values(entryRoutes);

const entryFallbacks = [
  { id: "never-played", label: "I have never played", detail: "Start with court orientation and a safe setup.", route: "unit" },
  { id: "first-game-essentials", label: "I need to play soon", detail: "Follow a practical first-game essentials playlist.", route: "playlist" },
  { id: "consistency", label: "I play but lack consistency", detail: "Use a short check to find the right next unit.", route: "diagnostic" },
  { id: "specific-answer", label: "I want a specific answer", detail: "Search rules, skills, drills, and sources without enrolling in a path.", route: "library" },
];
const entryOptions = routeEntries.length ? routeEntries : entryFallbacks;
const beginnerGoals = {
  "never-played": { label: "I’m new to pickleball", detail: "Start with court orientation and learn the basics in order." },
  "first-game-essentials": { label: "I’m preparing for my first game", detail: "Follow First Game Essentials for serving, scoring, and a first-game rehearsal." },
};
const refresherGuides = refresherTopics.map((topic) => {
  const guide = libraryEntries.find((entry) => entry.id === topic.guideId);
  const lesson = getLesson(guide.lessonId);
  const page = lesson.pages.find((item) => item.id === topic.pageId);
  return { ...topic, guide, lesson, page };
});
const diagnosticQuestions = [
  { id: "serve", prompt: "Can you usually identify a legal serve destination?", options: ["Not yet", "Usually", "Confidently"] },
  { id: "rally", prompt: "Can you explain the two-bounce opening?", options: ["Not yet", "Mostly", "Confidently"] },
  { id: "score", prompt: "Can you restore doubles positions from a score call?", options: ["Not yet", "Mostly", "Confidently"] },
  { id: "control", prompt: "How settled do your dink, volley, or reset choices feel?", options: ["I am learning", "Sometimes steady", "Usually steady"] },
  { id: "pressure", prompt: "What are you ready to practise next?", options: ["Reliable basics", "Point construction", "Pressure and partner systems"] },
];
const stickers = {
  "court-orientation": { id: "court-explorer", title: "Court Explorer", asset: "assets/stickers/court-explorer.png" },
  "ready-position": { id: "ready-set", title: "Ready, Set", asset: "assets/stickers/ready-set.png" },
  "serve-placement": { id: "serve-compass", title: "Serve Compass", asset: "assets/stickers/serve-compass.png" },
  "opening-rally": { id: "rally-rhythm", title: "Rally Rhythm", asset: "assets/stickers/rally-rhythm.png" },
  "doubles-scoring": { id: "score-caller", title: "Score Caller", asset: "assets/stickers/score-caller.png" },
  "third-shot-choice": { id: "soft-touch", title: "Soft Touch", asset: "assets/stickers/soft-touch.png" },
  "open-play": { id: "open-play-pal", title: "Open-play Pal", asset: "assets/stickers/open-play-pal.png" },
};

const situations = [
  { id: "first-game", label: "First-game basics", lessons: ["court-orientation", "equipment-safety", "ready-position", "kitchen-rule", "serve-legally", "two-bounce-opening", "first-game-rehearsal"] },
  { id: "scoring", label: "Scoring and positions", lessons: ["doubles-scoring", "rotation-positions", "side-outs-formats"] },
  { id: "reset", label: "Reset and soft game", lessons: ["dinks", "drop-reset", "third-shot-choice", "dink-placement", "pace-reset-response"] },
  { id: "partner", label: "Partner play", lessons: ["partner-communication", "open-play", "partner-systems"] },
];

let browserStorage;
try { browserStorage = window.localStorage; } catch { /* Reading remains available for this tab. */ }
const progressStore = createProgressStore({
  key: currentProgressKey,
  lessonIds,
  storage: browserStorage,
  locks: window.navigator?.locks,
});
const initialProgress = progressStore.read();
let progress = initialProgress.progress || createFreshProgress();
let progressGeneration = initialProgress.generation ?? 0;
let sessionOnly = false;
let progressQueue = Promise.resolve();
let legacyConflict = null;
let pendingResetConflict = false;
let courtMode = "explore";
let activeCourtZone = null;
let courtFeedback = null;
let activeSticker = null;
let pendingLessonFocus = null;
let resetArmed = false;
let libraryFilter = "All topics";
let libraryQuery = "";
let pageSelections = {};
let toastTimer;
let searchTimer;
let stopScoringWalkthrough;
const UNIT_SESSION_KEY = study ? `learn-pickleball:study:${study}:unit-disclosures` : "learn-pickleball:unit-disclosures";
let unitDisclosure = {};
try {
  const saved = JSON.parse(window.sessionStorage.getItem(UNIT_SESSION_KEY) || "{}");
  if (saved && typeof saved === "object" && !Array.isArray(saved)) unitDisclosure = saved;
} catch { /* Session storage is optional; keep choices in memory. */ }
function rememberUnit(id, open) {
  unitDisclosure[id] = open;
  try { window.sessionStorage.setItem(UNIT_SESSION_KEY, JSON.stringify(unitDisclosure)); } catch { /* In-memory fallback. */ }
}
function levelLabel(level) {
  return level ? `Skill guidance: ${level} (a suggested topic level, not your rating)` : "All learners";
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
}

function normalizeImage(value, lesson) {
  if (!value && !lesson?.illustration) return null;
  const image = value || lesson.illustration;
  if (typeof image === "string") return { src: image, alt: lesson?.title || "Pickleball learning illustration" };
  return { src: image.src || image.path, alt: image.alt || lesson?.title || "Pickleball learning illustration", caption: image.caption || image.summary };
}

function getRoute() {
  return parseRoute(window.location.hash);
}

function refresherHref(topic) {
  return href("/library", topic ? { view: "refresher", topic } : { view: "refresher" });
}

function refresherLink(label = "Quick refresher", { topic, primary = false } = {}) {
  const priority = primary ? "primary" : "quiet";
  return `<a class="button button-${priority}" data-cta-priority="${priority}" href="${escapeHtml(refresherHref(topic))}">${escapeHtml(label)}</a>`;
}

function progressSummary(value) {
  const pages = Object.values(value?.lessonProgress || {}).reduce((total, lesson) => total + (Array.isArray(lesson?.requiredPages) ? lesson.requiredPages.length : 0), 0);
  return `${pages} required pages and ${value?.practiceLogs?.length || 0} practice logs`;
}

function showStorageNotice(status, details = {}) {
  if (status === "reset-conflict") pendingResetConflict = true;
  const notice = document.querySelector("#storage-notice");
  if (!notice) return;
  const message = notice.querySelector("[data-storage-message]");
  const recovery = notice.querySelector("[data-storage-recovery]");
  const older = notice.querySelector('[data-action="legacy-use"]');
  const messages = {
    unavailable: "Progress cannot be saved right now. New changes stay in this tab only.",
    unsupported: "This browser cannot safely save progress across tabs. New changes stay in this tab only.",
    invalid: "Saved progress could not be read. It has been preserved; new changes stay in this tab only.",
    "legacy-changed": `An older tab changed progress. Reload all older tabs, then choose a copy. Current: ${progressSummary(details.progress)}. Older: ${details.legacyProgress ? progressSummary(details.legacyProgress) : "unreadable"}. Both copies will be kept for recovery.`,
    "recovery-failed": "Your choice could not be saved. Both copies remain in this browser; check browser storage and try again.",
    "reset-conflict": "Progress changed in another tab. This change was not kept; please review and try again.",
    "reset-failed": "Progress could not be reset in browser storage. Your saved progress has not been reset.",
  };
  notice.removeAttribute("hidden");
  if (message) message.textContent = messages[status] || messages.unavailable;
  if (recovery) recovery.hidden = status !== "legacy-changed" && status !== "recovery-failed";
  if (older) older.disabled = !details.legacyProgress;
  if (status === "legacy-changed" || status === "recovery-failed") legacyConflict = { generation: details.generation, legacyRaw: details.legacyRaw };
}

function clearStorageNotice({ acknowledgeResetConflict = false } = {}) {
  legacyConflict = null;
  if (acknowledgeResetConflict) pendingResetConflict = false;
  if (pendingResetConflict) { showStorageNotice("reset-conflict"); return; }
  document.querySelector("#storage-notice")?.setAttribute("hidden", "");
}

function enqueueProgressTask(task) {
  const result = progressQueue.then(task);
  progressQueue = result.catch(() => {});
  return result;
}

function changeProgress(change, { reset = false } = {}) {
  // Capture the generation when the learner acts, not when a queued task runs.
  const expectedGeneration = progressGeneration;
  // Earlier queued actions cannot acknowledge a warning shown after the click.
  const acknowledgeResetConflict = pendingResetConflict;
  return enqueueProgressTask(() => applyProgressChange(change, reset, expectedGeneration, acknowledgeResetConflict));
}

async function applyProgressChange(change, reset, expectedGeneration, acknowledgeResetConflict) {
  if (sessionOnly) {
    if (reset) { showStorageNotice("reset-failed"); return null; }
    return { value: change(progress), saved: false };
  }
  const result = await progressStore.update(expectedGeneration, change, { reset });
  if (result.committed) {
    // Another tab may have committed again before this promise was delivered.
    const latest = progressStore.read();
    const visible = latest.progress ? latest : result;
    progress = visible.progress;
    progressGeneration = visible.generation;
    if (visible.generation !== result.generation) {
      showStorageNotice("reset-conflict");
      render();
      return null;
    }
    if (visible.status === "legacy-changed") showStorageNotice(visible.status, visible);
    else if (visible.status === "ready") clearStorageNotice({ acknowledgeResetConflict });
    else showStorageNotice("unavailable");
    return { value: result.value, saved: true };
  }
  if (result.progress) {
    progress = result.progress;
    progressGeneration = result.generation;
  }
  if (result.status === "legacy-changed" || result.status === "reset-conflict") {
    showStorageNotice(result.status, result);
    render();
    return null;
  }
  if (reset) { showStorageNotice("reset-failed"); return null; }
  // Keep the experience usable without risking an unlocked or destructive write.
  sessionOnly = true;
  showStorageNotice(result.status);
  return { value: change(progress), saved: false };
}

function getEntry(id) {
  return entryOptions.find((entry) => entry.id === id) || null;
}

function getUnitId(lesson) {
  return lesson.unitId || lesson.unit?.id || getUnitForLesson(lesson.id)?.id;
}

function getUnit(lesson) {
  return getUnitForLesson(lesson.id) || curriculumUnits.find((unit) => unit.id === getUnitId(lesson));
}

function isOptional(lesson) {
  return Boolean(lesson.optional || lesson.core === false || getUnit(lesson)?.optional);
}

function requiredPages(lesson) {
  return (lesson.pages || []).filter((page) => page.required !== false);
}

function isLessonComplete(lesson) {
  const stored = progress.lessonProgress[lesson.id];
  return Boolean(stored?.conceptUnderstood);
}

function hasLessonActivity(stored) {
  return Boolean(stored && (stored.conceptUnderstood
    || (Array.isArray(stored.requiredPages) && stored.requiredPages.length)
    || (Array.isArray(stored.optionalPages) && stored.optionalPages.length)
    || (stored.attempts && typeof stored.attempts === "object" && Object.keys(stored.attempts).length)));
}

function hasLearningActivity() {
  return Boolean(progress.entryRouteId) || (!study && Object.values(progress.lessonProgress).some(hasLessonActivity));
}

function prerequisitesFor(lesson) {
  return (lesson.prerequisites || []).flatMap((item) => {
    if (typeof item === "string") return [item];
    if (Array.isArray(item?.required)) return item.required;
    if (typeof item?.lessonId === "string") return [item.lessonId];
    return [];
  });
}

function allCoreLessonsComplete() {
  return lessons.filter((lesson) => !isOptional(lesson)).every(isLessonComplete);
}

function hasDeepDiveAccess() {
  const recommended = progress.placementAnswers?.recommendedUnit;
  return allCoreLessonsComplete() || recommended === 6 || recommended === 7;
}

function isLessonAvailable(lesson) {
  if (isOptional(lesson) && !hasDeepDiveAccess()) return false;
  // A consistency diagnostic is an explicit self-directed entry route. It
  // opens the recommended unit without pretending its earlier lessons were
  // completed; those foundations remain available to revisit from Learn.
  if (progress.placementAnswers?.recommendedUnit === getUnit(lesson)?.number) return true;
  return prerequisitesFor(lesson).every((id) => {
    const prerequisite = getLesson(id);
    return !prerequisite || isLessonComplete(prerequisite);
  });
}

function lessonStatus(lesson) {
  if (isLessonComplete(lesson)) return { label: "Complete", className: "is-complete" };
  if (isLessonAvailable(lesson)) return { label: "Ready", className: "is-current" };
  return { label: isOptional(lesson) ? "Deep dive" : "Locked", className: "is-locked" };
}

function activePlaylist() {
  const selected = getEntry(progress.activePlaylistId || progress.entryRouteId);
  const ids = selected?.lessonIds || selected?.playlistLessonIds || selected?.playlist || [];
  return Array.isArray(ids) ? ids.map(getLesson).filter(Boolean) : [];
}

function getNextLesson() {
  const playlist = activePlaylist();
  const availablePlaylist = playlist.find((lesson) => isLessonAvailable(lesson) && !isLessonComplete(lesson));
  if (availablePlaylist) return availablePlaylist;
  const recommendedUnit = progress.placementAnswers?.recommendedUnit;
  const suggested = recommendedUnit && curriculumUnits.find((unit) => unit.number === recommendedUnit || unit.id === recommendedUnit);
  const candidates = [...(suggested?.lessons || []), ...lessons];
  return candidates.find((lesson) => isLessonAvailable(lesson) && !isLessonComplete(lesson)) || null;
}

function updateConceptStatus(state, lesson) {
  const stored = getLessonProgress(state, lesson.id);
  const complete = requiredPages(lesson).every((page) => stored.requiredPages.includes(page.id));
  if (complete && !stored.conceptUnderstood) {
    stored.conceptUnderstood = true;
    const sticker = stickers[lesson.id];
    if (sticker && !state.earnedStickers.includes(sticker.id)) {
      state.earnedStickers.push(sticker.id);
      return sticker;
    }
  }
  return null;
}

function recordLessonPage(lesson, page, required = page.required !== false, state = progress) {
  const wasComplete = Boolean(state.lessonProgress[lesson.id]?.conceptUnderstood);
  recordPage(state, lesson.id, page.id, { required });
  const sticker = updateConceptStatus(state, lesson);
  return { sticker, completed: !wasComplete && Boolean(state.lessonProgress[lesson.id]?.conceptUnderstood) };
}

function finishLessonPage(lesson, page, required, result) {
  if (result.sticker) activeSticker = result.sticker;
  const route = getRoute();
  const match = matchRoute(route);
  if (required && result.completed && match.view === "lesson" && !route.query.has("page") && resolveLesson(match.params.lessonId).lesson?.id === lesson.id) {
    route.query.set("page", page.id);
    window.history.replaceState(null, "", href(route.path, route.query));
  }
}

function lessonForDisplay(lessonId) {
  return progress.lessonProgress[lessonId] || { requiredPages: [], optionalPages: [], attempts: {}, conceptUnderstood: false, practiceLogs: [] };
}

function getPageIndex(lesson, route) {
  const requested = route.query.get("page");
  const pages = lesson.pages || [];
  const requestedIndex = pages.findIndex((page) => page.id === requested);
  if (requestedIndex >= 0) return requestedIndex;
  const stored = lessonForDisplay(lesson.id);
  const firstIncomplete = pages.findIndex((page) => page.required !== false && !stored.requiredPages.includes(page.id));
  return firstIncomplete >= 0 ? firstIncomplete : 0;
}

function nextPage(lesson, index) {
  return lesson.pages?.[index + 1] || null;
}

function resolveLesson(rawId) {
  if (getLesson(rawId)) return { lesson: getLesson(rawId), alias: null };
  const completedIds = lessons.filter(isLessonComplete).map((lesson) => lesson.id);
  const resolved = typeof resolveLegacyLessonId === "function" ? resolveLegacyLessonId(rawId, completedIds) : legacyLessonAliases?.[rawId];
  const id = typeof resolved === "string" ? resolved : resolved?.lessonId || resolved?.defaultLessonId;
  return { lesson: getLesson(id), alias: rawId };
}

function navKey(route) {
  return matchRoute(route).nav;
}

function renderHeader(route) {
  const current = navKey(route);
  const navigation = NAV_ITEMS.map((item) => [item.id, item.label, item.href]);
  return `
    <header class="site-header">
      <a class="brand" href="#/" aria-label="Learn Pickleball home"><span class="brand-mark" aria-hidden="true">LP</span><span>Learn Pickleball</span></a>
      <nav class="desktop-nav" aria-label="Primary navigation">
        ${navigation.map(([id, label, link]) => `<a href="${link}" data-nav-area="${id}" ${current === id ? 'aria-current="page"' : ""}>${label}</a>`).join("")}
      </nav>
    </header>`;
}

function renderBottomNav(route) {
  const current = navKey(route);
  const navigation = NAV_ITEMS.map((item) => [item.id, item.shortLabel, item.href]);
  return `<nav class="bottom-nav" aria-label="Mobile navigation">${navigation.map(([id, label, link]) => `<a href="${link}" data-nav-area="${id}" ${current === id ? 'aria-current="page"' : ""}><span>${label}</span>${current === id ? '<i class="nav-dot" aria-hidden="true"></i>' : ""}</a>`).join("")}</nav>`;
}

function renderStickerModal() {
  if (!activeSticker) return "";
  return `<div class="modal-layer" role="presentation"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="sticker-title"><img src="${escapeHtml(activeSticker.asset)}" alt="${escapeHtml(activeSticker.title)} sticker" /><p class="eyebrow">Learning keepsake</p><h2 id="sticker-title">${escapeHtml(activeSticker.title)}</h2><p>You completed a concept step. Keep going when you are ready.</p><button class="button button-primary" data-cta-priority="primary" type="button" data-action="sticker-dismiss">Continue</button></section></div>`;
}

function renderShell(content, route) {
  return `${renderHeader(route)}${study ? '<p class="study-notice">Research prototype · Progress is separate from the main app.</p>' : ""}<main id="main-content" class="app-main" data-view="${escapeHtml(route ? matchRoute(route).view : "")}" tabindex="-1">${content}</main><footer class="site-footer"><span>Learn Pickleball</span><a href="/support/">Support &amp; feedback</a></footer>${renderBottomNav(route)}${renderStickerModal()}`;
}

function renderHome(route) {
  const next = getNextLesson();
  if (!hasLearningActivity()) {
    return renderShell(`
      <section class="screen-intro page">
        <div>
          <p class="eyebrow">A calm way to learn</p><h1>Learn the game, one useful step at a time.</h1>
          <p class="lede">Friendly, source-aware lessons for the court, the first rally, and the decisions that make play feel easier.</p>
          <div class="button-row"><a class="button button-primary" data-cta-priority="primary" href="#/placement">${study ? "Find my starting point" : "Start learning"}</a>${study ? '<a class="button button-quiet" data-cta-priority="quiet" href="#/library?view=rules">Look up a rule</a>' : refresherLink()}</div>
          <p class="inline-progress"><span>Short digital lessons</span><span>Practice is always optional</span><span>No account required</span></p>
        </div>
        <figure class="hero-figure"><img src="assets/illustrations/stances-ready-v2.png" alt="Four adult pickleball players demonstrate balanced ready positions." /></figure>
      </section>
      ${study ? '<section class="page next-strip"><span class="status is-current">Start here</span><div><strong>Choose a route that fits today.</strong><span>New to pickleball, playing soon, building consistency, or looking up one answer.</span></div><a class="button button-quiet" data-cta-priority="quiet" href="#/placement">Choose route</a></section>' : ""}`, route);
  }
  const unit = next ? getUnit(next) : null;
  const stored = next && progress.lessonProgress[next.id];
  const resume = study ? stored?.requiredPages.length : hasLessonActivity(stored);
  const goalAction = !study && !progress.entryRouteId && hasLearningActivity()
    ? '<a class="button button-quiet" data-cta-priority="quiet" href="#/placement">Choose a learning goal</a>'
    : "";
  const reviewCompleted = '<a class="button button-quiet" href="#/learn?review=completed">Review completed lessons</a>';
  const homeActions = next
    ? `<a class="button button-primary" data-cta-priority="primary" href="${href(`/lesson/${next.id}`)}">${resume ? "Resume lesson" : "Start lesson"}</a>`
    : study
      ? '<a class="button button-primary" data-cta-priority="primary" href="#/learn?review=completed">Review completed lessons</a>'
      : refresherLink("Quick refresher", { primary: true }) + reviewCompleted;
  return renderShell(`
    <section class="screen-intro page">
      <div><p class="eyebrow">Your next learning step</p><h1>${next ? escapeHtml(next.title) : "You have built a reliable foundation."}</h1><p class="lede">${next ? escapeHtml(next.outcome || next.summary) : "Review a rule, add a practice note, or choose an optional deep-dive topic when it feels useful."}</p><p class="session-duration">${next ? `Estimated time: ${escapeHtml(next.duration || "Short lesson")}` : "Review what you have learned or find another topic."}</p><div class="button-row">${homeActions}<a class="button button-quiet" data-cta-priority="quiet" href="#/learn">View full path</a>${goalAction}${study ? '<a class="button button-quiet" href="#/library?view=rules">Find a rule or skill</a>' : next ? refresherLink() : ""}</div><p class="inline-progress"><span>${completedLessonCount()} concept steps understood</span><span>${practiceCount()} practices logged</span></p></div>
      <figure class="hero-figure"><img src="${escapeHtml(normalizeImage(next?.illustration, next)?.src || "assets/hero-rally.png")}" alt="${escapeHtml(normalizeImage(next?.illustration, next)?.alt || "Pickleball players learning together.")}" /></figure>
    </section>
    <section class="page next-strip"><span class="status is-current">${unit ? `Unit ${unit.number}` : "Review"}</span><div><strong>${next ? `${escapeHtml(next.duration || "Short lesson")} · ${escapeHtml(next.kind || "Guided lesson")}` : "Your path remains open."}</strong><span>${next ? "One focused idea, then a clear next move." : "Optional units never block your beginner completion."}</span></div>${next ? `<a class="button button-quiet" data-cta-priority="quiet" href="#/practice">Open practice</a>` : ""}</section>`, route);
}

function renderPlacement(route) {
  const selected = progress.entryRouteId;
  const routeOption = getEntry(selected);
  if (!selected) {
    const choices = entryOptions.map((entry, index) => {
      const goal = (!study && beginnerGoals[entry.id]) || entry;
      return `<button type="button" class="choice-row" data-action="set-entry" data-entry="${escapeHtml(entry.id)}">${study ? `<span class="choice-mark">${index + 1}</span>` : ""}<span><strong>${escapeHtml(goal.label || goal.title)}</strong><small>${escapeHtml(goal.detail || goal.description || "Choose this route")}</small></span></button>`;
    }).join("");
    return renderShell(`<section class="placement">${study ? '<div class="placement-progress"><span class="is-current"></span><span></span><span></span></div>' : ""}<div class="placement-question${study ? "" : " placement-goals"}"><p class="eyebrow">${study ? "Choose your route" : "Choose a learning goal"}</p><h1>What would help you most today?</h1><p class="lede">${study ? "This is not a rating. It only chooses a useful first view, and you can change it later." : "Choose a goal to see where to begin. You can change your choice later."}</p><div class="choice-list">${choices}</div></div></section>`, route);
  }
  if (selected === "consistency" && diagnosticQuestions.some((item) => !Object.hasOwn(progress.diagnosticAnswers, item.id))) {
    const question = diagnosticQuestions.find((item) => !Object.hasOwn(progress.diagnosticAnswers, item.id));
    const index = diagnosticQuestions.indexOf(question);
    return renderShell(`<section class="placement"><div class="placement-progress"><span class="is-done"></span><span class="is-current"></span><span></span></div><div class="placement-question"><p class="eyebrow">Consistency check · ${index + 1} of ${diagnosticQuestions.length}</p><h1>${escapeHtml(question.prompt)}</h1><p class="lede">Choose the closest answer. You can revisit or change your route at any time.</p><div class="choice-list">${question.options.map((option, answerIndex) => `<button type="button" class="choice-row" data-action="diagnostic-answer" data-question="${question.id}" data-value="${answerIndex}"><span class="choice-mark">${String.fromCharCode(65 + answerIndex)}</span><span><strong>${escapeHtml(option)}</strong></span></button>`).join("")}</div><button class="button button-quiet" type="button" data-action="placement-restart">Choose another route</button></div></section>`, route);
  }
  const target = placementTarget(selected);
  const action = selected === "specific-answer" ? "#/library?view=rules" : selected === "first-game-essentials" ? "#/learn" : target ? href(`/lesson/${target.id}`) : "#/learn";
  const actionLabel = selected === "specific-answer" ? "Open Library" : selected === "first-game-essentials" ? "See First Game Essentials" : target ? `Start: ${target.title}` : "Open learning path";
  const resultBody = selected === "consistency" && target ? `Your check points to Unit ${getUnit(target)?.number}: ${getUnit(target)?.title}. This is orientation, not a rating. You can still browse every topic.` : routeOption?.resultBody || placementExplanation(selected, target);
  return renderShell(`<section class="placement"><div class="placement-progress"><span class="is-done"></span><span class="is-done"></span><span class="is-current"></span></div><div class="placement-question"><p class="eyebrow">Your starting view</p><h1>${escapeHtml(routeOption?.resultTitle || (selected === "specific-answer" ? "Find the answer you need." : "Your path is ready."))}</h1><p class="lede">${escapeHtml(resultBody)}</p><div class="button-row"><a class="button button-primary" data-cta-priority="primary" href="${action}">${escapeHtml(actionLabel)}</a><button class="button button-quiet" data-cta-priority="quiet" type="button" data-action="placement-restart">Change route</button></div></div></section>`, route);
}

function placementTarget(entryId) {
  if (entryId === "never-played") return getLesson("court-orientation") || lessons[0];
  if (entryId === "consistency") {
    const answers = progress.diagnosticAnswers;
    const score = Object.values(answers).reduce((sum, value) => sum + Number(value || 0), 0);
    const recommendedUnit = score >= 7 ? 6 : 4;
    const unit = curriculumUnits.find((item) => item.number === recommendedUnit);
    return unit?.lessons.find((lesson) => isLessonAvailable(lesson)) || unit?.lessons[0] || null;
  }
  return getNextLesson();
}

function placementExplanation(entryId, target) {
  if (entryId === "never-played") return "We will begin with court landmarks, a safe setup, and a calm way to approach your first rally.";
  if (entryId === "first-game-essentials") return "This playlist keeps the ideas you need for a first game in one practical order, without asking you to finish every optional page.";
  if (entryId === "consistency") return `Your check points to ${target ? target.title : "a useful next unit"}. You can still browse every topic.`;
  return "The Library separates official-rule answers from coaching options so you can get context without enrolling in a path.";
}

function completedLessons() { return lessons.filter(isLessonComplete); }
function completedLessonCount() { return completedLessons().length; }
function practiceCount() { return progress.practiceLogs.length; }

function renderLearn(route) {
  const next = getNextLesson();
  const completedList = completedLessons();
  const completed = completedList.length;
  const atlasOpen = study === STUDY_CONDITIONS.ATLAS && route.query.get("view") === "atlas";
  const learnAction = !study && !hasLearningActivity()
    ? '<a class="button button-primary" data-cta-priority="primary" href="#/placement">Choose a learning goal</a>'
    : next
      ? `<a class="button button-primary" data-cta-priority="primary" href="${href(`/lesson/${next.id}`)}">Continue: ${escapeHtml(next.title)}</a>`
      : '<a class="button button-primary" data-cta-priority="primary" href="#/library?view=skills">Choose a deep dive</a>';
  const goalAction = !study && !progress.entryRouteId && hasLearningActivity()
    ? '<a class="button button-quiet" data-cta-priority="quiet" href="#/placement">Choose a learning goal</a>'
    : "";
  return renderShell(`
    <section class="screen-intro page path-intro"><div><p class="eyebrow">Your learning path</p><h1>One calm step closer to court-ready.</h1><p class="lede">Build court skills one step at a time, or find the topic you need.</p><div class="button-row">${learnAction}<a class="button button-quiet" href="#/learn?review=completed">Review completed lessons</a>${goalAction}${study ? '<a class="button button-quiet" href="#/library?view=rules">Find a rule or skill</a>' : refresherLink()}</div><p class="inline-progress"><span>${completed} of ${lessons.filter((lesson) => !isOptional(lesson)).length} core concepts understood</span><span>${practiceCount()} practice logs</span></p></div><figure class="hero-figure hero-figure-stance"><img src="assets/illustrations/stances-ready-v2.png" alt="Four adult players demonstrate balanced ready positions." /></figure></section>
    ${route.query.get("review") === "completed" ? `<section class="page review-list" aria-labelledby="review-heading"><h2 id="review-heading">Completed lessons</h2>${completedList.length ? completedList.map((lesson) => `<a class="review-link" href="${href(`/lesson/${lesson.id}`)}">${escapeHtml(lesson.title)} <span>Review</span></a>`).join("") : '<p>No completed lessons yet. Your completed lessons will appear here.</p>'}</section>` : ""}
    ${study === STUDY_CONDITIONS.DISCOVERY ? `<section class="page study-goals" aria-labelledby="study-goals-title"><h2 id="study-goals-title">Choose what helps today</h2><p>Choose a starting route or explore a situation. Your completed lessons remain saved.</p><div class="button-row"><button type="button" class="button button-quiet" data-action="study-entry" data-entry="first-game-essentials">Prepare for my first game</button><button type="button" class="button button-quiet" data-action="study-entry" data-entry="consistency">Build consistency</button></div><h3>Find a skill for your situation</h3><div class="button-row">${situations.map((item) => `<a data-situation-link class="button button-quiet" href="${href("/library", { view: "skills", situation: item.id })}">${escapeHtml(item.label)}</a>`).join("")}</div></section>` : ""}
    <section class="page"><div class="path-heading"><div><p class="eyebrow">Seven units</p><h2>Follow the sequence—or open the part you need.</h2></div><span class="meta">Required pages drive progress; optional references never block it.</span></div>${study === STUDY_CONDITIONS.ATLAS ? `<div class="button-row atlas-switch"><a class="button button-quiet" href="${atlasOpen ? "#/learn" : "#/learn?view=atlas"}">${atlasOpen ? "Show learning path" : "Explore the course Atlas"}</a></div>` : ""}${atlasOpen ? renderAtlas() : `<div class="path-list" aria-label="Pickleball learning path">${curriculumUnits.map(renderUnit).join("")}</div>`}</section>`, route);
}

function renderAtlas() {
  return `<section class="atlas" aria-labelledby="atlas-title"><h2 id="atlas-title">Course Atlas</h2><p>Explore the units in order. Full lessons may require an earlier step.</p><ol class="atlas-list">${curriculumUnits.map((unit) => {
    const image = normalizeImage(unit.lessons[0]?.illustration, unit.lessons[0]);
    const lessonRows = unit.lessons.map((lesson) => {
      const status = lessonStatus(lesson);
      return `<li><a href="${href(`/lesson/${lesson.id}`)}">${escapeHtml(lesson.title)}</a> <span class="status ${status.className}">${escapeHtml(status.label)}</span></li>`;
    }).join("");
    return `<li class="atlas-unit">${image?.src ? `<div class="atlas-art"><img src="${escapeHtml(image.src)}" alt="" loading="lazy" /></div>` : ""}<div><p class="eyebrow">Unit ${unit.number} · ${escapeHtml(levelLabel(unit.level))}</p><h3>${escapeHtml(unit.title)}</h3><p>${escapeHtml(unit.outcome)}</p><ul>${lessonRows}</ul>${unit.id === "unit-3" ? scoringLink() : ""}</div></li>`;
  }).join("")}</ol></section>`;
}

function renderUnit(unit) {
  const unitLessons = unit.lessons || lessons.filter((lesson) => getUnitId(lesson) === unit.id);
  const complete = unitLessons.length && unitLessons.every(isLessonComplete);
  const available = unitLessons.some(isLessonAvailable);
  const current = unitLessons.some((lesson) => isLessonAvailable(lesson) && !isLessonComplete(lesson));
  const recommended = progress.placementAnswers?.recommendedUnit === unit.number || progress.placementAnswers?.recommendedUnit === unit.id;
  const open = typeof unitDisclosure[unit.id] === "boolean" ? unitDisclosure[unit.id] : current || recommended || complete;
  const status = complete ? { label: "Complete", className: "is-complete" } : current ? { label: "Current", className: "is-current" } : available ? { label: "Available", className: "is-current" } : unit.optional ? { label: "Optional deep dive", className: "is-locked" } : { label: "Locked", className: "is-locked" };
  return `<details class="unit ${status.className}" data-unit-id="${escapeHtml(unit.id)}" ${open ? "open" : ""}><summary class="unit-summary"><div><p class="eyebrow">Unit ${unit.number} · ${escapeHtml(unit.level || unit.levelIntent || "Guided path")}</p><h3>${escapeHtml(unit.title)}</h3><p>${escapeHtml(unit.outcome || unit.summary || "Build a reliable next skill.")}</p></div><span class="status ${status.className}">${status.label}</span></summary><div class="unit-details lesson-list">${unitLessons.map((lesson, index) => renderLessonRow(lesson, index)).join("")}${unit.id === "unit-3" ? `<div class="scoring-unit-link">${scoringLink()}</div>` : ""}</div></details>`;
}

function renderLessonRow(lesson, index) {
  const status = lessonStatus(lesson);
  const complete = status.className === "is-complete";
  return `<a class="lesson-row ${status.className}" href="${href(`/lesson/${lesson.id}`)}" data-lesson-id="${escapeHtml(lesson.id)}" data-lesson-status="${status.label.toLowerCase().replace(/\s+/g, "-")}"><span class="row-index">${complete ? "✓" : String(index + 1).padStart(2, "0")}</span><span><strong>${escapeHtml(lesson.title)}</strong><small>${escapeHtml(lesson.kind || "Guided lesson")} · ${escapeHtml(lesson.duration || "Short session")}</small></span><span class="status ${status.className}">${status.label}</span></a>`;
}

function renderLesson(route, rawId) {
  const { lesson, alias } = resolveLesson(rawId);
  if (!lesson) return renderNotFound(route);
  if (!isLessonAvailable(lesson) && !isLessonComplete(lesson)) return renderLockedLesson(route, lesson);
  const index = getPageIndex(lesson, route);
  const page = lesson.pages?.[index];
  if (!page) return renderNotFound(route);
  const unit = getUnit(lesson);
  const stored = lessonForDisplay(lesson.id);
  const done = stored.requiredPages.filter((id) => requiredPages(lesson).some((pageItem) => pageItem.id === id)).length;
  const next = nextPage(lesson, index);
  const nextLesson = getNextLesson();
  const pageComplete = page.required === false || (page.required ? stored.requiredPages : stored.optionalPages).includes(page.id);
  const footerAction = pageComplete
    ? (next ? `<a class="button button-primary" data-cta-priority="primary" href="${href(`/lesson/${lesson.id}`, { page: next.id })}">Next: ${escapeHtml(next.title)}</a>` : nextLesson && nextLesson.id !== lesson.id ? `<a class="button button-primary" data-cta-priority="primary" href="${href(`/lesson/${nextLesson.id}`)}">Next lesson: ${escapeHtml(nextLesson.title)}</a>` : '<a class="button button-primary" data-cta-priority="primary" href="#/progress">See progress</a>')
    : '<span class="lesson-next-hint" data-cta-priority="quiet">Complete this page to continue</span>';
  const aliasNote = alias ? `<p class="source-block">This familiar link now opens the refined ${escapeHtml(lesson.title)} lesson. <a href="${href(`/lesson/${lesson.id}`)}">Use the canonical lesson link</a>.</p>` : "";
  return renderShell(`<section class="lesson-shell"><p class="lesson-breadcrumb"><a href="#/learn">Learning path</a> / ${escapeHtml(unit?.title || "Lesson")}</p><div class="lesson-topline"><span>Unit ${unit?.number || ""} · ${escapeHtml(lesson.kind || "Guided lesson")}</span><span>${done} of ${requiredPages(lesson).length} required pages</span></div><header class="lesson-header"><p class="eyebrow">${escapeHtml(lesson.duration || "Short session")} · ${escapeHtml(levelLabel(lesson.level || unit?.level))}</p><h1>${escapeHtml(lesson.title)}</h1><p class="outcome">${escapeHtml(lesson.outcome || lesson.summary || "Build one useful court decision.")}</p>${isLessonComplete(lesson) ? '<span class="status is-complete">Concept understood · revisit anytime</span>' : ""}</header>${renderLessonPage(lesson, page, index, route)}${aliasNote}${isLessonComplete(lesson) && !next ? '<aside class="feedback-prompt"><h2>How was this lesson?</h2><p>Your feedback can help improve it.</p><a href="/support/">Share feedback</a></aside>' : ""}<footer class="lesson-footer"><a class="button button-quiet" data-cta-priority="quiet" href="${href("/learn", { return: lesson.id })}">Back to path</a>${footerAction}</footer></section>`, route);
}

function renderLockedLesson(route, lesson) {
  const prereq = prerequisitesFor(lesson).map(getLesson).find((item) => item && !isLessonComplete(item));
  const refresher = !study && refresherGuides.find((topic) => topic.lesson.id === lesson.id);
  return renderShell(`<section class="empty-state"><p class="eyebrow">A useful step first</p><h1>${escapeHtml(lesson.title)} comes after a short foundation.</h1><p class="lede">${prereq ? `${escapeHtml(prereq.title)} gives this lesson its visual and rule context.` : "Choose an entry route or open the learning path to see what is ready."}</p><div class="button-row">${prereq ? `<a class="button button-primary" data-cta-priority="primary" href="${href(`/lesson/${prereq.id}`)}">Open: ${escapeHtml(prereq.title)}</a>` : '<a class="button button-primary" data-cta-priority="primary" href="#/placement">Choose my route</a>'}${refresher ? refresherLink("Review the basics", { topic: refresher.guideId }) : ""}<a class="button button-quiet" data-cta-priority="quiet" href="#/learn">View path</a></div></section>`, route);
}

function renderLessonPage(lesson, page, index, route) {
  const image = normalizeImage(page.illustration, lesson);
  const steps = page.steps || page.observations || page.contentBlocks?.filter((item) => typeof item === "string") || [];
  const sourceIds = page.sourceIds || lesson.sourceIds || [];
  return `<article class="lesson-page" data-page-type="${escapeHtml(page.type || "orientation")}"><p class="eyebrow">${page.required !== false ? `Required page ${index + 1}` : "Optional reference"} · ${escapeHtml(page.type || "Learning page")}</p><h2 tabindex="-1" data-lesson-heading>${escapeHtml(page.title)}</h2>${splitBody(page.body || page.summary || page.description)}${image ? `<figure class="learning-figure"><img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt)}" />${image.caption ? `<figcaption>${escapeHtml(image.caption)}</figcaption>` : ""}</figure>` : ""}${renderInstructionalPlate(page.plate)}${steps.length ? `<ol class="step-list">${steps.map((step) => `<li>${escapeHtml(typeof step === "string" ? step : step.text || step.title || "")}</li>`).join("")}</ol>` : ""}${page.cue ? `<p class="notice">${escapeHtml(page.cue)}</p>` : ""}${renderActivity(lesson, page, route)}${renderSources(sourceIds)}</article>`;
}

function renderInstructionalPlate(plate) {
  if (!plate?.items?.length) return "";
  return `<aside class="instructional-plate" aria-label="${escapeHtml(plate.label || plate.title || "Instructional plate")}"><p class="eyebrow">${escapeHtml(plate.label || "Instructional plate")}</p><h3>${escapeHtml(plate.title || "A useful court read")}</h3><ol>${plate.items.map((item, index) => `<li><span>${String(index + 1).padStart(2, "0")}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></div></li>`).join("")}</ol></aside>`;
}

function splitBody(body) {
  return String(body).split(/\n\n+/).filter(Boolean).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");
}

function activityKey(lesson, page) { return `${lesson.id}:${page.id}`; }

function getActionLessonPage(target) {
  const lesson = getLesson(target.dataset.lesson);
  const page = lesson?.pages?.find((item) => item.id === target.dataset.page);
  return lesson && page ? { lesson, page } : null;
}

function correctOptionIndex(activity = {}) {
  if (Number.isInteger(activity.correctIndex)) return activity.correctIndex;
  if (Number.isInteger(activity.answerIndex)) return activity.answerIndex;
  return 0;
}

function optionValue(option) { return typeof option === "string" ? option : option.label || option.text || option.value || ""; }

function renderActivity(lesson, page, route) {
  const activity = page.activity;
  const stored = lessonForDisplay(lesson.id);
  const pageDone = (page.required !== false ? stored.requiredPages : stored.optionalPages).includes(page.id);
  if (!activity) {
    if (pageDone) return '<p class="status is-complete">Page complete</p>';
    let tip = "Read this page, then mark it complete when you are ready.";
    if (!study && page === requiredPages(lesson)[0]) {
      tip = route.query.get("page") === page.id
        ? "Read this page and mark it complete, then choose Next. Your progress is saved in this browser."
        : "Read this page, then mark it complete to continue. Your progress is saved in this browser.";
    }
    return `<div class="activity-panel"><p>${tip}</p><div class="activity-actions"><button class="button button-primary" data-cta-priority="primary" type="button" data-action="page-complete" data-lesson="${lesson.id}" data-page="${page.id}">Mark page complete</button></div></div>`;
  }
  const kind = activity.kind || "retrieval";
  if (kind === "court-lab") return `<div class="activity-panel"><p class="eyebrow">Spatial practice</p><h3>${escapeHtml(activity.prompt || "Open the interactive court")}</h3><p>${escapeHtml(activity.description || "Use the full court when zone, serve, or player position matters. A text alternative remains in each scenario.")}</p><div class="activity-actions"><a class="button ${pageDone ? "button-secondary" : "button-primary"}" data-cta-priority="${pageDone ? "secondary" : "primary"}" href="#/court-lab?from=lesson&lesson=${encodeURIComponent(lesson.id)}">Open Court Lab</a>${pageDone ? '<span class="status is-complete">Court page complete</span>' : ""}</div></div>`;
  if (kind === "practice" || kind === "drill") return `<div class="activity-panel"><p class="eyebrow">Optional physical practice</p><h3>${escapeHtml(activity.prompt || "Try a small, safe repetition")}</h3><p>${escapeHtml(activity.practicePrompt || activity.description || "Choose standing, seated, reduced-range, or reading-only practice. Logging it never blocks concept completion.")}</p><div class="activity-actions"><button class="button button-secondary" type="button" data-action="practice-log" data-lesson="${lesson.id}" data-mode="practice">Log practice</button><button class="button button-quiet" type="button" data-action="page-complete" data-lesson="${lesson.id}" data-page="${page.id}">Use reading-only route</button></div></div>`;
  if (kind === "reflection") return `<div class="activity-panel"><p class="eyebrow">Reflection</p><h3>${escapeHtml(activity.prompt || "Choose a useful next focus")}</h3><p>${escapeHtml(activity.description || "A short plan helps a court session transfer without becoming a requirement.")}</p><div class="activity-actions"><button class="button button-primary" data-cta-priority="primary" type="button" data-action="page-complete" data-lesson="${lesson.id}" data-page="${page.id}">Save reflection</button></div></div>`;
  const key = activityKey(lesson, page);
  const selection = pageSelections[key];
  const options = activity.options || page.options || ["Use the rule and court cue from this page.", "Choose the option that ignores the key cue."];
  const correctIndex = correctOptionIndex(activity);
  const hasAnswered = Number.isInteger(selection?.index);
  const correct = selection?.index === correctIndex;
  return `<div class="activity-panel"><p class="eyebrow">${escapeHtml(kind.replace(/-/g, " "))}</p><h3>${escapeHtml(activity.prompt || "What is the useful next decision?")}</h3><p>${escapeHtml(activity.description || "Choose one response. Feedback explains the decision before you move on.")}</p><div class="answer-list" role="group" aria-label="${escapeHtml(activity.prompt || "Lesson check")}">${options.map((option, optionIndex) => { const selected = selection?.index === optionIndex; const state = hasAnswered ? (optionIndex === correctIndex ? "is-correct" : selected ? "is-incorrect" : "") : ""; return `<button class="answer-row ${selected ? "is-selected" : ""} ${state}" type="button" data-action="page-answer" data-lesson="${lesson.id}" data-page="${page.id}" data-index="${optionIndex}" aria-pressed="${selected}"><span class="answer-index">${String.fromCharCode(65 + optionIndex)}</span><span>${escapeHtml(optionValue(option))}</span></button>`; }).join("")}</div>${hasAnswered ? `<div class="feedback" role="status" tabindex="-1"><strong>${correct ? "That is the useful read." : "Keep the key cue in view."}</strong><p>${escapeHtml(correct ? activity.feedback || page.feedback || "That decision matches the court situation described on this page." : activity.incorrectFeedback || "Review the visual, then choose the response that follows the rule or coaching cue.")}</p></div>` : ""}${correct || pageDone ? '<p class="status is-complete">Required check complete</p>' : ""}</div>`;
}

function renderSources(ids = []) {
  const sources = (Array.isArray(ids) ? ids : []).map((id) => sourceById.get(id)).filter(Boolean);
  if (!sources.length) return "";
  return `<aside class="source-block"><p class="eyebrow">Evidence and source</p>${sources.map((source) => `<p><strong>${escapeHtml(source.type || "Source")}</strong>${source.reviewed ? ` · reviewed ${escapeHtml(source.reviewed)}` : ""} · ${source.url ? `<a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.title || source.label || "Source")} ↗</a>` : escapeHtml(source.title || source.label || "Source unavailable")}</p>`).join("")}</aside>`;
}

function renderPractice(route) {
  const drillPages = lessons.flatMap((lesson) => (lesson.pages || []).filter((page) => ["practice", "drill"].includes(page.activity?.kind)).map((page) => ({ lesson, page })));
  const relevant = drillPages.filter(({ lesson }) => isLessonAvailable(lesson) || isLessonComplete(lesson));
  const rows = (relevant.length ? relevant : drillPages).map(({ lesson, page }) => {
    const complete = isLessonComplete(lesson);
    return `<a class="practice-row" href="${href(`/lesson/${lesson.id}`, { page: page.id })}"><span><strong>${escapeHtml(page.title || lesson.title)}</strong><p>${escapeHtml(page.activity?.practicePrompt || page.body || lesson.outcome)}</p></span><span class="status ${complete ? "is-complete" : "is-current"}">${complete ? "Review" : "Open"}</span></a>`;
  }).join("");
  const practiceTotal = practiceCount();
  const practiceCue = study
    ? "Practice logs are voluntary. Every activity has a standing, seated, reduced-range, or reading-only way to continue learning."
    : "Pick one drill to try or read through. Log it if you want to remember what you practised.";
  return renderShell(`<section class="practice-layout page"><div><p class="eyebrow">Practice</p><h1>Take one useful cue to the court.</h1><p class="lede">${practiceCue}</p><div class="practice-list">${rows}</div></div><aside class="practice-aside"><p class="eyebrow">Your log</p><h2>${practiceTotal} practice${practiceTotal === 1 ? "" : "s"} recorded</h2><p>Use this as a memory aid, not a score. Court access and physical movement never gate lesson completion.</p><a class="button button-quiet" href="#/progress">See progress</a></aside></section>`, route);
}

function renderCourt(route) {
  const visited = new Set(progress.courtVisited);
  const hasRequiredZones = hasCourtZones();
  const returnTarget = courtReturnTarget(route);
  const fromLesson = returnTarget.href !== "#/learn";
  const modes = {
    explore: ["Explore the zones", study ? "Select the kitchen, a service court, and a baseline to build a court map." : "Select a labelled zone to learn what it means."],
    serve: ["Place the serve", "Choose the diagonally opposite service court from the lower-left baseline."],
    kitchen: ["Judge the kitchen scenario", "Use ball contact and momentum to decide whether a fault occurs."],
    check: ["Confirm the court map", hasRequiredZones ? "Use one quick check to confirm the spatial cue before returning to the lesson." : "Visit the kitchen, a service court, and a baseline first; then the map check will open."],
  };
  const [title, intro] = modes[courtMode] || modes.explore;
  const gateLabel = !hasRequiredZones ? "Explore three zones to continue" : !progress.courtKnowledgePassed ? "Pass the court check to continue" : "Court map complete";
  const lessonAction = progress.courtExplored
    ? `<a class="button button-primary" href="${escapeHtml(returnTarget.href)}">${escapeHtml(returnTarget.label)}</a>`
    : `<button class="button button-primary" type="button" disabled>${gateLabel}</button>`;
  const coach = !study && courtMode === "explore" ? renderCourtTip(fromLesson) : "";
  return renderShell(`<section class="court-page page"><div class="court-head"><div><p class="eyebrow">Court Lab · Interactive guide</p><h1>${title}</h1><p class="lede">${intro}</p></div><div class="court-progress" aria-label="${visited.size} of 3 court zones explored; court map check ${progress.courtKnowledgePassed ? "complete" : "pending"}"><strong>${visited.size}/3</strong><small>zones explored · ${progress.courtKnowledgePassed ? "check complete" : "check next"}</small></div></div><div class="court-tabs" role="group" aria-label="Court Lab activities">${[["explore", "Explore zones"], ["serve", "Serve placement"], ["kitchen", "Kitchen scenario"], ["check", "Court check"]].map(([mode, label]) => `<button type="button" aria-pressed="${courtMode === mode}" data-action="court-mode" data-mode="${mode}">${label}</button>`).join("")}</div><div class="court-layout"><div class="court-diagram-wrap">${renderCourtSvg()}<p class="court-caption">Every visual control has a labelled, keyboard-accessible court region. Use the coaching text beside it as a full text equivalent.</p></div><aside class="court-coach" aria-live="polite">${renderCourtCoach()}${coach}</aside></div><div class="court-actions"><a class="button button-quiet" href="#/learn">Back to learning path</a>${study || fromLesson ? lessonAction : ""}</div></section>`, route);
}

function renderCourtTip(fromLesson) {
  if (!fromLesson) return "<p>For a quick review, choose <strong>Serve placement</strong> or <strong>Kitchen scenario</strong>.</p>";
  if (progress.courtExplored) return "";
  return hasCourtZones()
    ? "<p>Choose <strong>Court check</strong> to confirm the map and return to your lesson.</p>"
    : "<p>Visit the <strong>kitchen</strong>, a <strong>service court</strong>, and a <strong>baseline</strong>. Then choose <strong>Court check</strong>.</p>";
}

function hasCourtZones(state = progress) {
  return Object.values(COURT_ZONES).every((zone) => state.courtVisited.includes(zone));
}

function courtReturnTarget(route) {
  const lesson = getLesson(route.query.get("lesson"));
  const courtPage = lesson?.pages?.find((page) => page.activity?.kind === "court-lab");
  if (lesson && courtPage) return { href: href(`/lesson/${lesson.id}`, { page: courtPage.id }), label: "Return to lesson" };
  return { href: "#/learn", label: "Return to learning path" };
}

function renderCourtSvg() {
  const zoneClass = (id, category) => `${activeCourtZone === id ? "is-active" : ""} ${progress.courtVisited.includes(category) ? "is-visited" : ""}`.trim();
  return `<svg class="court-svg" viewBox="0 0 620 760" role="group" aria-labelledby="court-title court-desc"><title id="court-title">Interactive top-down pickleball court</title><desc id="court-desc">Choose a kitchen, service court, or baseline to learn its use.</desc><rect x="35" y="30" width="550" height="700" rx="22" class="court-outer" />
  <g role="button" tabindex="0" class="court-zone court-service ${zoneClass("top-left-service", COURT_ZONES.SERVICE)}" data-action="court-zone" data-zone="top-left-service" data-category="${COURT_ZONES.SERVICE}" aria-label="Top left service court"><rect x="70" y="70" width="235" height="235"/><text x="187" y="188" text-anchor="middle">LEFT SERVICE</text></g>
  <g role="button" tabindex="0" class="court-zone court-service ${zoneClass("top-right-service", COURT_ZONES.SERVICE)}" data-action="court-zone" data-zone="top-right-service" data-category="${COURT_ZONES.SERVICE}" aria-label="Top right service court"><rect x="315" y="70" width="235" height="235"/><text x="432" y="188" text-anchor="middle">RIGHT SERVICE</text></g>
  <g role="button" tabindex="0" class="court-zone court-kitchen ${zoneClass("top-kitchen", COURT_ZONES.KITCHEN)}" data-action="court-zone" data-zone="top-kitchen" data-category="${COURT_ZONES.KITCHEN}" aria-label="Top non-volley zone"><rect x="70" y="315" width="480" height="65"/><text x="310" y="354" text-anchor="middle">NON-VOLLEY ZONE</text></g>
  <g role="button" tabindex="0" class="court-zone court-kitchen ${zoneClass("bottom-kitchen", COURT_ZONES.KITCHEN)}" data-action="court-zone" data-zone="bottom-kitchen" data-category="${COURT_ZONES.KITCHEN}" aria-label="Bottom non-volley zone"><rect x="70" y="390" width="480" height="65"/><text x="310" y="430" text-anchor="middle">NON-VOLLEY ZONE</text></g>
  <g role="button" tabindex="0" class="court-zone court-service ${zoneClass("bottom-left-service", COURT_ZONES.SERVICE)}" data-action="court-zone" data-zone="bottom-left-service" data-category="${COURT_ZONES.SERVICE}" aria-label="Bottom left service court"><rect x="70" y="465" width="235" height="225"/><text x="187" y="578" text-anchor="middle">LEFT SERVICE</text></g>
  <g role="button" tabindex="0" class="court-zone court-service ${zoneClass("bottom-right-service", COURT_ZONES.SERVICE)}" data-action="court-zone" data-zone="bottom-right-service" data-category="${COURT_ZONES.SERVICE}" aria-label="Bottom right service court"><rect x="315" y="465" width="235" height="225"/><text x="432" y="578" text-anchor="middle">RIGHT SERVICE</text></g>
  <g role="button" tabindex="0" class="court-zone court-baseline ${zoneClass("top-baseline", COURT_ZONES.BASELINE)}" data-action="court-zone" data-zone="top-baseline" data-category="${COURT_ZONES.BASELINE}" aria-label="Top baseline"><rect x="70" y="52" width="480" height="32"/><text x="310" y="49" text-anchor="middle">BASELINE</text></g>
  <g role="button" tabindex="0" class="court-zone court-baseline ${zoneClass("bottom-baseline", COURT_ZONES.BASELINE)}" data-action="court-zone" data-zone="bottom-baseline" data-category="${COURT_ZONES.BASELINE}" aria-label="Bottom baseline"><rect x="70" y="676" width="480" height="32"/><text x="310" y="722" text-anchor="middle">BASELINE</text></g>
  <g class="court-net" aria-hidden="true"><line x1="55" y1="385" x2="565" y2="385"/><circle cx="55" cy="385" r="8"/><circle cx="565" cy="385" r="8"/></g></svg>`;
}

function renderCourtCoach() {
  if (courtMode === "check") {
    if (!hasCourtZones()) return `<p class="eyebrow">Court map check</p><h2>Explore three landmarks first.</h2><p>Visit the kitchen, a service court, and a baseline. This keeps the check tied to the spatial map rather than a memorized sentence.</p>${renderVisited()}`;
    if (progress.courtKnowledgePassed) return `<p class="eyebrow">Court map check</p><h2>That spatial cue is set.</h2><p>You traced the court and used the diagonal-service rule. Return to the lesson whenever you are ready.</p>${renderVisited()}`;
    return `<p class="eyebrow">Court map check</p><h2>Where does this serve land?</h2><p>From the lower-left baseline, which top court is the legal diagonal service target?</p><div class="activity-actions"><button class="button button-secondary" type="button" data-action="court-check-answer" data-answer="left">Top-left service court</button><button class="button button-secondary" type="button" data-action="court-check-answer" data-answer="right">Top-right service court</button></div>${courtFeedback ? `<div class="feedback" role="status" tabindex="-1"><strong>${courtFeedback.correct ? "Correct" : "Not quite"}</strong><p>${escapeHtml(courtFeedback.text)}</p></div>` : ""}`;
  }
  if (courtMode === "kitchen") return `<p class="eyebrow">Kitchen scenario</p><h2>Does momentum still count?</h2><p>A player volleys while outside the kitchen, then their momentum carries them onto the non-volley-zone line. Is it a fault?</p><div class="activity-actions"><button class="button button-secondary" type="button" data-action="kitchen-answer" data-answer="yes">Yes, it is a fault</button><button class="button button-secondary" type="button" data-action="kitchen-answer" data-answer="no">No, play continues</button></div>${courtFeedback ? `<div class="feedback" role="status" tabindex="-1"><strong>${courtFeedback.correct ? "Correct" : "Not quite"}</strong><p>${escapeHtml(courtFeedback.text)}</p></div>` : ""}`;
  if (courtMode === "serve") return `<p class="eyebrow">Serve placement</p><h2>Start from lower-left.</h2><p>A legal serve travels diagonally, beyond the kitchen, into the opponent’s service court. Select the destination on the court.</p>${courtFeedback ? `<div class="feedback" role="status" tabindex="-1"><strong>${courtFeedback.correct ? "That is the box." : "Try the other diagonal."}</strong><p>${escapeHtml(courtFeedback.text)}</p></div>` : ""}`;
  if (activeCourtZone) {
    const category = activeCourtZone.includes(COURT_ZONES.KITCHEN) ? COURT_ZONES.KITCHEN : activeCourtZone.includes(COURT_ZONES.BASELINE) ? COURT_ZONES.BASELINE : COURT_ZONES.SERVICE;
    const copy = {
      [COURT_ZONES.KITCHEN]: ["The non-volley zone", "You may stand here and play a bounced ball. The restriction applies to volleys and their follow-through momentum."],
      [COURT_ZONES.SERVICE]: ["A service court", "The centreline divides left and right service courts. A serve travels diagonally into the opposite one, beyond the kitchen."],
      [COURT_ZONES.BASELINE]: ["The baseline", "A serve begins behind this line. It also helps you describe whether a ball is in or out during a rally."],
    }[category];
    return `<p class="eyebrow">Court cue</p><h2>${copy[0]}</h2><p>${copy[1]}</p>${renderVisited()}`;
  }
  return `<p class="eyebrow">Start here</p><h2>Select a court zone.</h2>${study ? "<p>Visit the kitchen, one service court, and either baseline. Then use the optional serve and kitchen scenarios to test the map.</p>" : ""}${renderVisited()}`;
}

function renderVisited() { return `<div class="court-visited" aria-label="Required zones explored">${Object.values(COURT_ZONES).map((category) => `<span class="${progress.courtVisited.includes(category) ? "is-done" : ""}">${progress.courtVisited.includes(category) ? "✓" : "○"} ${category}</span>`).join("")}</div>`; }

function renderLibraryTabs(view) {
  const views = [["skills", "Visual skills"], ["rules", "Rules & guides"]];
  if (!study) views.push(["refresher", "Quick refresher"]);
  return `<div class="library-tabs" role="group" aria-label="Library views">${views.map(([id, label]) => `<button type="button" aria-pressed="${view === id}" data-action="library-view" data-view="${id}">${escapeHtml(label)}</button>`).join("")}</div>`;
}

function isRefresherRoute(route) {
  return !study && matchRoute(route).path === "/library" && route.query.get("view") === "refresher";
}

function getRefresherTopic(route) {
  return refresherGuides.find(({ guideId }) => guideId === route.query.get("topic"));
}

function renderRefresher(route) {
  const topic = getRefresherTopic(route);
  let content;
  if (topic) {
    const { guide, lesson, page } = topic;
    const lessonLabel = isLessonComplete(lesson) ? "Review full lesson" : isLessonAvailable(lesson) ? "Open full lesson" : "See lesson prerequisites";
    const { prompt, options } = page.activity;
    content = `<div class="refresher-answer">
      <h1 tabindex="-1" data-refresher-heading>${escapeHtml(topic.title)}</h1>
      <p class="lede">${escapeHtml(guide.summary)}</p>
      <details class="refresher-check">
        <summary>Try a quick check</summary>
        <div class="refresher-question">
          <h2 id="refresher-question">${escapeHtml(prompt)}</h2>
          ${topic.showScenarioContext ? `<p>${escapeHtml(page.body)}</p>` : ""}
          <div class="activity-actions" role="group" aria-labelledby="refresher-question">
            ${options.map((option, index) => `<button class="button button-secondary" type="button" data-action="refresher-answer" data-index="${index}" aria-pressed="false">${escapeHtml(optionValue(option))}</button>`).join("")}
          </div>
          <p class="refresher-feedback" role="status" aria-atomic="true"></p>
        </div>
      </details>
      <div class="button-row refresher-actions">
        ${topic.guideId === "score-guide" ? scoringLink("refresher") : ""}
        ${refresherLink("All refresher topics")}
        <a class="button button-quiet" href="${href(`/lesson/${lesson.id}`)}">${lessonLabel}</a>
      </div>
      ${renderSources(guide.sourceIds)}
    </div>`;
  } else {
    content = `<div class="refresher-answer">
      <h1 tabindex="-1" data-refresher-heading>Quick refresher</h1>
      <p class="lede">Choose a rule for a quick answer and an optional scenario.</p>
      <ul class="refresher-topics">${refresherGuides.map(({ guideId, title }) => `<li><a class="button button-secondary" href="${escapeHtml(refresherHref(guideId))}">${escapeHtml(title)}</a></li>`).join("")}</ul>
    </div>`;
  }
  return renderShell(`<section class="reading refresher-view">${renderLibraryTabs("refresher")}${content}</section>`, route);
}

function answerRefresher(target) {
  const route = getRoute();
  if (!isRefresherRoute(route)) return;
  const topic = getRefresherTopic(route);
  const index = Number(target.dataset.index);
  const activity = topic?.page.activity;
  if (!activity?.options[index]) return;
  const question = target.closest(".refresher-question");
  if (!question) return;
  for (const option of question.querySelectorAll('[data-action="refresher-answer"]')) {
    option.setAttribute("aria-pressed", String(option === target));
  }
  const result = index === correctOptionIndex(activity) ? "Correct." : "Try again.";
  question.querySelector(".refresher-feedback").textContent = `${result} ${topic.explanation}`;
}

function renderLibrary(route) {
  if (isRefresherRoute(route)) return renderRefresher(route);
  const view = matchRoute(route).path === "/resources" || route.query.get("view") === "rules" ? "rules" : "skills";
  const situation = study === STUDY_CONDITIONS.DISCOVERY && view === "skills" ? situations.find((item) => item.id === route.query.get("situation")) : null;
  const query = libraryQuery.toLowerCase().trim();
  const topics = { "Know the Court": "Court and kitchen", "Start a Rally": "Serving and returns", "Keep Score": "Scoring", "Play the Point": "Strokes and movement", "Play Well With Others": "Etiquette and doubles", "Build a Reliable Game": "Advanced technique", "Deep-Dive Play": "Advanced play" };
  const items = view === "skills"
    ? lessons.map((lesson) => ({ id: lesson.id, title: lesson.title, description: lesson.outcome || lesson.summary, image: normalizeImage(lesson.illustration, lesson), tag: topics[getUnit(lesson)?.title] || getUnit(lesson)?.title || "Lesson", href: href(`/lesson/${lesson.id}`) }))
    : (libraryEntries || []).map((entry) => ({ ...entry, href: entry.lessonId ? href(`/lesson/${entry.lessonId}`) : entry.href || "#/learn" }));
  const filtered = items.filter((item) => (!situation || situation.lessons.includes(item.id)) && (!query || `${item.title} ${item.description} ${item.summary || ""} ${item.tag}`.toLowerCase().includes(query)) && (libraryFilter === "All topics" || item.tag === libraryFilter));
  const filters = ["All topics", ...new Set(items.map((item) => item.tag).filter(Boolean))].slice(0, 8);
  const situationLinks = study === STUDY_CONDITIONS.DISCOVERY && view === "skills" ? `<nav class="situation-nav" aria-label="Find skills by situation"><span>Explore a situation:</span> <a data-situation-link href="#/library?view=skills" ${!situation ? 'aria-current="page"' : ""}>All situations</a>${situations.map((item) => `<a data-situation-link href="${href("/library", { view: "skills", situation: item.id })}" ${situation?.id === item.id ? 'aria-current="page"' : ""}>${escapeHtml(item.label)}</a>`).join("")}</nav>` : "";
  return renderShell(`<section class="page"><div class="library-head"><div><p class="eyebrow">Library</p><h1>Find a rule or skill when you need it.</h1><p class="lede">Find a quick answer or explore a full lesson. Lesson prerequisites still apply.</p><div class="button-row">${scoringLink(view)}<a class="button button-quiet" href="/learn-pickleball/gear/">Beginner gear guide <span aria-hidden="true">→</span></a></div></div><label><span class="eyebrow">Search</span><input class="library-search" type="search" value="${escapeHtml(libraryQuery)}" placeholder="Kitchen, score, drop, or safety" data-input="library-query" /></label></div>${renderLibraryTabs(view)}${situationLinks}<div class="library-layout"><aside class="library-filter"><span>Browse by</span>${filters.map((filter) => `<button type="button" aria-pressed="${libraryFilter === filter}" data-action="library-filter" data-filter="${escapeHtml(filter)}">${escapeHtml(filter)}</button>`).join("")}</aside><div><div class="library-controls"><p role="status" aria-live="polite">${filtered.length} ${filtered.length === 1 ? "result" : "results"}</p><button type="button" class="button button-quiet" data-action="library-clear">Clear search and filters</button></div><div class="library-list">${filtered.length ? filtered.map((item) => view === "rules" ? `<article class="library-guide"><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.summary || item.description)}</p>${renderSources(item.sourceIds || [])}<a class="button button-quiet" href="${escapeHtml(item.href)}">Open full lesson: ${escapeHtml(item.title)} (prerequisites may apply)</a></article>` : `<a class="library-row" href="${escapeHtml(item.href)}">${item.image ? `<span class="library-thumbnail"><img src="${escapeHtml(item.image.src)}" alt="${escapeHtml(item.image.alt)}" /></span>` : '<span class="library-thumbnail" aria-hidden="true"></span>'}<span><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.description)}</p>${study === STUDY_CONDITIONS.DISCOVERY ? `<small>${escapeHtml(levelLabel(getUnit(getLesson(item.id))?.level))}</small>` : ""}</span><span class="library-tag">${escapeHtml(item.tag)}</span></a>`).join("") : '<p class="muted">No matching items yet. Try a broader word or clear the search and filters.</p>'}</div></div></div></section>`, route);
}

function renderProgress(route) {
  const complete = completedLessonCount();
  const next = getNextLesson();
  const earned = progress.earnedStickers.map((id) => Object.values(stickers).find((sticker) => sticker.id === id)).filter(Boolean);
  const hasRecoveryCopies = Boolean(progressStore.read().record?.recovery?.length);
  const resumeCue = study ? "Resume opens your next incomplete required page." : next ? "Resume starts at your next incomplete required page." : "";
  const resumeAction = next
    ? `<a class="button button-primary" href="${href(`/lesson/${next.id}`)}">Resume: ${escapeHtml(next.title)}</a>`
    : study ? '<a class="button button-primary" href="#/library?view=skills">Choose a review</a>' : refresherLink("Quick refresher", { primary: true });
  const actions = study ? resumeAction : `<div class="progress-actions">${resumeAction}<div class="button-row"><a class="button button-quiet" href="#/learn?review=completed">Review completed lessons</a>${next ? refresherLink() : ""}</div></div>`;
  return renderShell(`<section class="page"><div class="progress-head"><div><p class="eyebrow">Progress</p><h1>Small wins, useful next steps.</h1><p class="lede">Progress is saved in this browser on this device and does not sync. ${resumeCue ? `${resumeCue} ` : ""}Clearing browser data can erase progress. It is not a rating.</p></div>${actions}</div><div class="progress-summary"><div><strong>${complete}</strong><span>concept steps understood</span></div><div><strong>${practiceCount()}</strong><span>practice logs</span></div><div><strong>${earned.length}</strong><span>keepsakes earned</span></div></div><div class="progress-layout"><section><h2>Continue building</h2><div class="progress-list">${lessons.filter((lesson) => isLessonAvailable(lesson) && !isLessonComplete(lesson)).slice(0, 4).map((lesson) => `<a class="progress-row" href="${href(`/lesson/${lesson.id}`)}"><span><strong>${escapeHtml(lesson.title)}</strong><p>${escapeHtml(lesson.outcome || lesson.summary)}</p></span><span class="status is-current">Open</span></a>`).join("") || '<p class="muted">Your core path is complete. Optional deep dives are ready in Learn and Library.</p>'}</div>${hasRecoveryCopies ? '<p>Earlier progress copies are available after resolving a conflict. <button type="button" class="button button-quiet" data-action="download-recovery">Download recovery copies</button></p>' : ""}<details class="reset-details" ${resetArmed ? "open" : ""}><summary>Reset this device’s v2 learning progress</summary><p>This clears current progress and conflict recovery copies. A copy from before the multi-tab update may remain in this browser; older tabs and v1 data are not changed.</p>${resetArmed ? '<div class="button-row"><button class="button button-danger" type="button" data-action="reset-confirm">Reset fresh path</button><button class="button button-quiet" type="button" data-action="reset-cancel">Cancel</button></div>' : '<button class="button button-quiet" type="button" data-action="reset-arm">Reset progress</button>'}</details></section><aside class="progress-aside"><p class="eyebrow">Learning keepsakes</p><h2>${earned.length ? "A few moments worth remembering." : "Your first keepsake will appear here."}</h2>${earned.slice(-3).map((sticker) => `<div class="sticker-line"><img src="${escapeHtml(sticker.asset)}" alt="${escapeHtml(sticker.title)} sticker" /><span><strong>${escapeHtml(sticker.title)}</strong><br /><span class="muted">Earned after a concept step</span></span></div>`).join("") || '<p class="muted">Complete one concept check or explore the Court Lab to collect a small reminder of what you learned.</p>'}</aside></div></section>`, route);
}

function renderNotFound(route) {
  return renderShell(`<section class="empty-state"><p class="eyebrow">That page is not available</p><h1>Let’s return to a useful next step.</h1><p class="lede">The link may be old, or the lesson may now live under a refined curriculum name.</p><div class="button-row"><a class="button button-primary" href="#/learn">Open learning path</a><a class="button button-quiet" href="#/library?view=rules">Search Library</a></div></section>`, route);
}

function scoringLink(from) {
  return `<a class="button button-quiet" data-scoring-link href="${href("/scoring", from ? { from } : null)}">Try: Who serves next? <span aria-hidden="true">→</span></a>`;
}

function renderScoring(route) {
  const from = route.query.get("from");
  const library = ["skills", "rules", "refresher"].includes(from);
  const returnLink = library
    ? (from === "refresher" ? refresherHref("score-guide") : href("/library", { view: from }))
    : href("/learn", { return: "scoring-walkthrough" });
  return renderShell(`${renderScoringWalkthrough()}<div class="page scoring-footer">
    <a class="button button-quiet" href="${escapeHtml(returnLink)}">← Back to ${library ? "Library" : "Keep Score"}</a>
    ${renderSources(["R6"])}
  </div>`, route);
}

function render({ focusMain = false, lessonFocus = null } = {}) {
  const route = getRoute();
  let content;
  // Which page to show comes from routing/simple-router.js; app.js only renders it.
  const match = matchRoute(route);
  const views = {
    home: renderHome,
    placement: renderPlacement,
    learn: renderLearn,
    scoring: renderScoring,
    practice: renderPractice,
    court: renderCourt,
    library: renderLibrary,
    progress: renderProgress,
    lesson: (current) => renderLesson(current, match.params.lessonId),
    notFound: renderNotFound,
  };
  content = (views[match.view] || renderNotFound)(route);
  stopScoringWalkthrough?.();
  stopScoringWalkthrough = undefined;
  document.querySelector("#app").innerHTML = content;
  if (match.view === "scoring") {
    const walkthrough = document.querySelector("[data-scoring-walkthrough]");
    if (walkthrough) stopScoringWalkthrough = mountScoringWalkthrough(walkthrough);
  }
  document.title = titleForRoute(route);
  if (lessonFocus && activeSticker) pendingLessonFocus = lessonFocus;
  if (lessonFocus && !activeSticker) requestAnimationFrame(() => {
    (document.querySelector(lessonFocus) || document.querySelector("[data-lesson-heading]") || document.querySelector("#main-content"))?.focus();
  });
  if (focusMain && !activeSticker && !lessonFocus) requestAnimationFrame(() => {
    const returnId = match.path === "/learn" ? route.query.get("return") : null;
    const row = returnId === "scoring-walkthrough"
      ? document.querySelector("[data-scoring-link]")
      : returnId && [...document.querySelectorAll("[data-lesson-id]")].find((element) => element.dataset.lessonId === returnId);
    const refresherHeading = isRefresherRoute(route) && document.querySelector("[data-refresher-heading]");
    if (row) { const unit = row.closest("details"); if (unit) unit.open = true; row.focus(); }
    else if (refresherHeading) refresherHeading.focus();
    else if (match.view === "scoring") document.querySelector("#scoring-title")?.focus();
    else document.querySelector("#main-content")?.focus({ preventScroll: true });
  });
  if (activeSticker) requestAnimationFrame(() => document.querySelector('[data-action="sticker-dismiss"]')?.focus({ preventScroll: true }));
}

function titleForRoute(route) {
  const match = matchRoute(route);
  if (match.view === "lesson") return titled(resolveLesson(match.params.lessonId).lesson?.title || "Lesson");
  if (isRefresherRoute(route)) return titled(getRefresherTopic(route)?.title || "Quick refresher");
  return match.title;
}

function showToast(message) {
  const region = document.querySelector("#toast-region");
  if (!region) return;
  clearTimeout(toastTimer);
  region.textContent = message;
  region.classList.add("is-visible");
  toastTimer = setTimeout(() => region.classList.remove("is-visible"), 2800);
}

function markCourtLabPagesComplete(state) {
  const results = [];
  lessons.forEach((lesson) => (lesson.pages || []).filter((page) => page.activity?.kind === "court-lab").forEach((page) => results.push(recordLessonPage(lesson, page, page.required !== false, state))));
  return results;
}

function completeCourtLabGate(state) {
  if (!hasCourtZones(state) || !state.courtKnowledgePassed || state.courtExplored) return null;
  state.courtExplored = true;
  const results = markCourtLabPagesComplete(state);
  const sticker = { id: "court-explorer", title: "Court Explorer", asset: "assets/stickers/court-explorer.png" };
  if (!state.earnedStickers.includes(sticker.id)) {
    state.earnedStickers.push(sticker.id);
    return sticker;
  }
  return results.find((result) => result.sticker)?.sticker || null;
}

async function handleCourtZone(target) {
  const zone = target.dataset.zone;
  const category = target.dataset.category;
  const result = await changeProgress((state) => {
    if (!state.courtVisited.includes(category)) state.courtVisited.push(category);
  });
  if (!result) return;
  activeCourtZone = zone;
  if (courtMode === "serve") courtFeedback = { correct: zone === "top-right-service", text: zone === "top-right-service" ? "Correct. From the lower-left baseline, the serve travels across the net and centreline to the top-right service court." : "Trace across the net and centreline. The opposite service court is the target." };
  else courtFeedback = null;
  render();
  requestAnimationFrame(() => {
    if (!activeSticker && ["/court", "/court-lab", "/quiz"].includes(getRoute().path)) {
      const replacement = [...document.querySelectorAll('[data-action="court-zone"]')].find((element) => element.dataset.zone === zone);
      (replacement || document.querySelector("#main-content"))?.focus({ preventScroll: true });
    }
  });
}

function lessonFocusAfterAction(lesson, page, answered) {
  const route = getRoute();
  const visiblePage = lesson.pages?.[getPageIndex(lesson, route)];
  if (visiblePage?.id !== page.id) return "[data-lesson-heading]";
  return answered ? ".lesson-page .feedback" : '.lesson-footer [data-cta-priority="primary"]';
}

async function handleAction(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (action === "sticker-dismiss") { activeSticker = null; const lessonFocus = pendingLessonFocus; pendingLessonFocus = null; render({ focusMain: true, lessonFocus }); return; }
  if (action === "download-recovery") {
    const copies = progressStore.read().record?.recovery;
    if (!copies?.length) return;
    const blob = new Blob([JSON.stringify({ version: 1, copies }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "learn-pickleball-recovery.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (action === "legacy-keep" || action === "legacy-use") {
    const expected = legacyConflict;
    const result = await enqueueProgressTask(() => progressStore.resolveLegacy(action === "legacy-keep" ? "current" : "legacy", expected));
    if (!result.committed) {
      if (result.status === "unavailable") {
        const current = progressStore.read();
        if (current.status === "legacy-changed") { showStorageNotice("recovery-failed", current); return; }
      }
      if (result.status === "ready") {
        progress = result.progress;
        progressGeneration = result.generation;
        clearStorageNotice();
        showToast("The progress choice was already saved in another tab.");
        render({ focusMain: true });
      } else {
        if (result.progress) { progress = result.progress; progressGeneration = result.generation; render(); }
        showStorageNotice(result.status === "invalid-legacy" ? "legacy-changed" : result.status, result);
      }
      return;
    }
    progress = result.progress;
    progressGeneration = result.generation;
    pageSelections = {};
    activeSticker = null;
    if (result.status === "legacy-changed") showStorageNotice(result.status, result);
    else clearStorageNotice();
    showToast("Progress choice saved. A recovery copy remains in this browser.");
    render({ focusMain: true });
    return;
  }
  if (action === "study-entry" || action === "set-entry") {
    if (action === "study-entry" && (study !== STUDY_CONDITIONS.DISCOVERY || !["first-game-essentials", "consistency"].includes(target.dataset.entry))) return;
    const entry = target.dataset.entry;
    const result = await changeProgress((state) => {
      state.entryRouteId = entry;
      state.activePlaylistId = entry === "first-game-essentials" ? entry : null;
      state.placementAnswers = {};
      state.diagnosticAnswers = {};
    });
    if (!result) return;
    if (action === "study-entry") window.location.hash = "#/placement";
    else render({ focusMain: true });
    return;
  }
  if (action === "diagnostic-answer") {
    const question = target.dataset.question;
    const value = Number(target.dataset.value);
    const result = await changeProgress((state) => {
      state.diagnosticAnswers[question] = value;
      if (diagnosticQuestions.every((item) => Object.hasOwn(state.diagnosticAnswers, item.id))) {
        const score = Object.values(state.diagnosticAnswers).reduce((sum, answer) => sum + Number(answer || 0), 0);
        state.placementAnswers.recommendedUnit = score >= 7 ? 6 : 4;
      }
    });
    if (result) render({ focusMain: true });
    return;
  }
  if (action === "placement-restart") {
    const result = await changeProgress((state) => { state.entryRouteId = null; state.activePlaylistId = null; state.placementAnswers = {}; state.diagnosticAnswers = {}; });
    if (result) render({ focusMain: true });
    return;
  }
  if (action === "refresher-answer") { answerRefresher(target); return; }
  if (action === "page-complete") {
    const lessonPage = getActionLessonPage(target);
    if (!lessonPage) return;
    const { lesson, page } = lessonPage;
    const required = page.required !== false;
    const result = await changeProgress((state) => recordLessonPage(lesson, page, required, state));
    if (!result) return;
    finishLessonPage(lesson, page, required, result.value);
    showToast(required ? "Page recorded. Continue when ready." : "Optional reference recorded.");
    render({ lessonFocus: lessonFocusAfterAction(lesson, page, false) });
    return;
  }
  if (action === "practice-log") {
    const lessonId = target.dataset.lesson;
    const mode = target.dataset.mode || "practice";
    const result = await changeProgress((state) => recordPractice(state, lessonId, mode));
    if (!result) return;
    showToast("Practice logged. It never changes your concept completion.");
    render();
    return;
  }
  if (action === "page-answer") {
    const lessonPage = getActionLessonPage(target);
    if (!lessonPage) return;
    const { lesson, page } = lessonPage;
    const activity = page.activity || {};
    const index = Number(target.dataset.index);
    const correct = index === correctOptionIndex(activity);
    const result = await changeProgress((state) => {
      recordAttempt(state, lesson.id, activity.id || page.id, correct);
      return correct ? recordLessonPage(lesson, page, page.required !== false, state) : null;
    });
    if (!result) return;
    pageSelections[activityKey(lesson, page)] = { index };
    if (correct) { finishLessonPage(lesson, page, page.required !== false, result.value); showToast("Correct. Page recorded."); }
    render({ lessonFocus: lessonFocusAfterAction(lesson, page, true) });
    return;
  }
  if (action === "court-mode") {
    const mode = target.dataset.mode;
    courtMode = mode; courtFeedback = null; activeCourtZone = null; render();
    requestAnimationFrame(() => {
      if (matchRoute(getRoute()).view === "court" && courtMode === mode) {
        [...document.querySelectorAll('[data-action="court-mode"]')].find((button) => button.dataset.mode === mode)?.focus({ preventScroll: true });
      }
    });
    return;
  }
  if (action === "court-zone") { await handleCourtZone(target); return; }
  if (action === "kitchen-answer") { const correct = target.dataset.answer === "yes"; courtFeedback = { correct, text: correct ? "Volley momentum counts. Landing on or in the non-volley zone after a volley is a fault." : "A volley is not over when its momentum carries the player into the kitchen." }; render(); return; }
  if (action === "court-check-answer") {
    const correct = target.dataset.answer === "right";
    const result = await changeProgress((state) => {
      recordAttempt(state, "court-orientation", "court-map-check", correct);
      if (!correct) return null;
      state.courtKnowledgePassed = true;
      return completeCourtLabGate(state);
    });
    if (!result) return;
    if (result.value) activeSticker = result.value;
    courtFeedback = correct
      ? { correct: true, text: "Correct. The serve crosses both the net and centreline to the top-right service court." }
      : { correct: false, text: "Trace across the net and centreline from the lower-left baseline, then try again." };
    render();
    return;
  }
  if (action === "library-clear") { clearTimeout(searchTimer); libraryQuery = ""; libraryFilter = "All topics"; if (study === STUDY_CONDITIONS.DISCOVERY && getRoute().query.has("situation")) window.history.replaceState(null, "", "#/library?view=skills"); render(); requestAnimationFrame(() => document.querySelector('[data-input="library-query"]')?.focus()); return; }
  if (action === "library-view") { clearTimeout(searchTimer); libraryFilter = "All topics"; window.location.hash = `#/library?view=${target.dataset.view}`; return; }
  if (action === "library-filter") { clearTimeout(searchTimer); libraryFilter = target.dataset.filter; render(); requestAnimationFrame(() => [...document.querySelectorAll('[data-action="library-filter"]')].find((button) => button.dataset.filter === libraryFilter)?.focus()); return; }
  if (action === "reset-arm") { resetArmed = true; render(); return; }
  if (action === "reset-cancel") { resetArmed = false; render(); return; }
  if (action === "reset-confirm") {
    const result = await changeProgress(() => {}, { reset: true });
    if (!result) return;
    if (study) { unitDisclosure = {}; try { window.sessionStorage.removeItem(UNIT_SESSION_KEY); } catch { /* In-memory fallback. */ } }
    pageSelections = {};
    resetArmed = false;
    activeSticker = null;
    showToast("Fresh v2 learning path ready.");
    render({ focusMain: true });
  }
}

document.addEventListener("click", (event) => {
  if (event.target.closest?.(".skip-link")) {
    event.preventDefault();
    document.querySelector("#main-content")?.focus();
    return;
  }
  if (event.target.closest?.("[data-situation-link]")) { clearTimeout(searchTimer); libraryQuery = ""; libraryFilter = "All topics"; }
  const summary = event.target.closest?.("details[data-unit-id] > summary");
  if (summary) rememberUnit(summary.parentElement.dataset.unitId, !summary.parentElement.open);
  handleAction(event);
});
document.addEventListener("input", (event) => {
  if (event.target.matches('[data-input="library-query"]')) {
    libraryQuery = event.target.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const route = getRoute();
      if (matchRoute(route).view !== "library" || isRefresherRoute(route)) return;
      const inputHadFocus = document.activeElement?.matches('[data-input="library-query"]');
      render();
      if (inputHadFocus) requestAnimationFrame(() => { const input = document.querySelector('[data-input="library-query"]'); input?.focus(); input?.setSelectionRange(libraryQuery.length, libraryQuery.length); });
    }, 150);
  }
});
document.addEventListener("keydown", async (event) => {
  const target = event.target.closest?.('[data-action="court-zone"]');
  if (target && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); await handleCourtZone(target); }
  if (event.key === "Tab" && activeSticker) { event.preventDefault(); document.querySelector('[data-action="sticker-dismiss"]')?.focus(); }
  if (event.key === "Escape" && activeSticker) { activeSticker = null; const lessonFocus = pendingLessonFocus; pendingLessonFocus = null; render({ focusMain: true, lessonFocus }); }
});
window.addEventListener("hashchange", () => {
  pageSelections = {};
  if (!study && navKey(getRoute()) === "court") {
    courtMode = "explore";
    activeCourtZone = null;
    courtFeedback = null;
  }
  render({ focusMain: true });
});

// Notifications refresh the display; actions still acquire the lock before
// modifying the latest committed record.
function syncProgressFromStorage() {
  if (sessionOnly) return;
  const latest = progressStore.read();
  if (!latest.progress) { showStorageNotice(latest.status); return; }
  const wasReset = latest.generation !== progressGeneration;
  const changed = wasReset || JSON.stringify(latest.progress) !== JSON.stringify(progress);
  progress = latest.progress;
  progressGeneration = latest.generation;
  if (wasReset) { pageSelections = {}; activeSticker = null; pendingLessonFocus = null; }
  if (latest.status === "legacy-changed") showStorageNotice(latest.status, latest);
  else clearStorageNotice();
  if (!changed) return;
  // These views contain local, in-progress interactions that do not require a
  // refresh to accept the new progress. Preserve them until the next route.
  if (["library", "scoring"].includes(matchRoute(getRoute()).view)) return;

  // Preserve the active control when a different tab updates the view.
  const active = document.activeElement;
  const wasInsideApp = document.querySelector("#app")?.contains?.(active);
  const dataset = active?.dataset && { ...active.dataset };
  const linkHref = active?.tagName === "A" ? active.getAttribute("href") : null;
  const selector = dataset?.action ? "[data-action]" : dataset?.input ? "[data-input]" : linkHref ? "a[href]" : null;
  const start = active?.selectionStart;
  const end = active?.selectionEnd;
  render();
  if (wasInsideApp) requestAnimationFrame(() => {
    const replacement = selector && [...document.querySelectorAll(selector)].find((element) =>
      linkHref ? element.getAttribute("href") === linkHref : Object.entries(dataset).every(([key, value]) => element.dataset[key] === value));
    (replacement || document.querySelector("[data-lesson-heading]") || document.querySelector("#main-content"))?.focus({ preventScroll: true });
    if (replacement?.setSelectionRange && Number.isInteger(start) && Number.isInteger(end)) replacement.setSelectionRange(start, end);
  });
}

window.addEventListener("storage", (event) => {
  if (event.key === null || event.key === currentProgressKey || event.key === progressStore.recordKey) syncProgressFromStorage();
});
window.addEventListener("pageshow", syncProgressFromStorage);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncProgressFromStorage(); });

render();
if (initialProgress.status === "legacy-changed") showStorageNotice(initialProgress.status, initialProgress);
else if (initialProgress.status !== "ready") {
  sessionOnly = true;
  showStorageNotice(initialProgress.status);
} else if (!window.navigator?.locks?.request) {
  sessionOnly = true;
  showStorageNotice("unsupported");
}
