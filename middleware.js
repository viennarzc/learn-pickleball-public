// Vercel Routing Middleware entrypoint for the static deployment.
// Keep the guard implementation in proxy.js so it remains directly testable.
export {
  default,
  isDisallowedAutomatedUserAgent,
} from "./proxy.js";

// Run before every public route, including static files served by Vercel.
export const config = {
  matcher: "/:path*",
};
