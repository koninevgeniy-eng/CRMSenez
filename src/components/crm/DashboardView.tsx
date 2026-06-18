'use client';

import React from 'react';
import {
  FileText, Users, Clock, Banknote, Calendar, MapPin, Play,
  Plus, Shield, ClipboardList, BarChart3, CheckCircle2, ArrowRight, Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EventData, EventStatus, STATUS_LABELS, STATUS_COLORS } from '@/lib/crm-types';
import { getStatusLabel, getStatusColor, formatDate, formatCurrency } from '@/lib/crm-utils';

// Skeleton component for loading state
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`crm-skeleton rounded-md ${className}`} />;
}

function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <Card className={`crm-gradient-card border-0 crm-shadow-elevated ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardViewProps {
  events: EventData[];
  notifications: any[];
  setActiveDept: (dept: string) => void;
  setSelectedEvent: (event: EventData | null) => void;
  setShowEventDialog: (show: boolean) => void;
  setShowCreateDialog: (show: boolean) => void;
  mounted: boolean;
  loading?: boolean;
}

export function DashboardView({
  events,
  notifications,
  setActiveDept,
  setSelectedEvent,
  setShowEventDialog,
  setShowCreateDialog,
  mounted,
  loading = false,
}: DashboardViewProps) {
  const totalBudget = events.reduce((s, e) => s + (e.budget || 0), 0);
  const activeEvents = events.filter(e => [
    'coordination_budget_review',
    'uin_assignment',
    'agd_date_review',
    'calendar_approved',
    'organization_assignment',
    'in_progress',
    'approved',
    'budget_approved',
    'uin_assigned',
  ].includes(e.status));
  const pendingEvents = events.filter(e => ['draft', 'methodology_review', 'revision_requested', 'pending_approval', 'rejected'].includes(e.status));
  const completedEvents = events.filter(e => ['archived', 'completed'].includes(e.status));
  const upcomingEvents = mounted ? events
    .filter(e => e.startDate && new Date(e.startDate) > new Date() && !['archived', 'completed', 'cancelled'].includes(e.status))
    .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime())
    .slice(0, 5) : [];

  // Status distribution for mini chart
  const statusCounts: Record<string, number> = {};
  events.forEach(e => { statusCounts[e.status] = (statusCounts[e.status] || 0) + 1; });

  // Today's events (hydration-safe: only compute after mount)
  const today = mounted ? new Date() : null;
  const todayEvents = mounted
    ? events.filter(e => {
        if (!e.startDate || !e.endDate || !today) return false;
        const start = new Date(e.startDate);
        const end = new Date(e.endDate);
        return today >= start && today <= end;
      })
    : [];

  // Loading state with skeletons
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Welcome Header Skeleton */}
        <div className="crm-welcome-border">
          <div className="bg-gradient-to-r from-[#E4002B] via-[#BD0024] to-[#BD0024] rounded-2xl p-4 sm:p-6 text-white shadow-lg relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <Skeleton className="h-7 w-64 bg-white/20" />
                <Skeleton className="h-4 w-80 bg-white/15 mt-2" />
                <div className="flex items-center gap-3 mt-3">
                  <Skeleton className="h-8 w-36 bg-white/15 rounded-lg" />
                  <Skeleton className="h-8 w-36 bg-white/15 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Skeletons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Pipeline Skeleton */}
        <Card className="shadow-sm border-0 crm-shadow-elevated">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="flex flex-col items-center gap-2 flex-1">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="lg:col-span-2 shadow-sm border-0 crm-shadow-elevated">
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-56" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-start gap-4 p-3">
                  <Skeleton className="w-3 h-3 rounded-full mt-1" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="shadow-sm border-0 crm-shadow-elevated">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-40" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
                <Skeleton className="h-9 w-full rounded-md" />
              </CardContent>
            </Card>

            <Card className="shadow-sm border-0">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Activity Feed Skeleton */}
        <Card className="shadow-sm border-0 crm-shadow-elevated">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 p-2.5">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header with Animated Gradient Border */}
      <div className="crm-welcome-border">
        <div className="bg-gradient-to-r from-[#E4002B] via-[#BD0024] to-[#BD0024] rounded-2xl p-4 sm:p-6 text-white shadow-lg crm-welcome-banner relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold">Добро пожаловать в CRM Сенеж</h2>
              <p className="text-white/90 mt-1 text-xs sm:text-sm">Система управления образовательными мероприятиями</p>
              <div className="flex items-center gap-2 sm:gap-4 mt-3">
                <div className="flex items-center gap-1.5 sm:gap-2 bg-white/15 rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5">
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm font-medium">{events.length} мероприятий</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 bg-white/15 rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm font-medium">{events.reduce((s, e) => s + (e.participantCount || 0), 0)} участников</span>
                </div>
              </div>
            </div>
            <div className="hidden sm:block text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="crm-weather-icon text-lg">☀️</span>
                <p className="text-sm text-white/75">{mounted && today ? today.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}</p>
              </div>
              <p className="text-xs text-white/60 mt-0.5">Сегодня {todayEvents.length > 0 ? `${todayEvents.length} мероприятий` : 'нет мероприятий'}</p>
              {/* Budget utilization ring */}
              <div className="mt-3 flex items-center justify-end gap-2">
                <svg className="crm-progress-ring" width="48" height="48" viewBox="0 0 48 48">
                  <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
                  <circle cx="24" cy="24" r="20" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${totalBudget > 0 ? Math.min((completedEvents.reduce((s, e) => s + (e.actualCost || 0), 0) / totalBudget) * 125.6, 125.6) : 0} 125.6`} transform="rotate(-90 24 24)" />
                </svg>
                <div>
                  <p className="text-xs text-white/75">Бюджет использован</p>
                  <p className="text-sm font-bold">{totalBudget > 0 ? Math.round((completedEvents.reduce((s, e) => s + (e.actualCost || 0), 0) / totalBudget) * 100) : 0}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics with dot pattern & count-up */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Card className="crm-stat-card emerald crm-gradient-card border-0 crm-shadow-elevated">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2.5 bg-[#FFE0E5] rounded-lg sm:rounded-xl shrink-0"><FileText className="h-4 w-4 sm:h-5 sm:w-5 text-[#E4002B]" /></div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">Всего</p>
                <p className="text-lg sm:text-2xl font-bold crm-stat-number crm-count-up">{events.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="crm-stat-card blue crm-gradient-card border-0 crm-shadow-elevated">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2.5 bg-blue-100 rounded-lg sm:rounded-xl shrink-0"><Play className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" /></div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">В процессе</p>
                <p className="text-lg sm:text-2xl font-bold crm-stat-number crm-count-up">{activeEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="crm-stat-card amber crm-gradient-card border-0 crm-shadow-elevated">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2.5 bg-amber-100 rounded-lg sm:rounded-xl shrink-0"><Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" /></div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">Ожидают</p>
                <p className="text-lg sm:text-2xl font-bold crm-stat-number crm-count-up">{pendingEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="crm-stat-card green crm-gradient-card border-0 crm-shadow-elevated">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2.5 bg-green-100 rounded-lg sm:rounded-xl shrink-0"><Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" /></div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">Бюджет</p>
                <p className="text-base sm:text-xl font-bold crm-stat-number crm-count-up">{formatCurrency(totalBudget)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Воронка мероприятий с анимированными коннекторами */}
      <Card className="shadow-sm border-0 crm-shadow-elevated">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#E4002B]" />
            Воронка мероприятий
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-2 crm-scroll">
            <div className="flex items-center justify-between min-w-[600px] md:min-w-0">
              {[
                { status: 'draft', label: 'Черновик' },
                { status: 'pending_approval', label: 'На согласовании' },
                { status: 'budget_approved', label: 'Бюджет согласован' },
                { status: 'approved', label: 'Согласовано' },
                { status: 'in_progress', label: 'В процессе' },
                { status: 'completed', label: 'Завершено' },
              ].map((step, index, arr) => {
                const count = events.filter(e => e.status === step.status).length;
                const isLast = index === arr.length - 1;
                const hasItems = count > 0;
                // Check if the next step also has items (for active connector)
                const nextStepHasItems = !isLast && events.filter(e => e.status === arr[index + 1].status).length > 0;
                return (
                  <div key={step.status} className="flex items-center flex-1">
                    <div className="flex flex-col items-center text-center flex-1">
                      <div className={`crm-pipeline-step w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${hasItems ? 'bg-[#E4002B] text-white shadow-md ring-2 ring-[#FF9DAF] has-items' : 'bg-gray-200 text-gray-500'}`}>
                        {count}
                      </div>
                      <span className={`text-[11px] mt-1.5 font-medium leading-tight max-w-[90px] ${hasItems ? 'text-[#E4002B]' : 'text-muted-foreground'}`}>{step.label}</span>
                    </div>
                    {!isLast && (
                      <div className={`crm-pipeline-connector -mt-5 ${hasItems && nextStepHasItems ? 'active bg-[#FF9DAF]' : hasItems ? 'bg-[#FF9DAF]' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Upcoming Events Timeline */}
        <Card className="lg:col-span-2 shadow-sm border-0 crm-shadow-elevated">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#E4002B]" />
                Ближайшие мероприятия
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-[#E4002B]" onClick={() => setActiveDept('methodology')}>
                Все мероприятия <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="crm-empty-state">
                <div className="crm-empty-state-icon"><Calendar className="h-7 w-7" /></div>
                <h3 className="font-semibold text-base mb-1">Нет предстоящих мероприятий</h3>
                <p className="text-sm text-muted-foreground">Создайте новое мероприятие, чтобы начать работу</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event, index) => {
                  const daysUntil = event.startDate && today ? Math.ceil((new Date(event.startDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                  return (
                    <div key={event.id} className="flex items-start gap-3 sm:gap-4 p-2 sm:p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer overflow-hidden" onClick={() => { setSelectedEvent(event); setShowEventDialog(true); }}>
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center pt-1 shrink-0">
                        <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-[#E4002B] ring-2 ring-[#FF9DAF]' : 'bg-gray-300'}`} />
                        {index < upcomingEvents.length - 1 && <div className="w-0.5 h-8 bg-gray-200 mt-1" />}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className="font-medium text-xs sm:text-sm truncate">{event.title}</h4>
                          <Badge variant="outline" className={`crm-badge text-[10px] shrink-0 ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 text-[11px] sm:text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 whitespace-nowrap"><Calendar className="h-3 w-3 shrink-0" />{formatDate(event.startDate)} — {formatDate(event.endDate)}</span>
                          {event.venue && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{event.venue}</span></span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0 hidden sm:block">
                        {daysUntil <= 0 ? (
                          <Badge className="bg-red-100 text-red-700 border-red-200">Сейчас</Badge>
                        ) : daysUntil <= 7 ? (
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200">Через {daysUntil} дн.</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{daysUntil} дн.</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right sidebar - Quick actions & Status breakdown */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <Card className="shadow-sm border-0 crm-shadow-elevated">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                Быстрые действия
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full justify-start gap-2 bg-[#E4002B] hover:bg-[#BD0024] crm-btn-hover" size="sm" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4" /> Создать мероприятие
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 crm-btn-hover" size="sm" onClick={() => setActiveDept('coordination')}>
                <Shield className="h-4 w-4" /> Согласование ({events.filter(e => e.status === 'pending_approval').length})
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 crm-btn-hover" size="sm" onClick={() => setActiveDept('organization')}>
                <ClipboardList className="h-4 w-4" /> Задачи ({events.reduce((s, e) => s + e.tasks.filter(t => !t.completed).length, 0)} открыты)
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 crm-btn-hover" size="sm" onClick={() => setActiveDept('analytics')}>
                <BarChart3 className="h-4 w-4" /> Аналитика
              </Button>
            </CardContent>
          </Card>

          {/* Status Breakdown */}
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-400" />
                По статусам
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`crm-badge text-[10px] ${STATUS_COLORS[status as EventStatus] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[status as EventStatus] || status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#E4002B] rounded-full" style={{ width: `${events.length > 0 ? (count / events.length) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs font-semibold w-4 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Budget Summary */}
          <Card className="shadow-sm border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-400" />
                Финансы
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Запланировано</span>
                  <span className="font-semibold">{formatCurrency(totalBudget)}</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Потрачено</span>
                  <span className="font-semibold text-amber-600">{formatCurrency(completedEvents.reduce((s, e) => s + (e.actualCost || 0), 0))}</span>
                </div>
              </div>
              <div className="h-px bg-gray-200 my-2" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Завершено</span>
                <span className="font-semibold text-[#E4002B]">{completedEvents.length} из {events.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity / Notifications */}
      {notifications.length > 0 && (
        <Card className="shadow-sm border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-400" />
              Последние уведомления
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 crm-scroll">
              {notifications.slice(0, 6).map(n => (
                <div key={n.id} className="min-w-[250px] p-3 rounded-xl border bg-gray-50/50 shrink-0">
                  <div className="flex items-start gap-2">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.type === 'approval' ? 'bg-amber-400' : n.type === 'warning' ? 'bg-red-400' : n.type === 'change' ? 'bg-blue-400' : 'bg-[#E4002B]'}`} />
                    <div>
                      <p className="text-sm leading-snug">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString('ru-RU')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Activity Feed - Recent Changes */}
      <Card className="shadow-sm border-0 crm-shadow-elevated">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#E4002B]" />
            Лента активности
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const recentEvents = [...events].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5);
            if (recentEvents.length === 0) return (
              <div className="crm-empty-state">
                <div className="crm-empty-state-icon"><Activity className="h-7 w-7" /></div>
                <h3 className="font-semibold text-base mb-1">Нет активности</h3>
                <p className="text-sm text-muted-foreground">Действия появятся после создания мероприятий</p>
              </div>
            );
            return (
              <div className="space-y-3">
                {recentEvents.map((event, i) => (
                  <div key={event.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => { setSelectedEvent(event); setShowEventDialog(true); }}>
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                        event.status === 'completed' ? 'bg-green-100 text-green-700' :
                        event.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        event.status === 'pending_approval' ? 'bg-amber-100 text-amber-700' :
                        event.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                        'bg-[#FFE0E5] text-[#E4002B]'
                      }`}>
                        {event.title.charAt(0)}
                      </div>
                      {i < recentEvents.length - 1 && <div className="w-0.5 h-3 bg-gray-200 mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{event.title}</span>
                        <Badge variant="outline" className={`crm-badge text-[10px] py-0 ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Обновлено {new Date(event.updatedAt).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
