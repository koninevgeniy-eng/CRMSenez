import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const now = new Date();
    const parsedYear = Number(searchParams.get('year') || now.getFullYear());
    const year = Number.isFinite(parsedYear) ? parsedYear : now.getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
    const periodEnd = year === now.getFullYear() ? now : yearEnd;

    const events = await db.event.findMany({
      include: {
        speakers: true,
        budgetItems: true,
        tasks: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Basic stats
    const totalEvents = events.length;
    const completedEvents = events.filter(e => ['archived', 'completed'].includes(e.status)).length;
    const inProgressEvents = events.filter(e => e.status === 'in_progress').length;
    const pendingEvents = events.filter(e => [
      'draft',
      'methodology_review',
      'revision_requested',
      'coordination_budget_review',
      'uin_assignment',
      'agd_date_review',
      'calendar_approved',
      'organization_assignment',
      'event_finished',
      'methodology_actual_budget_review',
      'coordination_actual_budget_review',
      'cancel_requested',
      'pending_approval',
      'budget_approved',
      'uin_assigned',
      'pending_actual_budget',
      'pending_actual_approval',
      'rejected',
    ].includes(e.status)).length;

    // Budget analysis
    const totalBudget = events.reduce((sum, e) => sum + (e.budget || 0), 0);
    const totalActualCost = events.reduce((sum, e) => sum + (e.actualCost || 0), 0);
    const budgetByCategory: Record<string, { planned: number; actual: number }> = {};
    events.forEach(e => {
      e.budgetItems.forEach(bi => {
        if (!budgetByCategory[bi.category]) {
          budgetByCategory[bi.category] = { planned: 0, actual: 0 };
        }
        budgetByCategory[bi.category].planned += bi.plannedAmount;
        budgetByCategory[bi.category].actual += bi.actualAmount || 0;
      });
    });

    // Year-to-date participant and spend analytics
    const getParticipants = (event: any) => Math.max(0, event.participantCount || event.totalParticipants || 0);
    const getActualSpend = (event: any) => {
      const budgetItemsActual = event.budgetItems.reduce((sum: number, item: any) => sum + (item.actualAmount || 0), 0);
      return event.actualCost || budgetItemsActual;
    };
    const eventsInSelectedYear = events.filter(e => {
      if (!e.startDate) return false;
      const startDate = new Date(e.startDate);
      return startDate >= yearStart && startDate <= yearEnd;
    });
    const ytdEvents = eventsInSelectedYear.filter(e => {
      if (!e.startDate) return false;
      return new Date(e.startDate) <= periodEnd;
    });
    const remainingYearEvents = eventsInSelectedYear.filter(e => {
      if (!e.startDate) return false;
      return new Date(e.startDate) > periodEnd;
    });
    const ytdParticipants = ytdEvents.reduce((sum, e) => sum + getParticipants(e), 0);
    const remainingYearParticipants = remainingYearEvents.reduce((sum, e) => sum + getParticipants(e), 0);
    const forecastYearParticipants = ytdParticipants + remainingYearParticipants;
    const ytdActualSpend = ytdEvents.reduce((sum, e) => sum + getActualSpend(e), 0);
    const averageSpendPerParticipant = ytdParticipants > 0 ? ytdActualSpend / ytdParticipants : 0;

    // Speaker analysis
    const allSpeakers = events.flatMap(e => e.speakers);
    const totalSpeakerCost = allSpeakers.reduce((sum, s) => sum + (s.cost || 0), 0);
    const avgSpeakerCost = allSpeakers.length > 0 ? totalSpeakerCost / allSpeakers.length : 0;
    const speakerCosts = allSpeakers.map(s => ({ name: s.fullName, cost: s.cost || 0, event: events.find(e => e.speakers.some(sp => sp.id === s.id))?.title }));

    // NPS analysis
    const npsScores = events.filter(e => e.npsScore !== null).map(e => e.npsScore!);
    const avgNps = npsScores.length > 0 ? npsScores.reduce((a, b) => a + b, 0) / npsScores.length : 0;

    // Employee workload (tasks per assignee)
    const allTasks = events.flatMap(e => e.tasks);
    const workloadByAssignee: Record<string, { total: number; completed: number }> = {};
    allTasks.forEach(t => {
      if (t.assignee) {
        if (!workloadByAssignee[t.assignee]) {
          workloadByAssignee[t.assignee] = { total: 0, completed: 0 };
        }
        workloadByAssignee[t.assignee].total++;
        if (t.completed) workloadByAssignee[t.assignee].completed++;
      }
    });

    // Events by status
    const eventsByStatus: Record<string, number> = {};
    events.forEach(e => {
      eventsByStatus[e.status] = (eventsByStatus[e.status] || 0) + 1;
    });

    // Events by month
    const eventsByMonth: Record<string, number> = {};
    events.forEach(e => {
      if (e.startDate) {
        const month = new Date(e.startDate).toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
        eventsByMonth[month] = (eventsByMonth[month] || 0) + 1;
      }
    });

    // Budget by funding source
    const budgetByFunding: Record<string, number> = {};
    events.forEach(e => {
      if (e.fundingSource) {
        budgetByFunding[e.fundingSource] = (budgetByFunding[e.fundingSource] || 0) + (e.budget || 0);
      }
    });

    // Normalized dictionary-driven breakdowns
    const eventsByProgramType: Record<string, { count: number; participants: number; budget: number }> = {};
    const eventsByVenue: Record<string, { count: number; participants: number }> = {};
    const eventsByCampus: Record<string, { count: number; participants: number }> = {};
    events.forEach(e => {
      const programType = e.programType || 'Не указан';
      const venue = e.venue || 'Не указана';
      const campus = e.campus || 'Не указан';
      if (!eventsByProgramType[programType]) eventsByProgramType[programType] = { count: 0, participants: 0, budget: 0 };
      if (!eventsByVenue[venue]) eventsByVenue[venue] = { count: 0, participants: 0 };
      if (!eventsByCampus[campus]) eventsByCampus[campus] = { count: 0, participants: 0 };
      eventsByProgramType[programType].count++;
      eventsByProgramType[programType].participants += getParticipants(e);
      eventsByProgramType[programType].budget += e.budget || 0;
      eventsByVenue[venue].count++;
      eventsByVenue[venue].participants += getParticipants(e);
      eventsByCampus[campus].count++;
      eventsByCampus[campus].participants += getParticipants(e);
    });

    // Payment analytics
    const allPayments = events.flatMap(e => e.payments);
    const totalPendingPayments = allPayments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);
    const totalPartialPayments = allPayments
      .filter(p => p.status === 'partial')
      .reduce((sum, p) => sum + (p.amount - (p.paidAmount || 0)), 0);
    const totalPaidPayments = allPayments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + (p.paidAmount || p.amount), 0);
    const overdueCount = allPayments.filter(p => p.status === 'overdue').length;
    const totalOverdueAmount = allPayments
      .filter(p => p.status === 'overdue')
      .reduce((sum, p) => sum + p.amount, 0);
    const paymentsByStatus: Record<string, { count: number; totalAmount: number; paidAmount: number }> = {};
    allPayments.forEach(p => {
      if (!paymentsByStatus[p.status]) {
        paymentsByStatus[p.status] = { count: 0, totalAmount: 0, paidAmount: 0 };
      }
      paymentsByStatus[p.status].count++;
      paymentsByStatus[p.status].totalAmount += p.amount;
      paymentsByStatus[p.status].paidAmount += p.paidAmount || 0;
    });
    // Payments by contractor
    const paymentsByContractor: Record<string, { totalAmount: number; paidAmount: number; count: number }> = {};
    allPayments.forEach(p => {
      if (!paymentsByContractor[p.contractor]) {
        paymentsByContractor[p.contractor] = { totalAmount: 0, paidAmount: 0, count: 0 };
      }
      paymentsByContractor[p.contractor].totalAmount += p.amount;
      paymentsByContractor[p.contractor].paidAmount += p.paidAmount || 0;
      paymentsByContractor[p.contractor].count++;
    });

    return NextResponse.json({
      totalEvents,
      completedEvents,
      inProgressEvents,
      pendingEvents,
      totalBudget,
      totalActualCost,
      budgetByCategory,
      totalSpeakerCost,
      avgSpeakerCost,
      speakerCosts,
      avgNps,
      npsScores,
      workloadByAssignee,
      eventsByStatus,
      eventsByMonth,
      budgetByFunding,
      participantAnalytics: {
        year,
        periodStart: yearStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        yearEnd: yearEnd.toISOString(),
        ytdParticipants,
        remainingYearParticipants,
        forecastYearParticipants,
        ytdActualSpend,
        averageSpendPerParticipant,
        ytdEventsCount: ytdEvents.length,
        yearEventsCount: eventsInSelectedYear.length,
      },
      eventsByProgramType,
      eventsByVenue,
      eventsByCampus,
      // Payment analytics
      paymentAnalytics: {
        totalPendingPayments,
        totalPartialPayments,
        totalPaidPayments,
        overdueCount,
        totalOverdueAmount,
        paymentsByStatus,
        paymentsByContractor,
        totalPaymentsCount: allPayments.length,
        totalPaymentsAmount: allPayments.reduce((sum, p) => sum + p.amount, 0),
      },
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}
