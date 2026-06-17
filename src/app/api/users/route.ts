import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getManagerUser, getAdminUser } from '@/lib/auth-helpers';
import { validateCsrf, csrfErrorResponse } from '@/lib/csrf';

// GET /api/users — список пользователей (admin/manager)
export async function GET(request: NextRequest) {
  try {
    const user = await getManagerUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const department = searchParams.get('department');
    const role = searchParams.get('role');
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');

    const where: any = {};

    if (user.role === 'manager') {
      where.department = user.department;
    } else if (department) {
      where.department = department;
    }
    if (role) where.role = role;
    if (isActive !== null && isActive !== undefined) {
      where.isActive = isActive === 'true';
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        avatarUrl: true,
        isActive: true,
        isApproved: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            eventAssignments: true,
            assignedTasks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// POST /api/users — создание пользователя (admin only)
export async function POST(request: NextRequest) {
  try {
    // CSRF CHECK
    if (!validateCsrf(request)) {
      return csrfErrorResponse();
    }

    const user = await getAdminUser(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Необходима авторизация администратора' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, name, password, role = 'employee', department } = body;

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: 'Email, имя и пароль обязательны' },
        { status: 400 }
      );
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

    // Создаём пользователя (автоматически одобрен, т.к. создан админом)
    const newUser = await db.user.create({
      data: {
        email,
        name,
        passwordHash,
        role,
        department: department || null,
        isApproved: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        avatarUrl: true,
        isActive: true,
        isApproved: true,
        createdAt: true,
      },
    });

    // Аудит
    await db.auditLog.create({
      data: {
        action: 'CREATED',
        entityType: 'USER',
        entityId: newUser.id,
        details: JSON.stringify({
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          department: newUser.department,
          createdBy: user.id,
        }),
        userId: user.id,
      },
    });

    return NextResponse.json(
      { message: 'Пользователь успешно создан', user: newUser },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
