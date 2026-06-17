import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminUser } from '@/lib/auth-helpers';
import { validateCsrf, csrfErrorResponse } from '@/lib/csrf';

// POST /api/users/approve — approve or reject a pending user
export async function POST(request: NextRequest) {
  try {
    // CSRF validation
    if (!validateCsrf(request)) {
      return csrfErrorResponse() as NextResponse;
    }

    // Admin authentication
    const adminUser = await getAdminUser(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Только администратор может одобрять пользователей' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId, action } = body;

    // Validate required fields
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'Не указан ID пользователя' },
        { status: 400 }
      );
    }

    if (!action || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json(
        { error: 'Действие должно быть "approve" или "reject"' },
        { status: 400 }
      );
    }

    // Check that the target user exists
    const targetUser = await db.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Only act on users that are pending approval (isApproved = false and isActive = true)
    if (targetUser.isApproved) {
      return NextResponse.json(
        { error: 'Пользователь уже одобрен' },
        { status: 400 }
      );
    }

    if (!targetUser.isActive) {
      return NextResponse.json(
        { error: 'Пользователь уже деактивирован' },
        { status: 400 }
      );
    }

    let updatedUser;
    let auditAction: string;

    if (action === 'approve') {
      // Approve: set isApproved = true
      updatedUser = await db.user.update({
        where: { id: userId },
        data: { isApproved: true },
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
      auditAction = 'APPROVED';
    } else {
      // Reject: deactivate the account (isActive = false)
      updatedUser = await db.user.update({
        where: { id: userId },
        data: { isActive: false },
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
      auditAction = 'REJECTED';
    }

    // Create audit log entry
    await db.auditLog.create({
      data: {
        action: auditAction,
        entityType: 'USER',
        entityId: userId,
        details: JSON.stringify({
          action,
          userEmail: targetUser.email,
          userName: targetUser.name,
          processedBy: adminUser.id,
        }),
        userId: adminUser.id,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('Error processing user approval:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// GET /api/users/approve — list pending approval users
export async function GET(request: NextRequest) {
  try {
    // Admin authentication
    const adminUser = await getAdminUser(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Только администратор может просматривать ожидающих пользователей' },
        { status: 403 }
      );
    }

    // Return users where isApproved = false AND isActive = true
    const pendingUsers = await db.user.findMany({
      where: {
        isApproved: false,
        isActive: true,
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
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json(pendingUsers);
  } catch (error: any) {
    console.error('Error fetching pending users:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
