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
    const year = searchParams.get('year') || new Date().getFullYear().toString();

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
    const completedEvents = events.filter(e => e.status === 'completed').length;
    const inProgressEvents = events.filter(e => e.status === 'in_progress').length;
    const pendingEvents = events.filter(e => [
      'draft',
      'pending_approval',
      'budget_approved',
      'uin_assigned',
      'pending_actual_budget',
      'pending_actual_approval',
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
