import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const stickerDirectory = new URL("../assets/stickers/", import.meta.url);
const assets = (await readdir(stickerDirectory)).filter((name) => name.endsWith(".png")).map((name) => `assets/stickers/${name}`);
const mappedAssets = [...app.matchAll(/asset:\s*"(assets\/stickers\/[^\"]+\.png)"/g)].map((match) => match[1]);

assert.equal(assets.length, 15, "The illustration library should retain all 15 local sticker assets");
assert.equal(new Set(assets).size, assets.length, "sticker asset paths should be unique");
assert.ok(mappedAssets.length >= 7, "The v2 concept path should award a meaningful set of local stickers");
assert.ok(mappedAssets.every((asset) => assets.includes(asset)), "Every awarded sticker must resolve to a local asset");

for (const asset of assets) {
  const file = new URL(`../${asset}`, import.meta.url);
  const info = await stat(file);
  assert.ok(info.size > 1000, `${asset} should contain a real sticker image`);
  const bytes = await readFile(file);
  assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${asset} should be a PNG`);
  assert.equal(bytes.readUInt32BE(16), 512, `${asset} should be 512px wide`);
  assert.equal(bytes.readUInt32BE(20), 512, `${asset} should be 512px tall`);
}

const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");
assert.match(styles, /\.sticker-line img\s*\{[^}]*object-fit:\s*contain/);
assert.match(app, /data-action="sticker-dismiss"/);

console.log(`Sticker asset checks passed (${assets.length} local PNGs).`);
