/**
 * Automatic CORS proxy URL resolver.
 *
 * When the app is served behind Cloudflare Pages (or any host with a
 * server-side proxy function at `/api/proxy`), ALL outbound fetch
 * requests are transparently routed through that proxy so the browser
 * never hits the target API directly — eliminating CORS / mixed-content
 * errors completely.
 *
 * The user enters the REAL Base URL in settings (e.g.
 * `https://inference.poolside.ai`).  This module rewrites it to
 * `/api/proxy?target=...` at fetch time.
 *
 * Proxy is ONLY active for non-localhost URLs (i.e. real remote APIs).
 * Local development (`localhost`, `127.0.0.1`) is left untouched so the
 * Vite dev-server proxy continues to work as before.
 */

/** Hosts that should bypass the proxy (local development) */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Converts an absolute API URL into a proxy-relative URL.
 *
 * @example
 * ```ts
 * toProxyUrl('https://inference.poolside.ai/v1/models')
 * // => '/api/proxy?target=https%3A%2F%2Finference.poolside.ai%2Fv1%2Fmodels'
 *
 * toProxyUrl('https://api.groq.com/openai/v1/models')
 * // => '/api/proxy?target=https%3A%2F%2Fapi.groq.com%2Fopenai%2Fv1%2Fmodels'
 *
 * toProxyUrl('http://localhost:11434/v1/models')
 * // => 'http://localhost:11434/v1/models'  (unchanged – local)
 * ```
 */
export function toProxyUrl(absoluteUrl: string): string {
  try {
    const parsed = new URL(absoluteUrl);
    // Skip proxy for local development addresses
    if (LOCAL_HOSTS.has(parsed.hostname)) {
      return absoluteUrl;
    }
    const target = parsed.origin + parsed.pathname + parsed.search;
    return `/api/proxy?target=${encodeURIComponent(target)}`;
  } catch {
    // If URL parsing fails, return as-is
    return absoluteUrl;
  }
}
