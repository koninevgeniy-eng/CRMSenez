import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';
import { validateCsrf, csrfErrorResponse } from '@/lib/csrf';
import {
  canCreateEvent,
  isEventStatus,
  pickCreateEventScalarData,
} from '@/lib/event-policy';
import { normalizeBudgetItems, validateBudgetItems } from '@/lib/budget-policy';
import {
  buildEventVersionSnapshot,
} from '@/lib/event-versioning';
import { CALENDAR_EVENT_STATUSES } from '@/lib/calendar-policy';

function isValidDate(d: any): boolean {
  if (!d) return true; // null/undefined is acceptable (optional field)
  const date = new Date(d);
  return !isNaN(date.getTime());
}

function isValidPositiveNumber(n: any): boolean {
  if (n === undefined || n === null) return true; // optional
  return typeof n === 'number' && n >= 0;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    // Auth check - allow unauthenticated access for lite queries (public landing page)
    const lite = searchParams.get('lite') === 'true';
    const authUser = await getAuthUser(request);
    if (!authUser && !lite) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const status = searchParams.get('status');
    const department = searchParams.get('department');
    const search = searchParams.get('search');
    const year = searchParams.get('year');
    const programClass = searchParams.get('programClass');
    const quarter = searchParams.get('quarter');
    const isFavorite = searchParams.get('isFavorite');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '100')));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (status) where.status = status;
    if (programClass) where.programClass = programClass;
    if (quarter) where.quarter = quarter;
    if (isFavorite !== null && isFavorite !== undefined) {
      where.isFavorite = isFavorite === 'true';
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { uin: { contains: search } },
        { customerName: { contains: search } },
        { programDirector: { contains: search } },
        { client: { contains: search } },
        { tags: { contains: search } },
      ];
    }
    if (year) {
      const y = parseInt(year);
      const start = new Date(y, 0, 1);
      const end = new Date(y + 1, 0, 1);
      where.startDate = { gte: start, lt: end };
    }

    // Department-specific filters
    if (department === 'coordination') {
      where.status = {
        in: [
          'coordination_budget_review',
          'uin_assignment',
          'coordination_actual_budget_review',
          'actual_budget_approved',
          'pending_approval',
          'budget_approved',
          'uin_assigned',
          'pending_actual_approval',
        ],
      };
    } else if (department === 'agd') {
      where.status = {
        in: [
          'agd_date_review',
          'uin_assigned',
          ...CALENDAR_EVENT_STATUSES,
        ],
      };
    } else if (department === 'organization') {
      where.status = { in: ['calendar_approved', 'organization_assignment', 'in_progress', 'event_finished', 'approved'] };
    } else if (department === 'methodology') {
      // Methodology sees all
    }

    const publicSelect = {
      id: true,
      title: true,
      status: true,
      startDate: true,
      endDate: true,
      participantCount: true,
      venue: true,
    };

    const includeConfig = {
      speakers: true,
      budgetItems: true,
      tasks: true,
      contacts: true,
      rooms: true,
      meals: true,
      transfers: true,
      accommodations: true,
      notifications: { orderBy: { createdAt: 'desc' }, take: 5 },
      changeLogs: { orderBy: { createdAt: 'desc' }, take: 10 },
      approvals: { orderBy: { createdAt: 'desc' }, take: 20 },
      versions: { orderBy: { version: 'desc' }, take: 5 },
      payments: { orderBy: { createdAt: 'desc' } },
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
      } as any,
    };

    const eventsQuery = lite
      ? db.event.findMany({
          where,
          select: publicSelect,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        })
      : db.event.findMany({
          where,
          include: includeConfig as any,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        });

    const [events, total] = await Promise.all([
      eventsQuery,
      db.event.count({ where }),
    ]);

    return NextResponse.json({
      data: events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // CSRF CHECK
    if (!validateCsrf(request)) {
      return csrfErrorResponse();
    }

    // AUTH CHECK: Require manager or admin to create events
    const authUser = await getAuthUser(request);
    if (!authUser || !canCreateEvent(authUser)) {
      return NextResponse.json(
        { error: 'Недостаточно прав для создания мероприятий' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      speakers = [],
      budgetItems = [],
      tasks = [],
      contacts = [],
      rooms = [],
      meals = [],
      transfers = [],
      accommodations = [],
      payments = [],
      ...eventData
    } = body;

    // INPUT VALIDATION

    // Title: required, non-empty, max 500 chars
    if (!eventData.title || typeof eventData.title !== 'string' || eventData.title.trim().length === 0) {
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

    // Validate date fields
    const dateFields = ['startDate', 'endDate', 'setupStartDate', 'setupEndDate', 'teardownStartDate', 'teardownEndDate'];
    for (const field of dateFields) {
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
        { error: 'Статус назначается только через workflow' },
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
    const normalizedBudgetItems = normalizeBudgetItems(budgetItems);

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

    const createData = pickCreateEventScalarData(eventData);
    const event = await db.event.create({
      data: {
        ...createData,
        ownerId: authUser.id,
        hasProgram: eventData.hasProgram ?? false,
        hasPlan: eventData.hasPlan ?? false,
        isFavorite: eventData.isFavorite ?? false,
        speakers: {
          create: speakers.map((s: any) => ({
            fullName: s.fullName,
            topic: s.topic || null,
            cost: s.cost || null,
            description: s.description || null,
            photoUrl: s.photoUrl || null,
          })),
        },
        budgetItems: {
          create: normalizedBudgetItems.map((b: any) => ({
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
            status: b.status || 'planned',
          })),
        },
        tasks: {
          create: tasks.map((t: any) => ({
            category: t.category,
            title: t.title,
            description: t.description || null,
            assignee: t.assignee || null,
            dueDate: t.dueDate ? new Date(t.dueDate) : null,
            completed: t.completed || false,
            checklist: t.checklist || null,
            priority: t.priority || 'medium',
          })),
        },
        contacts: {
          create: contacts.map((c: any) => ({
            role: c.role,
            fullName: c.fullName,
            phone: c.phone || null,
            email: c.email || null,
            type: c.type || 'customer',
          })),
        },
        rooms: {
          create: rooms.map((r: any) => ({
            roomName: r.roomName,
            dateFrom: r.dateFrom || null,
            dateTo: r.dateTo || null,
            timeFrom: r.timeFrom || null,
            timeTo: r.timeTo || null,
          })),
        },
        meals: {
          create: meals.map((m: any) => ({
            date: m.date || null,
            time: m.time || null,
            location: m.location || null,
            mealType: m.mealType || null,
            level: m.level || null,
            headcount: m.headcount || null,
            notes: m.notes || null,
          })),
        },
        transfers: {
          create: transfers.map((t: any) => ({
            date: t.date || null,
            time: t.time || null,
            from: t.from || null,
            to: t.to || null,
            vehicleType: t.vehicleType || null,
            headcount: t.headcount || null,
            notes: t.notes || null,
          })),
        },
        accommodations: {
          create: accommodations.map((a: any) => ({
            roomType: a.roomType || null,
            count: a.count || null,
            checkIn: a.checkIn || null,
            checkOut: a.checkOut || null,
            notes: a.notes || null,
          })),
        },
        payments: {
          create: payments.map((p: any) => ({
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
        },
        notifications: {
          create: [
            { department: 'Методология', message: `Создан черновик мероприятия: ${eventData.title}`, type: 'info' },
          ],
        },
        changeLogs: {
          create: {
            field: 'status',
            newValue: 'draft',
            changedBy: authUser.name,
            role: authUser.role,
            department: authUser.department,
            stage: 'draft',
            version: 1,
            comment: 'Создание карточки мероприятия',
          },
        },
      } as Prisma.EventCreateInput,
      include: {
        speakers: true,
        budgetItems: true,
        tasks: true,
        contacts: true,
        rooms: true,
        meals: true,
        transfers: true,
        accommodations: true,
        notifications: true,
        changeLogs: true,
        approvals: true,
        versions: true,
        payments: true,
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
      },
    });

    const initialVersion = await db.eventVersion.create({
      data: {
        eventId: event.id,
        version: 1,
        status: event.status,
        reason: 'Создание карточки мероприятия',
        source: 'created',
        snapshot: buildEventVersionSnapshot(event as unknown as Record<string, unknown>),
        createdBy: authUser.name,
        role: authUser.role,
        department: authUser.department,
      },
    });

    return NextResponse.json({ ...event, versions: [initialVersion] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
