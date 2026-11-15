/*
 * Unit tests for routing/simple-router.js, one function at a time.
 * Assertions use paths, view names, nav ids, params and query values; page
 * titles are only checked for presence, never for wording.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { NAV_ITEMS, ROUTES, href, matchRoute, parseRoute } from "../routing/simple-router.js";

const resolve = (hash) => matchRoute(parseRoute(hash));
const pick = (match) => ({ view: match.view, nav: match.nav, params: match.params });

describe("parseRoute", () => {
  it("treats an empty or missing hash as home", () => {
    for (const hash of ["", undefined, null]) {
      const route = parseRoute(hash);
      assert.deepEqual({ raw: route.raw, path: route.path, segments: route.segments, query: route.query.toString() }, { raw: "#/", path: "/", segments: [], query: "" }, String(hash));
    }
  });

  it("treats a bare '#' as home but keeps the raw value", () => {
    const route = parseRoute("#");
    assert.deepEqual({ raw: route.raw, path: route.path }, { raw: "#", path: "/" });
  });

  it("splits the path into segments and ignores empty ones", () => {
    assert.deepEqual(parseRoute("#/lesson/kitchen-rule").segments, ["lesson", "kitchen-rule"]);
    assert.deepEqual(parseRoute("#//learn//").segments, ["learn"]);
  });

  it("accepts a path without the leading '#'", () => {
    assert.equal(parseRoute("/practice").path, "/practice");
  });

  it("parses the query string, decoding values", () => {
    const { query } = parseRoute("#/library?view=refresher&topic=serve%20guide");
    assert.deepEqual(Object.fromEntries(query), { view: "refresher", topic: "serve guide" });
  });

  it("keeps everything after the first '?' as the query", () => {
    assert.equal(parseRoute("#/library?view=refresher&topic=a?b").query.get("topic"), "a?b");
  });

  it("returns independent query objects", () => {
    const first = parseRoute("#/lesson/kitchen-rule?page=a");
    first.query.set("page", "changed");
    assert.equal(parseRoute("#/lesson/kitchen-rule?page=a").query.get("page"), "a");
  });
});

describe("matchRoute", () => {
  it("matches a static path to its view and nav tab", () => {
    assert.deepEqual(pick(resolve("#/practice")), { view: "practice", nav: "practice", params: {} });
  });

  it("extracts :params from the path", () => {
    assert.deepEqual(pick(resolve("#/lesson/kitchen-rule")), { view: "lesson", nav: "learn", params: { lessonId: "kitchen-rule" } });
  });

  it("decodes percent-encoded params from shared links", () => {
    assert.equal(resolve("#/lesson/kitchen%2Drule").params.lessonId, "kitchen-rule");
  });

  it("shows not-found for a malformed percent-encoding instead of throwing", () => {
    assert.equal(resolve("#/lesson/%E0%A4%A").view, "notFound");
  });

  it("requires the same number of segments as the pattern", () => {
    assert.equal(resolve("#/lesson").view, "notFound");
    assert.equal(resolve("#/lesson/kitchen-rule/extra").view, "notFound");
    assert.equal(resolve("#/practice/extra").view, "notFound");
  });

  it("tolerates a trailing slash", () => {
    assert.equal(resolve("#/learn/").view, "learn");
    assert.equal(resolve("#/lesson/kitchen-rule/").params.lessonId, "kitchen-rule");
  });

  it("is case-sensitive", () => {
    assert.equal(resolve("#/Learn").view, "notFound");
  });

  it("highlights Learn for not-found pages under /lesson or /unit, Progress otherwise", () => {
    assert.equal(resolve("#/lesson").nav, "learn");
    assert.equal(resolve("#/lessons").nav, "learn");
    assert.equal(resolve("#/unit/unit-1").nav, "learn");
    assert.equal(resolve("#/nope").nav, "progress");
  });

  it("returns the route, params and a title with every match", () => {
    for (const hash of ["#/learn", "#/lesson/kitchen-rule", "#/nope"]) {
      const match = resolve(hash);
      assert.equal(match.route.path, parseRoute(hash).path, hash);
      assert.equal(typeof match.params, "object", hash);
      assert.ok(typeof match.title === "string" && match.title.length > 0, hash);
    }
  });

  it("accepts partial route objects and fills in what is missing", () => {
    assert.equal(matchRoute({ path: "/library" }).view, "library");
    assert.equal(matchRoute({ path: "/library" }).route.query.toString(), "");
    assert.equal(matchRoute({}).view, "home");
  });

  it("does not change the route object it is given", () => {
    const route = { path: "/library", query: new URLSearchParams("view=rules") };
    matchRoute(route);
    assert.deepEqual(Object.keys(route), ["path", "query"]);
  });

  it("returns a copy, so changing a match does not change the route table", () => {
    resolve("#/practice").view = "changed";
    assert.equal(resolve("#/practice").view, "practice");
    assert.ok(ROUTES.every((route) => route.view !== "changed"));
  });
});

describe("href", () => {
  it("builds a hash link and adds a missing leading slash", () => {
    assert.equal(href("/learn"), "#/learn");
    assert.equal(href("learn"), "#/learn");
  });

  it("adds a query from an object, URLSearchParams or pairs", () => {
    assert.equal(href("/library", { view: "rules" }), "#/library?view=rules");
    assert.equal(href("/library", new URLSearchParams("view=rules")), "#/library?view=rules");
    assert.equal(href("/library", [["view", "rules"]]), "#/library?view=rules");
  });

  it("encodes query values", () => {
    assert.equal(href("/library", { topic: "a b&c" }), "#/library?topic=a+b%26c");
  });

  it("leaves out the '?' when the query is empty", () => {
    assert.equal(href("/learn", {}), "#/learn");
    assert.equal(href("/learn", new URLSearchParams()), "#/learn");
  });

  it("round-trips through parseRoute and matchRoute", () => {
    const match = resolve(href("/lesson/kitchen-rule", { page: "kitchen-decisions" }));
    assert.deepEqual({ view: match.view, lessonId: match.params.lessonId, page: match.route.query.get("page") }, { view: "lesson", lessonId: "kitchen-rule", page: "kitchen-decisions" });
  });
});

describe("ROUTES", () => {
  it("declares a path, view, nav tab and title for every route", () => {
    for (const route of ROUTES) {
      assert.match(route.path, /^\//, JSON.stringify(route));
      for (const key of ["view", "nav", "title"]) assert.ok(typeof route[key] === "string" && route[key].length > 0, `${route.path} needs ${key}`);
    }
  });

  it("names params with letters only", () => {
    const params = ROUTES.flatMap((route) => route.path.split("/").filter((part) => part.startsWith(":")));
    assert.deepEqual(params.filter((param) => !/^:[A-Za-z]+$/.test(param)), []);
  });

  it("never lets one route hide another", () => {
    for (const [index, route] of ROUTES.entries()) {
      const sample = route.path.replace(/:[A-Za-z]+/g, "sample");
      assert.equal(resolve(`#${sample}`).path, route.path, `${route.path} is shadowed by an earlier route`);
    }
  });
});

describe("NAV_ITEMS", () => {
  it("uses unique ids", () => {
    const ids = NAV_ITEMS.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("has a label and a short label for every tab", () => {
    for (const item of NAV_ITEMS) assert.ok(item.label && item.shortLabel, item.id);
  });

  it("is used by at least one route each, so no tab is orphaned", () => {
    for (const item of NAV_ITEMS) assert.ok(ROUTES.some((route) => route.nav === item.id), item.id);
  });
});
