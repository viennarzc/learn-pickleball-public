import { writeFile } from "node:fs/promises";

const email = process.env.SUPPORT_EMAIL?.trim();
if (!email || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(email)) {
  throw new Error("Set SUPPORT_EMAIL to a valid support email address before building.");
}
await writeFile(new URL("../support/config.js", import.meta.url), `window.supportEmail = ${JSON.stringify(email)};\n`);
