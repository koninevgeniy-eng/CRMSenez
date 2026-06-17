import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getAdminUser } from '@/lib/auth-helpers';
import { validateCsrf, csrfErrorResponse } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return csrfErrorResponse();
    }

    // Disable in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
    }

    // Require admin authentication
    const adminUser = await getAdminUser(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Требуется авторизация администратора' },
        { status: 403 }
      );
    }

    // Define password mapping by email
    const passwordMap: Record<string, string> = {
      'admin@senez.ru': 'admin123',
      'methodology@senez.ru': 'method123',
      'coordination@senez.ru': 'coordination123',
      'agd@senez.ru': 'agd123',
      'organization@senez.ru': 'org123',
      'analytics@senez.ru': 'analytics123',
    };

    // Default password for employees (any user not in the map above)
    const defaultEmployeePassword = 'emp123';

    // Get all users
    const allUsers = await db.user.findMany({
      select: { id: true, email: true, role: true },
    });

    let updatedCount = 0;

    for (const user of allUsers) {
      // Determine the correct password for this user
      const password = passwordMap[user.email] || defaultEmployeePassword;

      // Hash the password and update
      const passwordHash = await bcrypt.hash(password, 10);

      await db.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      updatedCount++;
    }

    return NextResponse.json({
      message: 'Пароли всех пользователей сброшены',
      updatedCount,
    });
  } catch (error: unknown) {
    console.error('[reset-passwords] Error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
