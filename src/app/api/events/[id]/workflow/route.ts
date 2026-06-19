import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';
import { validateCsrf, csrfErrorResponse } from '@/lib/csrf';
import { CALENDAR_EVENT_STATUSES, dateRangesOverlap } from '@/lib/calendar-policy';
import {
  buildEventVersionSnapshot,
  EVENT_VERSION_SNAPSHOT_INCLUDE,
} from '@/lib/event-versioning';

type WorkflowAction =
  | 'submit_for_approval'
  | 'methodology_approve'
  | 'request_revision'
  | 'reject'
  | 'approve_budget'
  | 'assign_uin'
  | 'agd_approve'
  | 'add_to_calendar'
  | 'accept_organization'
  | 'start'
  | 'complete'
  | 'submit_actual_budget'
  | 'methodology_approve_actual_budget'
  | 'approve_actual_budget'
  | 'reject_actual_budget'
  | 'finalize_event'
  | 'request_cancel'
  | 'confirm_cancel'
  | 'cancel';

const FINAL_STATUSES = new Set(['cancelled', 'archived', 'completed']);
const REVISION_STATUSES = new Set([
  'methodology_review',
  'coordination_budget_review',
  'agd_date_review',
  'methodology_actual_budget_review',
  'coordination_actual_budget_review',
  'pending_approval',
  'pending_actual_approval',
]);

function isManagerOf(user: { role: string; department: string | null }, department: string): boolean {
  return user.role === 'manager' && user.department === department;
}

function canActAsOwner(
  user: { id: string; role: string; department: string | null },
  event: { ownerId: string | null; status: string },
): boolean {
  return user.role === 'admin'
    || event.ownerId === user.id
    || (!event.ownerId && user.department === 'methodology');
}

function canUseStage(
  user: { role: string; department: string | null },
  stage: string,
): boolean {
  if (user.role === 'admin') return true;
  if (stage === 'methodology_review' || stage === 'methodology_actual_budget_review') {
    return isManagerOf(user, 'methodology');
  }
  if (stage === 'coordination_budget_review' || stage === 'coordination_actual_budget_review') {
    return isManagerOf(user, 'coordination');
  }
  if (stage === 'agd_date_review') {
    return isManagerOf(user, 'agd');
  }
  return false;
}

function normalizeStageForPermission(status: string): string {
  const legacyMap: Record<string, string> = {
    pending_approval: 'coordination_budget_review',
    budget_approved: 'uin_assignment',
    uin_assigned: 'agd_date_review',
    approved: 'calendar_approved',
    pending_actual_budget: 'event_finished',
    pending_actual_approval: 'coordination_actual_budget_review',
    completed: 'archived',
    rejected: 'revision_requested',
  };
  return legacyMap[status] || status;
}

