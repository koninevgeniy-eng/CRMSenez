export const EVENT_STATUSES = [
  'draft',
  'methodology_review',
  'revision_requested',
  'coordination_budget_review',
  'uin_assignment',
  'agd_date_review',
  'calendar_approved',
  'organization_assignment',
  'in_progress',
  'event_finished',
  'methodology_actual_budget_review',
  'coordination_actual_budget_review',
  'actual_budget_approved',
  'cancel_requested',
  'cancelled',
  'archived',
  // Legacy statuses kept temporarily for existing imported/demo data.
  'pending_approval',
  'budget_approved',
  'uin_assigned',
  'approved',
  'pending_actual_budget',
  'pending_actual_approval',
  'completed',
  'rejected',
] as const;

export const EVENT_SCALAR_FIELDS = [
  'uin',
  'title',
  'status',
  'ownerId',
  'currentVersion',
  'archivedAt',
  'cancelRequestedAt',
  'cancelRequestedBy',
  'cancelReason',
  'programDirector',
  'coOrganizers',
  'startDate',
  'endDate',
  'participantCount',
  'totalParticipants',
  'venue',
  'campus',
  'budget',
  'fundingSource',
  'program',
  'eventPlan',
  'hasProgram',
  'hasPlan',
  'targetAudience',
  'customerName',
  'contractorName',
  'number',
  'client',
  'programClass',
  'quarter',
  'plannedDates',
  'programType',
  'coOrganizer',
  'finance',
  'comments',
  'tags',
  'isFavorite',
  'needProgramHelp',
  'needTeamBuilding',
  'needEntertainment',
  'programHelpDesc',
  'teamBuildingDesc',
  'entertainmentDesc',
  'setupStartDate',
  'setupEndDate',
  'teardownStartDate',
  'teardownEndDate',
  'setupDescription',
  'vipGuests',
  'calendarAdded',
  'npsScore',
  'actualCost',
  'analyticalReport',
  'budgetApproved',
  'budgetApprovedBy',
  'budgetApprovedAt',
  'coordinatorComment',
  'actualBudgetApproved',
  'actualBudgetApprovedBy',
  'actualBudgetApprovedAt',
] as const;

export type EventScalarField = (typeof EVENT_SCALAR_FIELDS)[number];

const DATE_FIELDS = new Set<EventScalarField>([
  'startDate',
  'endDate',
  'setupStartDate',
  'setupEndDate',
  'teardownStartDate',
  'teardownEndDate',
  'archivedAt',
  'cancelRequestedAt',
  'budgetApprovedAt',
  'actualBudgetApprovedAt',
]);

const WORKFLOW_ONLY_FIELDS = new Set<EventScalarField>([
  'status',
  'ownerId',
  'currentVersion',
  'archivedAt',
  'cancelRequestedAt',
  'cancelRequestedBy',
  'cancelReason',
  'uin',
  'calendarAdded',
  'budgetApproved',
  'budgetApprovedBy',
  'budgetApprovedAt',
  'actualBudgetApproved',
  'actualBudgetApprovedBy',
  'actualBudgetApprovedAt',
]);

export const EVENT_FORM_FIELDS = EVENT_SCALAR_FIELDS.filter(
  field => !WORKFLOW_ONLY_FIELDS.has(field)
);

const DEPARTMENT_FIELDS: Record<string, Set<EventScalarField>> = {
  methodology: new Set([
    'title',
    'programDirector',
    'coOrganizers',
    'startDate',
    'endDate',
    'participantCount',
    'totalParticipants',
    'budget',
    'fundingSource',
    'program',
    'eventPlan',
    'hasProgram',
    'hasPlan',
    'targetAudience',
    'customerName',
    'contractorName',
    'number',
    'client',
    'programClass',
    'quarter',
    'plannedDates',
    'programType',
    'coOrganizer',
    'finance',
    'comments',
    'tags',
    'isFavorite',
    'needProgramHelp',
    'needTeamBuilding',
    'needEntertainment',
    'programHelpDesc',
    'teamBuildingDesc',
    'entertainmentDesc',
    'actualCost',
  ]),
  coordination: new Set([
    'coordinatorComment',
    'isFavorite',
  ]),
  agd: new Set([
    'vipGuests',
    'isFavorite',
  ]),
  organization: new Set([
    'venue',
    'campus',
    'participantCount',
    'totalParticipants',
    'setupStartDate',
    'setupEndDate',
    'teardownStartDate',
    'teardownEndDate',
    'setupDescription',
    'comments',
    'isFavorite',
  ]),
  analytics: new Set([
    'npsScore',
    'analyticalReport',
    'isFavorite',
  ]),
};

const DEPARTMENT_RELATIONS: Record<string, Set<string>> = {
  methodology: new Set(['speakers', 'budgetItems']),
  coordination: new Set(['speakers', 'budgetItems']),
  organization: new Set(['contacts', 'rooms', 'meals', 'transfers', 'accommodations', 'payments']),
  agd: new Set(),
  analytics: new Set(),
};

export interface EventPolicyUser {
  role: string;
  department: string | null;
}

export function canCreateEvent(user: EventPolicyUser): boolean {
  return user.role === 'admin'
    || (user.department === 'methodology' && ['manager', 'employee'].includes(user.role));
}

export function canDeleteEvent(user: EventPolicyUser): boolean {
  return user.role === 'admin';
}

export function canUseEventField(user: EventPolicyUser, field: EventScalarField): boolean {
  if (user.role === 'admin') return true;
  if (user.role !== 'manager' || !user.department) return false;
  if (WORKFLOW_ONLY_FIELDS.has(field)) return false;
  return DEPARTMENT_FIELDS[user.department]?.has(field) ?? false;
}

export function canUseEventRelation(user: EventPolicyUser, relation: string): boolean {
  if (user.role === 'admin') return true;
  if (user.role !== 'manager' || !user.department) return false;
  return DEPARTMENT_RELATIONS[user.department]?.has(relation) ?? false;
}

export function pickEventScalarData(
  input: Record<string, unknown>,
  user: EventPolicyUser,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of EVENT_SCALAR_FIELDS) {
    if (input[field] === undefined || !canUseEventField(user, field)) continue;
    const value = input[field];
    result[field] = DATE_FIELDS.has(field)
      ? (value ? new Date(String(value)) : null)
      : value;
  }

  return result;
}

export function pickCreateEventScalarData(input: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const field of EVENT_SCALAR_FIELDS) {
    if (input[field] === undefined || WORKFLOW_ONLY_FIELDS.has(field)) continue;
    const value = input[field];
    result[field] = DATE_FIELDS.has(field)
      ? (value ? new Date(String(value)) : null)
      : value;
  }

  result.status = 'draft';
  return result;
}

export function isEventStatus(value: unknown): value is (typeof EVENT_STATUSES)[number] {
  return typeof value === 'string' && EVENT_STATUSES.includes(value as (typeof EVENT_STATUSES)[number]);
}
