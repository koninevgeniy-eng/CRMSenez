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
        approvals: true,
        versions: true,
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
                department: true,
              },
            },
          },
        },
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
    const overdueTasks = allTasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < now).length;
    const workloadAnalytics = {
      totalTasks: allTasks.length,
      completedTasks: allTasks.filter(t => t.completed).length,
      pendingTasks: allTasks.filter(t => !t.completed).length,
      overdueTasks,
      completionRate: allTasks.length > 0
        ? (allTasks.filter(t => t.completed).length / allTasks.length) * 100
        : 0,
      eventAssignmentsByEmployee: events
        .flatMap(e => e.assignments)
        .reduce((acc: Record<string, { total: number; lead: number; support: number; department?: string | null }>, assignment) => {
          const name = assignment.user?.name || assignment.userId;
          if (!acc[name]) {
            acc[name] = {
              total: 0,
              lead: 0,
              support: 0,
              department: assignment.user?.department,
            };
          }
          acc[name].total++;
          if (assignment.role === 'LEAD') acc[name].lead++;
          else acc[name].support++;
          return acc;
        }, {}),
    };

    // Approval and lifecycle analytics
    const allApprovals = events.flatMap(e => e.approvals.map(a => ({
      ...a,
      eventTitle: e.title,
      eventStatus: e.status,
    })));
    const revisionDecisions = new Set(['revision_requested', 'actual_budget_revision_requested', 'rejected']);
    const approvalDecisions = new Set([
      'approved',
      'budget_approved',
      'uin_assigned',
      'agd_approved',
      'accepted_by_organization',
      'event_finished',
      'actual_budget_methodology_approved',
      'actual_budget_approved',
      'archived',
    ]);
    const approvalsByStage: Record<string, { total: number; approved: number; revision: number; other: number }> = {};
    allApprovals.forEach(approval => {
      if (!approvalsByStage[approval.stage]) {
        approvalsByStage[approval.stage] = { total: 0, approved: 0, revision: 0, other: 0 };
      }
      approvalsByStage[approval.stage].total++;
      if (revisionDecisions.has(approval.decision)) approvalsByStage[approval.stage].revision++;
      else if (approvalDecisions.has(approval.decision)) approvalsByStage[approval.stage].approved++;
      else approvalsByStage[approval.stage].other++;
    });
    const revisionByStage = Object.fromEntries(
      Object.entries(approvalsByStage).map(([stage, stats]) => [stage, stats.revision])
    );
    const approvalQueueStatuses = [
      'methodology_review',
      'coordination_budget_review',
      'uin_assignment',
      'agd_date_review',
      'methodology_actual_budget_review',
      'coordination_actual_budget_review',
      'cancel_requested',
      'pending_approval',
      'pending_actual_approval',
    ];
    const currentApprovalQueue = approvalQueueStatuses.reduce((acc: Record<string, number>, status) => {
      const count = events.filter(e => e.status === status).length;
      if (count > 0) acc[status] = count;
      return acc;
    }, {});
    const revisionRequests = allApprovals.filter(a => revisionDecisions.has(a.decision)).length;
    const processAnalytics = {
      currentApprovalQueue,
      currentApprovalTotal: Object.values(currentApprovalQueue).reduce((sum, value) => sum + value, 0),
      totalApprovalDecisions: allApprovals.length,
      revisionRequests,
      revisionRate: allApprovals.length > 0 ? (revisionRequests / allApprovals.length) * 100 : 0,
      approvalsByStage,
      revisionByStage,
    };

    // Version analytics
    const allVersions = events.flatMap(e => e.versions.map(v => ({
      ...v,
      eventTitle: e.title,
      eventStatus: e.status,
      currentVersion: e.currentVersion,
    })));
    const eventsWithMultipleVersions = events.filter(e => e.currentVersion > 1 || e.versions.length > 1);
    const versionReasonCounts = allVersions.reduce((acc: Record<string, number>, version) => {
      const reason = version.reason || version.source || 'Не указана';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {});
    const versionHotspots = eventsWithMultipleVersions
      .map(e => {
        const sortedVersions = [...e.versions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return {
          eventId: e.id,
          title: e.title,
          status: e.status,
          currentVersion: e.currentVersion,
          versionsCount: e.versions.length,
          lastReason: sortedVersions[0]?.reason || sortedVersions[0]?.source || null,
          updatedAt: e.updatedAt.toISOString(),
        };
      })
      .sort((a, b) => b.currentVersion - a.currentVersion || b.versionsCount - a.versionsCount)
      .slice(0, 10);
    const versionAnalytics = {
      totalVersions: allVersions.length,
      averageVersionsPerEvent: totalEvents > 0 ? allVersions.length / totalEvents : 0,
      eventsWithMultipleVersions: eventsWithMultipleVersions.length,
      versionReasonCounts,
      versionHotspots,
    };

    // Data quality analytics
    const statusesAfterBudget = new Set([
      'uin_assignment',
      'agd_date_review',
      'calendar_approved',
      'organization_assignment',
      'in_progress',
      'event_finished',
      'methodology_actual_budget_review',
      'coordination_actual_budget_review',
      'actual_budget_approved',
      'archived',
      'completed',
      'approved',
      'uin_assigned',
    ]);
    const calendarStatuses = new Set([
      'calendar_approved',
      'organization_assignment',
      'in_progress',
      'event_finished',
      'methodology_actual_budget_review',
      'coordination_actual_budget_review',
      'actual_budget_approved',
      'archived',
      'completed',
      'approved',
    ]);
    const completedLikeStatuses = new Set(['event_finished', 'actual_budget_approved', 'archived', 'completed']);
    const dataQualityIssues: Array<{
      eventId: string;
      title: string;
      status: string;
      issue: string;
      severity: 'critical' | 'warning';
      ownerId: string | null;
      startDate: string | null;
    }> = [];
    const addDataIssue = (event: any, issue: string, severity: 'critical' | 'warning' = 'warning') => {
      dataQualityIssues.push({
        eventId: event.id,
        title: event.title,
        status: event.status,
        issue,
        severity,
        ownerId: event.ownerId || null,
        startDate: event.startDate ? event.startDate.toISOString() : null,
      });
    };
    events.forEach(e => {
      if (statusesAfterBudget.has(e.status) && !e.uin) {
        addDataIssue(e, 'Нет УИН после согласования бюджета', 'critical');
      }
      if (!e.startDate || !e.endDate) {
        addDataIssue(e, 'Не заполнены даты мероприятия', 'critical');
      }
      if (calendarStatuses.has(e.status) && !e.venue?.trim()) {
        addDataIssue(e, 'Не указана площадка для календаря', 'warning');
      }
      const hasProgramDocument = e.hasProgram || Boolean(e.program?.trim());
      const hasPlanDocument = e.hasPlan || Boolean(e.eventPlan?.trim());
      if (!hasProgramDocument && !hasPlanDocument) {
        addDataIssue(e, 'Нет программы или плана мероприятия', 'warning');
      }
      if (completedLikeStatuses.has(e.status) && getActualSpend(e) <= 0) {
        addDataIssue(e, 'Не указан фактический бюджет после проведения', 'critical');
      }
      if (completedLikeStatuses.has(e.status) && (e.npsScore === null || typeof e.npsScore === 'undefined')) {
        addDataIssue(e, 'Не указан NPS после проведения', 'warning');
      }
    });
    const dataQualityIssueCounts = dataQualityIssues.reduce((acc: Record<string, number>, item) => {
      acc[item.issue] = (acc[item.issue] || 0) + 1;
      return acc;
    }, {});
    const dataQualityAnalytics = {
      totalIssues: dataQualityIssues.length,
      criticalIssues: dataQualityIssues.filter(i => i.severity === 'critical').length,
      warningIssues: dataQualityIssues.filter(i => i.severity === 'warning').length,
      issueCounts: dataQualityIssueCounts,
      problemEvents: dataQualityIssues.slice(0, 20),
    };

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
      workloadAnalytics,
      processAnalytics,
      versionAnalytics,
      dataQualityAnalytics,
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
