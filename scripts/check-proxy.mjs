import assert from "node:assert/strict";
import middleware, { config, isDisallowedAutomatedUserAgent } from "../middleware.js";

assert.deepEqual(config, { matcher: "/:path*" });

assert.equal(isDisallowedAutomatedUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36"), false);
assert.equal(isDisallowedAutomatedUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"), false);
assert.equal(isDisallowedAutomatedUserAgent("Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"), false);
assert.equal(isDisallowedAutomatedUserAgent("facebookexternalhit/1.1"), false);
assert.equal(isDisallowedAutomatedUserAgent("Mozilla/5.0 (compatible; GPTBot/1.2)"), true);
assert.equal(isDisallowedAutomatedUserAgent("curl/8.7.1"), true);
assert.equal(isDisallowedAutomatedUserAgent(""), false);
assert.equal(isDisallowedAutomatedUserAgent(undefined), false);

const blockedResponse = middleware(new Request("https://learn-pickleball.example/", {
  headers: { "user-agent": "curl/8.7.1" },
}));
assert.equal(blockedResponse.status, 403);
assert.equal(await blockedResponse.text(), "Automated collection is not permitted.");
assert.equal(blockedResponse.headers.get("x-robots-tag"), "noindex, nofollow, noarchive, nosnippet");

console.log("Proxy bot-guard checks passed.");
