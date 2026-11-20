import assert from "node:assert/strict";
import { test } from "node:test";
import { getLesson } from "../content/curriculum.js";
import { loadApp } from "./helpers/load-app.js";

test("server-one scenario gives feedback, allows retry, and preserves completion", async () => {
  const app = loadApp({ hash: "#/lesson/rotation-positions?page=lose-rally" });
  try {
    const lesson = getLesson("rotation-positions");
    const page = lesson.pages.find((item) => item.id === "lose-rally");
    const render = () => app.call("renderActivity", lesson, page, { query: new URLSearchParams() });
    const answer = (index) => app.call("handleAction", { target: { closest: () => ({ dataset: { action: "page-answer", lesson: lesson.id, page: page.id, index: String(index) } }) } });
    assert.match(render(), /What happens next\?/);
    assert.doesNotMatch(render(), /Required check complete/);
    await answer(2);
    assert.match(render(), /receiving team winning a rally does not score/);
    assert.doesNotMatch(render(), /Required check complete/);
    await answer(1);
    assert.match(render(), /server 1’s partner serves next/);
    assert.match(render(), /Required check complete/);
    await answer(0);
    assert.match(render(), /Required check complete/);
  } finally { app.dispose(); }
});
