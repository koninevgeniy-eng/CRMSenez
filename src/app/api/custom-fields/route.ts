import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminUser, getAuthUser } from '@/lib/auth-helpers';
import { validateCsrf, csrfErrorResponse } from '@/lib/csrf';
import {
  CUSTOM_FIELD_TYPES,
  isCustomFieldType,
  normalizeCustomFieldKey,
  parseCustomFieldOptions,
} from '@/lib/custom-fields';

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptions(value: unknown): string | null {
  if (Array.isArray(value)) {
    const options = value.map(item => String(item).trim()).filter(Boolean);
    return options.length > 0 ? JSON.stringify(options) : null;
  }
  const text = cleanText(value);
  if (!text) return null;
  const options = parseCustomFieldOptions(text);
  return options.length > 0 ? JSON.stringify(options) : null;
}

function payload(body: Record<string, unknown>) {
  const label = cleanText(body.label);
  const requestedKey = cleanText(body.key);
  const key = normalizeCustomFieldKey(requestedKey || label);
  const fieldType = cleanText(body.fieldType) || 'text';

  return {
    entityType: cleanText(body.entityType) || 'event',
    key,
    label,
    description: cleanText(body.description) || null,
    fieldType,
    options: normalizeOptions(body.options),
    department: cleanText(body.department) || null,
    required: typeof body.required === 'boolean' ? body.required : false,
    showInAnalytics: typeof body.showInAnalytics === 'boolean' ? body.showInAnalytics : true,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
    sortOrder: Number.isFinite(Number(body.sortOrder)) ? Number(body.sortOrder) : 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const entityType = cleanText(request.nextUrl.searchParams.get('entityType')) || 'event';
    const includeInactive = request.nextUrl.searchParams.get('includeInactive') === 'true'
      && authUser.role === 'admin';

    const fields = await db.customFieldDefinition.findMany({
      where: {
        entityType,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });

    return NextResponse.json({ fields });
  } catch (error: any) {
    console.error('Error fetching custom fields:', error);
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
      return NextResponse.json({ error: 'Только администратор может создавать поля карточки' }, { status: 403 });
    }

    const body = await request.json();
    const data = payload(body);
    if (!data.label) {
      return NextResponse.json({ error: 'Название поля обязательно' }, { status: 400 });
    }
    if (!data.key) {
      return NextResponse.json({ error: 'Ключ поля обязателен' }, { status: 400 });
    }
    if (!isCustomFieldType(data.fieldType)) {
      return NextResponse.json({ error: `Тип поля должен быть одним из: ${CUSTOM_FIELD_TYPES.join(', ')}` }, { status: 400 });
    }
    if (['select', 'multiselect'].includes(data.fieldType) && !data.options) {
      return NextResponse.json({ error: 'Для поля-списка нужны варианты значений' }, { status: 400 });
    }

    const field = await db.customFieldDefinition.create({
      data: {
        ...data,
        createdBy: adminUser.name,
      },
    });

    await db.auditLog.create({
      data: {
        action: 'CREATED',
        entityType: 'CUSTOM_FIELD',
        entityId: field.id,
        details: JSON.stringify({ key: field.key, label: field.label, fieldType: field.fieldType }),
        userId: adminUser.id,
      },
    });

    return NextResponse.json({ field }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Поле с таким ключом уже существует' }, { status: 409 });
    }
    console.error('Error creating custom field:', error);
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
      return NextResponse.json({ error: 'Только администратор может изменять поля карточки' }, { status: 403 });
    }

    const body = await request.json();
    const fieldId = cleanText(body.fieldId);
    if (!fieldId) {
      return NextResponse.json({ error: 'Не указано поле карточки' }, { status: 400 });
    }

    const data = payload(body);
    if (!data.label || !data.key) {
      return NextResponse.json({ error: 'Название и ключ поля обязательны' }, { status: 400 });
    }
    if (!isCustomFieldType(data.fieldType)) {
      return NextResponse.json({ error: `Тип поля должен быть одним из: ${CUSTOM_FIELD_TYPES.join(', ')}` }, { status: 400 });
    }
    if (['select', 'multiselect'].includes(data.fieldType) && !data.options) {
      return NextResponse.json({ error: 'Для поля-списка нужны варианты значений' }, { status: 400 });
    }

    const field = await db.customFieldDefinition.update({
      where: { id: fieldId },
      data,
    });

    await db.auditLog.create({
      data: {
        action: 'UPDATED',
        entityType: 'CUSTOM_FIELD',
        entityId: field.id,
        details: JSON.stringify({ key: field.key, label: field.label, isActive: field.isActive }),
        userId: adminUser.id,
      },
    });

    return NextResponse.json({ field });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Поле с таким ключом уже существует' }, { status: 409 });
    }
    console.error('Error updating custom field:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
