import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Departments available for public registration (exclude 'dashboard')
const ALLOWED_DEPARTMENTS = ['methodology', 'coordination', 'agd', 'organization', 'analytics'];

export async function POST(request: NextRequest) {
  try {
    // RATE LIMITING: Max 3 registrations per minute per IP
    const clientIp = getClientIp(request)
    const rateResult = rateLimit(`register:${clientIp}`, 3, 60 * 1000)
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: 'Слишком много попыток регистрации. Попробуйте позже.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, name, password, department } = body;

    // Validate required fields
    if (!email || !name || !password || !department) {
      return NextResponse.json(
        { error: 'Все поля обязательны для заполнения' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Некорректный формат email' },
        { status: 400 }
      );
    }

    // Validate name not empty
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Имя должно содержать не менее 2 символов' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Пароль должен содержать не менее 8 символов' },
        { status: 400 }
      );
    }

    // Validate department
    if (!ALLOWED_DEPARTMENTS.includes(department)) {
      return NextResponse.json(
        { error: 'Выберите корректный департамент' },
        { status: 400 }
      );
    }

    // Check email uniqueness
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Пользователь с таким email уже существует' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with role 'employee' only — never admin or manager
    // isApproved = false by default, requires admin approval
    const user = await db.user.create({
      data: {
        email,
        name: name.trim(),
        passwordHash,
        role: 'employee',
        department,
        isActive: true,
        isApproved: false,
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

    // Log to audit
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
          registrationType: 'public',
        }),
      },
    });

    return NextResponse.json(
      {
        message: 'Регистрация прошла успешно. Ваш аккаунт ожидает одобрения администратором.',
        user,
        requiresApproval: true,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in public registration:', error);
    return NextResponse.json(
      { error: 'Произошла ошибка при регистрации. Попробуйте ещё раз.' },
      { status: 500 }
    );
  }
}
