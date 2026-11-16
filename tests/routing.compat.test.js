/*
 * Routing tests for routing/simple-router.js.
 *
 * The compatibility suite checks that every URL the app and the public pages
 * produce opens the same view, highlights the same navigation tab and passes
 * the same ids as before the router was extracted from app.js.
 *
 * Assertions use view names, navigation ids, route names, param ids and nav
 * labels, never page titles or lesson titles.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAllLessons, refresherTopics } from "../content/curriculum.js";
import * as router from "../routing/simple-router.js";
import { publicPageDeepLinks } from "./helpers/load-app.js";

const lessons = getAllLessons();
const lessonIds = new Set(lessons.map((lesson) => lesson.id));

const resolve = (hash) => router.matchRoute(router.parseRoute(hash));
const routePaths = () => router.ROUTES.map((route) => route.path);

// Every path app.js accepts today, including v1 legacy paths.
const SUPPORTED_PATHS = ["/", "/home", "/placement", "/learn", "/scoring", "/practice", "/court-lab", "/court", "/quiz", "/library", "/skills", "/resources", "/progress", "/achievements", "/lesson/:lessonId"];

// Views app.js knows how to render today.
const APP_VIEWS = ["home", "placement", "learn", "scoring", "practice", "court", "library", "progress", "lesson"];

const expectedNavItems = [
  { id: "learn", label: "Learn", shortLabel: "Learn" },
  { id: "practice", label: "Practice", shortLabel: "Practice" },
  { id: "court", label: "Court Lab", shortLabel: "Court" },
  { id: "library", label: "Library", shortLabel: "Library" },
  { id: "progress", label: "Progress", shortLabel: "Progress" },
];

// Every URL shape the app links to today -> [view, highlighted nav tab].
const currentUrls = [
  ["", "home", "learn"],
  ["#/", "home", "learn"],
  ["#/home", "home", "learn"],
  ["#/placement", "placement", "learn"],
  ["#/learn", "learn", "learn"],
  ["#/learn?review=completed", "learn", "learn"],
  ["#/learn?view=atlas", "learn", "learn"],
  ["#/learn?return=kitchen-rule", "learn", "learn"],
  ["#/practice", "practice", "practice"],
  ["#/court-lab", "court", "court"],
  ["#/court-lab?from=lesson&lesson=kitchen-rule", "court", "court"],
  ["#/court", "court", "court"],
  ["#/quiz", "court", "court"],
  ["#/library", "library", "library"],
  ["#/library?view=skills", "library", "library"],
  ["#/library?view=rules", "library", "library"],
  ["#/library?view=refresher", "library", "library"],
  ["#/library?view=refresher&topic=serve-guide", "library", "library"],
  ["#/skills", "library", "library"],
  ["#/resources", "library", "library"],
  ["#/progress", "progress", "progress"],
  ["#/achievements", "progress", "progress"],
];

// URLs that match no page. The highlighted tab mirrors today's app.js navKey().
const notFoundUrls = [
  ["#/nope", "progress"],
  ["#/learn/extra", "progress"],
  ["#/lesson", "learn"],
  ["#/unit/unit-1", "learn"],
];

describe("compatibility with the URLs the app used before the router", () => {
  it("opens the same view and nav tab for every URL the app links to", () => {
    for (const [hash, view, nav] of currentUrls) {
      const match = resolve(hash);
      assert.deepEqual({ view: match.view, nav: match.nav }, { view, nav }, JSON.stringify(hash));
    }
  });

  it("opens every curriculum lesson through the generic lesson route", () => {
    for (const lesson of lessons) {
      const match = resolve(`#/lesson/${lesson.id}`);
      assert.deepEqual({ view: match.view, nav: match.nav, lessonId: match.params.lessonId }, { view: "lesson", nav: "learn", lessonId: lesson.id });
    }
  });

  it("passes a legacy lesson id through unchanged for app.js to resolve", () => {
    const match = resolve("#/lesson/court-kitchen");
    assert.deepEqual({ view: match.view, lessonId: match.params.lessonId }, { view: "lesson", lessonId: "court-kitchen" });
  });

  it("keeps the query string available to the view (e.g. ?page=)", () => {
    const match = resolve("#/lesson/kitchen-rule?page=kitchen-decisions");
    assert.equal(match.route.query.get("page"), "kitchen-decisions");
    assert.equal(match.params.lessonId, "kitchen-rule");
  });

  it("shows not-found for unknown URLs and highlights the same tab as today", () => {
    for (const [hash, nav] of notFoundUrls) {
      const match = resolve(hash);
      assert.deepEqual({ view: match.view, nav: match.nav }, { view: "notFound", nav }, hash);
    }
  });

  it("opens every deep link published on the public pages", () => {
    const links = publicPageDeepLinks();
    assert.ok(links.length > 0, "no deep links found on public pages");
    for (const hash of links) {
      const match = resolve(hash);
      assert.ok(APP_VIEWS.includes(match.view), `${hash} -> ${match.view}`);
      if (match.view === "lesson") assert.ok(lessonIds.has(match.params.lessonId), `${hash}: unknown lesson`);
      const topic = match.route.query.get("topic");
      if (topic) assert.ok(refresherTopics.some((item) => item.guideId === topic), `${hash}: unknown refresher topic`);
    }
  });

  it("matches a route object that only has path and query, as older callers build it", () => {
    const match = router.matchRoute({ path: "/library", query: new URLSearchParams("view=rules") });
    assert.deepEqual({ view: match.view, nav: match.nav }, { view: "library", nav: "library" });
    assert.equal(router.matchRoute({ path: "/lesson/kitchen-rule" }).params.lessonId, "kitchen-rule");
  });

  it("parses the hash into path, segments and query like app.js getRoute()", () => {
    const route = router.parseRoute("#/lesson/kitchen-rule?page=kitchen-decisions");
    assert.deepEqual(
      { raw: route.raw, path: route.path, segments: route.segments, page: route.query.get("page") },
      { raw: "#/lesson/kitchen-rule?page=kitchen-decisions", path: "/lesson/kitchen-rule", segments: ["lesson", "kitchen-rule"], page: "kitchen-decisions" },
    );
    assert.deepEqual({ raw: router.parseRoute("").raw, path: router.parseRoute("").path }, { raw: "#/", path: "/" });
  });

  it("builds links like app.js href()", () => {
    assert.equal(router.href("/learn"), "#/learn");
    assert.equal(router.href("practice"), "#/practice");
    assert.equal(router.href("/library", { view: "refresher", topic: "serve-guide" }), "#/library?view=refresher&topic=serve-guide");
    assert.equal(router.href("/lesson/kitchen-rule", new URLSearchParams({ page: "x" })), "#/lesson/kitchen-rule?page=x");
  });
});

describe("navigation and route table", () => {
  it("lists the navigation tabs by id and label in display order", () => {
    const items = router.NAV_ITEMS.map(({ id, label, shortLabel }) => ({ id, label, shortLabel }));
    assert.deepEqual(items, expectedNavItems);
  });

  it("each navigation tab links to a page that highlights that tab", () => {
    assert.equal(router.NAV_ITEMS.length, expectedNavItems.length);
    for (const item of router.NAV_ITEMS) assert.equal(resolve(item.href).nav, item.id, item.href);
  });

  it("declares every supported path exactly once", () => {
    const paths = routePaths();
    assert.deepEqual(paths.filter((path, index) => paths.indexOf(path) !== index), []);
    assert.deepEqual([...paths].sort(), [...SUPPORTED_PATHS].sort());
  });

  it("reaches every view app.js renders, using only nav ids that exist", () => {
    const navIds = new Set(router.NAV_ITEMS.map((item) => item.id));
    assert.deepEqual([...new Set(router.ROUTES.map((route) => route.view))].sort(), [...APP_VIEWS].sort());
    for (const route of router.ROUTES) {
      assert.ok(APP_VIEWS.includes(route.view), `${route.path} -> unknown view ${route.view}`);
      assert.ok(navIds.has(route.nav), `${route.path} -> unknown nav ${route.nav}`);
    }
  });

  it("gives every matched page a title", () => {
    for (const [hash] of [...currentUrls, ...notFoundUrls, ["#/lesson/kitchen-rule"]]) {
      const { title } = resolve(hash);
      assert.equal(typeof title, "string", hash);
      assert.ok(title.length > 0, hash);
    }
  });
});

describe("edge cases that behave better than before", () => {
  it("tolerates a trailing slash (today '#/learn/' is not found)", () => {
    assert.equal(resolve("#/learn/").view, "learn");
  });

  it("does not treat extra segments as a lesson (today '#/lesson/a/b' opens lesson 'a')", () => {
    assert.equal(resolve("#/lesson/kitchen-rule/extra").view, "notFound");
  });
});
