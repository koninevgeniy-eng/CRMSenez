import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';
import { validateCsrf, csrfErrorResponse } from '@/lib/csrf';

const DEPARTMENT_LABELS: Record<string, string> = {
  methodology: 'Методология',
  coordination: 'Координация',
  agd: 'АГД',
  organization: 'Организация',
  analytics: 'Аналитика',
};

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const requestedDepartment = searchParams.get('department');
    const unreadOnly = searchParams.get('unread') === 'true';
    const ownDepartment = authUser.department ? DEPARTMENT_LABELS[authUser.department] : null;

    const where: any = {};
    if (authUser.role === 'admin') {
      if (requestedDepartment) where.department = requestedDepartment;
    } else {
      if (!ownDepartment) return NextResponse.json([]);
      if (requestedDepartment && requestedDepartment !== ownDepartment) {
        return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
      }
      where.department = ownDepartment;
    }
    if (unreadOnly) where.read = false;

    const notifications = await db.notification.findMany({
      where,
      include: { event: { select: { id: true, title: true, status: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return csrfErrorResponse();
    }

    // Auth check
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const body = await request.json();
    const { ids, markAllRead, department } = body;
    const ownDepartment = authUser.department ? DEPARTMENT_LABELS[authUser.department] : null;

    if (markAllRead && department) {
      if (authUser.role !== 'admin' && department !== ownDepartment) {
        return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
      }
      await db.notification.updateMany({
        where: { department, read: false },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    if (ids && ids.length > 0) {
      await db.notification.updateMany({
        where: {
          id: { in: ids },
          ...(authUser.role === 'admin' ? {} : { department: ownDepartment || '__none__' }),
        },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 });
  } catch (error: any) {
    console.error('Error updating notifications:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
