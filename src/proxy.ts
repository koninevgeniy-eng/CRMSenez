import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/api/auth/login',
  '/api/auth/me',
  '/api/auth/public-register',
  '/api/auth/check-email',
  '/api/seed',
  '/api/seed-users',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only check API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next()
  }

  // Allow public event summaries and non-sensitive settings.
  if (request.method === 'GET' && (
    pathname.startsWith('/api/events') ||
    pathname.startsWith('/api/settings')
  )) {
    return NextResponse.next()
  }

  // Check for session token (cookie-only, no header fallback)
  const sessionToken = request.cookies.get('session-token')?.value

  if (!sessionToken) {
    return NextResponse.json(
      { error: 'Необходима авторизация' },
      { status: 401 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}
