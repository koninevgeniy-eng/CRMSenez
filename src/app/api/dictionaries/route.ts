import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, getAdminUser } from '@/lib/auth-helpers';
import { validateCsrf, csrfErrorResponse } from '@/lib/csrf';

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function itemPayload(body: Record<string, unknown>) {
  const label = cleanText(body.label);
  const value = cleanText(body.value) || label;
  const description = cleanText(body.description) || null;
  const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;
  const isActive = typeof body.isActive === 'boolean' ? body.isActive : true;

  return { label, value, description, sortOrder, isActive };
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true'
      && authUser.role === 'admin';

    const dictionaries = await db.referenceDictionary.findMany({
      orderBy: { name: 'asc' },
      include: {
        items: {
          where: includeInactive ? undefined : { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
        },
      },
    });

    return NextResponse.json({ dictionaries });
  } catch (error: any) {
    console.error('Error fetching dictionaries:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return csrfErrorResponse();
    }

    const adminUser = await getAdminUser(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Только администратор может изменять справочники' }, { status: 403 });
    }

    const body = await request.json();
    const dictionaryCode = cleanText(body.dictionaryCode);
    const dictionaryId = cleanText(body.dictionaryId);
    const dictionary = dictionaryId
      ? await db.referenceDictionary.findUnique({ where: { id: dictionaryId } })
      : await db.referenceDictionary.findUnique({ where: { code: dictionaryCode } });

    if (!dictionary) {
      return NextResponse.json({ error: 'Справочник не найден' }, { status: 404 });
    }

    const payload = itemPayload(body);
    if (!payload.label || !payload.value) {
      return NextResponse.json({ error: 'Название элемента справочника обязательно' }, { status: 400 });
    }

    const item = await db.referenceItem.create({
      data: {
        dictionaryId: dictionary.id,
        ...payload,
        createdBy: adminUser.name,
      },
    });

    await db.auditLog.create({
      data: {
        action: 'CREATED',
        entityType: 'REFERENCE_ITEM',
        entityId: item.id,
        details: JSON.stringify({
          dictionary: dictionary.code,
          label: item.label,
          createdBy: adminUser.name,
        }),
        userId: adminUser.id,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Такое значение уже есть в справочнике' }, { status: 409 });
    }
    console.error('Error creating dictionary item:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return csrfErrorResponse();
    }

    const adminUser = await getAdminUser(request);
    if (!adminUser) {
      return NextResponse.json({ error: 'Только администратор может изменять справочники' }, { status: 403 });
    }

    const body = await request.json();
    const itemId = cleanText(body.itemId);
    if (!itemId) {
      return NextResponse.json({ error: 'Не указан элемент справочника' }, { status: 400 });
    }

    const payload = itemPayload(body);
    if (!payload.label || !payload.value) {
      return NextResponse.json({ error: 'Название элемента справочника обязательно' }, { status: 400 });
    }

    const item = await db.referenceItem.update({
      where: { id: itemId },
      data: payload,
      include: { dictionary: true },
    });

    await db.auditLog.create({
      data: {
        action: 'UPDATED',
        entityType: 'REFERENCE_ITEM',
        entityId: item.id,
        details: JSON.stringify({
          dictionary: item.dictionary.code,
          label: item.label,
          isActive: item.isActive,
          updatedBy: adminUser.name,
        }),
        userId: adminUser.id,
      },
    });

    return NextResponse.json({ item });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Такое значение уже есть в справочнике' }, { status: 409 });
    }
    console.error('Error updating dictionary item:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
