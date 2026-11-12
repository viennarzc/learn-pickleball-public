import { requestOrigin } from "./seo-pages.js";

export function createRobots(origin) {
  return `# Public lessons are available to search engines.\nUser-agent: *\nAllow: /\n\nSitemap: ${new URL("/sitemap.xml", origin).href}\n`;
}

export default function handler(request, response) {
  response
    .status(200)
    .setHeader("Content-Type", "text/plain; charset=utf-8")
    .setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400")
    .send(createRobots(requestOrigin(request)));
}
