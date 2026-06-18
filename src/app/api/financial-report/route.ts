import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';

/**
 * GET /api/financial-report
 *
 * Сводный финансовый отчёт CRM Сенеж:
 * - Total budget across all events
 * - Total actual costs
 * - Budget by department
 * - Budget by status
 * - Overdue payments count
 * - Events over budget (where actualCost > budget)
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    // Fetch all events with their budget items and payments
    const events = await db.event.findMany({
      include: {
        budgetItems: true,
        payments: true,
        assignments: {
          include: {
            user: {
              select: { department: true },
            },
          },
        },
      },
    });

    // 1. Total budget and actual costs across all events
    let totalBudget = 0;
    let totalActualCost = 0;

    for (const event of events) {
      totalBudget += event.budget || 0;
      totalActualCost += event.actualCost || 0;

      // Also sum budget items for planned/actual detail
    }

    const totalBudgetItemsPlanned = events.reduce(
      (sum, e) => sum + e.budgetItems.reduce((s, b) => s + b.plannedAmount, 0),
      0,
    );
    const totalBudgetItemsActual = events.reduce(
      (sum, e) => sum + e.budgetItems.reduce((s, b) => s + (b.actualAmount || 0), 0),
      0,
    );

    // 2. Budget by department
    // We determine department from the LEAD assignment on each event
    const departmentBudgets: Record<string, { budget: number; actual: number; count: number }> = {};

    const DEPT_MAP: Record<string, string> = {
      methodology: 'Методология',
      coordination: 'Координация',
      agd: 'АГД',
      organization: 'Организация',
      analytics: 'Аналитика',
    };

    for (const event of events) {
      // Find the primary department from LEAD assignment
      const leadAssignment = event.assignments.find(a => a.role === 'LEAD');
      const deptKey = leadAssignment?.user?.department || 'unassigned';
      const deptName = DEPT_MAP[deptKey] || 'Не назначен';

      if (!departmentBudgets[deptName]) {
        departmentBudgets[deptName] = { budget: 0, actual: 0, count: 0 };
      }
      departmentBudgets[deptName].budget += event.budget || 0;
      departmentBudgets[deptName].actual += event.actualCost || 0;
      departmentBudgets[deptName].count += 1;
    }

    // 3. Budget by status
    const STATUS_MAP: Record<string, string> = {
      draft: 'Черновик',
      methodology_review: 'Согласование методологии',
      revision_requested: 'На доработке',
      coordination_budget_review: 'Согласование бюджета',
      uin_assignment: 'Присвоение УИН',
      agd_date_review: 'Проверка АГД',
      calendar_approved: 'В календаре',
      organization_assignment: 'Назначение организации',
      event_finished: 'Мероприятие проведено',
      methodology_actual_budget_review: 'Факт. бюджет у методологии',
      coordination_actual_budget_review: 'Факт. бюджет у координации',
      actual_budget_approved: 'Факт. бюджет согласован',
      cancel_requested: 'Запрошена отмена',
      archived: 'Архив',
      pending_approval: 'На согласовании',
      budget_approved: 'Бюджет согласован',
      uin_assigned: 'УИН присвоен',
      approved: 'Согласовано',
      in_progress: 'В процессе',
      completed: 'Завершено',
      rejected: 'Отклонено',
      cancelled: 'Отменено',
    };

    const statusBudgets: Record<string, { budget: number; actual: number; count: number }> = {};

    for (const event of events) {
      const statusLabel = STATUS_MAP[event.status] || event.status;
      if (!statusBudgets[statusLabel]) {
        statusBudgets[statusLabel] = { budget: 0, actual: 0, count: 0 };
      }
      statusBudgets[statusLabel].budget += event.budget || 0;
      statusBudgets[statusLabel].actual += event.actualCost || 0;
      statusBudgets[statusLabel].count += 1;
    }

    // 4. Overdue payments count
    const now = new Date();
    const overduePayments = await db.payment.count({
      where: {
        status: { not: 'paid' },
        dueDate: { lt: now },
      },
    });

    // 5. Payment status summary
    const paymentSummary = await db.payment.groupBy({
      by: ['status'],
      _count: { status: true },
      _sum: { amount: true },
    });

    const paymentStatusSummary: Record<string, { count: number; amount: number }> = {};
    for (const ps of paymentSummary) {
      paymentStatusSummary[ps.status] = {
        count: ps._count.status,
        amount: ps._sum.amount || 0,
      };
    }

    // 6. Events over budget (actualCost > budget and both are non-zero)
    const eventsOverBudget = events
      .filter(e => (e.actualCost ?? 0) > 0 && (e.budget ?? 0) > 0 && (e.actualCost ?? 0) > (e.budget ?? 0))
      .map(e => ({
        id: e.id,
        title: e.title,
        budget: e.budget ?? 0,
        actualCost: e.actualCost ?? 0,
        overrun: (e.actualCost ?? 0) - (e.budget ?? 0),
        overrunPercent: (e.budget ?? 0) > 0 ? Math.round((((e.actualCost ?? 0) - (e.budget ?? 0)) / (e.budget ?? 0)) * 100) : 0,
        status: e.status,
      }));

    // 7. Budget items detail - per category
    const categoryBudgets: Record<string, { planned: number; actual: number }> = {};
    for (const event of events) {
      for (const bi of event.budgetItems) {
        if (!categoryBudgets[bi.category]) {
          categoryBudgets[bi.category] = { planned: 0, actual: 0 };
        }
        categoryBudgets[bi.category].planned += bi.plannedAmount;
        categoryBudgets[bi.category].actual += bi.actualAmount || 0;
      }
    }

    return NextResponse.json({
      totalBudget,
      totalActualCost,
      delta: totalBudget - totalActualCost,
      totalBudgetItemsPlanned,
      totalBudgetItemsActual,
      departmentBudgets,
      statusBudgets,
      overduePayments,
      paymentStatusSummary,
      eventsOverBudget,
      categoryBudgets,
      eventsCount: events.length,
    });
  } catch (error: any) {
    console.error('Error generating financial report:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
