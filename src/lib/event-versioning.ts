export const EVENT_VERSION_SNAPSHOT_INCLUDE = {
  speakers: { orderBy: { createdAt: 'asc' } },
  budgetItems: { orderBy: { createdAt: 'asc' } },
  contacts: { orderBy: { createdAt: 'asc' } },
  rooms: { orderBy: { createdAt: 'asc' } },
  meals: { orderBy: { createdAt: 'asc' } },
  transfers: { orderBy: { createdAt: 'asc' } },
  accommodations: { orderBy: { createdAt: 'asc' } },
  payments: { orderBy: { createdAt: 'asc' } },
  assignments: {
    orderBy: { createdAt: 'asc' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          department: true,
        },
      },
    },
  },
} as const;

const VERSION_REAPPROVAL_STATUSES = new Set([
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
  'pending_approval',
  'budget_approved',
  'uin_assigned',
  'approved',
  'pending_actual_budget',
  'pending_actual_approval',
]);

export const VERSIONED_EVENT_FIELDS = new Set([
  'title',
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
]);

type VersionActor = {
  id: string;
  role: string;
  department: string | null;
};

type VersionEvent = {
  ownerId: string | null;
  status: string;
};

function comparable(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (value === null || value === undefined) return '';
  return String(value);
}

export function requiresNewVersion(status: string): boolean {
  return VERSION_REAPPROVAL_STATUSES.has(status);
}

export function canCreateVersionFromEdit(user: VersionActor, event: VersionEvent): boolean {
  return user.role === 'admin'
    || (user.department === 'methodology' && user.role === 'manager')
    || (user.department === 'methodology' && event.ownerId === user.id);
}

export function hasVersionedScalarChange(
  currentEvent: Record<string, unknown>,
  updateData: Record<string, unknown>,
): boolean {
  return Object.entries(updateData).some(([field, nextValue]) => {
    if (!VERSIONED_EVENT_FIELDS.has(field)) return false;
    return comparable(currentEvent[field]) !== comparable(nextValue);
  });
}

export function buildEventVersionSnapshot(event: Record<string, unknown>): string {
  const {
    notifications,
    changeLogs,
    approvals,
    versions,
    ...snapshot
  } = event;

  return JSON.stringify(snapshot);
}
