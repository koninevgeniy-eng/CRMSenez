'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  FileSpreadsheet, RefreshCw, Users, TrendingUp, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DEPARTMENTS, EventData, EventStatus, STATUS_LABELS, UserData } from '@/lib/crm-types';
import { getStatusLabel, getStatusColor, formatDate, formatCurrency, formatNumber } from '@/lib/crm-utils';
import { apiFetch } from '@/lib/api-fetch';
import { exportWorkbook } from '@/lib/excel-client';
import { toast } from '@/hooks/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';

const CHART_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const getStageLabel = (stage: string) => STATUS_LABELS[stage as EventStatus] || stage;
const ALL_FILTER_VALUE = 'all';
const DEPARTMENT_STATUS_FILTERS: Record<string, EventStatus[]> = {
  methodology: ['draft', 'methodology_review', 'revision_requested', 'methodology_actual_budget_review', 'pending_approval', 'pending_actual_budget', 'rejected'],
  coordination: ['coordination_budget_review', 'uin_assignment', 'coordination_actual_budget_review', 'budget_approved', 'uin_assigned', 'pending_actual_approval', 'actual_budget_approved'],
  agd: ['agd_date_review', 'calendar_approved', 'approved'],
  organization: ['organization_assignment', 'in_progress', 'event_finished'],
  analytics: ['actual_budget_approved', 'archived', 'completed'],
};

interface AnalyticsViewProps {
  events: EventData[];
  analyticsData: any;
  users?: UserData[];
}

