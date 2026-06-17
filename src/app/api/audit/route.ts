import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminUser } from '@/lib/auth-helpers';

// GET /api/audit — список записей аудита (admin only)
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAdminUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Только администратор может просматривать аудит' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get('entityType');
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: any = {};
    if (entityType) where.entityType = entityType;
    if (action) where.action = action;

    const logs = await db.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await db.auditLog.count({ where });

    return NextResponse.json({ logs, total });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
