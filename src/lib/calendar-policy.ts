export const CALENDAR_EVENT_STATUSES = [
  'calendar_approved',
  'organization_assignment',
  'in_progress',
  'event_finished',
  'methodology_actual_budget_review',
  'coordination_actual_budget_review',
  'actual_budget_approved',
  'archived',
  // Legacy statuses that already meant "calendar-visible".
  'approved',
  'pending_actual_budget',
  'pending_actual_approval',
  'completed',
] as const;

export function isCalendarEventStatus(status: string): boolean {
  return (CALENDAR_EVENT_STATUSES as readonly string[]).includes(status);
}

export function dateRangesOverlap(
  firstStart: string | Date,
  firstEnd: string | Date,
  secondStart: string | Date,
  secondEnd: string | Date,
): boolean {
  const aStart = new Date(firstStart).getTime();
  const aEnd = new Date(firstEnd).getTime();
  const bStart = new Date(secondStart).getTime();
  const bEnd = new Date(secondEnd).getTime();

  if ([aStart, aEnd, bStart, bEnd].some(Number.isNaN)) return false;
  return aStart <= bEnd && bStart <= aEnd;
}