export function AnalyticsView({
  events,
  analyticsData: initialAnalyticsData,
  users = [],
}: AnalyticsViewProps) {
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState({
    year: ALL_FILTER_VALUE,
    from: '',
    to: '',
    status: ALL_FILTER_VALUE,
    department: ALL_FILTER_VALUE,
    ownerId: ALL_FILTER_VALUE,
  });
  const [liveAnalyticsData, setLiveAnalyticsData] = useState<any>(initialAnalyticsData);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    setLiveAnalyticsData(initialAnalyticsData);
  }, [initialAnalyticsData]);

  const analyticsQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.year !== ALL_FILTER_VALUE) params.set('year', filters.year);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.status !== ALL_FILTER_VALUE) params.set('status', filters.status);
    if (filters.department !== ALL_FILTER_VALUE) params.set('department', filters.department);
    if (filters.ownerId !== ALL_FILTER_VALUE) params.set('ownerId', filters.ownerId);
    const query = params.toString();
    return query ? `?${query}` : '';
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    setAnalyticsLoading(true);
    apiFetch(`/api/analytics${analyticsQuery}`)
      .then(res => res.ok ? res.json() : Promise.reject(new Error('analytics_failed')))
      .then(data => {
        if (!cancelled) setLiveAnalyticsData(data);
      })
      .catch(() => {
        if (!cancelled) {
          toast({ title: 'Не удалось обновить аналитику', variant: 'destructive' });
        }
      })
      .finally(() => {
        if (!cancelled) setAnalyticsLoading(false);
      });
    return () => { cancelled = true; };
  }, [analyticsQuery]);

  const analyticsData = liveAnalyticsData || initialAnalyticsData;
  const availableYears = useMemo(() => {
    const years = new Set<number>([currentYear]);
    events.forEach(event => {
      if (event.startDate) {
        const year = new Date(event.startDate).getFullYear();
        if (Number.isFinite(year)) years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [currentYear, events]);

  const userById = useMemo(() => new Map(users.map(user => [user.id, user])), [users]);
  const ownerOptions = useMemo(() => {
    const ownerIds = new Set(events.map(event => event.ownerId).filter(Boolean) as string[]);
    return Array.from(ownerIds).map(ownerId => ({
      id: ownerId,
      label: userById.get(ownerId)?.name || `ID ${ownerId.slice(0, 8)}`,
    }));
  }, [events, userById]);

  const filteredEvents = useMemo(() => events.filter(event => {
    if (filters.status !== ALL_FILTER_VALUE) {
      if (event.status !== filters.status) return false;
    } else if (filters.department !== ALL_FILTER_VALUE) {
      const departmentStatuses = DEPARTMENT_STATUS_FILTERS[filters.department] || [];
      if (departmentStatuses.length > 0 && !departmentStatuses.includes(event.status)) return false;
    }
    if (filters.ownerId !== ALL_FILTER_VALUE && event.ownerId !== filters.ownerId) return false;

    if (filters.year !== ALL_FILTER_VALUE || filters.from || filters.to) {
      if (!event.startDate) return false;
      const startDate = new Date(event.startDate);
      if (filters.year !== ALL_FILTER_VALUE && startDate.getFullYear() !== Number(filters.year)) return false;
      if (filters.from) {
        const fromDate = new Date(filters.from);
        fromDate.setHours(0, 0, 0, 0);
        if (startDate < fromDate) return false;
      }
      if (filters.to) {
        const toDate = new Date(filters.to);
        toDate.setHours(23, 59, 59, 999);
        if (startDate > toDate) return false;
      }
    }
    return true;
  }), [events, filters]);

  const activeFiltersCount = [
    filters.year !== ALL_FILTER_VALUE,
    Boolean(filters.from),
    Boolean(filters.to),
    filters.status !== ALL_FILTER_VALUE,
    filters.department !== ALL_FILTER_VALUE,
    filters.ownerId !== ALL_FILTER_VALUE,
  ].filter(Boolean).length;

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      year: ALL_FILTER_VALUE,
      from: '',
      to: '',
      status: ALL_FILTER_VALUE,
      department: ALL_FILTER_VALUE,
      ownerId: ALL_FILTER_VALUE,
    });
  };

  if (!analyticsData) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-24 crm-skeleton" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        {[1,2].map(i => <div key={i} className="h-64 crm-skeleton" />)}
      </div>
    </div>
  );

  const statusData = Object.entries(analyticsData.eventsByStatus || {}).map(([name, value]) => ({
    name: STATUS_LABELS[name as EventStatus] || name,
    value: value as number,
  }));

  const budgetCategoryData = Object.entries(analyticsData.budgetByCategory || {}).map(([name, values]: [string, any]) => ({
    name,
    planned: values.planned,
    actual: values.actual,
  }));

  const workloadData = Object.entries(analyticsData.workloadByAssignee || {}).map(([name, values]: [string, any]) => ({
    name,
    total: values.total,
    completed: values.completed,
  }));

  const speakerData = (analyticsData.speakerCosts || []).slice(0, 8).map((s: any) => ({
    name: s.name,
    cost: s.cost,
  }));

  const monthData = Object.entries(analyticsData.eventsByMonth || {}).map(([name, value]) => ({
    name,
    count: value as number,
  }));

  const fundingData = Object.entries(analyticsData.budgetByFunding || {}).map(([name, value]) => ({
    name,
    value: value as number,
  }));

  const budgetEfficiency = analyticsData.totalBudget > 0
    ? ((analyticsData.totalBudget - (analyticsData.totalActualCost || 0)) / analyticsData.totalBudget * 100).toFixed(1)
    : '—';
  const participantAnalytics = analyticsData.participantAnalytics || {};
  const processAnalytics = analyticsData.processAnalytics || {};
  const workloadAnalytics = analyticsData.workloadAnalytics || {};
  const versionAnalytics = analyticsData.versionAnalytics || {};
  const dataQualityAnalytics = analyticsData.dataQualityAnalytics || {};
  const approvalQueueData = Object.entries(processAnalytics.currentApprovalQueue || {}).map(([name, value]) => ({
    name: getStageLabel(name),
    value: value as number,
  }));
  const revisionStageData = Object.entries(processAnalytics.revisionByStage || {})
    .map(([name, value]) => ({
      name: getStageLabel(name),
      revisions: value as number,
    }))
    .filter(item => item.revisions > 0);
  const versionReasonData = Object.entries(versionAnalytics.versionReasonCounts || {}).map(([name, value]) => ({
    name,
    value: value as number,
  }));
  const dataQualityIssueData = Object.entries(dataQualityAnalytics.issueCounts || {}).map(([name, value]) => ({
    name,
    value: value as number,
  }));
  const employeeAssignmentData = Object.entries(workloadAnalytics.eventAssignmentsByEmployee || {}).map(([name, values]: [string, any]) => ({
    name,
    total: values.total,
    lead: values.lead,
    support: values.support,
    department: values.department,
  }));

  const handleRosmolodezhReport = async () => {
    try {
      const completedEvents = filteredEvents.filter(e => e.status === 'completed' || e.status === 'actual_budget_approved' || e.uin);
      const data = [
        ['ОТЧЁТ ДЛЯ РОСМОЛОДЁЖИ', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['УИН', 'Наименование мероприятия', 'Дата начала', 'Дата окончания', 'Участников', 'Площадка', 'Бюджет (₽)', 'NPS'],
        ...completedEvents.map(e => [
          e.uin || '—',
          e.title,
          e.startDate ? formatDate(e.startDate) : '—',
          e.endDate ? formatDate(e.endDate) : '—',
          e.participantCount || '—',
          e.venue || '—',
          e.budget || '—',
          e.npsScore || '—',
        ]),
        ['', '', '', '', '', '', '', ''],
        ['ИТОГО:', '', '', '', completedEvents.reduce((s, e) => s + (e.participantCount || 0), 0), '', completedEvents.reduce((s, e) => s + (e.budget || 0), 0), ''],
      ];
      await exportWorkbook(
        `Отчёт_Росмолодёжь_${new Date().toLocaleDateString('ru-RU').replace(/\./g, '-')}.xlsx`,
        [{
          name: 'Отчёт Росмолодежи',
          rows: data,
          columnWidths: [20, 40, 14, 14, 12, 20, 14, 8],
        }]
      );
      toast({ title: 'Отчёт сформирован', description: 'Отчёт для Росмолодёжи экспортирован в Excel' });
    } catch (err) {
      toast({ title: 'Ошибка формирования отчёта', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Аналитика</h2>
          <p className="text-muted-foreground text-sm mt-1">Анализ мероприятий и нагрузки сотрудников с фильтрами по периоду и процессу</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleRosmolodezhReport}>
          <FileSpreadsheet className="h-3.5 w-3.5" /> Отчёт Росмолодёжи
        </Button>
      </div>

      <Card className="shadow-sm border-0">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-sm font-semibold">Фильтры аналитики</p>
              <p className="text-xs text-muted-foreground">
                Сейчас в выборке: {formatNumber(filteredEvents.length)} мероприятий
                {activeFiltersCount > 0 ? `, активных фильтров: ${activeFiltersCount}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {analyticsLoading && (
                <Badge variant="secondary" className="gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Обновление
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={resetFilters} disabled={activeFiltersCount === 0}>
                Сбросить
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">Год</p>
              <Select value={filters.year} onValueChange={(value) => updateFilter('year', value)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Все годы" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>Все годы</SelectItem>
                  {availableYears.map(year => (
                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">Дата с</p>
              <Input type="date" value={filters.from} onChange={(event) => updateFilter('from', event.target.value)} />
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">Дата по</p>
              <Input type="date" value={filters.to} onChange={(event) => updateFilter('to', event.target.value)} />
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">Департамент</p>
              <Select value={filters.department} onValueChange={(value) => updateFilter('department', value)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Все департаменты" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>Все департаменты</SelectItem>
                  {DEPARTMENTS.filter(department => department.id !== 'dashboard').map(department => (
                    <SelectItem key={department.id} value={department.id}>{department.shortName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">Статус</p>
              <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Все статусы" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>Все статусы</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([status, label]) => (
                    <SelectItem key={status} value={status}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground">Владелец</p>
              <Select value={filters.ownerId} onValueChange={(value) => updateFilter('ownerId', value)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Все владельцы" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_FILTER_VALUE}>Все владельцы</SelectItem>
                  {ownerOptions.map(owner => (
                    <SelectItem key={owner.id} value={owner.id}>{owner.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="events" className="space-y-5">
        <TabsList className="grid w-full max-w-xl grid-cols-2">
          <TabsTrigger value="events">Мероприятия</TabsTrigger>
          <TabsTrigger value="workload">Нагрузка сотрудников</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
        <Card className="crm-stat-card emerald crm-gradient-card border-0 crm-shadow-elevated"><CardContent className="p-4 text-center"><p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Всего мероприятий</p><p className="text-3xl font-bold crm-stat-number crm-count-up text-gray-800">{analyticsData.totalEvents}</p></CardContent></Card>
        <Card className="crm-stat-card green crm-gradient-card border-0 crm-shadow-elevated"><CardContent className="p-4 text-center"><p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Завершено</p><p className="text-3xl font-bold crm-stat-number crm-count-up text-[#E4002B]">{analyticsData.completedEvents}</p></CardContent></Card>
        <Card className="crm-stat-card blue crm-gradient-card border-0 crm-shadow-elevated"><CardContent className="p-4 text-center"><p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Общий бюджет</p><p className="text-xl font-bold crm-stat-number crm-count-up text-gray-800">{formatCurrency(analyticsData.totalBudget)}</p></CardContent></Card>
        <Card className="crm-stat-card amber crm-gradient-card border-0 crm-shadow-elevated"><CardContent className="p-4 text-center"><p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Фактические траты</p><p className="text-xl font-bold crm-stat-number crm-count-up text-amber-600">{formatCurrency(analyticsData.totalActualCost)}</p></CardContent></Card>
        <Card className="crm-stat-card green crm-gradient-card border-0 crm-shadow-elevated"><CardContent className="p-4 text-center">
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Эффективность бюджета</p>
          <p className={`text-3xl font-bold crm-stat-number crm-count-up ${budgetEfficiency !== '—' && parseFloat(budgetEfficiency) >= 0 ? 'text-[#E4002B]' : 'text-red-600'}`}>{budgetEfficiency !== '—' ? `${budgetEfficiency}%` : '—'}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Средний NPS: {analyticsData.avgNps ? analyticsData.avgNps.toFixed(1) : '—'}</p>
        </CardContent></Card>
      </div>

      {/* Participants Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="shadow-sm border-0 crm-gradient-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Участников с начала года</p>
                <p className="text-2xl sm:text-3xl font-bold crm-stat-number text-gray-800">{formatNumber(participantAnalytics.ytdParticipants || 0)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">С 1 января по {participantAnalytics.periodEnd ? formatDate(participantAnalytics.periodEnd) : 'сегодня'}</p>
              </div>
              <div className="p-2 rounded-xl bg-[#FFF1F3] text-[#E4002B]"><Users className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-0 crm-gradient-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Прогноз участников на год</p>
                <p className="text-2xl sm:text-3xl font-bold crm-stat-number text-[#E4002B]">{formatNumber(participantAnalytics.forecastYearParticipants || 0)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">По {participantAnalytics.yearEventsCount || 0} мероприятиям до 31 декабря</p>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700"><TrendingUp className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-0 crm-gradient-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Средняя трата на участника</p>
                <p className="text-xl sm:text-2xl font-bold crm-stat-number text-amber-700">{formatCurrency(participantAnalytics.averageSpendPerParticipant || 0)}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Факт. траты: {formatCurrency(participantAnalytics.ytdActualSpend || 0)}</p>
              </div>
              <div className="p-2 rounded-xl bg-amber-50 text-amber-700"><Wallet className="h-5 w-5" /></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Monthly Events Trend - Area Chart */}
        <Card className="shadow-sm border-0 lg:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#E4002B]" />Динамика мероприятий по месяцам</CardTitle></CardHeader>
          <CardContent>
            {monthData.length > 0 ? (
              <div style={{ width: '100%', aspectRatio: '2/1', minHeight: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthData}>
                    <defs>
                      <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} />
                    <RTooltip />
                    <Area type="monotone" dataKey="count" name="Мероприятий" stroke="#10b981" strokeWidth={2} fill="url(#colorEvents)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-center py-12 text-muted-foreground">Нет данных</p>}
          </CardContent>
        </Card>

        {/* Events by Status */}
        <Card className="shadow-sm border-0">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#E4002B]" />Мероприятия по статусам</CardTitle></CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <div style={{ width: '100%', aspectRatio: '1.2/1', minHeight: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" outerRadius="80%" dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {statusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <RTooltip /><Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-center py-12 text-muted-foreground">Нет данных</p>}
          </CardContent>
        </Card>

        {/* Budget by Category */}
        <Card className="shadow-sm border-0">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400" />Бюджет по категориям</CardTitle></CardHeader>
          <CardContent>
            {budgetCategoryData.length > 0 ? (
              <div style={{ width: '100%', aspectRatio: '1.2/1', minHeight: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetCategoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(v) => `${(v/1000).toFixed(0)}к`} />
                    <RTooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Bar dataKey="planned" name="План" fill="#10b981" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="actual" name="Факт" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-center py-12 text-muted-foreground">Нет данных</p>}
          </CardContent>
        </Card>

        {/* Speaker Costs */}
        <Card className="shadow-sm border-0">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-violet-400" />Стоимость спикеров</CardTitle></CardHeader>
          <CardContent>
            {speakerData.length > 0 ? (
              <div style={{ width: '100%', aspectRatio: '1.2/1', minHeight: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={speakerData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `${(v/1000).toFixed(0)}к`} />
                    <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} tickFormatter={(v: string) => v ? (v.length > 18 ? v.substring(0, 16) + '…' : v.replace(/ /g, '\u00A0')) : ''} />
                    <RTooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="cost" name="Стоимость" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-center py-12 text-muted-foreground">Нет данных</p>}
          </CardContent>
        </Card>

      </div>

      {/* Funding Source Chart */}
      {fundingData.length > 0 && (
        <Card className="shadow-sm border-0">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400" />Бюджет по источникам финансирования</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row items-center gap-6">
              <div style={{ width: '100%', aspectRatio: '1.5/1', minHeight: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={fundingData} cx="50%" cy="50%" innerRadius="40%" outerRadius="70%" dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                      {fundingData.map((_, i) => <Cell key={i} fill={['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'][i % 4]} />)}
                    </Pie>
                    <RTooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 w-full lg:w-auto">
                {fundingData.map((f, i) => (
                  <div key={f.name} className="flex items-center justify-between gap-4 p-2 rounded-lg border overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-3 h-3 rounded-full shrink-0 ${['bg-[#E4002B]', 'bg-amber-400', 'bg-blue-400', 'bg-violet-400'][i % 4]}`} />
                      <span className="text-xs sm:text-sm font-medium truncate">{f.name}</span>
                    </div>
                    <span className="text-xs sm:text-sm font-bold">{formatCurrency(f.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Forecast Chart */}
      <Card className="shadow-sm border-0">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#E4002B]" />Прогноз бюджета</CardTitle></CardHeader>
        <CardContent>
          {(() => {
            // Build monthly budget/actual data
            const monthMap: Record<string, { planned: number; actual: number }> = {};
            filteredEvents.forEach(e => {
              if (e.startDate) {
                const d = new Date(e.startDate);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (!monthMap[key]) monthMap[key] = { planned: 0, actual: 0 };
                monthMap[key].planned += e.budget || 0;
                monthMap[key].actual += e.actualCost || 0;
              }
            });
            const sortedMonths = Object.keys(monthMap).sort();
            if (sortedMonths.length === 0) return <p className="text-center py-12 text-muted-foreground">Нет данных для прогноза</p>;

            // Calculate average for forecast
            const totalPlanned = sortedMonths.reduce((s, m) => s + monthMap[m].planned, 0);
            const totalActual = sortedMonths.reduce((s, m) => s + monthMap[m].actual, 0);
            const avgPlanned = totalPlanned / sortedMonths.length;
            const avgActual = totalActual / sortedMonths.length;

            // Generate forecast for 3 additional months
            const lastMonth = new Date(sortedMonths[sortedMonths.length - 1] + '-01');
            const forecastMonths: string[] = [];
            for (let i = 1; i <= 3; i++) {
              const fDate = new Date(lastMonth);
              fDate.setMonth(fDate.getMonth() + i);
              forecastMonths.push(`${fDate.getFullYear()}-${String(fDate.getMonth() + 1).padStart(2, '0')}`);
            }

            const chartData = [
              ...sortedMonths.map(m => ({
                name: new Date(m + '-01').toLocaleString('ru-RU', { month: 'short', year: '2-digit' }),
                planned: monthMap[m].planned,
                actual: monthMap[m].actual,
                forecast: null as number | null,
              })),
              ...forecastMonths.map(m => ({
                name: new Date(m + '-01').toLocaleString('ru-RU', { month: 'short', year: '2-digit' }),
                planned: null as number | null,
                actual: null as number | null,
                forecast: Math.round(avgActual + (avgPlanned - avgActual) * 0.5),
              })),
            ];

            return (
              <div style={{ width: '100%', aspectRatio: '1.2/1', minHeight: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
                      </linearGradient>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02}/>
                      </linearGradient>
                      <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v: number) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}М` : v >= 1000 ? `${(v / 1000).toFixed(0)}К` : String(v)} tick={{ fontSize: 10 }} />
                    <RTooltip formatter={(v: number) => formatCurrency(v)} />
                    <Area type="monotone" dataKey="planned" name="План" stroke="#10b981" strokeWidth={2} fill="url(#colorPlanned)" connectNulls={false} />
                    <Area type="monotone" dataKey="actual" name="Факт" stroke="#f59e0b" strokeWidth={2} fill="url(#colorActual)" connectNulls={false} />
                    <Area type="monotone" dataKey="forecast" name="Прогноз" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="6 3" fill="url(#colorForecast)" connectNulls={false} />
                    <Legend />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* NPS Table */}
      <Card className="shadow-sm border-0">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-[#E4002B]" />NPS и бюджет по мероприятиям</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Мероприятие</TableHead><TableHead>Статус</TableHead><TableHead>NPS</TableHead><TableHead>Бюджет</TableHead><TableHead>Факт</TableHead><TableHead>Отклонение</TableHead><TableHead>Эффективность</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredEvents.filter(e => e.status === 'completed' || e.status === 'actual_budget_approved').map(event => {
                const deviation = event.budget && event.actualCost ? event.budget - event.actualCost : null;
                const efficiency = event.budget && event.actualCost ? ((event.budget - event.actualCost) / event.budget * 100).toFixed(1) : null;
                return (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium max-w-[180px] sm:max-w-[250px] truncate">{event.title}</TableCell>
                    <TableCell><Badge className={`crm-badge ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge></TableCell>
                    <TableCell>
                      {event.npsScore ? (
                        <span className={`font-semibold ${event.npsScore >= 70 ? 'text-[#E4002B]' : event.npsScore >= 40 ? 'text-amber-600' : 'text-red-600'}`}>{event.npsScore}</span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>{formatCurrency(event.budget)}</TableCell>
                    <TableCell>{formatCurrency(event.actualCost)}</TableCell>
                    <TableCell className={deviation !== null && deviation < 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                      {deviation !== null ? formatCurrency(deviation) : '—'}
                    </TableCell>
                    <TableCell>
                      {efficiency !== null ? (
                        <Badge variant={parseFloat(efficiency) >= 0 ? 'default' : 'destructive'} className="text-xs">
                          {efficiency}%
                        </Badge>
                      ) : '—'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Analytics */}
      {analyticsData.paymentAnalytics && (
        <Card className="shadow-sm border-0">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-violet-400" />Аналитика платежей</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-center">
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">Ожидает оплаты</p>
                <p className="text-lg font-bold text-amber-700">{formatCurrency(analyticsData.paymentAnalytics.totalPendingPayments)}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 border border-green-100 text-center">
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">Оплачено</p>
                <p className="text-lg font-bold text-green-700">{formatCurrency(analyticsData.paymentAnalytics.totalPaidPayments)}</p>
              </div>
              <div className="p-3 rounded-lg bg-sky-50 border border-sky-100 text-center">
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">Частично оплачено</p>
                <p className="text-lg font-bold text-sky-700">{formatCurrency(analyticsData.paymentAnalytics.totalPartialPayments)}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-center">
                <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium">Просрочено</p>
                <p className="text-lg font-bold text-red-700">{analyticsData.paymentAnalytics.overdueCount} на {formatCurrency(analyticsData.paymentAnalytics.totalOverdueAmount)}</p>
              </div>
            </div>
            {analyticsData.paymentAnalytics.paymentsByContractor && Object.keys(analyticsData.paymentAnalytics.paymentsByContractor).length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">По подрядчикам</h4>
                <div className="space-y-2">
                  {Object.entries(analyticsData.paymentAnalytics.paymentsByContractor).map(([contractor, data]: [string, any]) => (
                    <div key={contractor} className="flex items-center justify-between p-2 rounded-lg border overflow-hidden gap-2">
                      <div className="min-w-0">
                        <span className="font-medium text-xs sm:text-sm truncate">{contractor}</span>
                        <span className="text-xs text-muted-foreground ml-2">({data.count} платежей)</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs sm:text-sm">{formatCurrency(data.totalAmount)}</span>
                        <span className="text-[10px] sm:text-xs text-green-600">Оплачено: {formatCurrency(data.paidAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="workload" className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            <Card className="crm-stat-card blue crm-gradient-card border-0 crm-shadow-elevated">
              <CardContent className="p-4 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Задач всего</p>
                <p className="text-3xl font-bold crm-stat-number text-gray-800">{workloadAnalytics.totalTasks || 0}</p>
              </CardContent>
            </Card>
            <Card className="crm-stat-card green crm-gradient-card border-0 crm-shadow-elevated">
              <CardContent className="p-4 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Выполнено задач</p>
                <p className="text-3xl font-bold crm-stat-number text-[#E4002B]">{workloadAnalytics.completedTasks || 0}</p>
              </CardContent>
            </Card>
            <Card className="crm-stat-card amber crm-gradient-card border-0 crm-shadow-elevated">
              <CardContent className="p-4 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">На согласовании</p>
                <p className="text-3xl font-bold crm-stat-number text-amber-700">{processAnalytics.currentApprovalTotal || 0}</p>
              </CardContent>
            </Card>
            <Card className="crm-stat-card red crm-gradient-card border-0 crm-shadow-elevated">
              <CardContent className="p-4 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Возвратов</p>
                <p className="text-3xl font-bold crm-stat-number text-red-600">{processAnalytics.revisionRequests || 0}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{Number(processAnalytics.revisionRate || 0).toFixed(1)}% решений</p>
              </CardContent>
            </Card>
            <Card className="crm-stat-card violet crm-gradient-card border-0 crm-shadow-elevated">
              <CardContent className="p-4 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Версий всего</p>
                <p className="text-3xl font-bold crm-stat-number text-violet-700">{versionAnalytics.totalVersions || 0}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Среднее: {Number(versionAnalytics.averageVersionsPerEvent || 0).toFixed(1)}</p>
              </CardContent>
            </Card>
            <Card className="crm-stat-card orange crm-gradient-card border-0 crm-shadow-elevated">
              <CardContent className="p-4 text-center">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Проблем качества</p>
                <p className="text-3xl font-bold crm-stat-number text-orange-700">{dataQualityAnalytics.totalIssues || 0}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Крит.: {dataQualityAnalytics.criticalIssues || 0}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card className="shadow-sm border-0">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-400" />Загрузка сотрудников по задачам</CardTitle></CardHeader>
              <CardContent>
                {workloadData.length > 0 ? (
                  <div style={{ width: '100%', aspectRatio: '1.2/1', minHeight: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={workloadData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                        <YAxis />
                        <RTooltip />
                        <Legend />
                        <Bar dataKey="total" name="Всего задач" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="completed" name="Выполнено" fill="#10b981" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-center py-12 text-muted-foreground">Нет данных по задачам</p>}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-0">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-400" />Текущая очередь согласований</CardTitle></CardHeader>
              <CardContent>
                {approvalQueueData.length > 0 ? (
                  <div style={{ width: '100%', aspectRatio: '1.2/1', minHeight: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={approvalQueueData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-30} textAnchor="end" height={90} tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} />
                        <RTooltip />
                        <Bar dataKey="value" name="Карточек" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-center py-12 text-muted-foreground">Очередь согласований пуста</p>}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-0">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400" />Возвраты на доработку по этапам</CardTitle></CardHeader>
              <CardContent>
                {revisionStageData.length > 0 ? (
                  <div style={{ width: '100%', aspectRatio: '1.2/1', minHeight: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revisionStageData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" allowDecimals={false} />
                        <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                        <RTooltip />
                        <Bar dataKey="revisions" name="Возвратов" fill="#ef4444" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-center py-12 text-muted-foreground">Возвратов пока нет</p>}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-0">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-violet-400" />Роли сотрудников в мероприятиях</CardTitle></CardHeader>
              <CardContent>
                {employeeAssignmentData.length > 0 ? (
                  <div style={{ width: '100%', aspectRatio: '1.2/1', minHeight: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={employeeAssignmentData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-30} textAnchor="end" height={80} tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals={false} />
                        <RTooltip />
                        <Legend />
                        <Bar dataKey="lead" name="Руководитель" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="support" name="Участник" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-center py-12 text-muted-foreground">Назначений по мероприятиям пока нет</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card className="shadow-sm border-0">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-violet-400" />Причины появления версий</CardTitle></CardHeader>
              <CardContent>
                {versionReasonData.length > 0 ? (
                  <div style={{ width: '100%', aspectRatio: '1.2/1', minHeight: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={versionReasonData} cx="50%" cy="50%" outerRadius="78%" dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {versionReasonData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <RTooltip /><Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : <p className="text-center py-12 text-muted-foreground">Версий пока нет</p>}
              </CardContent>
            </Card>

            <Card className="shadow-sm border-0">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-400" />Качество данных</CardTitle></CardHeader>
              <CardContent>
                {dataQualityIssueData.length > 0 ? (
                  <div className="space-y-2">
                    {dataQualityIssueData.map(item => (
                      <div key={item.name} className="flex items-center justify-between gap-3 p-2 rounded-lg border">
                        <span className="text-xs sm:text-sm font-medium">{item.name}</span>
                        <Badge variant="secondary">{item.value}</Badge>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-center py-12 text-muted-foreground">Критичных проблем качества данных не найдено</p>}
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-sm border-0">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-violet-400" />Карточки с наибольшим числом версий</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Мероприятие</TableHead><TableHead>Статус</TableHead><TableHead>Текущая версия</TableHead><TableHead>Всего версий</TableHead><TableHead>Последняя причина</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(versionAnalytics.versionHotspots || []).length > 0 ? (
                      versionAnalytics.versionHotspots.map((item: any) => (
                        <TableRow key={item.eventId}>
                          <TableCell className="font-medium max-w-[240px] truncate">{item.title}</TableCell>
                          <TableCell><Badge className={`crm-badge ${getStatusColor(item.status as EventStatus)}`}>{getStatusLabel(item.status as EventStatus)}</Badge></TableCell>
                          <TableCell>v{item.currentVersion}</TableCell>
                          <TableCell>{item.versionsCount}</TableCell>
                          <TableCell className="max-w-[260px] truncate">{item.lastReason || '—'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Карточек с несколькими версиями пока нет</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-0">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-400" />Проблемные карточки по качеству данных</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Мероприятие</TableHead><TableHead>Статус</TableHead><TableHead>Проблема</TableHead><TableHead>Критичность</TableHead><TableHead>Дата</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(dataQualityAnalytics.problemEvents || []).length > 0 ? (
                      dataQualityAnalytics.problemEvents.map((item: any, index: number) => (
                        <TableRow key={`${item.eventId}-${index}`}>
                          <TableCell className="font-medium max-w-[240px] truncate">{item.title}</TableCell>
                          <TableCell><Badge className={`crm-badge ${getStatusColor(item.status as EventStatus)}`}>{getStatusLabel(item.status as EventStatus)}</Badge></TableCell>
                          <TableCell className="max-w-[320px]">{item.issue}</TableCell>
                          <TableCell>
                            <Badge variant={item.severity === 'critical' ? 'destructive' : 'secondary'}>
                              {item.severity === 'critical' ? 'Критично' : 'Предупреждение'}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.startDate ? formatDate(item.startDate) : '—'}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Проблем качества данных не найдено</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
