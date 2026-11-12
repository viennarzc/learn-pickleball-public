import { next } from "@vercel/functions";

// This list intentionally does not contain generic terms such as "bot" or "crawler".
// Search engines, link previews, and accessibility tools use those user agents too.
// Vercel Bot Management is the authority for challenging high-volume and spoofed traffic.
const DISALLOWED_AUTOMATION_USER_AGENT = /(?:gptbot|claudebot|anthropic-ai|perplexitybot|cohere-ai|bytespider|ccbot|semrushbot|ahrefsbot|mj12bot|dotbot|dataforseo|screaming frog|wget|curl|python-requests|aiohttp|go-http-client|scrapy|selenium|playwright|puppeteer|phantomjs|headlesschrome)/i;

export function isDisallowedAutomatedUserAgent(userAgent) {
  return Boolean(userAgent && DISALLOWED_AUTOMATION_USER_AGENT.test(userAgent));
}

export default function proxy(request) {
  const userAgent = request.headers.get("user-agent")?.trim();

  if (isDisallowedAutomatedUserAgent(userAgent)) {
    return new Response("Automated collection is not permitted.", {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
        "Retry-After": "86400",
        Vary: "User-Agent",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
      },
    });
  }

  return next();
}
