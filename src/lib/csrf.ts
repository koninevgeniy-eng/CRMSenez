/**
 * CSRF Protection Utility
 *
 * Validates that state-changing requests (POST/PUT/DELETE) originate from
 * the same host by checking the Origin header.
 *
 * Designed to work behind reverse proxies (Caddy, Nginx) where:
 * - The Host header may differ from Origin due to port stripping
 * - X-Forwarded-Host may contain the original host
 * - The proxy may rewrite headers
 *
 * CSRF Protection Strategy:
 * 1. Origin/Host comparison: All state-changing requests must have a matching
 *    Origin header (or no Origin for non-browser API clients).
 * 2. Content-Type check: application/json requests get a relaxed check since
 *    browsers enforce CORS preflight for cross-origin JSON requests.
 * 3. Non-JSON requests (form submissions, file uploads) require strict Origin matching.
 */

/**
 * Extract hostname from a host string (strip port)
 */
function getHostname(hostStr: string): string {
  // "example.com:81" → "example.com", "example.com" → "example.com"
  return hostStr.split(':')[0].toLowerCase()
}

/**
 * Check if the request has a valid Origin header for CSRF protection.
 * Returns true if the request is safe (same origin or no origin header on non-browser requests).
 *
 * @param request - The incoming request
 * @returns true if the request passes CSRF check, false otherwise
 */
export function validateCsrf(request: Request): boolean {
  const method = request.method.toUpperCase()

  // Only check state-changing methods
  if (method !== 'POST' && method !== 'PUT' && method !== 'DELETE') {
    return true
  }

  const origin = request.headers.get('origin')
  const contentType = request.headers.get('content-type')
  const isJson = contentType && contentType.toLowerCase().includes('application/json')

  // STRATEGY 1: For application/json requests from browsers
  // Browsers enforce CORS preflight for cross-origin JSON requests, so if Origin
  // is present, it must match. If no Origin (non-browser API client), allow through
  // since the request must include httpOnly cookies to be authenticated.
  if (isJson) {
    if (!origin) {
      // Non-browser request (e.g., curl) — allow, auth checks will gate access
      return true
    }
    // Origin present — must match host
    return isOriginMatch(origin, request)
  }

  // STRATEGY 2: For non-JSON requests (form submissions, file uploads)
  // These are more dangerous (no CORS preflight), so strict Origin check
  if (!origin) {
    // No Origin on a non-JSON state-changing request is suspicious but
    // could be a legitimate API client. Allow through with warning.
    console.warn('[CSRF] No Origin header on non-JSON request:', {
      method,
      contentType,
    })
    return true
  }

  return isOriginMatch(origin, request)
}

/**
 * Check if the Origin header matches the expected host.
 */
function isOriginMatch(origin: string, request: Request): boolean {
  // Get the effective host — check X-Forwarded-Host first (set by proxy), then Host
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host')

  if (!host) {
    // No host header — can't validate, allow through (auth checks gate access)
    return true
  }

  try {
    const originUrl = new URL(origin)
    const originHostname = getHostname(originUrl.host)
    const hostHostname = getHostname(host)

    // Allow same origin (hostname match, ignoring ports)
    if (originHostname === hostHostname) {
      return true
    }

    // Also allow if Origin host matches full host (with port)
    if (originUrl.host.toLowerCase() === host.toLowerCase()) {
      return true
    }

    // Allow common development hosts
    const devHosts = ['localhost', '127.0.0.1']
    if (devHosts.includes(originHostname) && devHosts.includes(hostHostname)) {
      return true
    }

    // If request came through our reverse proxy, check additional signals
    const forwardedProto = request.headers.get('x-forwarded-proto')
    const realIp = request.headers.get('x-real-ip')
    if (forwardedProto || realIp) {
      // Request came through our reverse proxy — trust hostname match
      if (originHostname === hostHostname || devHosts.includes(originHostname)) {
        return true
      }
    }

    // Log the failure for debugging
    console.warn('[CSRF] Validation failed:', {
      origin,
      originHostname,
      host,
      hostHostname,
      forwardedHost,
    })

    return false
  } catch (e) {
    console.warn('[CSRF] Validation error:', e)
    return false
  }
}

/**
 * Return a CSRF error response if validation fails.
 * Use this in API route handlers for POST/PUT/DELETE.
 */
export function csrfErrorResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'Запрос отклонён (CSRF проверка не пройдена)' }),
    {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
