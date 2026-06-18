import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, getManagerUser } from '@/lib/auth-helpers';
import { validateCsrf, csrfErrorResponse } from '@/lib/csrf';

// GET /api/assignments — список назначений (фильтр по eventId, userId)
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');
    const userId = searchParams.get('userId');
    const role = searchParams.get('role');

    const where: any = {};
    if (eventId) where.eventId = eventId;
    if (userId) {
      if (authUser.role === 'employee' && userId !== authUser.id) {
        return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
      }
      if (authUser.role === 'manager') {
        const targetUser = await db.user.findUnique({
          where: { id: userId },
          select: { department: true },
        });
        if (!targetUser || targetUser.department !== authUser.department) {
          return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
        }
      }
      where.userId = userId;
    } else if (!eventId && authUser.role === 'employee') {
      where.userId = authUser.id;
    }
    if (role) where.role = role;

    const assignments = await db.eventAssignment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
            avatarUrl: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(assignments);
  } catch (error: any) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// POST /api/assignments — создать назначение
// Правила: максимум 1 LEAD на мероприятие, максимум 3 SUPPORT
export async function POST(request: NextRequest) {
  try {
    // CSRF CHECK
    if (!validateCsrf(request)) {
      return csrfErrorResponse();
    }

    const authUser = await getManagerUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Недостаточно прав для назначения' },
        { status: 403 }
      );
    }

    const sessionUserId = authUser.id;

    const body = await request.json();
    const { eventId, userId, role, responsibilityZone } = body;

    if (!eventId || !userId || !role) {
      return NextResponse.json(
        { error: 'eventId, userId и role обязательны' },
        { status: 400 }
      );
    }

    if (!['LEAD', 'SUPPORT'].includes(role)) {
      return NextResponse.json(
        { error: 'Роль должна быть LEAD или SUPPORT' },
        { status: 400 }
      );
    }

    // Проверяем существование мероприятия
    const event = await db.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json(
        { error: 'Мероприятие не найдено' },
        { status: 404 }
      );
    }

    // Проверяем существование пользователя
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Пользователь не найден или неактивен' },
        { status: 404 }
      );
    }
    if (authUser.role === 'manager' && user.department !== authUser.department) {
      return NextResponse.json(
        { error: 'Менеджер может назначать только сотрудников своего отдела' },
        { status: 403 }
      );
    }

    // Проверяем лимит LEAD (максимум 1 на департамент)
    if (role === 'LEAD') {
      const existingLeads = await db.eventAssignment.count({
        where: {
          eventId,
          role: 'LEAD',
          user: { department: user.department },
        },
      });
      if (existingLeads >= 1) {
        return NextResponse.json(
          { error: 'В департаменте уже назначен руководитель мероприятия' },
          { status: 409 }
        );
      }
    }

    // Проверяем лимит SUPPORT (максимум 3 на департамент)
    if (role === 'SUPPORT') {
      const existingSupports = await db.eventAssignment.count({
        where: {
          eventId,
          role: 'SUPPORT',
          user: { department: user.department },
        },
      });
      if (existingSupports >= 3) {
        return NextResponse.json(
          { error: 'В департаменте может быть не более 3 SUPPORT' },
          { status: 409 }
        );
      }
    }

    // Проверяем, нет ли уже такого назначения (уникальный индекс eventId+userId+role)
    const existingAssignment = await db.eventAssignment.findUnique({
      where: {
        eventId_userId_role: { eventId, userId, role },
      },
    });
    if (existingAssignment) {
      return NextResponse.json(
        { error: 'Такое назначение уже существует' },
        { status: 409 }
      );
    }

    const assignment = await db.eventAssignment.create({
      data: {
        eventId,
        userId,
        role,
        responsibilityZone: responsibilityZone || null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            department: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    // Аудит
    await db.auditLog.create({
      data: {
        action: 'ASSIGNED',
        entityType: 'ASSIGNMENT',
        entityId: assignment.id,
        details: JSON.stringify({
          eventId,
          userId,
          role,
          responsibilityZone,
          assignedBy: sessionUserId,
        }),
        userId: sessionUserId,
      },
    });

    // Уведомление для пользователя
    await db.notification.create({
      data: {
        eventId,
        department: user.department || 'Методология',
        message: `Вы назначены ${role === 'LEAD' ? 'LEAD' : 'SUPPORT'} на мероприятие «${event.title}»`,
        type: 'assignment',
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error: any) {
    console.error('Error creating assignment:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/assignments?id=... — удалить назначение
export async function DELETE(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return csrfErrorResponse();
    }

    const authUser = await getManagerUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Недостаточно прав для удаления назначения' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID назначения обязателен' },
        { status: 400 }
      );
    }

    const assignment = await db.eventAssignment.findUnique({ where: { id } });
    if (!assignment) {
      return NextResponse.json(
        { error: 'Назначение не найдено' },
        { status: 404 }
      );
    }

    await db.eventAssignment.delete({ where: { id } });

    // Аудит
    await db.auditLog.create({
      data: {
        action: 'UNASSIGNED',
        entityType: 'ASSIGNMENT',
        entityId: id,
        details: JSON.stringify({
          eventId: assignment.eventId,
          userId: assignment.userId,
          role: assignment.role,
          unassignedBy: authUser.id,
        }),
        userId: authUser.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting assignment:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
