/*
 * Navigation routing — Option A: simple route table.
 *
 * The app uses hash URLs (#/learn, #/lesson/kitchen-rule?page=…) so it runs as
 * a static site without server rewrites. This file owns:
 *   - ROUTES:    every page, the view that renders it, its nav tab and title
 *   - NAV_ITEMS: the primary navigation tabs
 *   - parseRoute / matchRoute / href: reading the URL and building links
 * app.js owns what each view renders and what each query parameter does.
 *
 * To add a page: add one entry to ROUTES (with a comment) and register a view
 * with the same name in app.js. Paths may contain `:params`, e.g.
 * "/unit/:unitId", which arrive in match.params.
 */

export const APP_TITLE = "Learn Pickleball";
// "Practice" -> "Practice — Learn Pickleball"
export const titled = (page) => `${page} — ${APP_TITLE}`;

// Primary navigation in display order. `label` is the desktop header text,
// `shortLabel` the mobile bottom bar. `href` is where the tab points.
export const NAV_ITEMS = [
  { id: "learn", label: "Learn", shortLabel: "Learn", href: "#/learn" },
  { id: "practice", label: "Practice", shortLabel: "Practice", href: "#/practice" },
  { id: "court", label: "Court Lab", shortLabel: "Court", href: "#/court-lab" },
  { id: "library", label: "Library", shortLabel: "Library", href: "#/library?view=skills" },
  { id: "progress", label: "Progress", shortLabel: "Progress", href: "#/progress" },
];

// Order matters only for patterns: the first matching entry wins.
export const ROUTES = [
  // Home: welcome screen and "continue where you left off". Also the page for
  // an empty URL.
  { path: "/", view: "home", nav: "learn", title: "Learn Pickleball — Get court-ready" },

  // Legacy v1 link to home. Same screen.
  { path: "/home", view: "home", nav: "learn", title: APP_TITLE },

  // Entry-route chooser: "I have never played", "I need to play soon", …
  { path: "/placement", view: "placement", nav: "learn", title: APP_TITLE },

  // Learning path: all units and lessons.
  //   ?review=completed   list completed lessons
  //   ?view=atlas         atlas layout (atlas study mode only)
  //   ?return=<lessonId>  focus that lesson's row when coming back
  { path: "/learn", view: "learn", nav: "learn", title: titled("Learn") },

  // Optional Keep Score activity, also accessible from Library without prerequisites.
  { path: "/scoring", view: "scoring", nav: "learn", title: titled("Who serves next?") },

  // Practice hub: drills and the practice log.
  { path: "/practice", view: "practice", nav: "practice", title: titled("Practice") },

  // Court Lab: interactive court map and the map check. Linked from public pages.
  //   ?lesson=<lessonId>  came from a lesson; offers a way back to it
  //   ?from=<source>      where the visitor came from (informational, not read)
  { path: "/court-lab", view: "court", nav: "court", title: titled("Court Lab") },

  // Legacy v1 link to Court Lab.
  { path: "/court", view: "court", nav: "court", title: titled("Court Lab") },

  // Legacy v1 quiz link; the quiz now lives in Court Lab.
  { path: "/quiz", view: "court", nav: "court", title: APP_TITLE },

  // Library: answer-shaped rule and skill guides.
  //   ?view=skills (default) | rules | refresher
  //   ?topic=<guideId>      refresher topic, e.g. serve-guide
  //   ?situation=<id>       situation filter (discovery study mode only)
  { path: "/library", view: "library", nav: "library", title: titled("Library") },

  // Legacy link to the Library's visual skills view.
  { path: "/skills", view: "library", nav: "library", title: titled("Visual skills") },

  // Legacy link to Rules & guides; app.js always opens the rules view here.
  { path: "/resources", view: "library", nav: "library", title: titled("Rules & guides") },

  // Progress: completed lessons, stickers and reset.
  { path: "/progress", view: "progress", nav: "progress", title: titled("Progress") },

  // Legacy v1 link to achievements; now part of Progress.
  { path: "/achievements", view: "progress", nav: "progress", title: titled("Progress") },

  // One lesson. :lessonId is a canonical id or a legacy alias such as
  // court-kitchen; app.js resolves aliases. app.js replaces this title with
  // the lesson's own title.
  //   ?page=<pageId>  open a specific page of the lesson
  { path: "/lesson/:lessonId", view: "lesson", nav: "learn", title: titled("Lesson") },
];

// Shown when no route matches. The highlighted tab follows today's behaviour:
// anything under /lesson or /unit highlights Learn, everything else Progress.
const NOT_FOUND = { view: "notFound", title: APP_TITLE };
const notFoundNav = (path) => (path.startsWith("/lesson") || path.startsWith("/unit") ? "learn" : "progress");

// "#/lesson/x?page=y" -> { raw, path: "/lesson/x", segments: ["lesson", "x"], query }
export function parseRoute(hash) {
  const raw = hash || "#/";
  const trimmed = raw.startsWith("#") ? raw.slice(1) : raw;
  const queryStart = trimmed.indexOf("?");
  const path = (queryStart >= 0 ? trimmed.slice(0, queryStart) : trimmed) || "/";
  const query = queryStart >= 0 ? trimmed.slice(queryStart + 1) : "";
  return { raw, path, segments: path.split("/").filter(Boolean), query: new URLSearchParams(query) };
}

// Returns the matching ROUTES entry plus its params and the parsed route.
// Accepts parseRoute() output or a partial { path, query } object.
export function matchRoute(input) {
  const route = completeRoute(input);
  for (const definition of ROUTES) {
    const params = matchPath(definition.path, route.segments);
    if (params) return { ...definition, params, route };
  }
  return { ...NOT_FOUND, nav: notFoundNav(route.path), params: {}, route };
}

// ("/library", { view: "rules" }) -> "#/library?view=rules"
export function href(path, query) {
  const prefix = path.startsWith("/") ? path : `/${path}`;
  const search = query ? new URLSearchParams(query).toString() : "";
  return `#${prefix}${search ? `?${search}` : ""}`;
}

// Fills in segments, query and raw when a caller only provides a path.
function completeRoute(route) {
  const path = route.path || "/";
  return {
    ...route,
    path,
    segments: route.segments ?? path.split("/").filter(Boolean),
    query: route.query ?? new URLSearchParams(),
    raw: route.raw ?? `#${path}`,
  };
}

// "/lesson/:lessonId" vs ["lesson", "x"] -> { lessonId: "x" }; null if no match.
// Params are percent-decoded; a malformed encoding counts as no match.
function matchPath(pattern, segments) {
  const parts = pattern.split("/").filter(Boolean);
  if (parts.length !== segments.length) return null;
  const params = {};
  for (const [index, part] of parts.entries()) {
    if (part.startsWith(":")) {
      try { params[part.slice(1)] = decodeURIComponent(segments[index]); } catch { return null; }
    } else if (part !== segments[index]) return null;
  }
  return params;
}
