import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hash } from 'bcryptjs'
import { getAdminUser } from '@/lib/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    // Disable in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
    }

    // Admin auth check
    const adminUser = await getAdminUser(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Требуется авторизация администратора' }, { status: 403 });
    }
    const existing = await db.user.count()
    if (existing > 0) {
      return NextResponse.json({ message: 'Пользователи уже существуют', count: existing })
    }

    const users = [
      {
        email: 'admin@senez.ru',
        name: 'Администратор',
        passwordHash: await hash('admin123', 10),
        role: 'admin',
        department: null,
        isApproved: true,
      },
      {
        email: 'methodology@senez.ru',
        name: 'Алексей Иванов',
        passwordHash: await hash('method123', 10),
        role: 'manager',
        department: 'methodology',
        isApproved: true,
      },
      {
        email: 'coordination@senez.ru',
        name: 'Елена Козлова',
        passwordHash: await hash('coordination123', 10),
        role: 'manager',
        department: 'coordination',
        isApproved: true,
      },
      {
        email: 'agd@senez.ru',
        name: 'Мария Петрова',
        passwordHash: await hash('agd123', 10),
        role: 'manager',
        department: 'agd',
        isApproved: true,
      },
      {
        email: 'organization@senez.ru',
        name: 'Сергей Белов',
        passwordHash: await hash('org123', 10),
        role: 'manager',
        department: 'organization',
        isApproved: true,
      },
      {
        email: 'analytics@senez.ru',
        name: 'Дмитрий Смирнов',
        passwordHash: await hash('analytics123', 10),
        role: 'manager',
        department: 'analytics',
        isApproved: true,
      },
    ]

    for (const userData of users) {
      await db.user.create({ data: userData })
    }

    return NextResponse.json({ message: 'Пользователи созданы', count: users.length })
  } catch (error: unknown) {
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
