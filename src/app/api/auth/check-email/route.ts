import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/auth/check-email?email=... — check if email is available for registration
export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.json({ available: false, error: 'Email не указан' }, { status: 400 });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json({ available: false, error: 'Некорректный формат email' });
  }

  try {
    const existingUser = await db.user.findUnique({ where: { email } });
    return NextResponse.json({ available: !existingUser });
  } catch (error: any) {
    console.error('Error checking email:', error);
    return NextResponse.json({ available: true }); // Default to available on error
  }
}
