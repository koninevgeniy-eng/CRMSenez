'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  BookOpen, Shield, Crown, ClipboardList, BarChart3, Bell, Plus,
  Search, Download, Upload, Menu, X, ChevronRight, Calendar,
  MapPin, Users, Clock, Star, FileText, CheckCircle2,
  AlertTriangle, Filter, RefreshCw, Eye, Edit, Trash2, Send,
  ThumbsUp, ThumbsDown, Play, CheckCircle, XCircle, Settings,
  Home, TrendingUp, Building2, UserCheck, Utensils,
  Bus, BedDouble, Hammer, Gift, Lightbulb, MoreHorizontal, ArrowRight,
  LayoutDashboard, Briefcase, Hash, Activity, Copy, FileSpreadsheet,
  AlertCircle, Zap, Target, PieChart as PieChartIcon, Wallet,
  CalendarDays, Timer, ChevronDown, Printer, MessageSquare,
  Columns3, List, CreditCard, Receipt, Banknote,
  GitCompare, StickyNote, Pin, Milestone, LogOut, UserCog, ShieldCheck, Camera,
  Sun, Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup,
  CommandItem, CommandShortcut, CommandSeparator,
} from '@/components/ui/command';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { useTheme } from 'next-themes';
import {
  Department, DEPARTMENTS, EventData, EventStatus, STATUS_LABELS, STATUS_COLORS,
  Speaker, BudgetItem, Task, Contact, RoomBooking, Meal, Transfer, Accommodation,
  BUDGET_CATEGORIES, TASK_CATEGORIES, MEAL_TYPES,
  Payment, PaymentStatus, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS,
  WORKFLOW_STAGES, UserData, EventAssignment, PROGRAM_TYPES, PROGRAM_CLASSES, EVENT_TAGS, USER_ROLE_LABELS, USER_ROLE_COLORS, UserRole,
} from '@/lib/crm-types';
import {
  getStatusLabel, getStatusColor, formatDate, formatCurrency, formatNumber,
  canSubmitForApproval, canApproveBudget, canAssignUin, canAddToCalendar, canStartEvent, canCompleteEvent, canReject,
  canSubmitActualBudget, canApproveActualBudget, canRejectActualBudget, canFinalizeEvent,
} from '@/lib/crm-utils';
import { apiFetch } from '@/lib/api-fetch';
import { exportWorkbook } from '@/lib/excel-client';
import { UserForm } from '@/components/crm/UserForm';
import { EventDetailDialog } from '@/components/crm/EventDetailDialog';
import { CreateEventDialog } from '@/components/crm/CreateEventDialog';

// Dynamic imports for heavy view components (lazy-loaded to reduce initial compilation memory)
const AdminEventEditForm = dynamic(() => import('@/components/crm/AdminEventEditForm').then(m => ({ default: m.AdminEventEditForm })), { ssr: false });
const AnalyticalReportTab = dynamic(() => import('@/components/crm/AnalyticalReportTab').then(m => ({ default: m.AnalyticalReportTab })), { ssr: false });
const SpeakersTab = dynamic(() => import('@/components/crm/SpeakersTab').then(m => ({ default: m.SpeakersTab })), { ssr: false });
const BudgetTab = dynamic(() => import('@/components/crm/BudgetTab').then(m => ({ default: m.BudgetTab })), { ssr: false });
const RoomsTab = dynamic(() => import('@/components/crm/RoomsTab').then(m => ({ default: m.RoomsTab })), { ssr: false });
const MealsTab = dynamic(() => import('@/components/crm/MealsTab').then(m => ({ default: m.MealsTab })), { ssr: false });
const TransfersTab = dynamic(() => import('@/components/crm/TransfersTab').then(m => ({ default: m.TransfersTab })), { ssr: false });
const AccommodationsTab = dynamic(() => import('@/components/crm/AccommodationsTab').then(m => ({ default: m.AccommodationsTab })), { ssr: false });
const TasksTab = dynamic(() => import('@/components/crm/TasksTab').then(m => ({ default: m.TasksTab })), { ssr: false });
const ContactsTab = dynamic(() => import('@/components/crm/ContactsTab').then(m => ({ default: m.ContactsTab })), { ssr: false });
const CommentsTab = dynamic(() => import('@/components/crm/CommentsTab').then(m => ({ default: m.CommentsTab })), { ssr: false });
const PaymentsTab = dynamic(() => import('@/components/crm/PaymentsTab').then(m => ({ default: m.PaymentsTab })), { ssr: false });
const AssignmentsTab = dynamic(() => import('@/components/crm/AssignmentsTab').then(m => ({ default: m.AssignmentsTab })), { ssr: false });
const DashboardView = dynamic(() => import('@/components/crm/DashboardView').then(m => ({ default: m.DashboardView })), { ssr: false });
const MethodologyView = dynamic(() => import('@/components/crm/MethodologyView').then(m => ({ default: m.MethodologyView })), { ssr: false });
const CoordinationView = dynamic(() => import('@/components/crm/CoordinationView').then(m => ({ default: m.CoordinationView })), { ssr: false });
const AGDView = dynamic(() => import('@/components/crm/AGDView').then(m => ({ default: m.AGDView })), { ssr: false });
const OrganizationView = dynamic(() => import('@/components/crm/OrganizationView').then(m => ({ default: m.OrganizationView })), { ssr: false });
const AnalyticsView = dynamic(() => import('@/components/crm/AnalyticsView').then(m => ({ default: m.AnalyticsView })), { ssr: false });
const PersonalCabinetView = dynamic(() => import('@/components/crm/PersonalCabinetView').then(m => ({ default: m.PersonalCabinetView })), { ssr: false });
const AdminCabinetView = dynamic(() => import('@/components/crm/AdminCabinetView').then(m => ({ default: m.AdminCabinetView })), { ssr: false });
const Sidebar = dynamic(() => import('@/components/crm/Sidebar').then(m => ({ default: m.Sidebar })), { ssr: false });

import { AppDepartment, PersonalView } from '@/lib/crm-types';

const CHART_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

