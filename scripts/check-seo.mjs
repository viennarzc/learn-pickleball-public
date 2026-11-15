import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRobots } from "../api/robots.js";
import { PUBLIC_SEO_PAGES, requestOrigin } from "../api/seo-pages.js";
import { createSitemap } from "../api/sitemap.js";

const root = new URL("../", import.meta.url);
const routeFile = (path) => path === "/" ? "index.html" : `${path.slice(1)}index.html`;
const gearPath = "/learn-pickleball/gear/";
assert.ok(PUBLIC_SEO_PAGES.some(({ path }) => path === gearPath), "The gear guide belongs in the public sitemap");

for (const { path, updated } of PUBLIC_SEO_PAGES) {
  const html = await readFile(new URL(routeFile(path), root), "utf8");
  assert.match(updated, /^\d{4}-\d{2}-\d{2}$/, `${path} needs a sitemap lastmod date`);
  assert.match(html, /<title>[^<]+<\/title>/i, `${path} needs a title`);
  assert.match(html, /<meta\s+name="description"\s+content="[^"]+"/i, `${path} needs a description`);
  assert.match(html, /<link rel="canonical" href="https:\/\/[^\"]+"/i, `${path} needs an absolute canonical link`);
  assert.match(html, /<meta property="og:title" content="[^"]+"/i, `${path} needs an Open Graph title`);
  assert.match(html, /<meta property="og:url" content="https:\/\/[^\"]+"/i, `${path} needs an absolute Open Graph URL`);
  assert.match(html, /<meta property="og:image" content="https:\/\/[^\"]+"/i, `${path} needs an absolute Open Graph image`);
  assert.match(html, /<script defer src="\/?seo\.js\?v=1"><\/script>/i, `${path} needs dynamic production canonical and structured data support`);
  assert.doesNotMatch(html, /name="robots" content="[^">]*noindex/i, `${path} must be indexable`);
  assert.ok(html.includes(`data-seo-reviewed="${updated}"`), `${path} needs the matching source/review date`);
}

const origin = "https://learn-pickleball.example";
assert.equal(requestOrigin({ headers: { host: "learn-pickleball.example" } }), origin);
assert.equal(requestOrigin({ headers: { host: "learn-pickleball.example", "x-forwarded-proto": "http" } }), "http://learn-pickleball.example");
assert.equal(requestOrigin({ headers: { host: "learn-pickleball.example/unsafe" } }), "https://localhost");
for (const host of ["example.com:99999", ".", "example.com:65536"]) {
  const safeOrigin = requestOrigin({ headers: { host } });
  assert.equal(safeOrigin, "https://localhost", `Invalid host ${host} must fall back safely`);
  assert.doesNotThrow(() => createSitemap(safeOrigin));
  assert.doesNotThrow(() => createRobots(safeOrigin));
}
const sitemap = createSitemap(origin);
assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
for (const { path, updated } of PUBLIC_SEO_PAGES) {
  const entry = `<loc>${origin}${path}</loc>`;
  const url = sitemap.split("</url>").find((item) => item.includes(entry));
  assert.ok(url?.includes(`<lastmod>${updated}</lastmod>`), `${path} needs a sitemap entry with its own review date`);
}

const robots = createRobots(origin);
assert.match(robots, /User-agent: \*/);
assert.match(robots, /Allow: \//);
assert.match(robots, /Sitemap: https:\/\/learn-pickleball\.example\/sitemap\.xml/);

const vercel = JSON.parse(await readFile(new URL("../vercel.json", import.meta.url), "utf8"));
assert.ok(!Object.hasOwn(vercel, "proxy"), "Vercel must not use the unsupported proxy configuration block");
assert.deepEqual(vercel.rewrites, [
  { source: "/robots.txt", destination: "/api/robots" },
  { source: "/sitemap.xml", destination: "/api/sitemap" },
]);
assert.ok(!vercel.headers.flatMap(({ headers }) => headers).some(({ key }) => key.toLowerCase() === "x-robots-tag"), "Vercel must not globally noindex public pages");

console.log("SEO page, sitemap, robots, and Vercel route checks passed.");