function requireStatus(current: string, allowed: string[], message: string): NextResponse | null {
  if (!allowed.includes(current)) {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return null;
}

function requireComment(comment: unknown, message = 'Комментарий обязателен для этого действия'): NextResponse | null {
  if (typeof comment !== 'string' || comment.trim().length === 0) {
    return NextResponse.json({ error: message }, { status: 400 });
  }
  return null;
}

function notificationDepartmentsFor(status: string): string[] {
  switch (status) {
    case 'methodology_review':
    case 'revision_requested':
    case 'methodology_actual_budget_review':
      return ['Методология'];
    case 'coordination_budget_review':
    case 'uin_assignment':
    case 'coordination_actual_budget_review':
    case 'actual_budget_approved':
      return ['Координация', 'Методология'];
    case 'agd_date_review':
    case 'calendar_approved':
      return ['АГД', 'Методология', 'Координация'];
    case 'organization_assignment':
    case 'in_progress':
    case 'event_finished':
      return ['Организация', 'Методология'];
    case 'cancel_requested':
    case 'cancelled':
    case 'archived':
      return ['Методология', 'Координация', 'АГД', 'Организация', 'Аналитика'];
    default:
      return ['Методология'];
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!validateCsrf(request)) {
      return csrfErrorResponse();
    }

    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const action = body.action as WorkflowAction;
    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';
    const changedBy = typeof body.changedBy === 'string' && body.changedBy.trim()
      ? body.changedBy.trim()
      : authUser.name;
    const uin = typeof body.uin === 'string' ? body.uin.trim() : '';

    const event = await db.event.findUnique({
      where: { id },
      include: {
        budgetItems: true,
        assignments: {
          include: {
            user: {
              select: { department: true },
            },
          },
        },
      },
    });
    if (!event) {
      return NextResponse.json({ error: 'Мероприятие не найдено' }, { status: 404 });
    }

    let newStatus = event.status;
    let decision: string = action;
    let stage = event.status;
    let notificationMsg = '';
    let notificationType = 'info';
    const updateData: Record<string, unknown> = {};
    let createUinTask = false;
    let calendarConflicts: Array<{ id: string; title: string; startDate: Date | null; endDate: Date | null; venue: string | null }> = [];

    switch (action) {
      case 'submit_for_approval': {
        if (!canActAsOwner(authUser, event)) {
          return NextResponse.json(
            { error: 'Отправить карточку на согласование может только ее создатель или администратор' },
            { status: 403 }
          );
        }

        const missingFields: string[] = [];
        if (!event.title || event.title.trim().length === 0) missingFields.push('Название мероприятия');
        if (!event.startDate) missingFields.push('Дата начала');
        if (!event.endDate) missingFields.push('Дата окончания');
        if (!event.participantCount || event.participantCount <= 0) missingFields.push('Количество участников');
        if (!event.programDirector) missingFields.push('Руководитель программы');
        if (!event.program && !event.eventPlan) missingFields.push('Программа или план мероприятия');

        if (missingFields.length > 0) {
          return NextResponse.json(
            { error: `Для отправки на согласование необходимо заполнить: ${missingFields.join(', ')}` },
            { status: 400 }
          );
        }

        const invalid = requireStatus(
          event.status,
          ['draft', 'revision_requested', 'rejected'],
          'Отправить на согласование можно только из черновика или после доработки'
        );
        if (invalid) return invalid;

        newStatus = 'methodology_review';
        decision = 'submitted';
        notificationMsg = `Мероприятие "${event.title}" направлено руководителю методологии на согласование`;
        notificationType = 'approval';
        break;
      }

      case 'methodology_approve': {
        if (!canUseStage(authUser, 'methodology_review')) {
          return NextResponse.json({ error: 'Согласовать карточку может руководитель методологии' }, { status: 403 });
        }
        const invalid = requireStatus(event.status, ['methodology_review'], 'Карточка не находится на согласовании методологии');
        if (invalid) return invalid;
        newStatus = 'coordination_budget_review';
        decision = 'approved';
        notificationMsg = `Руководитель методологии согласовал мероприятие "${event.title}" — передано на согласование бюджета`;
        notificationType = 'approval';
        break;
      }

      case 'request_revision':
      case 'reject': {
        const commentError = requireComment(comment, 'При возврате на доработку нужно указать причину');
        if (commentError) return commentError;
        if (!REVISION_STATUSES.has(event.status)) {
          return NextResponse.json(
            { error: 'Вернуть на доработку можно только карточку на этапе согласования' },
            { status: 400 }
          );
        }
        if (!canUseStage(authUser, normalizeStageForPermission(event.status))) {
          return NextResponse.json(
            { error: 'Недостаточно прав для возврата карточки на этом этапе' },
            { status: 403 }
          );
        }
        newStatus = event.status === 'coordination_actual_budget_review' || event.status === 'pending_actual_approval'
          ? 'event_finished'
          : 'revision_requested';
        decision = 'revision_requested';
        notificationMsg = `Мероприятие "${event.title}" возвращено создателю на доработку. Причина: ${comment}`;
        notificationType = 'warning';
        break;
      }

      case 'approve_budget': {
        if (!canUseStage(authUser, 'coordination_budget_review')) {
          return NextResponse.json({ error: 'Бюджет может согласовать руководитель координации' }, { status: 403 });
        }
        const invalid = requireStatus(
          event.status,
          ['coordination_budget_review', 'pending_approval'],
          'Бюджет можно согласовать только на этапе согласования бюджета'
        );
        if (invalid) return invalid;
        const totalPlanned = event.budgetItems.reduce((s, b) => s + b.plannedAmount, 0);
        if ((!event.budget || event.budget <= 0) && totalPlanned <= 0) {
          return NextResponse.json(
            { error: 'Для согласования бюджета необходимо указать бюджет или бюджетные строки' },
            { status: 400 }
          );
        }
        newStatus = uin ? 'agd_date_review' : 'uin_assignment';
        decision = 'budget_approved';
        updateData.budgetApproved = true;
        updateData.budgetApprovedBy = changedBy;
        updateData.budgetApprovedAt = new Date();
        if (comment) updateData.coordinatorComment = comment;
        if (uin) updateData.uin = uin;
        createUinTask = !uin;
        notificationMsg = uin
          ? `Бюджет и УИН мероприятия "${event.title}" согласованы — передано в АГД`
          : `Бюджет мероприятия "${event.title}" согласован — требуется присвоить УИН`;
        notificationType = 'approval';
        break;
      }

      case 'assign_uin': {
        if (!canUseStage(authUser, 'coordination_budget_review')) {
          return NextResponse.json({ error: 'УИН может присвоить руководитель координации' }, { status: 403 });
        }
        const invalid = requireStatus(
          event.status,
          ['uin_assignment', 'budget_approved'],
          'УИН можно присвоить только после согласования бюджета'
        );
        if (invalid) return invalid;
        if (!uin && !event.uin) {
          return NextResponse.json({ error: 'УИН обязателен для этого действия' }, { status: 400 });
        }
        newStatus = 'agd_date_review';
        decision = 'uin_assigned';
        if (uin) updateData.uin = uin;
        notificationMsg = `УИН присвоен мероприятию "${event.title}" — передано в АГД на проверку`;
        notificationType = 'approval';
        break;
      }

      case 'agd_approve':
      case 'add_to_calendar': {
        if (!canUseStage(authUser, 'agd_date_review')) {
          return NextResponse.json({ error: 'Поставить мероприятие в календарь может руководитель АГД' }, { status: 403 });
        }
        const invalid = requireStatus(
          event.status,
          ['agd_date_review', 'uin_assigned', 'approved'],
          'Добавить в календарь можно только после присвоения УИН и проверки АГД'
        );
        if (invalid) return invalid;
        if (event.startDate && event.endDate) {
          const existingCalendarEvents = await db.event.findMany({
            where: {
              id: { not: id },
              status: { in: [...CALENDAR_EVENT_STATUSES] },
              startDate: { not: null },
              endDate: { not: null },
            },
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
              venue: true,
            },
          });
          calendarConflicts = existingCalendarEvents.filter(conflict =>
            conflict.startDate
            && conflict.endDate
            && dateRangesOverlap(event.startDate!, event.endDate!, conflict.startDate, conflict.endDate)
          );
        }
        newStatus = 'calendar_approved';
        decision = 'agd_approved';
        updateData.calendarAdded = true;
        notificationMsg = `Мероприятие "${event.title}" согласовано АГД и поставлено в календарь`;
        notificationType = 'approval';
        break;
      }

      case 'accept_organization':
      case 'start': {
        if (!(authUser.role === 'admin' || isManagerOf(authUser, 'organization'))) {
          return NextResponse.json({ error: 'Взять мероприятие в работу может руководитель организации' }, { status: 403 });
        }
        const invalid = requireStatus(
          event.status,
          ['calendar_approved', 'organization_assignment', 'approved'],
          'Взять в работу можно только мероприятие, согласованное и поставленное в календарь'
        );
        if (invalid) return invalid;
        const organizationLead = event.assignments.find(a => a.role === 'LEAD' && a.user?.department === 'organization');
        if (!organizationLead) {
          return NextResponse.json(
            { error: 'Перед передачей в работу назначьте руководителя мероприятия от департамента организации' },
            { status: 400 }
          );
        }
        newStatus = 'in_progress';
        decision = 'accepted_by_organization';
        notificationMsg = `Мероприятие "${event.title}" принято в работу департаментом организации`;
        notificationType = 'info';
        break;
      }

      case 'complete': {
        const organizationLead = event.assignments.find(a => a.role === 'LEAD' && a.user?.department === 'organization');
        const canComplete = authUser.role === 'admin'
          || isManagerOf(authUser, 'organization')
          || organizationLead?.userId === authUser.id;
        if (!canComplete) {
          return NextResponse.json({ error: 'Отметить проведение может руководитель организации или руководитель мероприятия' }, { status: 403 });
        }
        const invalid = requireStatus(event.status, ['in_progress'], 'Проведенным можно отметить только мероприятие в работе');
        if (invalid) return invalid;
        newStatus = 'event_finished';
        decision = 'event_finished';
        notificationMsg = `Мероприятие "${event.title}" проведено — передано создателю в методологию для фактического бюджета`;
        notificationType = 'info';
        break;
      }

      case 'submit_actual_budget': {
        if (!canActAsOwner(authUser, event)) {
          return NextResponse.json({ error: 'Фактический бюджет направляет создатель карточки' }, { status: 403 });
        }
        const invalid = requireStatus(
          event.status,
          ['event_finished', 'pending_actual_budget'],
          'Фактический бюджет можно направить после проведения мероприятия'
        );
        if (invalid) return invalid;
        if (!event.actualCost && event.actualCost !== 0) {
          return NextResponse.json(
            { error: 'Для отправки фактического бюджета необходимо указать фактические затраты' },
            { status: 400 }
          );
        }
        newStatus = 'methodology_actual_budget_review';
        decision = 'actual_budget_submitted';
        notificationMsg = `Фактический бюджет мероприятия "${event.title}" направлен руководителю методологии`;
        notificationType = 'approval';
        break;
      }

      case 'methodology_approve_actual_budget': {
        if (!canUseStage(authUser, 'methodology_actual_budget_review')) {
          return NextResponse.json({ error: 'Фактический бюджет согласует руководитель методологии' }, { status: 403 });
        }
        const invalid = requireStatus(
          event.status,
          ['methodology_actual_budget_review'],
          'Фактический бюджет не находится на согласовании методологии'
        );
        if (invalid) return invalid;
        newStatus = 'coordination_actual_budget_review';
        decision = 'actual_budget_methodology_approved';
        notificationMsg = `Руководитель методологии согласовал фактический бюджет мероприятия "${event.title}"`;
        notificationType = 'approval';
        break;
      }

      case 'approve_actual_budget': {
        if (!canUseStage(authUser, 'coordination_actual_budget_review')) {
          return NextResponse.json({ error: 'Фактический бюджет согласует руководитель координации' }, { status: 403 });
        }
        const invalid = requireStatus(
          event.status,
          ['coordination_actual_budget_review', 'pending_actual_approval'],
          'Фактический бюджет не находится на согласовании координации'
        );
        if (invalid) return invalid;
        newStatus = 'actual_budget_approved';
        decision = 'actual_budget_approved';
        updateData.actualBudgetApproved = true;
        updateData.actualBudgetApprovedBy = changedBy;
        updateData.actualBudgetApprovedAt = new Date();
        notificationMsg = `Фактический бюджет мероприятия "${event.title}" согласован координацией`;
        notificationType = 'approval';
        break;
      }

      case 'reject_actual_budget': {
        const commentError = requireComment(comment, 'При возврате фактического бюджета нужна причина');
        if (commentError) return commentError;
        if (!canUseStage(authUser, 'coordination_actual_budget_review')) {
          return NextResponse.json({ error: 'Фактический бюджет возвращает руководитель координации' }, { status: 403 });
        }
        const invalid = requireStatus(
          event.status,
          ['coordination_actual_budget_review', 'pending_actual_approval'],
          'Фактический бюджет не находится на согласовании координации'
        );
        if (invalid) return invalid;
        newStatus = 'event_finished';
        decision = 'actual_budget_revision_requested';
        notificationMsg = `Фактический бюджет мероприятия "${event.title}" возвращен на корректировку. Причина: ${comment}`;
        notificationType = 'warning';
        break;
      }

      case 'finalize_event': {
        if (!canActAsOwner(authUser, event)) {
          return NextResponse.json({ error: 'Закрыть мероприятие может создатель карточки' }, { status: 403 });
        }
        const invalid = requireStatus(
          event.status,
          ['actual_budget_approved'],
          'Закрыть мероприятие можно только после согласования фактического бюджета'
        );
        if (invalid) return invalid;
        newStatus = 'archived';
        decision = 'archived';
        updateData.archivedAt = new Date();
        notificationMsg = `Мероприятие "${event.title}" закрыто и направлено в архив`;
        notificationType = 'info';
        break;
      }

      case 'request_cancel': {
        const commentError = requireComment(comment, 'Для запроса отмены нужно указать причину');
        if (commentError) return commentError;
        if (!canActAsOwner(authUser, event) && !isManagerOf(authUser, 'methodology')) {
          return NextResponse.json({ error: 'Отмену может запросить создатель карточки или руководитель методологии' }, { status: 403 });
        }
        if (FINAL_STATUSES.has(event.status)) {
          return NextResponse.json({ error: 'Нельзя отменить финализированное мероприятие' }, { status: 400 });
        }
        newStatus = 'cancel_requested';
        decision = 'cancel_requested';
        updateData.cancelRequestedAt = new Date();
        updateData.cancelRequestedBy = authUser.id;
        updateData.cancelReason = comment;
        notificationMsg = `Запрошена отмена мероприятия "${event.title}". Причина: ${comment}`;
        notificationType = 'warning';
        break;
      }

      case 'confirm_cancel':
      case 'cancel': {
        if (!(authUser.role === 'admin' || isManagerOf(authUser, 'methodology'))) {
          return NextResponse.json({ error: 'Отмену подтверждает руководитель методологии' }, { status: 403 });
        }
        const invalid = action === 'confirm_cancel'
          ? requireStatus(event.status, ['cancel_requested'], 'Подтвердить можно только запрошенную отмену')
          : null;
        if (invalid) return invalid;
        if (FINAL_STATUSES.has(event.status) && event.status !== 'cancel_requested') {
          return NextResponse.json({ error: 'Нельзя отменить финализированное мероприятие' }, { status: 400 });
        }
        newStatus = 'cancelled';
        decision = 'cancelled';
        if (comment) updateData.cancelReason = comment;
        notificationMsg = `Мероприятие "${event.title}" отменено`;
        notificationType = 'warning';
        break;
      }

      default:
        return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
    }

    const oldStatus = event.status;
    updateData.status = newStatus;

    const updatedEvent = await db.$transaction(async (tx) => {
      const updated = await tx.event.update({
        where: { id },
        data: updateData,
      });

      await tx.eventApproval.create({
        data: {
          eventId: id,
          version: event.currentVersion,
          stage,
          decision,
          comment: comment || null,
          decidedBy: authUser.name,
          role: authUser.role,
          department: authUser.department,
        },
      });

      if (oldStatus !== newStatus) {
        await tx.changeLog.create({
          data: {
            eventId: id,
            field: 'status',
            oldValue: oldStatus,
            newValue: newStatus,
            changedBy: authUser.name,
            role: authUser.role,
            department: authUser.department,
            stage,
            version: event.currentVersion,
            comment: comment || null,
          },
        });
      }

      const versionEvent = await tx.event.findUnique({
        where: { id },
        include: EVENT_VERSION_SNAPSHOT_INCLUDE as any,
      });
      if (versionEvent) {
        await tx.eventVersion.upsert({
          where: {
            eventId_version: {
              eventId: id,
              version: event.currentVersion,
            },
          },
          update: {
            status: versionEvent.status,
            reason: notificationMsg || decision,
            source: 'workflow',
            snapshot: buildEventVersionSnapshot(versionEvent as unknown as Record<string, unknown>),
            createdBy: authUser.name,
            role: authUser.role,
            department: authUser.department,
          },
          create: {
            eventId: id,
            version: event.currentVersion,
            status: versionEvent.status,
            reason: notificationMsg || decision,
            source: 'workflow',
            snapshot: buildEventVersionSnapshot(versionEvent as unknown as Record<string, unknown>),
            createdBy: authUser.name,
            role: authUser.role,
            department: authUser.department,
          },
        });
      }

      if (createUinTask) {
        await tx.task.create({
          data: {
            eventId: id,
            category: 'coordination',
            title: 'Присвоить УИН мероприятию',
            description: 'Бюджет согласован. Необходимо присвоить УИН перед передачей карточки в АГД.',
            assignee: changedBy,
            priority: 'high',
          },
        });
      }

      const targetDepartments = notificationDepartmentsFor(newStatus);
      if (targetDepartments.length > 0) {
        await tx.notification.createMany({
          data: targetDepartments.map(dept => ({
            eventId: id,
            department: dept,
            message: notificationMsg + (comment && !notificationMsg.includes(comment) ? `. Комментарий: ${comment}` : ''),
            type: notificationType,
          })),
        });
      }

      return updated;
    });

    return NextResponse.json({
      ...updatedEvent,
      calendarConflicts,
      warning: calendarConflicts.length > 0
        ? `Найдены пересечения дат с ${calendarConflicts.length} календарными мероприятиями`
        : undefined,
    });
  } catch (error: any) {
    console.error('Error in workflow:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
