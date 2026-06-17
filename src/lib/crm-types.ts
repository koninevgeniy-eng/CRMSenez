export type Department = 'dashboard' | 'methodology' | 'coordination' | 'agd' | 'organization' | 'analytics';

// Extended department type including admin and personal cabinet
export type AppDepartment = Department | 'admin' | 'cabinet';
export type PersonalView = 'overview' | 'my-tasks' | 'team' | 'workload';

export const DEPARTMENTS: { id: Department; name: string; shortName: string; icon: string }[] = [
  { id: 'dashboard', name: 'Обзорная панель', shortName: 'Обзор', icon: 'LayoutDashboard' },
  { id: 'methodology', name: 'Департамент методологии', shortName: 'Методология', icon: 'BookOpen' },
  { id: 'coordination', name: 'Департамент координации', shortName: 'Координация', icon: 'Shield' },
  { id: 'agd', name: 'Аппарат генерального директора', shortName: 'АГД', icon: 'Crown' },
  { id: 'organization', name: 'Департамент организации', shortName: 'Организация', icon: 'ClipboardList' },
  { id: 'analytics', name: 'Департамент аналитики', shortName: 'Аналитика', icon: 'BarChart3' },
];

export type UserRole = 'admin' | 'manager' | 'employee';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Администратор',
  manager: 'Руководитель',
  employee: 'Сотрудник',
};

export const USER_ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-red-50 text-red-700 border-red-300',
  manager: 'bg-amber-50 text-amber-700 border-amber-300',
  employee: 'bg-sky-50 text-sky-700 border-sky-300',
};

export type EventStatus = 'draft' | 'pending_approval' | 'budget_approved' | 'approved' | 'uin_assigned' | 'in_progress' | 'pending_actual_budget' | 'pending_actual_approval' | 'actual_budget_approved' | 'completed' | 'rejected' | 'cancelled';

export const STATUS_LABELS: Record<EventStatus, string> = {
  draft: 'Черновик',
  pending_approval: 'На согласовании',
  budget_approved: 'Бюджет согласован',
  approved: 'Согласовано',
  uin_assigned: 'УИН присвоен',
  in_progress: 'В процессе',
  pending_actual_budget: 'Ожидает факт. бюджет',
  pending_actual_approval: 'Факт. бюджет на согл.',
  actual_budget_approved: 'Факт. бюджет согл.',
  completed: 'Завершено',
  rejected: 'Отклонено',
  cancelled: 'Отменено',
};

export const STATUS_COLORS: Record<EventStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
  pending_approval: 'bg-amber-50 text-amber-700 border-amber-300',
  budget_approved: 'bg-sky-50 text-sky-700 border-sky-300',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  uin_assigned: 'bg-teal-50 text-teal-700 border-teal-300',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-300',
  pending_actual_budget: 'bg-orange-50 text-orange-700 border-orange-300',
  pending_actual_approval: 'bg-purple-50 text-purple-700 border-purple-300',
  actual_budget_approved: 'bg-indigo-50 text-indigo-700 border-indigo-300',
  completed: 'bg-green-50 text-green-700 border-green-300',
  rejected: 'bg-red-50 text-red-700 border-red-300',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-300',
};

export const BUDGET_CATEGORIES = [
  'Техническое оснащение',
  'Питание',
  'PR и реклама',
  'Трансфер',
  'Проживание',
  'Застройка',
  'Сувенирная продукция',
  'Спикеры',
  'Творческая составляющая',
  'Прочее',
];

export const TASK_CATEGORIES = [
  { value: 'technical', label: 'Техническое оснащение' },
  { value: 'catering', label: 'Питание' },
  { value: 'pr', label: 'PR и реклама' },
  { value: 'transfer', label: 'Трансфер' },
  { value: 'accommodation', label: 'Заселение' },
  { value: 'creative', label: 'Творческая программа' },
  { value: 'setup', label: 'Застройка' },
  { value: 'souvenirs', label: 'Сувенирная продукция' },
];

export const MEAL_TYPES = [
  'Шведская линия',
  'Фуршет классический',
  'Кофе-брейк',
  'Банкет',
  'Фуршет',
];

export const PROGRAM_TYPES = [
  'Модульная',
  'Форум',
  'Семинар',
  'Мероприятие',
  'Постсопровождение',
];

export const PROGRAM_CLASSES = [
  { value: 'A', label: 'Класс A' },
  { value: 'B', label: 'Класс B' },
  { value: 'C', label: 'Класс C' },
];

export const EVENT_TAGS = [
  'Конференция', 'Семинар', 'Форум', 'Обучение',
  'Консультация', 'Стажировка', 'Постсопровождение', 'Встреча', 'Другое',
];

export type SpeakerCostApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Speaker {
  id?: string;
  fullName: string;
  topic?: string;
  cost?: number;
  plannedCost?: number;
  actualCost?: number;
  costApprovalStatus?: SpeakerCostApprovalStatus;
  costApprovalComment?: string;
  description?: string;
  photoUrl?: string;
}

export interface BudgetItem {
  id?: string;
  category: string;
  description: string;
  plannedAmount: number;
  actualAmount?: number;
  originalAmount?: number;      // Исходная плановая сумма (до корректировки)
  correctedAmount?: number;     // Скорректированная сумма (Координация)
  correctedBy?: string;         // Кто скорректировал
  correctionComment?: string;   // Причина корректировки
  status?: string;
}

