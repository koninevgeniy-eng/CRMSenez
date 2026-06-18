import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';
import { validateCsrf, csrfErrorResponse } from '@/lib/csrf';

// GET /api/tasks — fetch tasks
// Query params:
//   userId — get tasks assigned to a specific user
//   department — get tasks for users in a specific department (manager view)
//   eventId — get tasks for a specific event
//   status — filter by status (completed/pending)
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const department = searchParams.get('department');
    const eventId = searchParams.get('eventId');
    const status = searchParams.get('status');

    // If userId is provided, fetch tasks assigned to that user
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
      const assignments = await db.taskAssignment.findMany({
        where: { userId },
        include: {
          task: {
            include: {
              event: {
                select: { id: true, title: true, status: true, startDate: true, endDate: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      let filtered = assignments;
      if (status === 'completed') {
        filtered = assignments.filter(a => a.task.completed);
      } else if (status === 'pending') {
        filtered = assignments.filter(a => !a.task.completed);
      }

      return NextResponse.json(filtered);
    }

    // If department is provided (manager view), fetch tasks for all users in that department
    if (department) {
      if (authUser.role === 'employee'
        || (authUser.role === 'manager' && department !== authUser.department)) {
        return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
      }
      const deptUsers = await db.user.findMany({
        where: { department, isActive: true },
        select: { id: true },
      });
      const userIds = deptUsers.map(u => u.id);

      const assignments = await db.taskAssignment.findMany({
        where: { userId: { in: userIds } },
        include: {
          task: {
            include: {
              event: {
                select: { id: true, title: true, status: true, startDate: true, endDate: true },
              },
            },
          },
          user: {
            select: { id: true, name: true, email: true, role: true, department: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      let filtered = assignments;
      if (status === 'completed') {
        filtered = assignments.filter(a => a.task.completed);
      } else if (status === 'pending') {
        filtered = assignments.filter(a => !a.task.completed);
      }

      return NextResponse.json(filtered);
    }

    // If eventId is provided, fetch tasks for that event
    if (eventId) {
      const tasks = await db.task.findMany({
        where: { eventId },
        include: {
          assignments: {
            include: {
              user: {
                select: { id: true, name: true, email: true, role: true, department: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json(tasks);
    }

    // Default: return tasks assigned to the current user
    const myAssignments = await db.taskAssignment.findMany({
      where: { userId: authUser.id },
      include: {
        task: {
          include: {
            event: {
              select: { id: true, title: true, status: true, startDate: true, endDate: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(myAssignments);
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/tasks — create a task and optionally assign it to users
// Body: { eventId, category, title, description, dueDate, priority, assigneeIds: string[] }
export async function POST(request: NextRequest) {
  try {
    // CSRF CHECK
    if (!validateCsrf(request)) {
      return csrfErrorResponse();
    }

    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Недостаточно прав для создания задач' }, { status: 403 });
    }

    const body = await request.json();
    const { eventId, category, title, description, dueDate, priority, assigneeIds } = body;

    if (!eventId || !category || !title) {
      return NextResponse.json({ error: 'eventId, category и title обязательны' }, { status: 400 });
    }

    // Verify event exists
    const event = await db.event.findUnique({
      where: { id: eventId },
      include: {
        assignments: {
          include: {
            user: { select: { department: true } },
          },
        },
      },
    });
    if (!event) {
      return NextResponse.json({ error: 'Мероприятие не найдено' }, { status: 404 });
    }

    const isManager = authUser.role === 'admin' || authUser.role === 'manager';
    const isEventLead = event.assignments.some(a =>
      a.role === 'LEAD'
      && a.userId === authUser.id
      && a.user?.department === 'organization'
    );
    if (!isManager && !isEventLead) {
      return NextResponse.json({ error: 'Создавать задачи может руководитель организации или руководитель мероприятия' }, { status: 403 });
    }

    if (assigneeIds && Array.isArray(assigneeIds) && assigneeIds.length > 0) {
      if (authUser.role === 'manager' || isEventLead) {
        const assignees = await db.user.findMany({
          where: { id: { in: assigneeIds }, isActive: true },
          select: { id: true, department: true },
        });
        if (assignees.length !== assigneeIds.length
          || assignees.some(user => user.department !== 'organization' || (authUser.role === 'manager' && user.department !== authUser.department))) {
          return NextResponse.json(
            { error: 'Задачи организации можно назначать только активным сотрудникам департамента организации' },
            { status: 403 }
          );
        }
      }
    }

    // Create the task after all authorization checks pass
    const task = await db.task.create({
      data: {
        eventId,
        category,
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || 'medium',
        completed: false,
      },
    });

    // Create assignments if assigneeIds provided
    if (assigneeIds && Array.isArray(assigneeIds) && assigneeIds.length > 0) {
      await db.taskAssignment.createMany({
        data: assigneeIds.map((uid: string) => ({
          taskId: task.id,
          userId: uid,
          assignedBy: authUser.id,
        })),
      });

      // Create notifications for assigned users
      for (const uid of assigneeIds) {
        const assignedUser = await db.user.findUnique({ where: { id: uid } });
        if (assignedUser) {
          await db.notification.create({
            data: {
              eventId,
              department: assignedUser.department || 'Методология',
              message: `Вам назначена новая задача: «${title}» на мероприятии «${event.title}»`,
              type: 'assignment',
            },
          });
        }
      }
    }

    // Audit log
    await db.auditLog.create({
      data: {
        action: 'CREATED',
        entityType: 'TASK',
        entityId: task.id,
        details: JSON.stringify({
          eventId,
          title,
          category,
          assigneeIds: assigneeIds || [],
          createdBy: authUser.id,
        }),
        userId: authUser.id,
      },
    });

    // Fetch the full task with assignments to return
    const fullTask = await db.task.findUnique({
      where: { id: task.id },
      include: {
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true, department: true } },
          },
        },
      },
    });

    return NextResponse.json(fullTask, { status: 201 });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
