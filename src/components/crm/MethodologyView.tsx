'use client';

import React from 'react';
import {
  FileText, Users, Clock, Banknote, Calendar, MapPin, Plus,
  Search, Download, Upload, Send, CheckCircle2, X, Star,
  UserCheck, Building2, Copy, ChevronRight, Columns3, List,
  Milestone, Play, XCircle, Pin, StickyNote, Crown, Banknote as BanknoteIcon,
  GitCompare, FileSpreadsheet, Filter, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  EventData, EventStatus, STATUS_LABELS, STATUS_COLORS,
} from '@/lib/crm-types';
import {
  getStatusLabel, getStatusColor, formatDate, formatCurrency, canSubmitForApproval,
} from '@/lib/crm-utils';

const CHART_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

interface MethodologyViewProps {
  events: EventData[];
  loading: boolean;
  searchQuery: string;
  statusFilter: string;
  methodologyViewMode: 'list' | 'kanban' | 'timeline';
  compareMode: boolean;
  compareIds: string[];
  expandedNoteId: string | null;
  mounted: boolean;
  handleSearchChange: (value: string) => void;
  setStatusFilter: (filter: string) => void;
  setMethodologyViewMode: (mode: 'list' | 'kanban' | 'timeline') => void;
  setCompareMode: (mode: boolean) => void;
  setCompareIds: (ids: string[]) => void;
  setShowCompareDialog: (show: boolean) => void;
  setExpandedNoteId: (id: string | null) => void;
  setSelectedEvent: (event: EventData | null) => void;
  setShowEventDialog: (show: boolean) => void;
  setShowCreateDialog: (show: boolean) => void;
  handleWorkflowAction: (eventId: string, action: string, comment?: string, uin?: string) => Promise<void>;
  handleExportAllExcel: () => Promise<void>;
  handleImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleDuplicateEvent: (event: EventData) => Promise<void>;
  handleExportExcel: (event: EventData) => Promise<void>;
  getQuickNote: (eventId: string) => string;
  saveQuickNote: (eventId: string, note: string) => void;
}