export interface Task {
  id?: string;
  category: string;
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: string;
  completed: boolean;
  checklist?: string;
  priority?: string;
}

export interface TaskAssignment {
  id?: string;
  taskId: string;
  userId: string;
  assignedBy?: string;
}

export interface Contact {
  id?: string;
  role: string;
  fullName: string;
  phone?: string;
  email?: string;
  type: string;
}

export interface RoomBooking {
  id?: string;
  roomName: string;
  dateFrom?: string;
  dateTo?: string;
  timeFrom?: string;
  timeTo?: string;
}

export interface Meal {
  id?: string;
  date?: string;
  time?: string;
  location?: string;
  mealType?: string;
  level?: string;
  headcount?: number;
  notes?: string;
}

export interface Transfer {
  id?: string;
  date?: string;
  time?: string;
  from?: string;
  to?: string;
  vehicleType?: string;
  headcount?: number;
  notes?: string;
}

export interface Accommodation {
  id?: string;
  roomType?: string;
  count?: number;
  checkIn?: string;
  checkOut?: string;
  notes?: string;
}

export interface Notification {
  id: string;
  eventId: string;
  department: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  event?: { id: string; title: string; status: string };
}

export interface ChangeLog {
  id: string;
  eventId: string;
  field: string;
  oldValue?: string;
  newValue?: string;
  changedBy?: string;
  createdAt: string;
}

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue';

export const PAYMENT_STATUSES: { value: PaymentStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Ожидает оплаты', color: 'bg-amber-50 text-amber-700 border-amber-300' },
  { value: 'partial', label: 'Частично оплачен', color: 'bg-sky-50 text-sky-700 border-sky-300' },
  { value: 'paid', label: 'Оплачен', color: 'bg-green-50 text-green-700 border-green-300' },
  { value: 'overdue', label: 'Просрочен', color: 'bg-red-50 text-red-700 border-red-300' },
];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Ожидает оплаты',
  partial: 'Частично оплачен',
  paid: 'Оплачен',
  overdue: 'Просрочен',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-300',
  partial: 'bg-sky-50 text-sky-700 border-sky-300',
  paid: 'bg-green-50 text-green-700 border-green-300',
  overdue: 'bg-red-50 text-red-700 border-red-300',
};

export interface Payment {
  id?: string;
  contractor: string;
  description: string;
  amount: number;
  status?: PaymentStatus;
  dueDate?: string;
  paidDate?: string;
  paidAmount?: number;
  invoiceNumber?: string;
  notes?: string;
}

export interface EventAssignment {
  id?: string;
  eventId: string;
  userId: string;
  role: string; // LEAD, SUPPORT
  responsibilityZone?: string;
  user?: UserData;
}

// Workflow stages for progress indicator
export const WORKFLOW_STAGES: { key: EventStatus; label: string }[] = [
  { key: 'draft', label: 'Черновик' },
  { key: 'pending_approval', label: 'На согласовании' },
  { key: 'uin_assigned', label: 'УИН + Бюджет' },
  { key: 'approved', label: 'Согласовано' },
  { key: 'in_progress', label: 'В процессе' },
  { key: 'pending_actual_budget', label: 'Факт. бюджет' },
  { key: 'pending_actual_approval', label: 'Согл. факта' },
  { key: 'completed', label: 'Завершено' },
];

export interface UserData {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  avatarUrl?: string;
  isActive: boolean;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  assignedTasks?: TaskAssignment[];
  eventAssignments?: EventAssignment[];
}

export interface EventData {
  id: string;
  uin?: string;
  title: string;
  status: EventStatus;
  programDirector?: string;
  coOrganizers?: string;
  startDate?: string;
  endDate?: string;
  participantCount?: number;
  totalParticipants?: number;
  venue?: string;
  campus?: string;
  budget?: number;
  fundingSource?: string;
  program?: string;
  eventPlan?: string;
  hasProgram: boolean;
  hasPlan: boolean;
  targetAudience?: string;
  customerName?: string;
  contractorName?: string;
  // Organization service fields
  number?: number;
  client?: string;
  programClass?: string;
  quarter?: string;
  plannedDates?: string;
  programType?: string;
  coOrganizer?: string;
  finance?: string;
  comments?: string;
  tags?: string;
  isFavorite: boolean;
  // Additional fields
  needProgramHelp: boolean;
  needTeamBuilding: boolean;
  needEntertainment: boolean;
  programHelpDesc?: string;
  teamBuildingDesc?: string;
  entertainmentDesc?: string;
  setupStartDate?: string;
  setupEndDate?: string;
  teardownStartDate?: string;
  teardownEndDate?: string;
  setupDescription?: string;
  vipGuests?: string;
  calendarAdded: boolean;
  npsScore?: number;
  actualCost?: number;
  actualBudgetApproved?: boolean;
  actualBudgetApprovedBy?: string;
  actualBudgetApprovedAt?: string;
  analyticalReport?: string;
  budgetApproved: boolean;
  budgetApprovedBy?: string;
  budgetApprovedAt?: string;
  coordinatorComment?: string;
  createdAt: string;
  updatedAt: string;
  speakers: Speaker[];
  budgetItems: BudgetItem[];
  tasks: Task[];
  contacts: Contact[];
  rooms: RoomBooking[];
  meals: Meal[];
  transfers: Transfer[];
  accommodations: Accommodation[];
  notifications: Notification[];
  changeLogs: ChangeLog[];
  payments: Payment[];
  assignments: EventAssignment[];
}
