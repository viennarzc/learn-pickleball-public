/*
 * Minimal static file server for UI tests. The app is a static site that
 * loads ES modules, which browsers refuse to load from file:// URLs.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, normalize, resolve, sep } from "node:path";

const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".webp": "image/webp", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
};

// Serves `root` on a free local port. Returns { url, close() }.
export async function startStaticServer(root) {
  const base = resolve(root);
  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname); // drops ?v=22 cache busters
    const file = resolve(base, `.${normalize(pathname.endsWith("/") ? `${pathname}index.html` : pathname)}`);
    if (file !== base && !file.startsWith(base + sep)) { response.writeHead(403).end(); return; }
    try {
      const body = await readFile(file);
      response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(body);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((done) => server.close(done)),
  };
}
