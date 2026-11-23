/*
 * Integration tests: app.js + routing/simple-router.js.
 *
 * Visits URLs in the real app (sandboxed) and checks which view app.js
 * rendered, which navigation tab is highlighted, and where the document title
 * comes from. Titles are compared with router or curriculum values, never
 * with hard-coded wording.
 */
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { getAllLessons, getLesson, refresherTopics } from "../content/curriculum.js";
import { NAV_ITEMS, ROUTES, matchRoute, parseRoute } from "../routing/simple-router.js";
import { loadApp, publicPageDeepLinks } from "./helpers/load-app.js";

const lessons = getAllLessons();
const sampleUrl = (path) => `#${path.replace(":lessonId", lessons[0].id)}`;

describe("app.js routing", () => {
  let app;
  before(() => { app = loadApp(); });
  after(() => app.dispose());

  it("renders every route's view and highlights its nav tab", () => {
    for (const route of ROUTES) {
      const page = app.visit(sampleUrl(route.path));
      assert.deepEqual({ view: page.views[0], nav: page.nav }, { view: route.view, nav: [route.nav] }, route.path);
    }
  });

  it("marks the page wrapper with the route's view for every route (used by UI tests)", () => {
    for (const route of ROUTES) {
      const { html } = app.visit(sampleUrl(route.path));
      assert.match(html, new RegExp(`<main id="main-content"[^>]* data-view="${route.view}"`), route.path);
    }
    assert.match(app.visit("#/nope").html, /<main id="main-content"[^>]* data-view="notFound"/);
  });

  it("opens every curriculum lesson through the lesson view", () => {
    for (const lesson of lessons) {
      const page = app.visit(`#/lesson/${lesson.id}`);
      // Exactly one view: renderLesson falls back to renderNotFound for an unknown id.
      assert.deepEqual({ views: page.views, nav: page.nav }, { views: ["lesson"], nav: ["learn"] }, lesson.id);
    }
  });

  it("renders not-found for unknown URLs and highlights the router's fallback tab", () => {
    for (const url of ["#/nope", "#/lesson", "#/unit/unit-1", "#/lesson/kitchen-rule/extra"]) {
      const page = app.visit(url);
      assert.deepEqual({ view: page.views[0], nav: page.nav }, { view: "notFound", nav: [matchRoute(parseRoute(url)).nav] }, url);
    }
  });

  it("renders a real page for every deep link on the public pages", () => {
    for (const url of publicPageDeepLinks()) {
      const page = app.visit(url);
      assert.ok(page.views.length > 0 && page.views[0] !== "notFound", url);
    }
  });

  it("re-renders the new page when the URL hash changes", () => {
    app.visit("#/learn");
    const page = app.followLink("#/practice");
    assert.deepEqual({ view: page.views[0], nav: page.nav }, { view: "practice", nav: ["practice"] });
  });

  it("shows every navigation tab in the header and the bottom bar with its labels", () => {
    const { html } = app.visit("#/learn");
    for (const item of NAV_ITEMS) {
      assert.equal(html.split(`data-nav-area="${item.id}"`).length - 1, 2, `${item.id} should appear in header and bottom bar`);
      assert.ok(html.includes(`>${item.label}</a>`), `${item.id} header label`);
      assert.ok(html.includes(`<span>${item.shortLabel}</span>`), `${item.id} bottom-bar label`);
    }
  });

  it("takes the document title from the router for non-lesson pages", () => {
    for (const route of ROUTES.filter((item) => item.view !== "lesson")) {
      assert.equal(app.visit(`#${route.path}`).title, route.title, route.path);
    }
  });

  it("titles a lesson page after its lesson", () => {
    assert.ok(app.visit("#/lesson/kitchen-rule").title.startsWith(getLesson("kitchen-rule").title));
  });

  it("titles a legacy lesson link after the lesson it opens", () => {
    const page = app.visit("#/lesson/court-kitchen");
    assert.deepEqual(page.views, ["lesson"]);
    assert.ok(page.title.startsWith(getLesson("court-orientation").title), page.title);
  });

  it("opens a lesson from a percent-encoded shared link", () => {
    const page = app.visit("#/lesson/kitchen%2Drule");
    assert.deepEqual(page.views, ["lesson"], "the lesson page must receive the decoded id");
    assert.ok(page.title.startsWith(getLesson("kitchen-rule").title), page.title);
  });

  it("adds ?page= to the lesson URL when the last required page completes the lesson", async () => {
    const lesson = getLesson("equipment-safety");
    const required = lesson.pages.filter((page) => page.required !== false);
    for (const url of ["#/lesson/equipment-safety", "#/lesson/equipment%2Dsafety"]) {
      const fresh = loadApp();
      try {
        fresh.visit(url);
        for (const page of required) await fresh.call("handleAction", { target: { closest: () => ({ dataset: { action: "page-complete", lesson: lesson.id, page: page.id } }) } });
        const match = matchRoute(parseRoute(fresh.window.location.hash));
        assert.deepEqual({ lessonId: match.params.lessonId, page: match.route.query.get("page") }, { lessonId: lesson.id, page: required.at(-1).id }, url);
      } finally {
        fresh.dispose();
      }
    }
  });

  it("titles a refresher after its topic", () => {
    const topic = refresherTopics[0];
    assert.ok(app.visit(`#/library?view=refresher&topic=${topic.guideId}`).title.startsWith(topic.title));
  });

  it("keeps Library aliases and query views when paths have trailing slashes", () => {
    const resources = app.visit("#/resources/");
    assert.match(resources.html, /class="library-guide"/);
    assert.match(resources.html, /aria-pressed="true" data-action="library-view" data-view="rules"/);

    const topic = refresherTopics[0];
    const refresher = app.visit(`#/library/?view=refresher&topic=${topic.guideId}`);
    assert.match(refresher.html, /refresher-view/);
    assert.ok(refresher.title.startsWith(topic.title), refresher.title);
  });
});
