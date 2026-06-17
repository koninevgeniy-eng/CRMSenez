import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getAdminUser } from '@/lib/auth-helpers';
import { validateCsrf, csrfErrorResponse } from '@/lib/csrf';

export async function POST(request: NextRequest) {
  try {
    // CSRF CHECK
    if (!validateCsrf(request)) {
      return csrfErrorResponse();
    }

    const body = await request.json();
    const { email, name, password, role = 'employee', department } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, имя и пароль обязательны' },
        { status: 400 }
      );
    }

    // Проверяем, есть ли уже пользователи в системе
    const userCount = await db.user.count();
    const isFirstUser = userCount === 0;

    if (!isFirstUser) {
      // Не первый пользователь — нужна авторизация администратора
      const adminUser = await getAdminUser(request);
      if (!adminUser) {
        return NextResponse.json(
          { error: 'Только администратор может создавать пользователей' },
          { status: 403 }
        );
      }
    }

    // Проверяем уникальность email
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 409 }
      );
    }

    // Хешируем пароль
    const passwordHash = await bcrypt.hash(password, 10);

    // Создаём пользователя (админ-созданные пользователи автоматически одобрены)
    const user = await db.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: isFirstUser ? 'admin' : role,
        department: department || null,
        isApproved: true, // Created by admin or first user — auto-approved
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Записываем в аудит
    await db.auditLog.create({
      data: {
        action: 'CREATED',
        entityType: 'USER',
        entityId: user.id,
        details: JSON.stringify({
          email: user.email,
          name: user.name,
          role: user.role,
          department: user.department,
          isFirstUser,
        }),
      },
    });

    return NextResponse.json(
      {
        message: isFirstUser
          ? 'Администратор успешно создан'
          : 'Пользователь успешно создан',
        user,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error registering user:', error);
    return NextResponse.json(
      { error: 'Произошла ошибка при регистрации' },
      { status: 500 }
    );
  }
}
