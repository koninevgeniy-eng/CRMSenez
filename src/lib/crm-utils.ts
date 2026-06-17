import { EventStatus, STATUS_LABELS, STATUS_COLORS } from './crm-types';

export function getStatusLabel(status: EventStatus): string {
  return STATUS_LABELS[status] || status;
}

export function getStatusColor(status: EventStatus): string {
  return STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
}

export function formatDate(date?: string | null): string {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function formatCurrency(amount?: number | null): string {
  if (amount === null || amount === undefined) return '—';
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(amount);
}

export function formatNumber(num?: number | null): string {
  if (num === null || num === undefined) return '—';
  return new Intl.NumberFormat('ru-RU').format(num);
}

export function getDaysUntil(date?: string | null): number {
  if (!date) return 0;
  const now = new Date();
  const target = new Date(date);
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Методология может отправить на согласование из черновика или после отклонения */
export function canSubmitForApproval(status: EventStatus): boolean {
  return status === 'draft' || status === 'rejected';
}

/** Координация может согласовать бюджет (+ УИН) из статуса "на согласовании" */
export function canApproveBudget(status: EventStatus): boolean {
  return status === 'pending_approval';
}

/** Координация может присвоить УИН после согласования бюджета */
export function canAssignUin(status: EventStatus): boolean {
  return status === 'budget_approved';
}

/** АГД может добавить в календарь после присвоения УИН */
export function canAddToCalendar(status: EventStatus): boolean {
  return status === 'uin_assigned';
}

/** Организация может начать работу после одобрения АГД */
export function canStartEvent(status: EventStatus): boolean {
  return status === 'approved';
}

/** Организатор может отметить мероприятие выполненным (→ ожидает факт. бюджет) */
export function canCompleteEvent(status: EventStatus): boolean {
  return status === 'in_progress';
}

/** Методология может внести фактический бюджет и отправить на согласование */
export function canSubmitActualBudget(status: EventStatus): boolean {
  return status === 'pending_actual_budget';
}

/** Координация может согласовать фактический бюджет */
export function canApproveActualBudget(status: EventStatus): boolean {
  return status === 'pending_actual_approval';
}

/** Координация может отклонить фактический бюджет */
export function canRejectActualBudget(status: EventStatus): boolean {
  return status === 'pending_actual_approval';
}

/** Методология может финализировать мероприятие после согласования факт. бюджета */
export function canFinalizeEvent(status: EventStatus): boolean {
  return status === 'actual_budget_approved';
}

/** Отклонить мероприятие (координация) — на этапе согласования плана или факта */
export function canReject(status: EventStatus): boolean {
  return status === 'pending_approval' || status === 'pending_actual_approval';
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