export function MethodologyView({
  events,
  loading,
  searchQuery,
  statusFilter,
  methodologyViewMode,
  compareMode,
  compareIds,
  expandedNoteId,
  mounted,
  handleSearchChange,
  setStatusFilter,
  setMethodologyViewMode,
  setCompareMode,
  setCompareIds,
  setShowCompareDialog,
  setExpandedNoteId,
  setSelectedEvent,
  setShowEventDialog,
  setShowCreateDialog,
  handleWorkflowAction,
  handleExportAllExcel,
  handleImportExcel,
  handleDuplicateEvent,
  handleExportExcel,
  getQuickNote,
  saveQuickNote,
}: MethodologyViewProps) {

  const renderKanbanView = () => {
    const kanbanStatuses: { status: EventStatus; label: string; color: string; bgColor: string; borderColor: string }[] = [
      { status: 'draft', label: 'Черновик', color: 'text-gray-700', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
      { status: 'pending_approval', label: 'На согласовании', color: 'text-amber-700', bgColor: 'bg-amber-50/50', borderColor: 'border-amber-200' },
      { status: 'uin_assigned', label: 'УИН присвоен', color: 'text-teal-700', bgColor: 'bg-teal-50/50', borderColor: 'border-teal-200' },
      { status: 'approved', label: 'Согласовано', color: 'text-[#E4002B]', bgColor: 'bg-[#FFF1F3]/50', borderColor: 'border-[#FF9DAF]' },
      { status: 'in_progress', label: 'В процессе', color: 'text-blue-700', bgColor: 'bg-blue-50/50', borderColor: 'border-blue-200' },
      { status: 'pending_actual_budget', label: 'Ожидает факт. бюджет', color: 'text-orange-700', bgColor: 'bg-orange-50/50', borderColor: 'border-orange-200' },
      { status: 'pending_actual_approval', label: 'Факт. бюджет на согл.', color: 'text-purple-700', bgColor: 'bg-purple-50/50', borderColor: 'border-purple-200' },
      { status: 'actual_budget_approved', label: 'Факт. бюджет согл.', color: 'text-indigo-700', bgColor: 'bg-indigo-50/50', borderColor: 'border-indigo-200' },
      { status: 'completed', label: 'Завершено', color: 'text-green-700', bgColor: 'bg-green-50/50', borderColor: 'border-green-200' },
    ];

    return (
      <div className="flex overflow-x-auto gap-4 pb-2 crm-scroll sm:grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-9">
        {kanbanStatuses.map(col => {
          const colEvents = events.filter(e => e.status === col.status);
          const colBudget = colEvents.reduce((s, e) => s + (e.budget || 0), 0);
          return (
            <div key={col.status} className={`rounded-xl border ${col.borderColor} ${col.bgColor} flex flex-col min-w-[260px] sm:min-w-0 min-h-[400px] max-h-[600px]`}>
              <div className="px-3 py-3 border-b border-inherit">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`font-semibold text-sm ${col.color}`}>{col.label}</h3>
                  <Badge variant="secondary" className="text-xs h-5 min-w-5 flex items-center justify-center">{colEvents.length}</Badge>
                </div>
                {colBudget > 0 && <p className="text-[11px] text-muted-foreground">{formatCurrency(colBudget)}</p>}
              </div>
              <div className="flex-1 p-2 space-y-2 overflow-y-auto crm-scroll min-h-0">
                {colEvents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-6 w-6 mx-auto mb-1.5 opacity-20" />
                    <p className="text-xs">Нет мероприятий</p>
                  </div>
                ) : (
                  colEvents.map(event => (
                    <div key={event.id} className="bg-white dark:bg-gray-900 rounded-lg border shadow-sm p-3 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden" onClick={() => { setSelectedEvent(event); setShowEventDialog(true); }}>
                      <h4 className="font-medium text-sm leading-tight mb-2 line-clamp-2">{event.title}</h4>
                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        {event.startDate && <div className="flex items-center gap-1.5"><Calendar className="h-3 w-3 shrink-0" /><span className="truncate">{formatDate(event.startDate)}</span></div>}
                        {event.venue && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{event.venue}</span></div>}
                        {event.budget && <div className="flex items-center gap-1.5"><BanknoteIcon className="h-3 w-3 shrink-0" /><span>{formatCurrency(event.budget)}</span></div>}
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
                <div className="bg-white dark:bg-gray-900 rounded-xl border shadow-sm p-4 hover:shadow-md transition-shadow overflow-hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <h3 className="font-semibold text-[15px] truncate">{event.title}</h3>
                        <Badge variant="outline" className={`crm-badge text-[10px] ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge>
                        {noteText && <Pin className="h-3.5 w-3.5 text-amber-500 crm-note-pin" />}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {event.startDate && (
                          <span className="flex items-center gap-1.5 min-w-0">
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{formatDate(event.startDate)} — {formatDate(event.endDate)}</span>
                          </span>
                        )}
                        {event.venue && <span className="flex items-center gap-1.5 min-w-0"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{event.venue}</span></span>}
                        {event.budget && <span className="flex items-center gap-1.5"><BanknoteIcon className="h-3.5 w-3.5 shrink-0" />{formatCurrency(event.budget)}</span>}
                        {event.participantCount && <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 shrink-0" />{event.participantCount} чел.</span>}
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Карточки мероприятий</h2>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">Создание и редактирование карточек мероприятий, управление спикерами и программой</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <Button variant={methodologyViewMode === 'list' ? 'default' : 'ghost'} size="sm" className={`gap-1.5 h-7 text-xs ${methodologyViewMode === 'list' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''}`} onClick={() => setMethodologyViewMode('list')}>
              <List className="h-3.5 w-3.5" /> Список
            </Button>
            <Button variant={methodologyViewMode === 'kanban' ? 'default' : 'ghost'} size="sm" className={`gap-1.5 h-7 text-xs ${methodologyViewMode === 'kanban' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''}`} onClick={() => setMethodologyViewMode('kanban')}>
              <Columns3 className="h-3.5 w-3.5" /> Канбан
            </Button>
            <Button variant={methodologyViewMode === 'timeline' ? 'default' : 'ghost'} size="sm" className={`gap-1.5 h-7 text-xs ${methodologyViewMode === 'timeline' ? 'bg-white dark:bg-gray-800 shadow-sm' : ''}`} onClick={() => setMethodologyViewMode('timeline')}>
              <Milestone className="h-3.5 w-3.5" /> Хронология
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          {/* Compare Toggle */}
          <Button variant={compareMode ? 'default' : 'outline'} size="sm" className={`gap-1.5 ${compareMode ? 'bg-[#E4002B] hover:bg-[#BD0024] crm-btn-hover' : ''}`} onClick={() => { setCompareMode(!compareMode); setCompareIds([]); }}>
            <GitCompare className="h-3.5 w-3.5" /> Сравнить
          </Button>
          {compareMode && compareIds.length >= 2 && (
            <Button size="sm" className="gap-1.5 bg-[#E4002B] hover:bg-[#BD0024] crm-btn-hover" onClick={() => setShowCompareDialog(true)}>
              Сравнить ({compareIds.length})
            </Button>
          )}
          <Separator orientation="vertical" className="h-6" />
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportAllExcel}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> Экспорт всех
          </Button>
          <label htmlFor="import-excel">
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <span><Upload className="h-3.5 w-3.5" /> Импорт</span>
            </Button>
          </label>
          <input id="import-excel" type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportExcel} />
          <Button size="sm" className="gap-1.5 bg-[#E4002B] hover:bg-[#BD0024] crm-btn-hover" onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-3.5 w-3.5" /> Новое мероприятие
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
        <Card className="crm-stat-card emerald crm-gradient-card border-0 shadow-sm">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2.5 bg-[#FFE0E5] rounded-lg sm:rounded-xl shrink-0"><FileText className="h-4 w-4 sm:h-5 sm:w-5 text-[#E4002B]" /></div>
              <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">Всего</p><p className="text-lg sm:text-2xl font-bold crm-stat-number crm-count-up">{events.length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="crm-stat-card amber crm-gradient-card border-0 shadow-sm">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2.5 bg-amber-100 rounded-lg sm:rounded-xl shrink-0"><Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" /></div>
              <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">Черновики</p><p className="text-lg sm:text-2xl font-bold crm-stat-number crm-count-up">{events.filter(e => e.status === 'draft').length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="crm-stat-card blue crm-gradient-card border-0 shadow-sm">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2.5 bg-blue-100 rounded-lg sm:rounded-xl shrink-0"><Send className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" /></div>
              <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">На согласовании</p><p className="text-lg sm:text-2xl font-bold crm-stat-number crm-count-up">{events.filter(e => e.status === 'pending_approval').length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="crm-stat-card orange crm-gradient-card border-0 shadow-sm">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2.5 bg-orange-100 rounded-lg sm:rounded-xl shrink-0"><BanknoteIcon className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" /></div>
              <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">Факт. бюджет</p><p className="text-lg sm:text-2xl font-bold crm-stat-number crm-count-up">{events.filter(e => e.status === 'pending_actual_budget').length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="crm-stat-card green crm-gradient-card border-0 shadow-sm">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2.5 bg-green-100 rounded-lg sm:rounded-xl shrink-0"><CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" /></div>
              <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">Согласовано</p><p className="text-lg sm:text-2xl font-bold crm-stat-number crm-count-up">{events.filter(e => ['approved','budget_approved','uin_assigned','actual_budget_approved'].includes(e.status)).length}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Pills */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS_LABELS).map(([status, label]) => {
          const count = events.filter(e => e.status === status).length;
          if (count === 0) return null;
          return (
            <button
              key={status}
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer
                ${statusFilter === status ? 'ring-2 ring-[#E4002B] shadow-sm' : 'hover:shadow-sm'}
                ${STATUS_COLORS[status as EventStatus]}`}
            >
              {count} {label}
            </button>
          );
        })}
        {statusFilter !== 'all' && (
          <button
            onClick={() => setStatusFilter('all')}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all"
          >
            <X className="h-3 w-3" /> Сбросить фильтр
          </button>
        )}
      </div>

      {/* Speaker Costs Section — for events in progress or completed */}
      {(() => {
        const activeEvents = events.filter(e => ['in_progress', 'completed'].includes(e.status) && e.speakers.length > 0);
        if (activeEvents.length === 0) return null;
        return (
          <Card className="shadow-sm border-l-4 border-l-teal-400">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Star className="h-5 w-5 text-teal-500" />
                Расходы на спикеров ({activeEvents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Внесите плановые и фактические стоимости по каждому спикеру. Фактические расходы подлежат согласованию координацией.</p>
              <div className="space-y-3">
                {activeEvents.map(event => {
                  const totalPlanned = event.speakers.reduce((s, sp) => s + (sp.plannedCost || 0), 0);
                  const totalActual = event.speakers.reduce((s, sp) => s + (sp.actualCost || 0), 0);
                  const pendingCount = event.speakers.filter(s => s.costApprovalStatus === 'pending' && s.actualCost).length;
                  const approvedCount = event.speakers.filter(s => s.costApprovalStatus === 'approved').length;
                  const rejectedCount = event.speakers.filter(s => s.costApprovalStatus === 'rejected').length;

                  return (
                    <div key={event.id} className="border rounded-xl p-3 sm:p-4 space-y-3 bg-white dark:bg-gray-900 overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base truncate">{event.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{event.speakers.length} спикер(ов)</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          {pendingCount > 0 && <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-300">{pendingCount} на соглас.</Badge>}
                          {approvedCount > 0 && <Badge className="text-[10px] bg-green-50 text-green-700 border-green-300">{approvedCount} соглас.</Badge>}
                          {rejectedCount > 0 && <Badge className="text-[10px] bg-red-50 text-red-700 border-red-300">{rejectedCount} откл.</Badge>}
                          <Badge className={`crm-badge ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge>
                        </div>
                      </div>

                      {/* Quick stats */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 rounded-lg bg-teal-50 border border-teal-200">
                          <p className="text-[10px] text-muted-foreground">План (спикеры)</p>
                          <p className="text-sm font-bold text-teal-700">{formatCurrency(totalPlanned)}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                          <p className="text-[10px] text-muted-foreground">Факт (спикеры)</p>
                          <p className="text-sm font-bold text-amber-700">{formatCurrency(totalActual)}</p>
                        </div>
                      </div>

                      <Button variant="outline" size="sm" className="gap-1.5 text-xs w-full sm:w-auto" onClick={() => { setSelectedEvent(event); setShowEventDialog(true); }}>
                        <Eye className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Открыть карточку</span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Event Content - List, Kanban, or Timeline */}
      {methodologyViewMode === 'kanban' ? (
        renderKanbanView()
      ) : methodologyViewMode === 'timeline' ? (
        renderTimelineView()
      ) : (
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-lg">Список мероприятий</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input placeholder="Поиск по названию..." value={searchQuery} onChange={e => handleSearchChange(e.target.value)} className="w-full sm:w-64 pl-8" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44"><Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" /><SelectValue placeholder="Статус" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все статусы</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 crm-skeleton" />)}</div>
          ) : events.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Мероприятия не найдены</p>
              <p className="text-sm mt-1">Попробуйте изменить параметры поиска или создать новое мероприятие</p>
              <Button className="mt-4 bg-[#E4002B] hover:bg-[#BD0024] crm-btn-hover" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" /> Создать мероприятие
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map(event => {
                const statusBorderColors: Record<string, string> = {
                  draft: 'border-l-gray-400',
                  pending_approval: 'border-l-amber-400',
                  budget_approved: 'border-l-sky-400',
                  approved: 'border-l-[#E4002B]',
                  uin_assigned: 'border-l-teal-400',
                  in_progress: 'border-l-blue-400',
                  pending_actual_budget: 'border-l-orange-400',
                  pending_actual_approval: 'border-l-purple-400',
                  actual_budget_approved: 'border-l-indigo-400',
                  completed: 'border-l-green-400',
                  rejected: 'border-l-red-400',
                  cancelled: 'border-l-gray-300',
                };
                const eventNote = getQuickNote(event.id);
                const isExpanded = expandedNoteId === event.id;
                const isSelected = compareIds.includes(event.id);
                return (
                  <div key={event.id}>
                    <div className={`crm-event-card flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 rounded-xl border bg-white dark:bg-gray-900 hover:shadow-md overflow-hidden ${statusBorderColors[event.status] || 'border-l-[#E4002B]'} ${isSelected ? 'ring-2 ring-[#FF9DAF]' : ''}`} onClick={() => {
                      if (compareMode) {
                        if (isSelected) {
                          setCompareIds(compareIds.filter(id => id !== event.id));
                        } else if (compareIds.length < 4) {
                          setCompareIds([...compareIds, event.id]);
                        }
                      } else {
                        setSelectedEvent(event);
                        setShowEventDialog(true);
                      }
                    }}>
                      {/* Compare checkbox */}
                      {compareMode && (
                        <div className="mr-3 shrink-0" onClick={e => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked && compareIds.length < 4) {
                                setCompareIds([...compareIds, event.id]);
                              } else {
                                setCompareIds(compareIds.filter(id => id !== event.id));
                              }
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          {/* Priority indicator dot */}
                          <div className={`crm-priority-dot ${
                            event.status === 'pending_approval' ? 'high' :
                            event.status === 'draft' ? 'medium' : 'low'
                          }`} />
                          <h3 className="font-semibold truncate text-[15px]">{event.title}</h3>
                          <Badge variant="outline" className={`crm-badge ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge>
                          {event.uin && <Badge variant="secondary" className="text-[10px] font-mono">{event.uin}</Badge>}
                          {eventNote && <Pin className="h-3.5 w-3.5 text-amber-500 crm-note-pin" />}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                          {event.startDate && <span className="flex items-center gap-1.5 min-w-0"><Calendar className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{formatDate(event.startDate)} — {formatDate(event.endDate)}</span></span>}
                          {event.venue && <span className="flex items-center gap-1.5 truncate"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{event.venue}</span></span>}
                          {event.budget && <span className="flex items-center gap-1.5"><BanknoteIcon className="h-3.5 w-3.5 shrink-0" />{formatCurrency(event.budget)}</span>}
                          {event.participantCount && <span className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 shrink-0" />{event.participantCount} чел.</span>}
                          {event.speakers?.length > 0 && <span className="flex items-center gap-1.5"><Star className="h-3.5 w-3.5 shrink-0" />{event.speakers.length} спикер{event.speakers.length > 1 ? 'ов' : ''}</span>}
                        </div>
                        {/* Hidden metadata revealed on hover */}
                        <div className="crm-event-meta-hidden">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {event.programDirector && <span className="flex items-center gap-1"><UserCheck className="h-3 w-3" />{event.programDirector}</span>}
                            {event.customerName && <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{event.customerName}</span>}
                            {event.participantCount && event.participantCount > 0 && (
                              <div className="crm-avatar-row">
                                {Array.from({ length: Math.min(event.participantCount, 5) }).map((_, i) => (
                                  <div key={i} className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center text-[8px] font-bold text-white" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}>
                                    {String.fromCharCode(65 + i)}
                                  </div>
                                ))}
                                {event.participantCount > 5 && <div className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-900 bg-gray-300 flex items-center justify-center text-[8px] font-bold text-gray-600">+{event.participantCount - 5}</div>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2 sm:ml-4 shrink-0">
                        {canSubmitForApproval(event.status) && !compareMode && (
                          <Button size="sm" variant="outline" className="gap-1.5 border-[#FF9DAF] text-[#E4002B] hover:bg-[#FFF1F3] hidden sm:inline-flex" onClick={(e) => { e.stopPropagation(); handleWorkflowAction(event.id, 'submit_for_approval'); }}>
                            <Send className="h-3 w-3" /> На согласование
                          </Button>
                        )}
                        {!compareMode && (
                          <>
                            <Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); setExpandedNoteId(isExpanded ? null : event.id); }}><StickyNote className={`h-4 w-4 ${eventNote ? 'text-amber-500' : 'text-muted-foreground'}`} /></Button></TooltipTrigger><TooltipContent>Заметка</TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-8 w-8 p-0 hidden sm:inline-flex" onClick={(e) => { e.stopPropagation(); handleDuplicateEvent(event); }}><Copy className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Дублировать</TooltipContent></Tooltip>
                            <Tooltip><TooltipTrigger asChild><Button size="sm" variant="ghost" className="h-8 w-8 p-0 hidden sm:inline-flex" onClick={(e) => { e.stopPropagation(); handleExportExcel(event); }}><Download className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>Экспорт Excel</TooltipContent></Tooltip>
                          </>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    {/* Inline Note */}
                    {isExpanded && (
                      <div className="crm-inline-note ml-4 mr-4 mt-1 p-3 rounded-lg border border-dashed bg-amber-50/50">
                        <div className="flex items-center gap-2 mb-2">
                          <StickyNote className="h-3.5 w-3.5 text-amber-500" />
                          <span className="text-xs font-medium text-muted-foreground">Быстрая заметка</span>
                        </div>
                        <Textarea
                          placeholder="Введите заметку..."
                          value={eventNote}
                          onChange={(e) => saveQuickNote(event.id, e.target.value)}
                          className="min-h-[60px] text-sm resize-none border-amber-200 focus:border-amber-400"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
