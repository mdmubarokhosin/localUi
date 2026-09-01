/**
 * Cloudflare Pages Function — Generic CORS Proxy
 *
 * Transparently forwards any request to the target API server,
 * eliminating browser CORS / mixed-content restrictions.
 *
 * The client sends:  GET /api/proxy?target=https%3A%2F%2Finference.poolside.ai%2Fv1%2Fmodels
 * The worker forwards:  GET https://inference.poolside.ai/v1/models
 */

interface Env {}

type Ctx = { request: Request; env: Env };

type Handler = (ctx: Ctx) => Promise<Response>;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Expose-Headers': 'Content-Type, X-Request-Id',
  'Access-Control-Max-Age': '86400',
};

function corsResponse(
  body: BodyInit | null,
  status: number,
  extra?: Record<string, string>
): Response {
  return new Response(body, {
    status,
    headers: { ...CORS_HEADERS, ...extra },
  });
}

/** Hop-by-hop headers that must NOT be forwarded */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'cf-worker',
]);

export const onRequest: Handler = async (ctx) => {
  const { request } = ctx;
  const url = new URL(request.url);

  // ── CORS preflight ─────────────────────────────────────────────
  if (request.method === 'OPTIONS') {
    return corsResponse(null, 204);
  }

  // ── Extract target URL from query parameter ────────────────────
  const target = url.searchParams.get('target');
  if (!target) {
    return corsResponse(
      JSON.stringify({ error: 'Missing ?target= query parameter' }),
      400,
      { 'Content-Type': 'application/json' }
    );
  }

  // Validate the target URL to prevent SSRF
  let targetParsed: URL;
  try {
    targetParsed = new URL(target);
    if (targetParsed.protocol !== 'https:' && targetParsed.protocol !== 'http:') {
      throw new Error('Invalid protocol');
    }
  } catch {
    return corsResponse(
      JSON.stringify({ error: 'Invalid target URL' }),
      400,
      { 'Content-Type': 'application/json' }
    );
  }

  // ── Build forwarding headers ──────────────────────────────────
  const headers = new Headers(request.headers);
  headers.set('Host', targetParsed.host);
  for (const key of headers.keys()) {
    if (HOP_BY_HOP.has(key.toLowerCase())) {
      headers.delete(key);
    }
  }

  // ── Forward request ───────────────────────────────────────────
  const response = await fetch(target, {
    method: request.method,
    headers,
    body:
      request.method !== 'GET' && request.method !== 'HEAD'
        ? request.body
        : undefined,
    // @ts-expect-error — Cloudflare Workers support duplex for streaming
    duplex: request.method === 'POST' ? 'half' : undefined,
  });

  // ── Return response with CORS headers ─────────────────────────
  const respHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    respHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: respHeaders,
  });
};
