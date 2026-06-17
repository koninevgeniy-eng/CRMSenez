import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminUser } from '@/lib/auth-helpers';
import { validateCsrf, csrfErrorResponse } from '@/lib/csrf';

// Default settings values
const DEFAULT_SETTINGS: Record<string, string> = {
  appName: 'CRM Сенеж',
  appDescription: 'Система управления образовательными мероприятиями',
  defaultBudget: '500000',
  defaultParticipants: '50',
  notificationsEnabled: 'true',
  emailNotifications: 'false',
};

// GET /api/settings — returns all settings (public, non-sensitive)
export async function GET() {
  try {
    const settingsRows = await db.settings.findMany();

    // Build settings object from DB, fallback to defaults
    const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of settingsRows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/settings — updates settings (admin only)
export async function PUT(request: NextRequest) {
  try {
    if (!validateCsrf(request)) {
      return csrfErrorResponse();
    }

    const adminUser = await getAdminUser(request);
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Только администратор может изменять настройки' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { settings } = body as { settings: Record<string, string> };

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Неверный формат настроек' },
        { status: 400 }
      );
    }

    // Upsert each setting
    const allowedKeys = Object.keys(DEFAULT_SETTINGS);
    for (const [key, value] of Object.entries(settings)) {
      if (!allowedKeys.includes(key)) continue;
      await db.settings.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    // Create audit log
    await db.auditLog.create({
      data: {
        action: 'UPDATED',
        entityType: 'SETTINGS',
        entityId: 'global',
        details: JSON.stringify({
          description: 'Обновление настроек приложения',
          updatedKeys: Object.keys(settings).filter(k => allowedKeys.includes(k)),
          updatedBy: adminUser.name,
        }),
        userId: adminUser.id,
      },
    });

    // Return updated settings
    const updatedSettings: Record<string, string> = { ...DEFAULT_SETTINGS };
    const allSettings = await db.settings.findMany();
    for (const row of allSettings) {
      updatedSettings[row.key] = row.value;
    }

    return NextResponse.json({ settings: updatedSettings });
  } catch (error: any) {
    console.error('Error updating settings:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
