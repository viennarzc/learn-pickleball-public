import { PUBLIC_SEO_PAGES, escapeXml, requestOrigin } from "./seo-pages.js";

export function createSitemap(origin) {
  const entries = PUBLIC_SEO_PAGES.map(({ path, updated }) => `  <url>\n    <loc>${escapeXml(new URL(path, origin).href)}</loc>\n    <lastmod>${updated}</lastmod>\n  </url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

export default function handler(request, response) {
  response
    .status(200)
    .setHeader("Content-Type", "application/xml; charset=utf-8")
    .setHeader("Cache-Control", "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400")
    .send(createSitemap(requestOrigin(request)));
}
