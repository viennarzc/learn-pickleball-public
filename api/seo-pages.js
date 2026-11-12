export const PUBLIC_SEO_PAGES = [
  { path: "/", updated: "2026-09-01" },
  { path: "/learn-pickleball/", updated: "2026-09-01" },
  { path: "/learn-pickleball/kitchen-rules/", updated: "2026-09-01" },
  { path: "/learn-pickleball/serve-basics/", updated: "2026-09-01" },
  { path: "/learn-pickleball/two-bounce-rule/", updated: "2026-09-01" },
  { path: "/learn-pickleball/doubles-scoring/", updated: "2026-09-01" },
];

export function requestOrigin(request) {
  const forwardedHost = request.headers["x-forwarded-host"] || request.headers.host;
  const host = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost?.split(",")[0]?.trim();
  const forwardedProtocol = request.headers["x-forwarded-proto"];
  const protocolCandidate = (Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol || "https").split(",")[0].trim().toLowerCase();
  const protocol = protocolCandidate === "http" ? "http" : "https";

  if (!host || !/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(host)) return "https://localhost";
  // Parse the complete origin so invalid ports and malformed hosts cannot
  // turn a robots.txt or sitemap request into an unhandled exception.
  try {
    const parsed = new URL(`${protocol}://${host}`);
    return /[a-z0-9]/i.test(parsed.hostname) ? parsed.origin : "https://localhost";
  } catch {
    return "https://localhost";
  }
}

export function escapeXml(value) {
  return value.replace(/[<>&'\"]/g, (character) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    "\"": "&quot;",
  })[character]);
}
