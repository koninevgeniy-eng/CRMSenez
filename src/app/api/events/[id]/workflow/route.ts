import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';
import { validateCsrf, csrfErrorResponse } from '@/lib/csrf';

/**
 * Workflow CRM Сенеж — полная цепочка согласования:
 *
 * 1. Методология создает мероприятие → draft
 * 2. Методология отправляет на согласование бюджета → pending_approval
 * 3. Координация согласовывает бюджет + присваивает УИН → uin_assigned
 * 4. АГД согласовывает и ставит в календарь → approved
 * 5. Организация назначает организатора и берёт в работу → in_progress
 * 6. Организатор отмечает, что мероприятие проведено → pending_actual_budget
 * 7. Методология вносит фактический бюджет → pending_actual_approval
 * 8. Координация согласовывает фактический бюджет → actual_budget_approved
 * 9. Методология завершает мероприятие → completed
 * 10. Все финальные данные → Аналитика
 *
 * Отклонение:
 * - На этапе pending_approval → rejected (возврат в draft)
 * - На этапе pending_actual_approval → pending_actual_budget (возврат Методологии)
 *
 * Обязательные поля для переходов:
 * - submit_for_approval: title, startDate, program OR plan
 * - approve_budget: budget > 0 or coordinator comment
 * - start: venue, participantCount
 * - submit_actual_budget: actualCost > 0
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF CHECK
    if (!validateCsrf(request)) {
      return csrfErrorResponse();
    }

    // AUTH CHECK: Require authenticated user for workflow actions
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Необходима авторизация' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action, comment, changedBy, uin } = body;

    // RBAC: Check role/department permissions per action
    const isAdmin = authUser.role === 'admin';
    const userDept = authUser.department;
    const isManager = authUser.role === 'manager';

    const ACTION_PERMISSIONS: Record<string, { departments: string[]; allowManager?: boolean }> = {
      submit_for_approval: { departments: ['methodology'] },
      approve_budget: { departments: ['coordination'] },
      reject: { departments: ['coordination'] },
      assign_uin: { departments: ['coordination'] },
      add_to_calendar: { departments: ['agd'] },
      start: { departments: ['organization'] },
      complete: { departments: ['organization'] },
      submit_actual_budget: { departments: ['methodology'] },
      approve_actual_budget: { departments: ['coordination'] },
      reject_actual_budget: { departments: ['coordination'] },
      finalize_event: { departments: ['methodology'] },
      cancel: { departments: [], allowManager: true },
    };

    const perm = ACTION_PERMISSIONS[action];
    if (perm) {
      const allowed = isAdmin
        || (isManager && (
          perm.allowManager
          || (userDept !== null && perm.departments.includes(userDept))
        ));
      if (!allowed) {
        return NextResponse.json(
          { error: 'Недостаточно прав для выполнения этого действия' },
          { status: 403 }
        );
      }
    }

    const event = await db.event.findUnique({
      where: { id },
      include: { budgetItems: true },
    });
    if (!event) {
      return NextResponse.json({ error: 'Мероприятие не найдено' }, { status: 404 });
    }

    let newStatus = event.status;
    let notificationMsg = '';
    let notificationType = 'info';
    let targetDepartments: string[] = [];

    switch (action) {
      case 'submit_for_approval': {
        // Методология → Координация: отправить на согласование
        const missingFields: string[] = [];
        if (!event.title || event.title.trim().length === 0) {
          missingFields.push('Название мероприятия');
        }
        if (!event.startDate) {
          missingFields.push('Дата начала');
        }
        if (!event.program && !event.eventPlan) {
          missingFields.push('Программа или план мероприятия');
        }
        if (missingFields.length > 0) {
          return NextResponse.json(
            { error: `Для отправки на согласование необходимо заполнить: ${missingFields.join(', ')}` },
            { status: 400 }
          );
        }
        if (event.status !== 'draft' && event.status !== 'rejected') {
          return NextResponse.json(
            { error: 'Отправить на согласование можно только из черновика или после отклонения' },
            { status: 400 }
          );
        }
        newStatus = 'pending_approval';
        notificationMsg = `Мероприятие "${event.title}" направлено на согласование в Департамент координации`;
        notificationType = 'approval';
        targetDepartments = ['Координация', 'АГД', 'Организация', 'Аналитика'];
        break;
      }

      case 'approve_budget': {
        // Координация: согласовать бюджет + УИН
        const totalPlanned = event.budgetItems.reduce((s, b) => s + b.plannedAmount, 0);
        if ((!event.budget || event.budget <= 0) && totalPlanned <= 0 && !comment) {
          return NextResponse.json(
            { error: 'Для согласования бюджета необходимо указать бюджет > 0 или добавить комментарий координатора' },
            { status: 400 }
          );
        }
        if (event.status !== 'pending_approval') {
          return NextResponse.json(
            { error: 'Бюджет можно согласовать только для мероприятий на согласовании' },
            { status: 400 }
          );
        }
        // If UIN provided, go directly to uin_assigned; otherwise budget_approved
        if (uin && uin.trim().length > 0) {
          newStatus = 'uin_assigned';
          notificationMsg = `Бюджет и УИН мероприятия "${event.title}" согласованы Департаментом координации — передано в АГД`;
        } else {
          newStatus = 'budget_approved';
          notificationMsg = `Бюджет мероприятия "${event.title}" согласован Департаментом координации`;
        }
        notificationType = 'approval';
        targetDepartments = ['Методология', 'АГД', 'Организация', 'Аналитика'];
        break;
      }

      case 'assign_uin': {
        // Координация: присвоить УИН (после согласования бюджета, если не был указан ранее)
        if (event.status !== 'budget_approved') {
          return NextResponse.json(
            { error: 'УИН можно присвоить только после согласования бюджета' },
            { status: 400 }
          );
        }
        if (!uin && !event.uin) {
          return NextResponse.json(
            { error: 'УИН обязателен для этого действия' },
            { status: 400 }
          );
        }
        newStatus = 'uin_assigned';
        notificationMsg = `УИН присвоен мероприятию "${event.title}" — передано в АГД для добавления в календарь`;
        notificationType = 'info';
        targetDepartments = ['АГД', 'Методология', 'Организация', 'Аналитика', 'Координация'];
        break;
      }

      case 'add_to_calendar': {
        // АГД: добавить в календарь → статус approved (готово к работе)
        if (event.status !== 'uin_assigned' && event.status !== 'approved') {
          return NextResponse.json(
            { error: 'Добавить в календарь можно после присвоения УИН' },
            { status: 400 }
          );
        }
        newStatus = 'approved';
        notificationMsg = `Мероприятие "${event.title}" добавлено в календарь АГД — передано в Департамент организации для исполнения`;
        notificationType = 'info';
        targetDepartments = ['Организация', 'Методология', 'Координация', 'Аналитика'];
        break;
      }

      case 'reject': {
        // Координация: отклонить → rejected (возврат в draft)
        if (event.status !== 'pending_approval') {
          return NextResponse.json(
            { error: 'Отклонить можно только мероприятие на согласовании' },
            { status: 400 }
          );
        }
        newStatus = 'rejected';
        notificationMsg = `Мероприятие "${event.title}" отклонено Департаментом координации`;
        notificationType = 'warning';
        targetDepartments = ['Методология'];
        break;
      }

      case 'start': {
        // Организация: взять в работу
        const missingFields: string[] = [];
        if (!event.venue) {
          missingFields.push('Площадка проведения');
        }
        if (!event.participantCount || event.participantCount <= 0) {
          missingFields.push('Количество участников');
        }
        if (missingFields.length > 0) {
          return NextResponse.json(
            { error: `Для начала работы необходимо заполнить: ${missingFields.join(', ')}` },
            { status: 400 }
          );
        }
        if (event.status !== 'approved') {
          return NextResponse.json(
            { error: 'Начать работу можно только с согласованным мероприятием' },
            { status: 400 }
          );
        }
        newStatus = 'in_progress';
        notificationMsg = `Мероприятие "${event.title}" взято в работу Департаментом организации`;
        notificationType = 'info';
        targetDepartments = ['Методология', 'Координация', 'АГД', 'Аналитика'];
        break;
      }

      case 'complete': {
        // Организация: отметить что мероприятие проведено → pending_actual_budget
        // (идёт в Методологию для внесения фактического бюджета)
        if (event.status !== 'in_progress') {
          return NextResponse.json(
            { error: 'Завершить можно только мероприятие в работе' },
            { status: 400 }
          );
        }
        newStatus = 'pending_actual_budget';
        notificationMsg = `Мероприятие "${event.title}" проведено — передано в Департамент методологии для внесения фактического бюджета`;
        notificationType = 'info';
        targetDepartments = ['Методология', 'Координация', 'Аналитика'];
        break;
      }

      case 'submit_actual_budget': {
        // Методология: внести фактический бюджет и отправить на согласование
        if (event.status !== 'pending_actual_budget') {
          return NextResponse.json(
            { error: 'Внести фактический бюджет можно только для мероприятия, ожидающего фактический бюджет' },
            { status: 400 }
          );
        }
        // Check that actualCost is provided
        if (!event.actualCost && event.actualCost !== 0) {
          return NextResponse.json(
            { error: 'Для отправки фактического бюджета необходимо указать фактические затраты' },
            { status: 400 }
          );
        }
        newStatus = 'pending_actual_approval';
        notificationMsg = `Фактический бюджет мероприятия "${event.title}" направлен на согласование в Департамент координации`;
        notificationType = 'approval';
        targetDepartments = ['Координация', 'Аналитика'];
        break;
      }

      case 'approve_actual_budget': {
        // Координация: согласовать фактический бюджет
        if (event.status !== 'pending_actual_approval') {
          return NextResponse.json(
            { error: 'Согласовать фактический бюджет можно только для мероприятия на согласовании факта' },
            { status: 400 }
          );
        }
        newStatus = 'actual_budget_approved';
        notificationMsg = `Фактический бюджет мероприятия "${event.title}" согласован Департаментом координации — передано в Методологию для завершения`;
        notificationType = 'approval';
        targetDepartments = ['Методология', 'Аналитика'];
        break;
      }

      case 'reject_actual_budget': {
        // Координация: отклонить фактический бюджет → возврат в pending_actual_budget
        if (event.status !== 'pending_actual_approval') {
          return NextResponse.json(
            { error: 'Отклонить фактический бюджет можно только для мероприятия на согласовании факта' },
            { status: 400 }
          );
        }
        newStatus = 'pending_actual_budget';
        notificationMsg = `Фактический бюджет мероприятия "${event.title}" отклонён Департаментом координации — возвращено в Методологию для корректировки`;
        notificationType = 'warning';
        targetDepartments = ['Методология'];
        break;
      }

      case 'finalize_event': {
        // Методология: финализировать мероприятие → completed
        if (event.status !== 'actual_budget_approved') {
          return NextResponse.json(
            { error: 'Завершить мероприятие можно только после согласования фактического бюджета' },
            { status: 400 }
          );
        }
        newStatus = 'completed';
        notificationMsg = `Мероприятие "${event.title}" завершено — финальные данные переданы в Департамент аналитики`;
        notificationType = 'info';
        targetDepartments = ['Методология', 'Координация', 'АГД', 'Организация', 'Аналитика'];
        break;
      }

      case 'cancel': {
        // Любой: отменить
        if (event.status === 'completed' || event.status === 'cancelled') {
          return NextResponse.json(
            { error: 'Нельзя отменить завершённое или уже отменённое мероприятие' },
            { status: 400 }
          );
        }
        newStatus = 'cancelled';
        notificationMsg = `Мероприятие "${event.title}" отменено`;
        notificationType = 'warning';
        targetDepartments = ['Методология', 'Координация', 'АГД', 'Организация', 'Аналитика'];
        break;
      }

      default:
        return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
    }

    const updateData: any = {
      status: newStatus,
      budgetApproved: action === 'approve_budget' ? true : event.budgetApproved,
      budgetApprovedBy: action === 'approve_budget' ? (changedBy || 'Координация') : event.budgetApprovedBy,
      budgetApprovedAt: action === 'approve_budget' ? new Date() : event.budgetApprovedAt,
      coordinatorComment: comment || event.coordinatorComment,
      calendarAdded: action === 'add_to_calendar' ? true : event.calendarAdded,
    };

    // При присвоении УИН — сохраняем УИН
    if (action === 'assign_uin' && uin) {
      updateData.uin = uin;
    }

    // При approve_budget с УИН — тоже сохраняем
    if (action === 'approve_budget' && uin && uin.trim().length > 0) {
      updateData.uin = uin;
    }

    // При согласовании фактического бюджета — помечаем
    if (action === 'approve_actual_budget') {
      updateData.actualBudgetApproved = true;
      updateData.actualBudgetApprovedBy = changedBy || 'Координация';
      updateData.actualBudgetApprovedAt = new Date();
    }

    const updatedEvent = await db.event.update({
      where: { id },
      data: updateData,
    });

    // Create change log
    await db.changeLog.create({
      data: {
        eventId: id,
        field: 'status',
        oldValue: event.status,
        newValue: newStatus,
        changedBy: authUser.name,
      },
    });

    // Create notifications for relevant departments
    if (targetDepartments.length > 0) {
      await db.notification.createMany({
        data: targetDepartments.map(dept => ({
          eventId: id,
          department: dept,
          message: notificationMsg + (comment ? `. Комментарий: ${comment}` : ''),
          type: notificationType,
        })),
      });
    }

    return NextResponse.json(updatedEvent);
  } catch (error: any) {
    console.error('Error in workflow:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
