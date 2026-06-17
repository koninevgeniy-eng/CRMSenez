import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  // Production guard
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  // Admin auth check
  const adminUser = await getAdminUser(request);
  if (!adminUser) {
    return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 403 });
  }

  return NextResponse.json({
    host: request.headers.get('host'),
    xForwardedHost: request.headers.get('x-forwarded-host'),
    xForwardedProto: request.headers.get('x-forwarded-proto'),
    xForwardedFor: request.headers.get('x-forwarded-for'),
    xRealIp: request.headers.get('x-real-ip'),
    url: request.url,
    nextUrlOrigin: request.nextUrl.origin,
  });
}
