import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const fontFiles = [
  "assets/fonts/fredoka-500.woff2",
  "assets/fonts/fredoka-600.woff2",
  "assets/fonts/fredoka-700.woff2",
  "assets/fonts/nunito-400.woff2",
  "assets/fonts/nunito-500.woff2",
  "assets/fonts/nunito-600.woff2",
  "assets/fonts/nunito-700.woff2",
  "assets/fonts/nunito-800.woff2",
  "assets/fonts/nunito-900.woff2",
];

for (const file of fontFiles) {
  const contents = await readFile(new URL(`../${file}`, import.meta.url));
  assert.ok(contents.length > 1000, `${file} should contain a real font payload`);
  assert.equal(contents.slice(0, 4).toString("ascii"), "wOF2", `${file} should be WOFF2`);
}

const styles = await readFile(new URL("../styles.css", import.meta.url), "utf8");
assert.match(styles, /font-family: "Fredoka"[\s\S]*?font-weight: 500 700[\s\S]*?fredoka-500\.woff2/);
assert.match(styles, /font-family: "Nunito"[\s\S]*?font-weight: 400 900[\s\S]*?nunito-400\.woff2/);
assert.doesNotMatch(styles, /fonts\.(?:googleapis|gstatic)\.com/);

for (const license of ["assets/fonts/Fredoka-OFL.txt", "assets/fonts/Nunito-OFL.txt"]) {
  const contents = await readFile(new URL(`../${license}`, import.meta.url), "utf8");
  assert.match(contents, /SIL Open Font License, Version 1\.1/);
}

console.log("Local Fredoka/Nunito font checks passed.");