export default function CRMPage() {
  const { isAuthenticated, isLoading: authLoading, user, isManager, isAdmin, userDepartment, signOut } = useAuth();
  const canCreateEvents = isAdmin || (isManager && userDepartment === 'methodology');
  const { theme, setTheme } = useTheme();
  const [activeDept, setActiveDept] = useState<AppDepartment>('dashboard');

  // Set default view based on role when auth loads
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      // Only set default if still on initial 'dashboard' value
      setActiveDept(prev => {
        // Admin defaults to dashboard; employees/managers default to their cabinet
        if (prev === 'dashboard' && !isAdmin) return 'cabinet';
        return prev;
      });
    }
  }, [authLoading, isAuthenticated, isAdmin]);
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [allEvents, setAllEvents] = useState<EventData[]>([]);
  const [methodologyViewMode, setMethodologyViewMode] = useState<'list' | 'kanban' | 'timeline'>('list');
  const [mounted, setMounted] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [publicEvents, setPublicEvents] = useState<EventData[]>([]);

  // Personal cabinet state
  const [personalView, setPersonalView] = useState<PersonalView>('overview');
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [deptTasks, setDeptTasks] = useState<any[]>([]);
  const [myEventAssignments, setMyEventAssignments] = useState<any[]>([]);
  const [deptUsers, setDeptUsers] = useState<UserData[]>([]);
  const [showCreateTaskDialog, setShowCreateTaskDialog] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState({ eventId: '', category: 'technical', title: '', description: '', dueDate: '', priority: 'medium', assigneeIds: [] as string[] });

  // Admin cabinet state
  const [adminTab, setAdminTab] = useState<string>('users');
  const [pendingUsers, setPendingUsers] = useState<UserData[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditFilterAction, setAuditFilterAction] = useState<string>('all');
  const [auditFilterEntity, setAuditFilterEntity] = useState<string>('all');
  const [adminEventStatusFilter, setAdminEventStatusFilter] = useState<string>('all');
  const [adminEventSearch, setAdminEventSearch] = useState('');
  const [adminEditingEvent, setAdminEditingEvent] = useState<EventData | null>(null);
  const [showAdminEventDialog, setShowAdminEventDialog] = useState(false);
  const [adminSettings, setAdminSettings] = useState({
    appName: 'CRM Сенеж',
    appDescription: 'Система управления мероприятиями',
    defaultBudget: '0',
    defaultParticipants: '50',
    notificationsEnabled: 'true',
    emailNotifications: 'false',
  });

  // apiFetch is imported from @/lib/api-fetch

  // Hydration-safe: only true after client mount
  useEffect(() => { setMounted(true); setSelectedDate(new Date()); }, []);

  // Debounced search handler
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, []);

  // Global Search keyboard shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchDialog(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch ALL events for global search (unfiltered)
  useEffect(() => {
    if (showSearchDialog) {
      apiFetch('/api/events?lite=true').then(r => r.ok ? r.json() : { data: [] }).then((result: any) => {
        const data = Array.isArray(result) ? result : (result.data || []);
        setAllEvents(data);
      }).catch(() => {});
    }
  }, [showSearchDialog]);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (activeDept === 'coordination') params.set('department', 'coordination');
      if (activeDept === 'organization') params.set('department', 'organization');

      const res = await apiFetch(`/api/events?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // Support both old array format and new paginated format
        if (Array.isArray(data)) {
          setEvents(data);
        } else if (data.data && Array.isArray(data.data)) {
          setEvents(data.data);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
    }, [statusFilter, debouncedSearch, activeDept]);

  // Fetch users for admin
  const fetchUsers = useCallback(async () => {
    try {
      const res = await apiFetch('/api/users');
      if (res.ok) { const data = await res.json(); setUsers(data); }
    } catch {}
  }, []);

  // Fetch pending approval users
  const fetchPendingUsers = useCallback(async () => {
    try {
      const res = await apiFetch('/api/users/approve');
      if (res.ok) { const data = await res.json(); setPendingUsers(data); }
    } catch {}
  }, []);

  // Approve or reject a pending user
  const handleUserApproval = useCallback(async (userId: string, action: 'approve' | 'reject', userName: string) => {
    try {
      const res = await apiFetch('/api/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      if (res.ok) {
        toast({ title: action === 'approve' ? `Пользователь ${userName} одобрен` : `Пользователь ${userName} отклонен` });
        fetchPendingUsers();
        fetchUsers();
      } else {
        const err = await res.json();
        toast({ title: 'Ошибка', description: err.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось обработать запрос', variant: 'destructive' });
    }
  }, [fetchPendingUsers, fetchUsers]);

  // Fetch personal cabinet data
  const fetchPersonalData = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch my tasks (assigned to current user)
      const tasksRes = await apiFetch(`/api/tasks?userId=${user.id}`);
      if (tasksRes.ok) { const data = await tasksRes.json(); setMyTasks(data); }

      // Fetch my event assignments
      const assignRes = await apiFetch(`/api/assignments?userId=${user.id}`);
      if (assignRes.ok) { const data = await assignRes.json(); setMyEventAssignments(data); }

      // If manager, also fetch department data
      if ((isManager || isAdmin) && userDepartment) {
        const deptTasksRes = await apiFetch(`/api/tasks?department=${userDepartment}`);
        if (deptTasksRes.ok) { const data = await deptTasksRes.json(); setDeptTasks(data); }

        const deptUsersRes = await apiFetch(`/api/users?department=${userDepartment}`);
        if (deptUsersRes.ok) { const data = await deptUsersRes.json(); setDeptUsers(data); }
      }
    } catch (err) {
      console.error('Error fetching personal data:', err);
    }
  }, [user, isManager, isAdmin, userDepartment]);

  // Fetch audit logs for admin
  const fetchAuditLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (auditFilterAction !== 'all') params.set('action', auditFilterAction);
      if (auditFilterEntity !== 'all') params.set('entityType', auditFilterEntity);
      params.set('limit', '200');
      const res = await apiFetch(`/api/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
        setAuditTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  }, [auditFilterAction, auditFilterEntity]);

  // Load admin settings from backend API
  useEffect(() => {
    if (mounted && isAuthenticated) {
      apiFetch('/api/settings')
        .then(r => r.ok ? r.json() : null)
        .then((data: any) => {
          if (data?.settings) {
            setAdminSettings(prev => ({ ...prev, ...data.settings }));
          }
        })
        .catch(() => {
          // Fallback to localStorage if backend fails
          try {
            const saved = localStorage.getItem('senez_admin_settings');
            if (saved) {
              setAdminSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
            }
          } catch {}
        });
    }
  }, [mounted, isAuthenticated]);

  // Fetch audit logs when admin tab is audit
  useEffect(() => {
    if (activeDept === 'admin' && adminTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeDept, adminTab, fetchAuditLogs]);

  // Fetch public events for unauthenticated view
  useEffect(() => {
    if (!isAuthenticated) {
      apiFetch('/api/events?lite=true').then(r => r.ok ? r.json() : { data: [] }).then((result: any) => {
        const data = Array.isArray(result) ? result : (result.data || []);
        setPublicEvents(data);
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  const fetchNotifications = useCallback(async () => {
    try {
      const deptMap: Record<string, string> = {
        dashboard: 'Обзор',
        methodology: 'Методология',
        coordination: 'Координация',
        agd: 'АГД',
        organization: 'Организация',
        analytics: 'Аналитика',
        admin: 'Администрирование',
      };
      const res = await apiFetch(`/api/notifications?department=${deptMap[activeDept] || 'Обзор'}&unread=true`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, [activeDept]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await apiFetch('/api/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const hasSeededRef = useRef(false);

  const seedData = useCallback(async () => {
    if (hasSeededRef.current) return;
    hasSeededRef.current = true;
    try {
      const res = await apiFetch('/api/seed', { method: 'POST' });
      if (res.ok) {
        fetchEvents();
      }
    } catch (err) {
      console.error(err);
      hasSeededRef.current = false;
    }
  }, [fetchEvents]);

  useEffect(() => {
    fetchEvents();
    fetchNotifications();
    if (activeDept === 'analytics' || activeDept === 'dashboard') fetchAnalytics();
    if (activeDept === 'cabinet') fetchPersonalData();
    if (activeDept === 'admin') { fetchUsers(); fetchPendingUsers(); }
  }, [fetchEvents, fetchNotifications, fetchAnalytics, fetchPersonalData, fetchUsers, fetchPendingUsers, activeDept]);

  useEffect(() => {
    if (events.length === 0 && !loading) {
      seedData();
    }
  }, [events.length, loading, seedData]);

  const handleWorkflowAction = async (eventId: string, action: string, comment?: string, uin?: string) => {
    // Validate program/plan requirement for submit_for_approval
    if (action === 'submit_for_approval') {
      const event = events.find(e => e.id === eventId);
      if (event && !event.hasProgram && !event.hasPlan) {
        toast({ title: 'Невозможно отправить', description: 'Необходимо добавить программу или план мероприятия', variant: 'destructive' });
        return;
      }
    }
    try {
      const body: any = {
        action,
        comment,
        changedBy: DEPARTMENTS.find(d => d.id === activeDept)?.shortName || 'Система',
      };
      if (uin) body.uin = uin;

      const res = await apiFetch(`/api/events/${eventId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const actionLabels: Record<string, string> = {
          submit_for_approval: 'Отправлено на согласование',
          approve_budget: 'Бюджет согласован',
          assign_uin: 'УИН присвоен — передано в АГД',
          add_to_calendar: 'Добавлено в календарь — передано в Организацию',
          reject: 'Мероприятие отклонено',
          start: 'Мероприятие взято в работу',
          complete: 'Мероприятие проведено — передано в Методологию',
          submit_actual_budget: 'Фактический бюджет отправлен на согласование',
          approve_actual_budget: 'Фактический бюджет согласован',
          reject_actual_budget: 'Фактический бюджет отклонён',
          finalize_event: 'Мероприятие завершено',
          cancel: 'Мероприятие отменено',
        };
        toast({ title: actionLabels[action] || 'Действие выполнено', description: 'Статус обновлен успешно' });
        setShowEventDialog(false);
        setSelectedEvent(null);
        fetchEvents();
        fetchNotifications();
      } else {
        const err = await res.json();
        toast({ title: 'Ошибка', description: err.error, variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Ошибка сети', variant: 'destructive' });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const res = await apiFetch(`/api/events/${eventId}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Мероприятие удалено', description: 'Карточка мероприятия успешно удалена' });
        setSelectedEvent(null);
        setShowEventDialog(false);
        fetchEvents();
      }
    } catch (err) {
      toast({ title: 'Ошибка удаления', variant: 'destructive' });
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      const deptMap: Record<Department, string> = {
        dashboard: 'Обзор',
        methodology: 'Методология',
        coordination: 'Координация',
        agd: 'АГД',
        organization: 'Организация',
        analytics: 'Аналитика',
      };
      await apiFetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true, department: deptMap[activeDept] }),
      });
      setNotifications([]);
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDuplicateEvent = async (event: EventData) => {
    try {
      const res = await apiFetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...event,
          id: undefined,
          uin: '',
          status: 'draft',
          title: event.title + ' (копия)',
          budgetApproved: false,
          budgetApprovedBy: null,
          budgetApprovedAt: null,
          calendarAdded: false,
          npsScore: null,
          actualCost: null,
          notifications: undefined,
          changeLogs: undefined,
          createdAt: undefined,
          updatedAt: undefined,
        }),
      });
      if (res.ok) {
        toast({ title: 'Мероприятие дублировано', description: 'Создана копия карточки как черновик' });
        fetchEvents();
      }
    } catch (err) {
      toast({ title: 'Ошибка дублирования', variant: 'destructive' });
    }
  };

  const handleExportAllExcel = async () => {
    try {
      const data = [
        ['№', 'Наименование', 'Статус', 'Руководитель', 'Дата начала', 'Дата окончания', 'Площадка', 'Бюджет', 'УИН', 'Участников'],
        ...events.map((e, i) => [
          i + 1,
          e.title,
          getStatusLabel(e.status),
          e.programDirector || '',
          e.startDate ? formatDate(e.startDate) : '',
          e.endDate ? formatDate(e.endDate) : '',
          e.venue || '',
          e.budget || '',
          e.uin || '',
          e.participantCount || '',
        ]),
      ];
      await exportWorkbook(
        `CRM_Сенеж_Экспорт_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`,
        [{ name: 'Мероприятия', rows: data }]
      );
      toast({ title: 'Экспорт завершен', description: `Экспортировано ${events.length} мероприятий` });
    } catch (err) {
      toast({ title: 'Ошибка экспорта', variant: 'destructive' });
    }
  };

  const handleExportExcel = async (event: EventData) => {
    try {
      // Заявка sheet
      const заявкаData = [
        ['ЗАЯВКА НА МЕРОПРИЯТИЕ', '', '', '', '', ''],
        ['', '', '', '', '', ''],
        ['Даты мероприятия', '', '', 'дата начала', event.startDate ? formatDate(event.startDate) : '', 'дата окончания', event.endDate ? formatDate(event.endDate) : ''],
        ['Наименование мероприятия', '', '', event.title, '', ''],
        ['Заказчик', '', '', event.customerName || '', '', ''],
        ['Источник финансирования', '', '', event.fundingSource || '', '', ''],
        ['Руководитель программы', '', '', event.programDirector || '', '', ''],
        ['', '', '', '', '', ''],
        ['Количество участников', '', '', event.participantCount?.toString() || '', '', ''],
        ['Общее количество', '', '', event.totalParticipants?.toString() || '', '', ''],
        ['Площадка', '', '', event.venue || '', '', ''],
        ['Кампус', '', '', event.campus || '', '', ''],
        ['Бюджет', '', '', event.budget?.toString() || '', '', ''],
        ['УИН', '', '', event.uin || '', '', ''],
        ['Целевая аудитория', '', '', event.targetAudience || '', '', ''],
        ['', '', '', '', '', ''],
        ['Спикеры:', '', '', '', '', ''],
        ['ФИО', 'Тема', 'Стоимость', '', '', ''],
        ...event.speakers.map(s => [s.fullName, s.topic || '', s.cost?.toString() || '']),
      ];

      // Бюджет sheet
      const бюджетData = [
        ['БЮДЖЕТ МЕРОПРИЯТИЯ', '', '', ''],
        ['Категория', 'Описание', 'План', 'Факт'],
        ...event.budgetItems.map(b => [b.category, b.description, b.plannedAmount.toString(), b.actualAmount?.toString() || '']),
        ['ИТОГО', '', event.budgetItems.reduce((s, b) => s + b.plannedAmount, 0).toString(), event.budgetItems.reduce((s, b) => s + (b.actualAmount || 0), 0).toString()],
      ];

      await exportWorkbook(`${event.title}.xlsx`, [
        { name: 'Заявка', rows: заявкаData },
        { name: 'Бюджет', rows: бюджетData },
      ]);
      toast({ title: 'Экспорт завершен' });
    } catch (err) {
      toast({ title: 'Ошибка экспорта', variant: 'destructive' });
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiFetch('/api/import', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        toast({ title: `Импортировано: ${data.imported} мероприятий` });
        fetchEvents();
      }
    } catch (err) {
      toast({ title: 'Ошибка импорта', variant: 'destructive' });
    }
    e.target.value = '';
  };

  // ======================== GLOBAL SEARCH ========================

  const GlobalSearchDialog = () => (
    <CommandDialog
      open={showSearchDialog}
      onOpenChange={setShowSearchDialog}
      title="Глобальный поиск"
      description="Поиск мероприятий, быстрые действия"
    >
      <CommandInput placeholder="Поиск по названию, УИН, площадке, руководителю..." />
      <CommandList>
        <CommandEmpty>Ничего не найдено</CommandEmpty>
        <CommandGroup heading="Мероприятия">
          {allEvents.map(event => (
            <CommandItem
              key={event.id}
              value={`${event.title} ${event.uin || ''} ${event.venue || ''} ${event.programDirector || ''}`}
              onSelect={() => { setSelectedEvent(event); setShowEventDialog(true); setShowSearchDialog(false); }}
              className="flex items-center gap-3 py-3"
            >
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                event.status === 'draft' ? 'bg-gray-400' :
                event.status === 'pending_approval' ? 'bg-amber-400' :
                event.status === 'budget_approved' ? 'bg-sky-400' :
                event.status === 'approved' || event.status === 'uin_assigned' ? 'bg-[#E4002B]' :
                event.status === 'in_progress' ? 'bg-blue-400' :
                event.status === 'completed' ? 'bg-green-400' :
                event.status === 'rejected' ? 'bg-red-400' : 'bg-gray-300'
              }`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{event.title}</span>
                  {event.uin && <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{event.uin}</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Badge variant="outline" className={`crm-badge text-[10px] py-0 px-1.5 ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge>
                  {event.venue && <span className="truncate">{event.venue}</span>}
                  {event.budget && <span>{formatCurrency(event.budget)}</span>}
                </div>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Быстрые действия">
          {canCreateEvents && <CommandItem value="Создать мероприятие" onSelect={() => { setShowSearchDialog(false); setShowCreateDialog(true); }}>
            <Plus className="h-4 w-4 text-[#E4002B]" /><span>Создать мероприятие</span>
          </CommandItem>}
          <CommandItem value="Перейти в Обзор" onSelect={() => { setShowSearchDialog(false); setActiveDept('dashboard'); }}>
            <LayoutDashboard className="h-4 w-4 text-muted-foreground" /><span>Перейти в Обзор</span>
          </CommandItem>
          <CommandItem value="Перейти в Методология" onSelect={() => { setShowSearchDialog(false); setActiveDept('methodology'); }}>
            <BookOpen className="h-4 w-4 text-muted-foreground" /><span>Перейти в Методологию</span>
          </CommandItem>
          <CommandItem value="Перейти в Координация" onSelect={() => { setShowSearchDialog(false); setActiveDept('coordination'); }}>
            <Shield className="h-4 w-4 text-muted-foreground" /><span>Перейти в Координацию</span>
          </CommandItem>
          <CommandItem value="Перейти в АГД" onSelect={() => { setShowSearchDialog(false); setActiveDept('agd'); }}>
            <Crown className="h-4 w-4 text-muted-foreground" /><span>Перейти в АГД</span>
          </CommandItem>
          <CommandItem value="Перейти в Организация" onSelect={() => { setShowSearchDialog(false); setActiveDept('organization'); }}>
            <ClipboardList className="h-4 w-4 text-muted-foreground" /><span>Перейти в Организацию</span>
          </CommandItem>
          <CommandItem value="Перейти в Аналитика" onSelect={() => { setShowSearchDialog(false); setActiveDept('analytics'); }}>
            <BarChart3 className="h-4 w-4 text-muted-foreground" /><span>Перейти в Аналитику</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );

  // ======================== COMPARISON DIALOG ========================

  const ComparisonDialog = () => {
    const selected = compareIds.map(id => events.find(e => e.id === id)).filter(Boolean) as EventData[];
    if (selected.length < 2) return null;

    const comparisonRows: { label: string; getValue: (e: EventData) => string | number; isNumeric?: boolean }[] = [
      { label: 'Название', getValue: e => e.title },
      { label: 'Статус', getValue: e => getStatusLabel(e.status) },
      { label: 'Бюджет', getValue: e => e.budget || 0, isNumeric: true },
      { label: 'Дата начала', getValue: e => e.startDate ? formatDate(e.startDate) : '—' },
      { label: 'Дата окончания', getValue: e => e.endDate ? formatDate(e.endDate) : '—' },
      { label: 'Участников', getValue: e => e.participantCount || 0, isNumeric: true },
      { label: 'Площадка', getValue: e => e.venue || '—' },
      { label: 'NPS', getValue: e => e.npsScore ?? '—', isNumeric: true },
      { label: 'Спикеров', getValue: e => e.speakers?.length || 0, isNumeric: true },
      { label: 'Руководитель', getValue: e => e.programDirector || '—' },
      { label: 'Факт. расходы', getValue: e => e.actualCost || 0, isNumeric: true },
    ];

    const getCellClass = (row: typeof comparisonRows[0], values: (string | number)[]) => {
      if (!row.isNumeric || values.length < 2) return '';
      const numValues = values.map(v => typeof v === 'number' ? v : parseFloat(String(v)) || 0);
      const maxVal = Math.max(...numValues);
      const minVal = Math.min(...numValues);
      if (maxVal === minVal) return '';
      return numValues.map((v, i) => {
        if (v === maxVal && maxVal !== minVal) return 'crm-compare-higher';
        if (v === minVal && maxVal !== minVal) return 'crm-compare-lower';
        return '';
      });
    };

    return (
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5 text-[#E4002B]" />
              Сравнение мероприятий ({selected.length})
            </DialogTitle>
            <DialogDescription>Сравнение выбранных мероприятий. Зелёная подсветка — наибольшее значение, красная — наименьшее.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-36 sticky left-0 bg-white">Параметр</TableHead>
                  {selected.map(e => (
                    <TableHead key={e.id} className="text-center min-w-[180px]">
                      <div className="font-semibold truncate">{e.title}</div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonRows.map(row => {
                  const values = selected.map(e => row.getValue(e));
                  const cellClasses = getCellClass(row, values);
                  return (
                    <TableRow key={row.label}>
                      <TableCell className="font-medium text-sm text-muted-foreground sticky left-0 bg-white">{row.label}</TableCell>
                      {values.map((val, i) => (
                        <TableCell key={i} className={`text-center text-sm ${cellClasses[i] || ''}`}>
                          {row.isNumeric && typeof val === 'number' && val > 0 ? formatCurrency(val) : String(val)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompareDialog(false)}>Закрыть</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // ======================== KANBAN VIEW ========================

  const renderKanbanView = () => {
    const kanbanStatuses: { status: EventStatus; label: string; color: string; bgColor: string; borderColor: string }[] = [
      { status: 'draft', label: 'Черновик', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
      { status: 'pending_approval', label: 'На согласовании', color: 'text-amber-700', bgColor: 'bg-amber-50/50', borderColor: 'border-amber-200' },
      { status: 'budget_approved', label: 'Бюджет согласован', color: 'text-sky-700', bgColor: 'bg-sky-50/50', borderColor: 'border-sky-200' },
      { status: 'approved', label: 'Согласовано', color: 'text-[#E4002B]', bgColor: 'bg-[#FFF1F3]/50', borderColor: 'border-[#FF9DAF]' },
      { status: 'in_progress', label: 'В процессе', color: 'text-blue-700', bgColor: 'bg-blue-50/50', borderColor: 'border-blue-200' },
      { status: 'completed', label: 'Завершено', color: 'text-green-700', bgColor: 'bg-green-50/50', borderColor: 'border-green-200' },
    ];

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kanbanStatuses.map(col => {
          const colEvents = events.filter(e => e.status === col.status);
          const colBudget = colEvents.reduce((s, e) => s + (e.budget || 0), 0);
          return (
            <div key={col.status} className={`rounded-xl border ${col.borderColor} ${col.bgColor} flex flex-col min-h-[400px]`}>
              <div className="px-3 py-3 border-b border-inherit">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`font-semibold text-sm ${col.color}`}>{col.label}</h3>
                  <Badge variant="secondary" className="text-xs h-5 min-w-5 flex items-center justify-center">{colEvents.length}</Badge>
                </div>
                {colBudget > 0 && <p className="text-[11px] text-muted-foreground">{formatCurrency(colBudget)}</p>}
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto crm-scroll">
                {colEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-6 w-6 mx-auto mb-1.5 opacity-20" />
                    <p className="text-xs">Нет мероприятий</p>
                  </div>
                ) : (
                  colEvents.map(event => (
                    <div key={event.id} className="bg-white dark:bg-gray-900 rounded-lg border shadow-sm p-3 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5" onClick={() => { setSelectedEvent(event); setShowEventDialog(true); }}>
                      <h4 className="font-medium text-sm leading-tight mb-2 line-clamp-2">{event.title}</h4>
                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        {event.startDate && <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3 shrink-0" /><span className="truncate">{formatDate(event.startDate)}</span></div>}
                        {event.venue && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{event.venue}</span></div>}
                        {event.budget && <div className="flex items-center gap-1.5"><Banknote className="h-3 w-3 shrink-0" /><span>{formatCurrency(event.budget)}</span></div>}
                        {event.participantCount && <div className="flex items-center gap-1.5"><Users className="h-3 w-3 shrink-0" /><span>{event.participantCount} чел.</span></div>}
                      </div>
                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t">
                        <Badge variant="outline" className={`crm-badge text-[9px] py-0 px-1.5 ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge>
                        {event.uin && <span className="text-[9px] font-mono text-muted-foreground">{event.uin}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ======================== TIMELINE VIEW ========================

  const renderTimelineView = () => {
    const sortedEvents = [...events]
      .filter(e => e.startDate)
      .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime());

    const statusNodeColors: Record<string, string> = {
      draft: 'bg-gray-400',
      pending_approval: 'bg-amber-400',
      budget_approved: 'bg-sky-400',
      approved: 'bg-[#E4002B]',
      uin_assigned: 'bg-teal-400',
      in_progress: 'bg-blue-400',
      completed: 'bg-green-400',
      rejected: 'bg-red-400',
      cancelled: 'bg-gray-300',
    };

    const statusRingColors: Record<string, string> = {
      draft: 'ring-gray-200',
      pending_approval: 'ring-amber-200',
      budget_approved: 'ring-sky-200',
      approved: 'ring-[#FF9DAF]',
      uin_assigned: 'ring-teal-200',
      in_progress: 'ring-blue-200',
      completed: 'ring-green-200',
      rejected: 'ring-red-200',
      cancelled: 'ring-gray-100',
    };

    if (sortedEvents.length === 0) {
      return (
        <Card className="shadow-sm">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Milestone className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">Нет мероприятий с указанными датами</p>
            <p className="text-sm mt-1">Добавьте даты начала к мероприятиям для отображения хронологии</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="relative">
        {/* Vertical connector line */}
        <div className="crm-timeline-connector" style={{ left: '19px' }} />

        <div className="space-y-0">
          {sortedEvents.map((event, index) => {
            const noteText = getQuickNote(event.id);
            return (
              <div key={event.id} className="crm-timeline-node crm-timeline-enter relative pl-12 pb-8 cursor-pointer" style={{ animationDelay: `${index * 60}ms` }} onClick={() => { setSelectedEvent(event); setShowEventDialog(true); }}>
                {/* Timeline node dot */}
                <div className={`absolute left-2.5 top-1 w-7 h-7 rounded-full ${statusNodeColors[event.status] || 'bg-gray-400'} ring-4 ${statusRingColors[event.status] || 'ring-gray-100'} flex items-center justify-center z-10 shadow-sm`}>
                  {event.status === 'completed' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                  ) : event.status === 'in_progress' ? (
                    <Play className="h-3 w-3 text-white" />
                  ) : event.status === 'rejected' ? (
                    <XCircle className="h-3.5 w-3.5 text-white" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-white/80" />
                  )}
                </div>

                {/* Event card */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className="font-semibold text-[15px]">{event.title}</h3>
                        <Badge variant="outline" className={`crm-badge text-[10px] ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge>
                        {noteText && <Pin className="h-3.5 w-3.5 text-amber-500 crm-note-pin" />}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {event.startDate && (
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(event.startDate)} — {formatDate(event.endDate)}
                          </span>
                        )}
                        {event.venue && <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{event.venue}</span>}
                        {event.budget && <span className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" />{formatCurrency(event.budget)}</span>}
                        {event.participantCount && <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5" />{event.participantCount} чел.</span>}
                      </div>
                      {event.programDirector && (
                        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5"><UserCheck className="h-3 w-3" />{event.programDirector}</p>
                      )}
                      {/* Plan data badges */}
                      {(event.number || event.programClass || event.programType || event.client) && (
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          {event.number && <span className="text-[10px] font-mono text-muted-foreground bg-slate-100 rounded px-1.5 py-0.5">#{event.number}</span>}
                          {event.programClass && <Badge variant="outline" className={`text-[10px] h-4 px-1 ${event.programClass === 'A' ? 'bg-red-50 text-red-600 border-red-200' : event.programClass === 'B' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{event.programClass}</Badge>}
                          {event.programType && <Badge variant="outline" className="text-[10px] h-4 px-1 bg-slate-50">{event.programType}</Badge>}
                          {event.client && <span className="text-[10px] text-muted-foreground">{event.client}</span>}
                        </div>
                      )}
                      {/* Assignment avatars */}
                      {event.assignments?.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          {event.assignments.filter(a => a.role === 'LEAD').map(a => (
                            <span key={a.id} className="inline-flex items-center gap-1 text-[10px] text-[#E4002B] bg-[#FFF1F3] rounded-full px-1.5 py-0.5 border border-[#FF9DAF]">
                              <Crown className="h-2.5 w-2.5" />{a.user?.name?.split(' ')[0] || '?'}
                            </span>
                          ))}
                          {event.assignments.filter(a => a.role === 'SUPPORT').map(a => (
                            <span key={a.id} className="inline-flex items-center gap-1 text-[10px] text-sky-700 bg-sky-50 rounded-full px-1.5 py-0.5 border border-sky-200">
                              {a.user?.name?.split(' ')[0] || '?'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // ======================== RENDER DEPARTMENT VIEWS ========================

  const getQuickNote = (eventId: string): string => {
    if (!mounted) return '';
    try {
      return localStorage.getItem(`crm-notes-${eventId}`) || '';
    } catch { return ''; }
  };

  const saveQuickNote = (eventId: string, note: string) => {
    try {
      if (note.trim()) {
        localStorage.setItem(`crm-notes-${eventId}`, note);
      } else {
        localStorage.removeItem(`crm-notes-${eventId}`);
      }
    } catch {}
  };

  const renderDashboardView = () => (
    <DashboardView
      events={events}
      notifications={notifications}
      setActiveDept={setActiveDept as (dept: string) => void}
      setSelectedEvent={setSelectedEvent}
      setShowEventDialog={setShowEventDialog}
      setShowCreateDialog={setShowCreateDialog}
      mounted={mounted}
      loading={loading}
    />
  );

  const renderMethodologyView = () => (
    <MethodologyView
      events={events}
      loading={loading}
      searchQuery={searchQuery}
      statusFilter={statusFilter}
      methodologyViewMode={methodologyViewMode}
      compareMode={compareMode}
      compareIds={compareIds}
      expandedNoteId={expandedNoteId}
      mounted={mounted}
      handleSearchChange={handleSearchChange}
      setStatusFilter={setStatusFilter}
      setMethodologyViewMode={setMethodologyViewMode}
      setCompareMode={setCompareMode}
      setCompareIds={setCompareIds}
      setShowCompareDialog={setShowCompareDialog}
      setExpandedNoteId={setExpandedNoteId}
      setSelectedEvent={setSelectedEvent}
      setShowEventDialog={setShowEventDialog}
      setShowCreateDialog={setShowCreateDialog}
      handleWorkflowAction={handleWorkflowAction}
      handleExportAllExcel={handleExportAllExcel}
      handleImportExcel={handleImportExcel}
      handleDuplicateEvent={handleDuplicateEvent}
      handleExportExcel={handleExportExcel}
      getQuickNote={getQuickNote}
      saveQuickNote={saveQuickNote}
    />
  );
  const renderCoordinationView = () => (
    <CoordinationView
      events={events}
      handleWorkflowAction={handleWorkflowAction}
      setSelectedEvent={setSelectedEvent}
      setShowEventDialog={setShowEventDialog}
    />
  );

  const renderAGDView = () => (
    <AGDView
      events={events}
      selectedDate={selectedDate}
      setSelectedDate={setSelectedDate}
      handleWorkflowAction={handleWorkflowAction}
      setSelectedEvent={setSelectedEvent}
      setShowEventDialog={setShowEventDialog}
      mounted={mounted}
    />
  );

  const renderOrganizationView = () => (
    <OrganizationView
      events={events}
      users={users}
      isManager={isManager}
      handleWorkflowAction={handleWorkflowAction}
      setSelectedEvent={setSelectedEvent}
      setShowEventDialog={setShowEventDialog}
      fetchEvents={fetchEvents}
    />
  );

  const renderAnalyticsView = () => (
    <AnalyticsView
      events={events}
      analyticsData={analyticsData}
    />
  );

  const deptViews: Record<Department, () => React.ReactNode> = {
    dashboard: renderDashboardView,
    methodology: renderMethodologyView,
    coordination: renderCoordinationView,
    agd: renderAGDView,
    organization: renderOrganizationView,
    analytics: renderAnalyticsView,
  };

  const deptIcons: Record<Department, React.ReactNode> = {
    dashboard: <LayoutDashboard className="h-5 w-5" />,
    methodology: <BookOpen className="h-5 w-5" />,
    coordination: <Shield className="h-5 w-5" />,
    agd: <Crown className="h-5 w-5" />,
    organization: <ClipboardList className="h-5 w-5" />,
    analytics: <BarChart3 className="h-5 w-5" />,
  };

  // ======================== MAIN RENDER ========================
  // Show landing page immediately for unauthenticated or while auth is loading
  // This avoids the "stuck on loading" issue when server is slow
  if (authLoading || !isAuthenticated) {
    return (
      <TooltipProvider>
        <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 crm-particles-bg">
          {/* Header */}
          <header className="sticky top-0 z-50 shadow-md no-print crm-gradient-header">
            <div className="flex items-center justify-between h-14 px-2 sm:px-4 md:px-8">
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                  <img src="/logos/senezh-monogram-red.svg" alt="С" className="h-5 w-5 sm:h-6 sm:w-6 brightness-0 invert" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">CRM Сенеж</h1>
                  <p className="text-[9px] sm:text-[10px] text-white/80 tracking-wide hidden xs:block">Управление образовательными мероприятиями</p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-9 w-9 min-h-[44px] min-w-[44px]" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {mounted && theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Button
                  onClick={() => window.location.href = '/login'}
                  className="bg-white text-[#E4002B] hover:bg-white/90 dark:bg-gray-800 dark:text-[#FF9DAF] dark:hover:bg-gray-700 font-semibold shadow-md rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105 active:scale-100 text-xs sm:text-sm h-9 sm:h-10"
                >
                  <LogOut className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Войти в кабинет</span>
                  <span className="sm:hidden">Войти</span>
                </Button>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <main className="flex-1">
            <div className="crm-hero-gradient py-16 md:py-24 px-4 md:px-8">
              <div className="max-w-6xl mx-auto relative z-10">
                <div className="text-center crm-section-fade">
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-white/90 text-sm mb-6 border border-white/10">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    Президентская платформа «Россия — страна возможностей»
                  </div>
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white mb-4 tracking-tight leading-tight">
                    ТехноСенеж
                  </h1>
                  <p className="text-white/80 text-lg md:text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
                    Единая система управления образовательными мероприятиями — от планирования до закрытия отчёта
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
                    <Button
                      onClick={() => window.location.href = '/login'}
                      size="lg"
                      className="bg-white text-[#E4002B] hover:bg-white/90 dark:bg-gray-800 dark:text-[#FF9DAF] font-bold shadow-xl rounded-xl transition-all duration-200 hover:shadow-2xl hover:scale-105 active:scale-100 h-12 px-8 text-base"
                    >
                      Войти в личный кабинет
                      <ChevronRight className="h-5 w-5 ml-1" />
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-sm rounded-xl h-12 px-8 text-base font-medium"
                      onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      Узнать больше
                    </Button>
                  </div>
                </div>
                {/* Animated Counters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto crm-section-fade" style={{ animationDelay: '0.2s' }}>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center border border-white/10">
                    <div className="text-2xl md:text-3xl font-bold text-white crm-counter crm-counter-animate">{publicEvents.length}</div>
                    <div className="text-white/70 text-xs mt-0.5">мероприятий</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center border border-white/10">
                    <div className="text-2xl md:text-3xl font-bold text-white crm-counter crm-counter-animate" style={{ animationDelay: '0.1s' }}>{publicEvents.reduce((s, e) => s + (e.participantCount || 0), 0)}</div>
                    <div className="text-white/70 text-xs mt-0.5">участников</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center border border-white/10">
                    <div className="text-2xl md:text-3xl font-bold text-white crm-counter crm-counter-animate" style={{ animationDelay: '0.2s' }}>{publicEvents.filter(e => e.status === 'in_progress').length}</div>
                    <div className="text-white/70 text-xs mt-0.5">в процессе</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 text-center border border-white/10">
                    <div className="text-2xl md:text-3xl font-bold text-white crm-counter crm-counter-animate" style={{ animationDelay: '0.3s' }}>{publicEvents.filter(e => e.status === 'completed').length}</div>
                    <div className="text-white/70 text-xs mt-0.5">завершено</div>
                  </div>
                </div>
              </div>
            </div>

            {/* About Campus Section */}
            <div id="about" className="max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-16">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                <div className="space-y-5">
                  <div className="inline-flex items-center gap-2 bg-[#FFF1F3] dark:bg-[#E4002B]/10 rounded-full px-4 py-1.5 text-[#E4002B] dark:text-[#FF9DAF] text-sm font-medium">
                    <Building2 className="h-4 w-4" />
                    О кампусе
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold leading-tight">
                    Мастерская управления <span className="text-[#E4002B] dark:text-[#FF9DAF]">«Сенеж»</span>
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Это уникальная образовательная площадка Президентской платформы «Россия — страна возможностей», расположенная на берегу живописного Сенежского озера в Московской области.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Здесь проходят программы повышения квалификации для управленцев, лидеров общественных движений и социальных предпринимателей. Каждый год кампус принимает тысячи участников из всех регионов России.
                  </p>
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="text-center p-3 rounded-xl bg-[#FFF1F3] dark:bg-[#E4002B]/5">
                      <p className="text-2xl font-bold text-[#E4002B] dark:text-[#FF9DAF]">50+</p>
                      <p className="text-xs text-muted-foreground mt-0.5">программ в год</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10">
                      <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">5</p>
                      <p className="text-xs text-muted-foreground mt-0.5">департаментов</p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-green-50 dark:bg-green-900/10">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">100%</p>
                      <p className="text-xs text-muted-foreground mt-0.5">цифровизация</p>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <div className="bg-gradient-to-br from-[#E4002B]/10 via-[#BD0024]/5 to-transparent rounded-2xl p-6 md:p-8 border border-[#FF9DAF]/20">
                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#E4002B] text-white flex items-center justify-center shrink-0"><Target className="h-5 w-5" /></div>
                        <div>
                          <h4 className="font-semibold mb-1">Единая платформа</h4>
                          <p className="text-sm text-muted-foreground">Все процессы — от заявки до отчёта — в одной системе. Никаких разрозненных таблиц и потерянных данных.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#BD0024] text-white flex items-center justify-center shrink-0"><Zap className="h-5 w-5" /></div>
                        <div>
                          <h4 className="font-semibold mb-1">Автоматизация процессов</h4>
                          <p className="text-sm text-muted-foreground">Согласование бюджетов, назначение ответственных и трекинг задач — автоматически на каждом этапе.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#190B62] text-white flex items-center justify-center shrink-0"><BarChart3 className="h-5 w-5" /></div>
                        <div>
                          <h4 className="font-semibold mb-1">Аналитика в реальном времени</h4>
                          <p className="text-sm text-muted-foreground">Дашборды, воронки и NPS-аналитика помогают принимать обоснованные решения.</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0"><Shield className="h-5 w-5" /></div>
                        <div>
                          <h4 className="font-semibold mb-1">Безопасность и контроль</h4>
                          <p className="text-sm text-muted-foreground">Ролевая модель доступа, аудит действий и защита данных на каждом уровне системы.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-8 relative z-20">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <Card className="crm-gradient-card border-0 shadow-md crm-shadow-elevated crm-card-hover rounded-xl">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-[#FFE0E5] text-[#E4002B] dark:bg-[#E4002B]/20 dark:text-[#FF9DAF]"><Calendar className="h-5 w-5" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Всего мероприятий</p>
                        <p className="text-xl font-bold crm-stat-number">{publicEvents.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="crm-gradient-card border-0 shadow-md crm-shadow-elevated crm-card-hover rounded-xl">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"><Play className="h-5 w-5" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">В процессе</p>
                        <p className="text-xl font-bold crm-stat-number">{publicEvents.filter(e => e.status === 'in_progress').length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="crm-gradient-card border-0 shadow-md crm-shadow-elevated crm-card-hover rounded-xl">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"><Clock className="h-5 w-5" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Предстоящих</p>
                        <p className="text-xl font-bold crm-stat-number">{mounted ? publicEvents.filter(e => e.startDate && new Date(e.startDate) > new Date() && e.status !== 'completed').length : '–'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="crm-gradient-card border-0 shadow-md crm-shadow-elevated crm-card-hover rounded-xl">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="h-5 w-5" /></div>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium">Завершено</p>
                        <p className="text-xl font-bold crm-stat-number">{publicEvents.filter(e => e.status === 'completed').length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Events List */}
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
              <Card className="shadow-md border-0 rounded-xl overflow-hidden">
                <CardHeader className="pb-3 border-b bg-gray-50/50 dark:bg-gray-800/50">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <div className="w-3 h-3 rounded-full bg-[#E4002B]" />
                    Сегодня в Сенеже
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="crm-stagger-list">
                    {(mounted
                      ? publicEvents.filter(event => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const tomorrow = new Date(today);
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          if (!event.startDate) return false;
                          const start = new Date(event.startDate);
                          start.setHours(0, 0, 0, 0);
                          const end = event.endDate ? new Date(event.endDate) : start;
                          end.setHours(23, 59, 59, 999);
                          return start <= tomorrow && end >= today;
                        })
                      : []
                    ).map(event => (
                      <div key={event.id} className="flex items-center gap-2 sm:gap-4 p-3 sm:p-5 border-b last:border-b-0 bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-all duration-200 cursor-pointer crm-status-bar status-{event.status}">
                        <div className={`w-1.5 h-8 sm:h-12 rounded-full shrink-0 ${
                          event.status === 'completed' ? 'bg-green-400' :
                          event.status === 'in_progress' ? 'bg-blue-400' :
                          event.status === 'pending_approval' ? 'bg-amber-400' : 'bg-gray-300'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm">{event.title}</h3>
                            <Badge variant="outline" className={`text-[10px] rounded-full px-2 py-0.5 ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                            {event.startDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(event.startDate)} — {formatDate(event.endDate)}</span>}
                            {event.venue && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{event.venue}</span>}
                            {event.participantCount && <span className="flex items-center gap-1"><Users className="h-3 w-3" />{event.participantCount} чел.</span>}
                          </div>
                        </div>
                        {event.budget && <span className="text-sm font-semibold text-[#E4002B] dark:text-[#FF9DAF] hidden sm:block">{formatCurrency(event.budget)}</span>}
                      </div>
                    ))}
                    {(mounted ? publicEvents.filter(event => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const tomorrow = new Date(today);
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      if (!event.startDate) return false;
                      const start = new Date(event.startDate);
                      start.setHours(0, 0, 0, 0);
                      const end = event.endDate ? new Date(event.endDate) : start;
                      end.setHours(23, 59, 59, 999);
                      return start <= tomorrow && end >= today;
                    }) : []).length === 0 && (
                      <div className="crm-empty-state">
                        <div className="crm-empty-state-icon"><Calendar className="h-7 w-7" /></div>
                        <h3 className="font-semibold text-base mb-1">Сегодня нет мероприятий</h3>
                        <p className="text-sm text-muted-foreground">Мероприятия на текущую дату не запланированы</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Features Section */}
            <div id="features" className="max-w-6xl mx-auto px-4 md:px-8 py-12 crm-section-fade">
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold mb-3">Возможности CRM</h2>
                <p className="text-muted-foreground max-w-xl mx-auto">Полный цикл управления образовательными мероприятиями в единой системе</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { icon: <ClipboardList className="h-6 w-6" />, title: 'Планирование', desc: 'Создание и управление мероприятиями с полным набором параметров и шаблонов' },
                  { icon: <Shield className="h-6 w-6" />, title: 'Согласование', desc: 'Многоуровневое согласование мероприятий с отслеживанием статуса в реальном времени' },
                  { icon: <Wallet className="h-6 w-6" />, title: 'Бюджетирование', desc: 'Контроль расходов по статьям, трекинг платежей и финансовая аналитика' },
                  { icon: <Users className="h-6 w-6" />, title: 'Участники', desc: 'Регистрация, расселение, питание и трансферы — всё в одном месте' },
                  { icon: <BarChart3 className="h-6 w-6" />, title: 'Аналитика', desc: 'Дашборды, воронки и отчёты для принятия управленческих решений' },
                  { icon: <FileText className="h-6 w-6" />, title: 'Документы', desc: 'Экспорт отчётов, реестров и аналитических материалов в разных форматах' },
                ].map((feature, i) => (
                  <div key={i} className="crm-feature-card bg-white dark:bg-gray-800/50 rounded-xl p-5 sm:p-6 crm-stagger-list">
                    <div className="w-12 h-12 rounded-xl bg-[#FFE0E5] text-[#E4002B] dark:bg-[#E4002B]/15 dark:text-[#FF9DAF] flex items-center justify-center mb-4">
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Section */}
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
              <div className="crm-hero-gradient rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
                <div className="relative z-10">
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Готовы начать работу?</h2>
                  <p className="text-white/80 mb-6 max-w-lg mx-auto">Войдите в личный кабинет для полного доступа к системе управления мероприятиями</p>
                  <Button
                    onClick={() => window.location.href = '/login'}
                    size="lg"
                    className="bg-white text-[#E4002B] hover:bg-white/90 dark:bg-gray-800 dark:text-[#FF9DAF] font-bold shadow-xl rounded-xl transition-all duration-200 hover:shadow-2xl hover:scale-105 active:scale-100 h-12 px-8 text-base"
                  >
                    Войти в личный кабинет
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer className="bg-white dark:bg-gray-900 border-t py-4 sm:py-6 px-4 mt-auto">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3">
                  <img src="/logos/senezh-monogram-red.svg" alt="Сенеж" className="h-7 w-7 sm:h-8 sm:w-8" />
                  <div>
                    <p className="font-semibold text-sm">CRM Сенеж</p>
                    <p className="text-xs text-muted-foreground">Система управления образовательными мероприятиями</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground text-center">
                  <span>© 2026 Мастерская управления «Сенеж»</span>
                  <span className="hidden sm:inline">•</span>
                  <span className="hidden sm:inline">Президентская платформа «Россия — страна возможностей»</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#E4002B]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#BD0024]" />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#164194]" />
                </div>
              </div>
            </div>
          </footer>
        </div>
      </TooltipProvider>
    );
  }

  // ======================== AUTHENTICATED APP ========================
  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b shadow-sm no-print crm-gradient-header">
          <div className="flex items-center justify-between h-14 px-2 sm:px-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm" className="md:hidden text-white hover:bg-white/10 min-h-[44px] min-w-[44px]">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 sm:w-64 p-0">
                  <SheetTitle className="sr-only">Навигация</SheetTitle>
                  <Sidebar
                    activeDept={activeDept}
                    setActiveDept={setActiveDept}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    events={events}
                    pendingUsers={pendingUsers}
                    isAdmin={isAdmin}
                    isManager={isManager}
                    userDepartment={userDepartment ?? undefined}
                    fetchPersonalData={fetchPersonalData}
                    fetchUsers={fetchUsers}
                    fetchPendingUsers={fetchPendingUsers}
                  />
                </SheetContent>
              </Sheet>
              <div className="flex items-center gap-2 sm:gap-2.5">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/20">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base sm:text-lg font-bold leading-tight text-white">CRM Сенеж</h1>
                  <p className="text-[9px] sm:text-[10px] text-white/90 leading-tight hidden xs:block">Управление образовательными мероприятиями</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-3">
              {/* Current department indicator */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs font-medium border border-white/10">
                {activeDept === 'cabinet' ? <Briefcase className="h-3.5 w-3.5" /> : activeDept === 'admin' ? <ShieldCheck className="h-3.5 w-3.5" /> : deptIcons[activeDept]}
                <span>{activeDept === 'cabinet' ? 'Мой кабинет' : activeDept === 'admin' ? 'Администрирование' : DEPARTMENTS.find(d => d.id === activeDept)?.shortName}</span>
              </div>

              {/* Search shortcut hint */}
              <Button variant="ghost" size="sm" className="sm:hidden text-white hover:bg-white/10 min-h-[44px] min-w-[44px]" onClick={() => setShowSearchDialog(true)}>
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2 text-white/80 hover:text-white hover:bg-white/10 h-8 px-2.5" onClick={() => setShowSearchDialog(true)}>
                <Search className="h-3.5 w-3.5" />
                <span className="text-xs">Поиск</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-white/20 bg-white/10 px-1.5 font-mono text-[10px] font-medium text-white/70">⌘K</kbd>
              </Button>

              <Popover open={showNotifications} onOpenChange={setShowNotifications}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative text-white hover:bg-white/10 min-h-[44px] min-w-[44px]">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-400 text-white text-[10px] min-w-4 h-4 rounded-full flex items-center justify-center px-1 animate-pulse">{unreadCount}</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[calc(100vw-2rem)] sm:w-80 p-0" align="end">
                  <div className="p-3 border-b flex items-center justify-between bg-gradient-to-r from-[#FFF1F3] to-[#FFE0E5] dark:from-[#E4002B]/10 dark:to-[#E4002B]/5">
                    <span className="font-semibold text-sm">Уведомления</span>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" className="text-xs h-6 text-[#E4002B]" onClick={handleMarkNotificationsRead}>
                        Прочитать все
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="max-h-72 crm-scroll">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-6 text-center">Нет новых уведомлений</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-3 border-b transition-colors ${n.read ? '' : 'bg-[#FFF1F3]/60 dark:bg-[#E4002B]/10 hover:bg-[#FFF1F3] dark:hover:bg-[#E4002B]/15'}`}>
                          <div className="flex items-start gap-2">
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.type === 'approval' ? 'bg-amber-400' : n.type === 'warning' ? 'bg-red-400' : n.type === 'change' ? 'bg-blue-400' : 'bg-[#E4002B]'}`} />
                            <div>
                              <p className="text-sm leading-snug">{n.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString('ru-RU')}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>

              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 min-h-[44px] min-w-[44px]" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                {mounted && theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-white hover:bg-white/10" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
              </Button>

              {/* User info & Logout */}
              {user && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white text-xs border border-white/10">
                  <div className="w-6 h-6 rounded-full bg-[#E4002B] flex items-center justify-center text-[10px] font-bold text-white">
                    {user.name?.charAt(0) || '?'}
                  </div>
                  <span className="max-w-[120px] sm:max-w-[160px] lg:max-w-xs truncate">{user.name}</span>
                  {isAdmin && <ShieldCheck className="h-3 w-3 text-amber-300" />}
                  {isManager && !isAdmin && <UserCog className="h-3 w-3 text-amber-300" />}
                </div>
              )}
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 min-h-[44px] min-w-[44px]" onClick={() => signOut()}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <div className="flex flex-1 min-h-0">
          {/* Desktop Sidebar */}
          <aside className="hidden md:flex w-60 flex-col bg-white dark:bg-gray-900 border-r shadow-sm no-print shrink-0">
            <Sidebar
              activeDept={activeDept}
              setActiveDept={setActiveDept}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
              events={events}
              pendingUsers={pendingUsers}
              isAdmin={isAdmin}
              isManager={isManager}
              userDepartment={userDepartment ?? undefined}
              fetchPersonalData={fetchPersonalData}
              fetchUsers={fetchUsers}
              fetchPendingUsers={fetchPendingUsers}
            />
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-2 sm:p-3 md:p-6 overflow-auto crm-scroll crm-main-content bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-950 dark:to-gray-900/50 min-h-0">
            <div className="crm-view-transition" key={activeDept}>
              {activeDept === 'admin' ? (
                <AdminCabinetView
                  events={events}
                  users={users}
                  setUsers={setUsers}
                  pendingUsers={pendingUsers}
                  setPendingUsers={setPendingUsers}
                  adminTab={adminTab}
                  setAdminTab={setAdminTab}
                  auditLogs={auditLogs}
                  auditTotal={auditTotal}
                  auditFilterAction={auditFilterAction}
                  setAuditFilterAction={setAuditFilterAction}
                  auditFilterEntity={auditFilterEntity}
                  setAuditFilterEntity={setAuditFilterEntity}
                  adminEventStatusFilter={adminEventStatusFilter}
                  setAdminEventStatusFilter={setAdminEventStatusFilter}
                  adminEventSearch={adminEventSearch}
                  setAdminEventSearch={setAdminEventSearch}
                  adminEditingEvent={adminEditingEvent}
                  setAdminEditingEvent={setAdminEditingEvent}
                  showAdminEventDialog={showAdminEventDialog}
                  setShowAdminEventDialog={setShowAdminEventDialog}
                  showUserDialog={showUserDialog}
                  setShowUserDialog={setShowUserDialog}
                  editingUser={editingUser}
                  setEditingUser={setEditingUser}
                  adminSettings={adminSettings}
                  setAdminSettings={setAdminSettings}
                  fetchEvents={fetchEvents}
                  fetchUsers={fetchUsers}
                  fetchPendingUsers={fetchPendingUsers}
                  fetchAuditLogs={fetchAuditLogs}
                  handleUserApproval={handleUserApproval}
                  setSelectedEvent={setSelectedEvent}
                  setShowEventDialog={setShowEventDialog}
                  setShowCreateDialog={setShowCreateDialog}
                  user={user}
                />
              ) : activeDept === 'cabinet' ? (
                <PersonalCabinetView
                  user={user}
                  isManager={isManager}
                  isAdmin={isAdmin}
                  events={events}
                  myTasks={myTasks}
                  deptTasks={deptTasks}
                  myEventAssignments={myEventAssignments}
                  deptUsers={deptUsers}
                  personalView={personalView}
                  setPersonalView={setPersonalView}
                  showCreateTaskDialog={showCreateTaskDialog}
                  setShowCreateTaskDialog={setShowCreateTaskDialog}
                  newTaskForm={newTaskForm}
                  setNewTaskForm={setNewTaskForm}
                  fetchPersonalData={fetchPersonalData}
                />
              ) : deptViews[activeDept]()}
            </div>
          </main>
        </div>

        {/* Footer */}
        <footer className="bg-white dark:bg-gray-900 border-t py-2 sm:py-3 px-4 text-center text-xs sm:text-sm text-muted-foreground no-print mt-auto">
          <div className="flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#E4002B]" />
            <span className="hidden sm:inline">CRM Сенеж © 2026 — Система управления образовательными мероприятиями</span>
            <span className="sm:hidden">CRM Сенеж © 2026</span>
            <div className="w-1.5 h-1.5 rounded-full bg-[#BD0024]" />
          </div>
        </footer>

        {/* Event Detail Dialog */}
        {selectedEvent && (
          <EventDetailDialog
            event={selectedEvent}
            open={showEventDialog}
            onClose={() => { setShowEventDialog(false); setSelectedEvent(null); }}
            onUpdate={() => { fetchEvents(); }}
            onDelete={() => { setDeleteTarget(selectedEvent.id); setShowDeleteDialog(true); }}
            onWorkflowAction={handleWorkflowAction}
            onExport={() => handleExportExcel(selectedEvent)}
            onDuplicate={() => handleDuplicateEvent(selectedEvent)}
            canEdit={isAdmin || isManager}
            canDelete={isAdmin}
            canManageWorkflow={isAdmin || isManager}
            canDuplicate={canCreateEvents}
            departmentContext={activeDept === 'methodology' ? 'methodology' : activeDept === 'coordination' ? 'coordination' : 'other'}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Удалить мероприятие?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Это действие нельзя отменить. Карточка мероприятия и все связанные данные (спикеры, бюджет, задачи, контакты) будут удалены навсегда.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setShowDeleteDialog(false); setDeleteTarget(null); }}>Отмена</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteTarget) handleDeleteEvent(deleteTarget);
                  setShowDeleteDialog(false);
                  setDeleteTarget(null);
                }}
              >
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Create Event Dialog */}
        <CreateEventDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onCreate={() => { setShowCreateDialog(false); fetchEvents(); }}
        />

        {/* Global Search Dialog */}
        <GlobalSearchDialog />

        {/* Comparison Dialog */}
        <ComparisonDialog />
      </div>
    </TooltipProvider>
  );
}
