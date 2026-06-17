import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'xlsx';

    const event = await db.event.findUnique({
      where: { id },
      include: {
        speakers: true,
        budgetItems: true,
        tasks: true,
        contacts: true,
        rooms: true,
        meals: true,
        transfers: true,
        accommodations: true,
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Мероприятие не найдено' }, { status: 404 });
    }

    // Return structured data for client-side export
    return NextResponse.json({
      event,
      format,
      exportDate: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error exporting event:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
