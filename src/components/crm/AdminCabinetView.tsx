'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, UserCheck, Users, Calendar, Plus, Edit, Trash2,
  CheckCircle2, XCircle, RefreshCw, ClipboardList, Settings,
  UserCog, Target, Bell, Building2, Eye, Banknote, TrendingDown, AlertTriangle, PieChart,
  ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { EventData, UserData, DEPARTMENTS, STATUS_LABELS, STATUS_COLORS, USER_ROLE_LABELS, USER_ROLE_COLORS, UserRole } from '@/lib/crm-types';
import { getStatusLabel, getStatusColor, formatDate, formatCurrency } from '@/lib/crm-utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';
import { apiFetch } from '@/lib/api-fetch';
import { toast } from '@/hooks/use-toast';
import { UserForm } from '@/components/crm/UserForm';
import { AdminEventEditForm } from '@/components/crm/AdminEventEditForm';

interface FinancialReportTabProps {
  events: EventData[];
}

/** Финансовый отчёт — отдельный компонент внутри AdminCabinetView */
function FinancialReportTab({ events }: FinancialReportTabProps) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/financial-report');
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      } else {
        toast({ title: 'Ошибка загрузки отчёта', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка загрузки отчёта', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [events.length]);

  if (loading || !report) {
    return (
      <Card className="shadow-sm border-0">
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3 animate-spin" />
          <p className="text-muted-foreground">Загрузка финансового отчёта...</p>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data for budget by department
  const deptChartData = Object.entries(report.departmentBudgets || {}).map(([name, data]: [string, any]) => ({
    name,
    budget: Math.round(data.budget / 1000),
    actual: Math.round(data.actual / 1000),
  }));

  // Payment status summary
  const PAYMENT_STATUS_MAP: Record<string, { label: string; color: string }> = {
    pending: { label: 'Ожидает', color: 'bg-amber-50 text-amber-700 border-amber-300' },
    partial: { label: 'Частично', color: 'bg-sky-50 text-sky-700 border-sky-300' },
    paid: { label: 'Оплачен', color: 'bg-green-50 text-green-700 border-green-300' },
    overdue: { label: 'Просрочен', color: 'bg-red-50 text-red-700 border-red-300' },
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="crm-gradient-card border-0 shadow-sm crm-shadow-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#FFE0E5] text-[#E4002B]"><Banknote className="h-5 w-5" /></div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Общий бюджет</p>
                <p className="text-xl font-bold">{formatCurrency(report.totalBudget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="crm-gradient-card border-0 shadow-sm crm-shadow-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600"><TrendingDown className="h-5 w-5" /></div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Фактические затраты</p>
                <p className="text-xl font-bold">{formatCurrency(report.totalActualCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={`crm-gradient-card border-0 shadow-sm crm-shadow-elevated`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${report.delta >= 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {report.delta >= 0 ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Дельта (план − факт)</p>
                <p className={`text-xl font-bold ${report.delta < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(report.delta)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget by Department Bar Chart */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><PieChart className="h-5 w-5 text-[#E4002B]" />Бюджет по подразделениям</CardTitle>
          <CardDescription>Плановый и фактический бюджет (тыс. ₽)</CardDescription>
        </CardHeader>
        <CardContent>
          {deptChartData.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <RechartsTooltip formatter={(value: number) => `${value.toLocaleString('ru-RU')} тыс. ₽`} />
                  <Legend />
                  <Bar dataKey="budget" fill="#E4002B" name="План" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" fill="#BD0024" name="Факт" radius={[4, 4, 0, 0]} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">Нет данных для отображения</p>
          )}
        </CardContent>
      </Card>

      {/* Events Over Budget Table */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Мероприятия с превышением бюджета
            {report.eventsOverBudget?.length > 0 && (
              <Badge className="bg-red-500 text-white ml-2">{report.eventsOverBudget.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {report.eventsOverBudget?.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Мероприятие</TableHead>
                    <TableHead className="text-right">Бюджет</TableHead>
                    <TableHead className="text-right">Факт</TableHead>
                    <TableHead className="text-right">Превышение</TableHead>
                    <TableHead className="text-right">% перерасхода</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.eventsOverBudget.map((ev: any) => (
                    <TableRow key={ev.id} className="crm-table-row-accent">
                      <TableCell className="font-medium text-sm max-w-[250px] truncate">{ev.title}</TableCell>
                      <TableCell className="text-right">{formatCurrency(ev.budget)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(ev.actualCost)}</TableCell>
                      <TableCell className="text-right text-red-600 font-semibold">{formatCurrency(ev.overrun)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive" className="text-xs">+{ev.overrunPercent}%</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[ev.status] || ''}`}>
                          {STATUS_LABELS[ev.status] || ev.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircle2 className="h-10 w-10 mx-auto text-green-500 mb-2" />
              <p className="text-sm text-muted-foreground">Нет мероприятий с превышением бюджета</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Status Summary */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Banknote className="h-5 w-5 text-[#E4002B]" />Статусы оплат</CardTitle>
          <CardDescription>Сводка по статусам платежей</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(PAYMENT_STATUS_MAP).map(([key, info]) => {
              const data = report.paymentStatusSummary?.[key];
              return (
                <div key={key} className={`border rounded-xl p-4 ${info.color.split(' ').find(c => c.startsWith('bg-'))?.replace('bg-', '') || ''}`}>
                  <p className="text-xs font-medium opacity-80">{info.label}</p>
                  <p className="text-2xl font-bold mt-1">{data?.count || 0}</p>
                  <p className="text-xs mt-1 opacity-70">{formatCurrency(data?.amount || 0)}</p>
                  {key === 'overdue' && (data?.count || 0) > 0 && (
                    <Badge variant="destructive" className="text-[10px] mt-2">Требует внимания</Badge>
                  )}
                </div>
              );
            })}
          </div>
          {report.overduePayments > 0 && (
            <div className="mt-3 flex items-center gap-2 p-3 border border-red-200 rounded-lg bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">Просроченных платежей: <strong>{report.overduePayments}</strong></p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget by Status */}
      <Card className="shadow-sm border-0">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-5 w-5 text-[#E4002B]" />Бюджет по статусам мероприятий</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Статус</TableHead>
                  <TableHead className="text-right">Кол-во</TableHead>
                  <TableHead className="text-right">Бюджет</TableHead>
                  <TableHead className="text-right">Факт</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(report.statusBudgets || {}).map(([status, data]: [string, any]) => (
                  <TableRow key={status} className="crm-table-row-accent">
                    <TableCell className="font-medium text-sm">{status}</TableCell>
                    <TableCell className="text-right">{data.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.budget)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(data.actual)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface AdminCabinetViewProps {
  events: EventData[];
  users: UserData[];
  setUsers: (users: UserData[]) => void;
  pendingUsers: UserData[];
  setPendingUsers: (users: UserData[]) => void;
  adminTab: string;
  setAdminTab: (tab: string) => void;
  auditLogs: any[];
  auditTotal: number;
  auditFilterAction: string;
  setAuditFilterAction: (action: string) => void;
  auditFilterEntity: string;
  setAuditFilterEntity: (entity: string) => void;
  adminEventStatusFilter: string;
  setAdminEventStatusFilter: (filter: string) => void;
  adminEventSearch: string;
  setAdminEventSearch: (search: string) => void;
  adminEditingEvent: EventData | null;
  setAdminEditingEvent: (event: EventData | null) => void;
  showAdminEventDialog: boolean;
  setShowAdminEventDialog: (show: boolean) => void;
  showUserDialog: boolean;
  setShowUserDialog: (show: boolean) => void;
  editingUser: UserData | null;
  setEditingUser: (user: UserData | null) => void;
  adminSettings: {
    appName: string;
    appDescription: string;
    defaultBudget: string;
    defaultParticipants: string;
    notificationsEnabled: string;
    emailNotifications: string;
  };
  setAdminSettings: (settings: any) => void;
  fetchEvents: () => void;
  fetchUsers: () => void;
  fetchPendingUsers: () => void;
  fetchAuditLogs: () => void;
  handleUserApproval: (userId: string, action: 'approve' | 'reject', userName: string) => Promise<void>;
  setSelectedEvent: (event: EventData | null) => void;
  setShowEventDialog: (show: boolean) => void;
  setShowCreateDialog: (show: boolean) => void;
  user: any;
}

export function AdminCabinetView({
  events,
  users,
  setUsers,
  pendingUsers,
  setPendingUsers,
  adminTab,
  setAdminTab,
  auditLogs,
  auditTotal,
  auditFilterAction,
  setAuditFilterAction,
  auditFilterEntity,
  setAuditFilterEntity,
  adminEventStatusFilter,
  setAdminEventStatusFilter,
  adminEventSearch,
  setAdminEventSearch,
  adminEditingEvent,
  setAdminEditingEvent,
  showAdminEventDialog,
  setShowAdminEventDialog,
  showUserDialog,
  setShowUserDialog,
  editingUser,
  setEditingUser,
  adminSettings,
  setAdminSettings,
  fetchEvents,
  fetchUsers,
  fetchPendingUsers,
  fetchAuditLogs,
  handleUserApproval,
  setSelectedEvent,
  setShowEventDialog,
  setShowCreateDialog,
  user,
}: AdminCabinetViewProps) {
  const deptUsersFn = (dept: string) => users.filter(u => u.department === dept);
  const adminUsers = users.filter(u => u.role === 'admin');
  const managerUsers = users.filter(u => u.role === 'manager');
  const employeeUsers = users.filter(u => u.role === 'employee');

  // Pagination state
  const ITEMS_PER_PAGE = 10;
  const [usersPage, setUsersPage] = useState(1);
  const [eventsPage, setEventsPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);

  // Bulk action state
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isApprovingAll, setIsApprovingAll] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Filtered events for admin events tab
  const adminFilteredEvents = events.filter(e => {
    if (adminEventStatusFilter !== 'all' && e.status !== adminEventStatusFilter) return false;
    if (adminEventSearch) {
      const q = adminEventSearch.toLowerCase();
      return (e.title?.toLowerCase().includes(q) || e.uin?.toLowerCase().includes(q) || e.customerName?.toLowerCase().includes(q) || e.venue?.toLowerCase().includes(q));
    }
    return true;
  });

  // Department stats
  const deptStats = DEPARTMENTS.filter(d => d.id !== 'dashboard').map(d => ({
    ...d,
    userCount: users.filter(u => u.department === d.id).length,
    eventCount: events.length,
  }));

  // Paginated data
  const paginatedUsers = users.slice((usersPage - 1) * ITEMS_PER_PAGE, usersPage * ITEMS_PER_PAGE);
  const totalPagesUsers = Math.max(1, Math.ceil(users.length / ITEMS_PER_PAGE));

  const paginatedEvents = adminFilteredEvents.slice((eventsPage - 1) * ITEMS_PER_PAGE, eventsPage * ITEMS_PER_PAGE);
  const totalPagesEvents = Math.max(1, Math.ceil(adminFilteredEvents.length / ITEMS_PER_PAGE));

  const paginatedAuditLogs = auditLogs.slice((auditPage - 1) * ITEMS_PER_PAGE, auditPage * ITEMS_PER_PAGE);
  const totalPagesAudit = Math.max(1, Math.ceil(auditLogs.length / ITEMS_PER_PAGE));

  // Reset page when filters change
  useEffect(() => { setUsersPage(1); }, [users.length]);
  useEffect(() => { setEventsPage(1); }, [adminEventStatusFilter, adminEventSearch]);
  useEffect(() => { setAuditPage(1); }, [auditFilterAction, auditFilterEntity]);

  // Toggle event selection
  const toggleEventSelection = useCallback((eventId: string) => {
    setSelectedEventIds(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  }, []);

  const toggleAllEvents = useCallback(() => {
    if (selectedEventIds.size === paginatedEvents.length) {
      setSelectedEventIds(new Set());
    } else {
      setSelectedEventIds(new Set(paginatedEvents.map(e => e.id)));
    }
  }, [selectedEventIds.size, paginatedEvents]);

  // Bulk delete events
  const handleBulkDeleteEvents = async () => {
    if (selectedEventIds.size === 0) return;
    setIsBulkDeleting(true);
    try {
      let deleted = 0;
      for (const eventId of selectedEventIds) {
        const res = await apiFetch(`/api/events/${eventId}`, { method: 'DELETE' });
        if (res.ok) deleted++;
      }
      toast({ title: `Удалено мероприятий: ${deleted}` });
      setSelectedEventIds(new Set());
      fetchEvents();
    } catch {
      toast({ title: 'Ошибка при удалении', variant: 'destructive' });
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Approve all pending users
  const handleApproveAll = async () => {
    if (pendingUsers.length === 0) return;
    setIsApprovingAll(true);
    try {
      let approved = 0;
      for (const u of pendingUsers) {
        const res = await apiFetch('/api/users/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: u.id, action: 'approve' }),
        });
        if (res.ok) approved++;
      }
      toast({ title: `Одобрено пользователей: ${approved}` });
      fetchPendingUsers();
      fetchUsers();
    } catch {
      toast({ title: 'Ошибка при одобрении', variant: 'destructive' });
    } finally {
      setIsApprovingAll(false);
    }
  };

  // Save settings helper — persists to backend
  const saveSettings = async (newSettings: typeof adminSettings) => {
    setIsSavingSettings(true);
    try {
      setAdminSettings(newSettings);
      const res = await apiFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: newSettings }),
      });
      if (res.ok) {
        toast({ title: 'Настройки сохранены' });
      } else {
        // Fallback to localStorage if backend fails
        try { localStorage.setItem('senez_admin_settings', JSON.stringify(newSettings)); } catch {}
        toast({ title: 'Настройки сохранены локально', description: 'Не удалось сохранить на сервере' });
      }
    } catch {
      try { localStorage.setItem('senez_admin_settings', JSON.stringify(newSettings)); } catch {}
      toast({ title: 'Настройки сохранены локально', description: 'Не удалось сохранить на сервере' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Pagination component
  const PaginationControls = ({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (p: number) => void }) => (
    <div className="flex items-center justify-between py-2">
      <p className="text-xs text-muted-foreground">
        Страница {page} из {totalPages}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-7 px-2" disabled={page <= 1} onClick={() => setPage(page - 1)}>
          <ChevronLeft className="h-3 w-3" />
        </Button>
        <Button variant="outline" size="sm" className="h-7 px-2" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-red-500" />Кабинет администратора</h2>
          <p className="text-sm text-muted-foreground">Полное управление системой CRM Сенеж</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="crm-gradient-card border-0 shadow-sm crm-shadow-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-100 text-red-600"><ShieldCheck className="h-5 w-5" /></div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Администраторы</p>
                <p className="text-xl font-bold">{adminUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="crm-gradient-card border-0 shadow-sm crm-shadow-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600"><UserCog className="h-5 w-5" /></div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Руководители</p>
                <p className="text-xl font-bold">{managerUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="crm-gradient-card border-0 shadow-sm crm-shadow-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600"><Users className="h-5 w-5" /></div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Сотрудники</p>
                <p className="text-xl font-bold">{employeeUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="crm-gradient-card border-0 shadow-sm crm-shadow-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[#FFE0E5] text-[#E4002B]"><Calendar className="h-5 w-5" /></div>
              <div>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Мероприятий</p>
                <p className="text-xl font-bold">{events.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={adminTab} onValueChange={setAdminTab} className="space-y-4">
        <TabsList className="flex w-full overflow-x-auto crm-scroll sm:grid sm:grid-cols-6 gap-1 p-1">
          <TabsTrigger value="pending" className="flex items-center gap-1.5 relative min-h-[44px]">
            <UserCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Заявки</span>
            {pendingUsers.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#E4002B] text-white text-[10px] flex items-center justify-center font-bold">{pendingUsers.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-1.5 min-h-[44px]"><Users className="h-4 w-4" /><span className="hidden sm:inline">Пользователи</span></TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-1.5 min-h-[44px]"><Calendar className="h-4 w-4" /><span className="hidden sm:inline">Мероприятия</span></TabsTrigger>
          <TabsTrigger value="finance" className="flex items-center gap-1.5 min-h-[44px]"><Banknote className="h-4 w-4" /><span className="hidden sm:inline">Финансы</span></TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-1.5 min-h-[44px]"><ClipboardList className="h-4 w-4" /><span className="hidden sm:inline">Аудит</span></TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1.5 min-h-[44px]"><Settings className="h-4 w-4" /><span className="hidden sm:inline">Настройки</span></TabsTrigger>
        </TabsList>

        {/* ====== PENDING APPROVAL TAB ====== */}
        <TabsContent value="pending" className="space-y-4">
          {pendingUsers.length === 0 ? (
            <Card className="shadow-sm border-0">
              <CardContent className="p-8 text-center">
                <UserCheck className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <h3 className="text-lg font-semibold text-muted-foreground">Нет ожидающих заявок</h3>
                <p className="text-sm text-muted-foreground mt-1">Все зарегистрированные пользователи одобрены</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-sm border-0">
              <CardHeader>
                <div className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-amber-500" />
                    Заявки на регистрацию
                    <Badge className="bg-[#E4002B] text-white ml-2">{pendingUsers.length}</Badge>
                  </CardTitle>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" disabled={isApprovingAll}>
                        {isApprovingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Одобрить всех
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Одобрить все заявки?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Вы собираетесь одобрить {pendingUsers.length} {pendingUsers.length === 1 ? 'заявку' : pendingUsers.length < 5 ? 'заявки' : 'заявок'} на регистрацию. Все пользователи получат доступ к системе.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction className="bg-emerald-600 hover:bg-emerald-700" onClick={handleApproveAll}>
                          Одобрить всех
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingUsers.map(u => (
                    <div key={u.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border bg-amber-50/50 border-amber-200 overflow-hidden">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-sm font-bold shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[10px]">
                              {DEPARTMENTS.find(d => d.id === u.department)?.shortName || u.department || '—'}
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {USER_ROLE_LABELS[u.role as UserRole] || u.role}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => handleUserApproval(u.id, 'approve', u.name)}>
                          <CheckCircle2 className="h-4 w-4" /> Одобрить
                        </Button>
                        <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => {
                          if (confirm(`Отклонить заявку от ${u.name}?`)) {
                            handleUserApproval(u.id, 'reject', u.name);
                          }
                        }}>
                          <XCircle className="h-4 w-4" /> Отклонить
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ====== USERS TAB ====== */}
        <TabsContent value="users" className="space-y-4">
          {/* Users by department */}
          <Card className="shadow-sm border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-5 w-5 text-[#E4002B]" />Пользователи по подразделениям</CardTitle>
              <Button size="sm" className="bg-[#E4002B] hover:bg-[#BD0024] crm-btn-hover" onClick={() => { setEditingUser(null); setShowUserDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" />Добавить
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['methodology', 'coordination', 'agd', 'organization', 'analytics'].map(dept => {
                  const deptInfo = DEPARTMENTS.find(d => d.id === dept);
                  const deptUserList = deptUsersFn(dept);
                  if (deptUserList.length === 0) return null;
                  return (
                    <div key={dept} className="border rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline" className="text-xs">{deptInfo?.shortName || dept}</Badge>
                        <span className="text-xs text-muted-foreground">{deptUserList.length} пользователей</span>
                      </div>
                      {deptUserList.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {deptUserList.map(u => (
                            <div key={u.id} className="flex items-center gap-2 p-2 rounded-lg border bg-white overflow-hidden">
                              <div className="w-8 h-8 rounded-full bg-[#FFE0E5] text-[#E4002B] flex items-center justify-center text-xs font-bold shrink-0">
                                {u.name.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium truncate">{u.name}</p>
                                <p className="text-[10px] sm:text-[10px] text-muted-foreground truncate">{u.email}</p>
                              </div>
                              <Badge variant="outline" className={`text-[10px] px-1.5 ${USER_ROLE_COLORS[u.role as UserRole] || ''}`}>
                                {USER_ROLE_LABELS[u.role as UserRole] || u.role}
                              </Badge>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingUser(u); setShowUserDialog(true); }}>
                                <Edit className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Нет пользователей</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* All Users Table */}
          <Card className="shadow-sm border-0">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-5 w-5 text-[#E4002B]" />Все пользователи <span className="text-xs text-muted-foreground font-normal">({users.length})</span></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Имя</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead>Подразделение</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map(u => (
                      <TableRow key={u.id} className="crm-table-row-accent">
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${USER_ROLE_COLORS[u.role as UserRole] || ''}`}>
                            {USER_ROLE_LABELS[u.role as UserRole] || u.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {DEPARTMENTS.find(d => d.id === u.department)?.shortName || u.department || '—'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {!u.isApproved ? (
                            <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-300">
                              Ожидает
                            </Badge>
                          ) : (
                            <Badge variant="outline" className={`text-[10px] ${u.isActive ? 'bg-green-50 text-green-700 border-green-300' : 'bg-red-50 text-red-700 border-red-300'}`}>
                              {u.isActive ? 'Активен' : 'Отключен'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setEditingUser(u); setShowUserDialog(true); }}>
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={async () => {
                              if (confirm(`Отключить пользователя ${u.name}?`)) {
                                await apiFetch(`/api/users/${u.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: false }) });
                                fetchUsers();
                                toast({ title: 'Пользователь отключен' });
                              }
                            }}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <PaginationControls page={usersPage} totalPages={totalPagesUsers} setPage={setUsersPage} />
            </CardContent>
          </Card>

          {/* User Create/Edit Dialog */}
          <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
            <DialogContent className="max-w-[95vw] sm:max-w-md crm-dialog-enter crm-dialog-glow">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5 text-[#E4002B]" />
                  {editingUser ? 'Редактировать пользователя' : 'Новый пользователь'}
                </DialogTitle>
              </DialogHeader>
              <UserForm user={editingUser} onClose={() => { setShowUserDialog(false); setEditingUser(null); }} onSave={() => { setShowUserDialog(false); setEditingUser(null); fetchUsers(); }} />
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ====== EVENTS MANAGEMENT TAB ====== */}
        <TabsContent value="events" className="space-y-4">
          <Card className="shadow-sm border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base flex items-center gap-2"><Calendar className="h-5 w-5 text-[#E4002B]" />Все мероприятия <span className="text-xs text-muted-foreground font-normal">({adminFilteredEvents.length})</span></CardTitle>
              <div className="flex items-center gap-2">
                {selectedEventIds.size > 0 && (
                  <Button size="sm" variant="destructive" className="gap-1.5" disabled={isBulkDeleting} onClick={handleBulkDeleteEvents}>
                    {isBulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Удалить ({selectedEventIds.size})
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => fetchEvents()}>
                  <RefreshCw className="h-4 w-4 mr-1" />Обновить
                </Button>
                <Button size="sm" className="bg-[#E4002B] hover:bg-[#BD0024] crm-btn-hover" onClick={() => { setSelectedEvent(null); setShowCreateDialog(true); }}>
                  <Plus className="h-4 w-4 mr-1" />Создать
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <Input placeholder="Поиск мероприятий..." value={adminEventSearch} onChange={e => setAdminEventSearch(e.target.value)} className="h-9" />
                </div>
                <Select value={adminEventStatusFilter} onValueChange={setAdminEventStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] h-9"><SelectValue placeholder="Статус" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все статусы</SelectItem>
                    {Object.entries(STATUS_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Events table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={paginatedEvents.length > 0 && selectedEventIds.size === paginatedEvents.length}
                          onCheckedChange={toggleAllEvents}
                        />
                      </TableHead>
                      <TableHead className="min-w-[200px]">Название</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Даты</TableHead>
                      <TableHead>Бюджет</TableHead>
                      <TableHead>Площадка</TableHead>
                      <TableHead>Участники</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminFilteredEvents.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Мероприятия не найдены</TableCell></TableRow>
                    ) : paginatedEvents.map(ev => (
                      <TableRow key={ev.id} className="crm-table-row-accent">
                        <TableCell>
                          <Checkbox
                            checked={selectedEventIds.has(ev.id)}
                            onCheckedChange={() => toggleEventSelection(ev.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-medium text-xs sm:text-sm truncate max-w-[180px] sm:max-w-[200px]">{ev.title}</p>
                            {ev.uin && <p className="text-[10px] text-muted-foreground">УИН: {ev.uin}</p>}
                            {ev.tags && <div className="flex flex-wrap gap-0.5 mt-1">{ev.tags.split(',').slice(0, 2).map((t, i) => <Badge key={i} variant="outline" className="text-[9px] px-1 py-0">{t.trim()}</Badge>)}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select value={ev.status} onValueChange={async (newStatus) => {
                            try {
                              const res = await apiFetch(`/api/events/${ev.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus, changedBy: user?.name || 'Админ' }) });
                              if (res.ok) { fetchEvents(); toast({ title: 'Статус обновлен' }); }
                            } catch { toast({ title: 'Ошибка', variant: 'destructive' }); }
                          }}>
                            <SelectTrigger className="h-7 w-auto border-0 p-0">
                              <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[ev.status] || ''}`}>
                                {STATUS_LABELS[ev.status] || ev.status}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                <SelectItem key={key} value={key}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {ev.startDate ? formatDate(ev.startDate) : '—'}
                          {ev.endDate ? <span> — {formatDate(ev.endDate)}</span> : ''}
                        </TableCell>
                        <TableCell className="text-sm">
                          {ev.budget ? formatCurrency(ev.budget) : '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                          {ev.venue || '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {ev.participantCount || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip><TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setAdminEditingEvent(ev); setShowAdminEventDialog(true); }}>
                                <Edit className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger><TooltipContent>Редактировать</TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedEvent(ev); setShowEventDialog(true); }}>
                                <Eye className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger><TooltipContent>Просмотр</TooltipContent></Tooltip>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Удалить мероприятие?</AlertDialogTitle>
                                  <AlertDialogDescription>Мероприятие &laquo;{ev.title}&raquo; будет удалено без возможности восстановления. Все связанные данные (спикеры, бюджет, задачи и т.д.) будут также удалены.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                                  <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
                                    try {
                                      const res = await apiFetch(`/api/events/${ev.id}`, { method: 'DELETE' });
                                      if (res.ok) { fetchEvents(); toast({ title: 'Мероприятие удалено' }); }
                                    } catch { toast({ title: 'Ошибка удаления', variant: 'destructive' }); }
                                  }}>Удалить</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">Всего: {adminFilteredEvents.length} из {events.length} мероприятий</p>
                <PaginationControls page={eventsPage} totalPages={totalPagesEvents} setPage={setEventsPage} />
              </div>
            </CardContent>
          </Card>

          {/* Admin Event Edit Dialog */}
          <Dialog open={showAdminEventDialog} onOpenChange={setShowAdminEventDialog}>
            <DialogContent className="max-w-[95vw] sm:max-w-2xl crm-dialog-enter crm-dialog-glow max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5 text-[#E4002B]" />
                  Редактирование мероприятия
                </DialogTitle>
                <DialogDescription>Измените данные мероприятия. Все изменения будут сохранены мгновенно.</DialogDescription>
              </DialogHeader>
              {adminEditingEvent && <AdminEventEditForm event={adminEditingEvent} onClose={() => { setShowAdminEventDialog(false); setAdminEditingEvent(null); }} onSave={() => { setShowAdminEventDialog(false); setAdminEditingEvent(null); fetchEvents(); }} />}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ====== FINANCIAL REPORT TAB ====== */}
        <TabsContent value="finance" className="space-y-4">
          <FinancialReportTab events={events} />
        </TabsContent>

        {/* ====== AUDIT LOG TAB ====== */}
        <TabsContent value="audit" className="space-y-4">
          <Card className="shadow-sm border-0">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-5 w-5 text-[#E4002B]" />Журнал аудита</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{auditTotal} записей</span>
                <Button size="sm" variant="outline" onClick={() => fetchAuditLogs()}>
                  <RefreshCw className="h-4 w-4 mr-1" />Обновить
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Audit Filters */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Select value={auditFilterAction} onValueChange={setAuditFilterAction}>
                  <SelectTrigger className="w-full sm:w-[180px] h-9"><SelectValue placeholder="Действие" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все действия</SelectItem>
                    <SelectItem value="CREATED">Создание</SelectItem>
                    <SelectItem value="UPDATED">Обновление</SelectItem>
                    <SelectItem value="DELETED">Удаление</SelectItem>
                    <SelectItem value="ASSIGNED">Назначение</SelectItem>
                    <SelectItem value="UNASSIGNED">Снятие назначения</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={auditFilterEntity} onValueChange={setAuditFilterEntity}>
                  <SelectTrigger className="w-full sm:w-[180px] h-9"><SelectValue placeholder="Тип сущности" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все типы</SelectItem>
                    <SelectItem value="EVENT">Мероприятие</SelectItem>
                    <SelectItem value="USER">Пользователь</SelectItem>
                    <SelectItem value="ASSIGNMENT">Назначение</SelectItem>
                    <SelectItem value="TASK">Задача</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Audit Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата/Время</TableHead>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Действие</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>ID сущности</TableHead>
                      <TableHead>Детали</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAuditLogs.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Записи аудита отсутствуют</TableCell></TableRow>
                    ) : paginatedAuditLogs.map((log: any) => (
                      <TableRow key={log.id} className="crm-table-row-accent">
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString('ru-RU') : '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-[#FFE0E5] text-[#E4002B] flex items-center justify-center text-[10px] font-bold">
                              {log.user?.name?.charAt(0) || '?'}
                            </div>
                            <span className="truncate max-w-[120px]">{log.user?.name || 'Система'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${
                            log.action === 'CREATED' ? 'bg-green-50 text-green-700 border-green-300' :
                            log.action === 'UPDATED' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                            log.action === 'DELETED' ? 'bg-red-50 text-red-700 border-red-300' :
                            log.action === 'ASSIGNED' ? 'bg-amber-50 text-amber-700 border-amber-300' :
                            'bg-gray-50 text-gray-700 border-gray-300'
                          }`}>
                            {log.action === 'CREATED' && 'Создание'}
                            {log.action === 'UPDATED' && 'Обновление'}
                            {log.action === 'DELETED' && 'Удаление'}
                            {log.action === 'ASSIGNED' && 'Назначение'}
                            {log.action === 'UNASSIGNED' && 'Снятие'}
                            {!['CREATED','UPDATED','DELETED','ASSIGNED','UNASSIGNED'].includes(log.action) && log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {log.entityType === 'EVENT' && 'Мероприятие'}
                            {log.entityType === 'USER' && 'Пользователь'}
                            {log.entityType === 'ASSIGNMENT' && 'Назначение'}
                            {log.entityType === 'TASK' && 'Задача'}
                            {!['EVENT','USER','ASSIGNMENT','TASK'].includes(log.entityType) && log.entityType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground font-mono max-w-[100px] truncate">
                          {log.entityId}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                          {log.details ? (() => { try { const d = JSON.parse(log.details); return d.description || d.title || log.details; } catch { return log.details; } })() : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <PaginationControls page={auditPage} totalPages={totalPagesAudit} setPage={setAuditPage} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="settings" className="space-y-4">
          {/* App Settings */}
          <Card className="shadow-sm border-0">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Settings className="h-5 w-5 text-[#E4002B]" />Настройки приложения</CardTitle>
              <CardDescription>Общие параметры системы CRM</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>Название приложения</Label>
                  <Input value={adminSettings.appName} onChange={e => setAdminSettings((s: any) => ({ ...s, appName: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Описание</Label>
                  <Input value={adminSettings.appDescription} onChange={e => setAdminSettings((s: any) => ({ ...s, appDescription: e.target.value }))} />
                </div>
              </div>
              <Button className="bg-[#E4002B] hover:bg-[#BD0024]" disabled={isSavingSettings} onClick={() => saveSettings(adminSettings)}>
                {isSavingSettings ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Сохранение...</> : 'Сохранить настройки'}
              </Button>
            </CardContent>
          </Card>

          {/* Default values for new events */}
          <Card className="shadow-sm border-0">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Target className="h-5 w-5 text-[#E4002B]" />Значения по умолчанию</CardTitle>
              <CardDescription>Настройки для новых мероприятий</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label>Бюджет по умолчанию (₽)</Label>
                  <Input type="number" value={adminSettings.defaultBudget} onChange={e => setAdminSettings((s: any) => ({ ...s, defaultBudget: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Кол-во участников по умолчанию</Label>
                  <Input type="number" value={adminSettings.defaultParticipants} onChange={e => setAdminSettings((s: any) => ({ ...s, defaultParticipants: e.target.value }))} />
                </div>
              </div>
              <Button className="bg-[#E4002B] hover:bg-[#BD0024]" disabled={isSavingSettings} onClick={() => saveSettings(adminSettings)}>
                {isSavingSettings ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Сохранение...</> : 'Сохранить'}
              </Button>
            </CardContent>
          </Card>

          {/* Notification settings */}
          <Card className="shadow-sm border-0">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Bell className="h-5 w-5 text-[#E4002B]" />Уведомления</CardTitle>
              <CardDescription>Настройки системы уведомлений</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Уведомления в системе</p>
                  <p className="text-xs text-muted-foreground">Показывать уведомления при изменениях</p>
                </div>
                <Checkbox checked={adminSettings.notificationsEnabled === 'true'} onCheckedChange={c => setAdminSettings((s: any) => ({ ...s, notificationsEnabled: c ? 'true' : 'false' }))} />
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">Email-уведомления</p>
                  <p className="text-xs text-muted-foreground">Отправлять уведомления на email</p>
                </div>
                <Checkbox checked={adminSettings.emailNotifications === 'true'} onCheckedChange={c => setAdminSettings((s: any) => ({ ...s, emailNotifications: c ? 'true' : 'false' }))} />
              </div>
              <Button className="bg-[#E4002B] hover:bg-[#BD0024]" disabled={isSavingSettings} onClick={() => saveSettings(adminSettings)}>
                {isSavingSettings ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Сохранение...</> : 'Сохранить'}
              </Button>
            </CardContent>
          </Card>

          {/* Department Management */}
          <Card className="shadow-sm border-0">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-5 w-5 text-[#E4002B]" />Подразделения</CardTitle>
              <CardDescription>Информация о подразделениях и их руководителях</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deptStats.map(d => {
                  const deptManager = users.find(u => u.department === d.id && u.role === 'manager');
                  const deptEmpCount = users.filter(u => u.department === d.id).length;
                  return (
                    <div key={d.id} className="border rounded-xl p-3 sm:p-4 overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-[#FFF1F3] text-[#E4002B]">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold truncate">{d.name}</p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">{d.shortName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-center">
                            <p className="text-lg font-bold">{deptEmpCount}</p>
                            <p className="text-[10px] text-muted-foreground">Сотрудников</p>
                          </div>
                          <Separator orientation="vertical" className="h-8" />
                          <div className="text-center">
                            <p className="text-xs sm:text-sm font-medium truncate">{deptManager?.name || 'Не назначен'}</p>
                            <p className="text-[10px] text-muted-foreground">Руководитель</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
