import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';
import { validateCsrf, csrfErrorResponse } from '@/lib/csrf';
import {
  canDeleteEvent,
  canUseEventRelation,
  isEventStatus,
  pickEventScalarData,
} from '@/lib/event-policy';
import { hasPlannedBudgetChange, normalizeBudgetItems, validateBudgetItems } from '@/lib/budget-policy';

function isValidDate(d: any): boolean {
  if (!d) return true;
  const date = new Date(d);
  return !isNaN(date.getTime());
}

function isValidPositiveNumber(n: any): boolean {
  if (n === undefined || n === null) return true;
  return typeof n === 'number' && n >= 0;
}

function valuesMatch(currentValue: unknown, requestedValue: unknown): boolean {
  if (currentValue instanceof Date) {
    if (!requestedValue) return false;
    return currentValue.getTime() === new Date(String(requestedValue)).getTime();
  }
  return currentValue === requestedValue
    || String(currentValue ?? '') === String(requestedValue ?? '');
}

const eventInclude = {
  speakers: true,
  budgetItems: true,
  tasks: true,
  contacts: true,
  rooms: true,
  meals: true,
  transfers: true,
  accommodations: true,
  payments: { orderBy: { createdAt: 'desc' } },
  notifications: { orderBy: { createdAt: 'desc' } },
  changeLogs: { orderBy: { createdAt: 'desc' } },
  approvals: { orderBy: { createdAt: 'desc' } },
  assignments: {
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
    },
  },
};

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
    const event = await db.event.findUnique({
      where: { id },
      include: eventInclude as any,
    });

    if (!event) {
      return NextResponse.json({ error: 'Мероприятие не найдено' }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error: any) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF CHECK
    if (!validateCsrf(request)) {
      return csrfErrorResponse();
    }

    // AUTH CHECK: Require manager or admin to update events
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Недостаточно прав для редактирования мероприятий' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Validate the event exists before updating
    const existingEvent = await db.event.findUnique({
      where: { id },
      include: { budgetItems: true },
    });
    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Мероприятие не найдено' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      speakers,
      budgetItems,
      tasks,
      contacts,
      rooms,
      meals,
      transfers,
      accommodations,
      payments,
      changeDescription,
      changedBy,
      ...eventData
    } = body;

    // INPUT VALIDATION

    // Title: if provided, must be non-empty and max 500 chars
    if (eventData.title !== undefined) {
      if (typeof eventData.title !== 'string' || eventData.title.trim().length === 0) {
        return NextResponse.json(
          { error: 'Название мероприятия обязательно' },
          { status: 400 }
        );
      }
      if (eventData.title.length > 500) {
        return NextResponse.json(
          { error: 'Название мероприятия не должно превышать 500 символов' },
          { status: 400 }
        );
      }
    }

    // Validate date fields
    const dateFieldNames = [
      'startDate',
      'endDate',
      'setupStartDate',
      'setupEndDate',
      'teardownStartDate',
      'teardownEndDate',
      'budgetApprovedAt',
      'actualBudgetApprovedAt',
      'archivedAt',
      'cancelRequestedAt',
    ];
    for (const field of dateFieldNames) {
      if (eventData[field] !== undefined && !isValidDate(eventData[field])) {
        return NextResponse.json(
          { error: `Некорректная дата в поле ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate budget is positive number
    if (eventData.budget !== undefined && !isValidPositiveNumber(eventData.budget)) {
      return NextResponse.json(
        { error: 'Бюджет должен быть положительным числом' },
        { status: 400 }
      );
    }

    // Validate status is one of allowed values
    if (eventData.status !== undefined && !isEventStatus(eventData.status)) {
      return NextResponse.json(
        { error: 'Недопустимый статус' },
        { status: 400 }
      );
    }

    const budgetValidation = validateBudgetItems(budgetItems);
    if (!budgetValidation.ok) {
      return NextResponse.json(
        { error: budgetValidation.error },
        { status: 400 }
      );
    }
    const normalizedBudgetItems = Array.isArray(budgetItems) ? normalizeBudgetItems(budgetItems) : undefined;

    // Validate payments: non-negative amounts
    if (Array.isArray(payments)) {
      for (const p of payments) {
        if (p.amount !== undefined && typeof p.amount === 'number' && p.amount < 0) {
          return NextResponse.json(
            { error: `Сумма платежа не может быть отрицательной (${p.description || p.contractor})` },
            { status: 400 }
          );
        }
        if (p.paidAmount !== undefined && p.paidAmount !== null && typeof p.paidAmount === 'number' && p.paidAmount < 0) {
          return NextResponse.json(
            { error: `Оплаченная сумма не может быть отрицательной (${p.description || p.contractor})` },
            { status: 400 }
          );
        }
      }
    }

    // Get current event for change log
    const currentEvent = existingEvent;
    const updateData = pickEventScalarData(eventData, authUser);

    const requestedScalarFields = Object.keys(eventData);
    const rejectedScalarFields = requestedScalarFields.filter(field =>
      !(field in updateData)
      && !valuesMatch((existingEvent as unknown as Record<string, unknown>)[field], eventData[field])
    );
    if (rejectedScalarFields.length > 0) {
      return NextResponse.json(
        { error: `Недостаточно прав для изменения полей: ${rejectedScalarFields.join(', ')}` },
        { status: 403 }
      );
    }

    const requestedRelations = {
      speakers,
      budgetItems,
      tasks,
      contacts,
      rooms,
      meals,
      transfers,
      accommodations,
      payments,
    };
    for (const [relation, value] of Object.entries(requestedRelations)) {
      if (value !== undefined && (relation === 'tasks' || !canUseEventRelation(authUser, relation))) {
        return NextResponse.json(
          { error: relation === 'tasks'
            ? 'Используйте API задач для изменения задач'
            : `Недостаточно прав для изменения раздела ${relation}` },
          { status: 403 }
        );
      }
    }

    // Log changes
    const changeLogs: any[] = [];
    const plannedBudgetChanged = normalizedBudgetItems !== undefined
      && hasPlannedBudgetChange(existingEvent.budgetItems, budgetItems);
    const needsBudgetReapproval = plannedBudgetChanged
      && existingEvent.budgetApproved
      && ![
        'draft',
        'methodology_review',
        'revision_requested',
        'coordination_budget_review',
        'cancel_requested',
        'cancelled',
        'archived',
        'completed',
      ].includes(existingEvent.status);

    if (needsBudgetReapproval) {
      updateData.status = 'coordination_budget_review';
      updateData.budgetApproved = false;
      updateData.budgetApprovedBy = null;
      updateData.budgetApprovedAt = null;
      updateData.calendarAdded = false;
    }

    const changeLogContext = {
      changedBy: authUser.name,
      role: authUser.role,
      department: authUser.department,
      stage: existingEvent.status,
      version: existingEvent.currentVersion,
      comment: changeDescription || null,
    };

    if (currentEvent) {
      for (const [key, value] of Object.entries(updateData)) {
        const oldValue = (currentEvent as any)[key];
        const oldStr = oldValue?.toString() || '';
        const newStr = value?.toString() || '';
        if (oldStr !== newStr && key !== 'updatedAt') {
          changeLogs.push({
            eventId: id,
            field: key,
            oldValue: oldStr,
            newValue: newStr,
            ...changeLogContext,
          });
        }
      }
      // Also log boolean field changes
      for (const boolField of ['hasProgram', 'hasPlan', 'isFavorite']) {
        if (updateData[boolField] !== undefined && (currentEvent as any)[boolField] !== updateData[boolField]) {
          changeLogs.push({
            eventId: id,
            field: boolField,
            oldValue: String((currentEvent as any)[boolField]),
            newValue: String(updateData[boolField]),
            ...changeLogContext,
          });
        }
      }
      if (needsBudgetReapproval) {
        changeLogs.push({
          eventId: id,
          field: 'budgetReapproval',
          oldValue: existingEvent.status,
          newValue: 'coordination_budget_review',
          ...changeLogContext,
          comment: changeDescription || 'Плановый бюджет изменен после согласования. Требуется повторное согласование бюджета.',
        });
      }
    }

    // Perform all updates inside a transaction for data integrity
    await db.$transaction(async (tx) => {
      // Update event
      const event = await tx.event.update({
        where: { id },
        data: updateData,
      });

      // Create change logs
      if (changeLogs.length > 0) {
        await tx.changeLog.createMany({ data: changeLogs });

        // Create notifications for all departments about changes
        const changeMsg = changeDescription || `Мероприятие "${event.title}" было изменено`;
        await tx.notification.createMany({
          data: [
            { eventId: id, department: 'АГД', message: changeMsg, type: 'change' },
            { eventId: id, department: 'Координация', message: changeMsg, type: 'change' },
            { eventId: id, department: 'Организация', message: changeMsg, type: 'change' },
            { eventId: id, department: 'Аналитика', message: changeMsg, type: 'change' },
            { eventId: id, department: 'Методология', message: changeMsg, type: 'change' },
          ],
        });
      }

      // Handle speakers - replace all
      if (speakers !== undefined) {
        await tx.speaker.deleteMany({ where: { eventId: id } });
        if (speakers.length > 0) {
          await tx.speaker.createMany({
            data: speakers.map((s: any) => ({
              eventId: id,
              fullName: s.fullName,
              topic: s.topic || null,
              cost: s.cost || null,
              description: s.description || null,
              photoUrl: s.photoUrl || null,
            })),
          });
        }
      }

      // Handle budget items - replace all
      if (normalizedBudgetItems !== undefined) {
        await tx.budgetItem.deleteMany({ where: { eventId: id } });
        if (normalizedBudgetItems.length > 0) {
          await tx.budgetItem.createMany({
            data: normalizedBudgetItems.map((b: any) => ({
              eventId: id,
              number: b.number,
              article: b.article,
              quantity: b.quantity,
              unitPrice: b.unitPrice,
              comment: b.comment,
              overrunReason: b.overrunReason,
              category: b.category,
              description: b.description,
              plannedAmount: b.plannedAmount,
              actualAmount: b.actualAmount,
              originalAmount: b.originalAmount,
              correctedAmount: b.correctedAmount,
              correctedBy: b.correctedBy,
              correctionComment: b.correctionComment,
              status: b.status || 'planned',
            })),
          });
        }
      }

      // Handle contacts - replace all
      if (contacts !== undefined) {
        await tx.contact.deleteMany({ where: { eventId: id } });
        if (contacts.length > 0) {
          await tx.contact.createMany({
            data: contacts.map((c: any) => ({
              eventId: id,
              role: c.role,
              fullName: c.fullName,
              phone: c.phone || null,
              email: c.email || null,
              type: c.type || 'customer',
            })),
          });
        }
      }

      // Handle rooms - replace all
      if (rooms !== undefined) {
        await tx.roomBooking.deleteMany({ where: { eventId: id } });
        if (rooms.length > 0) {
          await tx.roomBooking.createMany({
            data: rooms.map((r: any) => ({
              eventId: id,
              roomName: r.roomName,
              dateFrom: r.dateFrom || null,
              dateTo: r.dateTo || null,
              timeFrom: r.timeFrom || null,
              timeTo: r.timeTo || null,
            })),
          });
        }
      }

      // Handle meals - replace all
      if (meals !== undefined) {
        await tx.meal.deleteMany({ where: { eventId: id } });
        if (meals.length > 0) {
          await tx.meal.createMany({
            data: meals.map((m: any) => ({
              eventId: id,
              date: m.date || null,
              time: m.time || null,
              location: m.location || null,
              mealType: m.mealType || null,
              level: m.level || null,
              headcount: m.headcount || null,
              notes: m.notes || null,
            })),
          });
        }
      }

      // Handle transfers - replace all
      if (transfers !== undefined) {
        await tx.transfer.deleteMany({ where: { eventId: id } });
        if (transfers.length > 0) {
          await tx.transfer.createMany({
            data: transfers.map((t: any) => ({
              eventId: id,
              date: t.date || null,
              time: t.time || null,
              from: t.from || null,
              to: t.to || null,
              vehicleType: t.vehicleType || null,
              headcount: t.headcount || null,
              notes: t.notes || null,
            })),
          });
        }
      }

      // Handle accommodations - replace all
      if (accommodations !== undefined) {
        await tx.accommodation.deleteMany({ where: { eventId: id } });
        if (accommodations.length > 0) {
          await tx.accommodation.createMany({
            data: accommodations.map((a: any) => ({
              eventId: id,
              roomType: a.roomType || null,
              count: a.count || null,
              checkIn: a.checkIn || null,
              checkOut: a.checkOut || null,
              notes: a.notes || null,
            })),
          });
        }
      }

      // Handle payments - replace all
      if (payments !== undefined) {
        await tx.payment.deleteMany({ where: { eventId: id } });
        if (payments.length > 0) {
          await tx.payment.createMany({
            data: payments.map((p: any) => ({
              eventId: id,
              contractor: p.contractor,
              description: p.description,
              amount: p.amount || 0,
              status: p.status || 'pending',
              dueDate: p.dueDate ? new Date(p.dueDate) : null,
              paidDate: p.paidDate ? new Date(p.paidDate) : null,
              paidAmount: p.paidAmount || null,
              invoiceNumber: p.invoiceNumber || null,
              notes: p.notes || null,
            })),
          });
        }
      }
    });

    // Return updated event
    const updatedEvent = await db.event.findUnique({
      where: { id },
      include: eventInclude as any,
    });

    return NextResponse.json(updatedEvent);
  } catch (error: any) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF CHECK
    if (!validateCsrf(request)) {
      return csrfErrorResponse();
    }

    // AUTH CHECK: Require manager or admin to delete events
    const authUser = await getAuthUser(request);
    if (!authUser || !canDeleteEvent(authUser)) {
      return NextResponse.json(
        { error: 'Только администратор может удалять мероприятия' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Validate event exists before deleting
    const existingEvent = await db.event.findUnique({ where: { id } });
    if (!existingEvent) {
      return NextResponse.json(
        { error: 'Мероприятие не найдено' },
        { status: 404 }
      );
    }

    await db.event.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
