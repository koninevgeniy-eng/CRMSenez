import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { getAuthUser, getAdminUser } from '@/lib/auth-helpers';
import { validateCsrf, csrfErrorResponse } from '@/lib/csrf';

const VALID_ROLES = ['admin', 'manager', 'employee'];
const VALID_DEPARTMENTS = ['methodology', 'coordination', 'agd', 'organization', 'analytics'];

// GET /api/users/[id] — получить пользователя по ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
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
        eventAssignments: {
          include: {
            event: {
              select: { id: true, title: true, status: true },
            },
          },
        },
        _count: {
          select: {
            assignedTasks: true,
            auditLogs: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] — обновить пользователя
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF CHECK
    if (!validateCsrf(request)) {
      return csrfErrorResponse() as NextResponse;
    }

    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const sessionRole = authUser.role;
    const sessionDepartment = authUser.department;
    const sessionUserId = authUser.id;

    const body = await request.json();
    const { name, email, role, department, password, avatarUrl, isActive, isApproved } = body;

    // Получаем текущего пользователя
    const targetUser = await db.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // INPUT VALIDATION

    // Validate email format if changing email
    if (email !== undefined && email !== null) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Некорректный формат email' },
          { status: 400 }
        );
      }
    }

    // Validate role is one of allowed values
    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return NextResponse.json(
        { error: `Недопустимая роль. Допустимые: ${VALID_ROLES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate department is valid if provided
    if (department !== undefined && department !== null && !VALID_DEPARTMENTS.includes(department)) {
      return NextResponse.json(
        { error: `Недопустимый департамент. Допустимые: ${VALID_DEPARTMENTS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate name if provided
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
      return NextResponse.json(
        { error: 'Имя должно содержать не менее 2 символов' },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (department !== undefined) updateData.department = department;

    // Смена пароля
    if (password) {
      if (typeof password !== 'string' || password.length < 6) {
        return NextResponse.json(
          { error: 'Пароль должен содержать не менее 6 символов' },
          { status: 400 }
        );
      }
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    // Администратор может менять всё
    if (sessionRole === 'admin') {
      if (role !== undefined) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (isApproved !== undefined) updateData.isApproved = isApproved;
    }

    // Менеджер может менять сотрудников своего отдела
    if (sessionRole === 'manager') {
      // Менеджер может редактировать только сотрудников своего отдела
      if (targetUser.department !== sessionDepartment || targetUser.role !== 'employee') {
        return NextResponse.json(
          { error: 'Менеджер может редактировать только сотрудников своего отдела' },
          { status: 403 }
        );
      }
      // Менеджер не может менять роль и isActive
      if (role !== undefined || isActive !== undefined) {
        return NextResponse.json(
          { error: 'Недостаточно прав для изменения роли или статуса' },
          { status: 403 }
        );
      }
    }

    // Пользователь может редактировать только свой профиль (имя, аватар)
    if (sessionRole === 'employee' && sessionUserId !== id) {
      return NextResponse.json(
        { error: 'Можно редактировать только свой профиль' },
        { status: 403 }
      );
    }

    if (sessionRole === 'employee') {
      // Сотрудник может менять только имя и аватар
      delete updateData.email;
      delete updateData.role;
      delete updateData.department;
      delete updateData.isActive;
      delete updateData.isApproved;
      if (password) {
        delete updateData.passwordHash;
      }
    }

    // Проверяем уникальность email при изменении
    if (email && email !== targetUser.email) {
      const existingUser = await db.user.findUnique({ where: { email } });
      if (existingUser) {
        return NextResponse.json(
          { error: 'Пользователь с таким email уже существует' },
          { status: 409 }
        );
      }
    }

    const user = await db.user.update({
      where: { id },
      data: updateData,
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
      },
    });

    // Аудит
    await db.auditLog.create({
      data: {
        action: 'UPDATED',
        entityType: 'USER',
        entityId: id,
        details: JSON.stringify({
          updatedFields: Object.keys(updateData),
          updatedBy: sessionUserId,
        }),
        userId: sessionUserId,
      },
    });

    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] — мягкое удаление (isActive=false, admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF CHECK
    if (!validateCsrf(request)) {
      return csrfErrorResponse() as NextResponse;
    }

    const authUser = await getAdminUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Только администратор может удалять пользователей' },
        { status: 403 }
      );
    }

    const sessionUserId = authUser.id;

    const { id } = await params;

    // Нельзя удалить самого себя
    if (id === sessionUserId) {
      return NextResponse.json(
        { error: 'Нельзя деактивировать свою учётную запись' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { error: 'Пользователь уже деактивирован' },
        { status: 400 }
      );
    }

    // Мягкое удаление
    await db.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Аудит
    await db.auditLog.create({
      data: {
        action: 'DELETED',
        entityType: 'USER',
        entityId: id,
        details: JSON.stringify({
          email: user.email,
          name: user.name,
          deactivatedBy: sessionUserId,
        }),
        userId: sessionUserId,
      },
    });

    return NextResponse.json({ message: 'Пользователь деактивирован' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
