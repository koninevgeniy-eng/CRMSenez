import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, getManagerUser } from '@/lib/auth-helpers';
import { validateCsrf, csrfErrorResponse } from '@/lib/csrf';

// PUT /api/tasks/[id] — update a task
// Body: { completed, title, description, dueDate, priority, category }
// Employees can only toggle completed status; managers can edit all fields
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // CSRF CHECK
    if (!validateCsrf(request)) {
      return csrfErrorResponse();
    }

    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check task exists
    const task = await db.task.findUnique({
      where: { id },
      include: {
        event: {
          include: {
            assignments: {
              include: {
                user: { select: { department: true } },
              },
            },
          },
        },
      },
    });
    if (!task) {
      return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 });
    }

    const isManager = authUser.role === 'admin' || authUser.role === 'manager';
    const isEventLead = task.event.assignments.some(a =>
      a.role === 'LEAD'
      && a.userId === authUser.id
      && a.user?.department === 'organization'
    );

    // If employee, check they are assigned to this task
    if (!isManager && !isEventLead) {
      const assignment = await db.taskAssignment.findFirst({
        where: { taskId: id, userId: authUser.id },
      });
      if (!assignment) {
        return NextResponse.json({ error: 'У вас нет прав на редактирование этой задачи' }, { status: 403 });
      }
    }

    // Build update data
    const updateData: any = {};

    if (typeof body.completed === 'boolean') {
      updateData.completed = body.completed;
    }

    // Managers and event leads can edit these fields
    if (isManager || isEventLead) {
      if (body.title !== undefined) updateData.title = body.title;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
      if (body.priority !== undefined) updateData.priority = body.priority;
      if (body.category !== undefined) updateData.category = body.category;
    }

    const updatedTask = await db.task.update({
      where: { id },
      data: updateData,
      include: {
        assignments: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true, department: true } },
          },
        },
        event: {
          select: { id: true, title: true, status: true },
        },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        action: 'UPDATED',
        entityType: 'TASK',
        entityId: id,
        details: JSON.stringify({
          updates: updateData,
          updatedBy: authUser.id,
        }),
        userId: authUser.id,
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/tasks/[id] — delete a task (managers only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // CSRF CHECK
    if (!validateCsrf(request)) {
      return csrfErrorResponse();
    }

    const authUser = await getManagerUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 });
    }

    const { id } = await params;

    const task = await db.task.findUnique({ where: { id } });
    if (!task) {
      return NextResponse.json({ error: 'Задача не найдена' }, { status: 404 });
    }

    await db.task.delete({ where: { id } });

    // Audit log
    await db.auditLog.create({
      data: {
        action: 'DELETED',
        entityType: 'TASK',
        entityId: id,
        details: JSON.stringify({
          title: task.title,
          deletedBy: authUser.id,
        }),
        userId: authUser.id,
      },
    });

    return NextResponse.json({ message: 'Задача удалена' });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
