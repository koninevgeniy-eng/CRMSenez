'use client';

import React, { useState } from 'react';
import {
  AlertTriangle, ThumbsUp, ThumbsDown, CheckCircle2, Banknote,
  Calendar, Users, UserCheck, Hash, Eye, Send, XCircle,
  Wallet, Star, Edit, Save, X, RotateCcw, Info, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { EventData, BudgetItem } from '@/lib/crm-types';
import { getStatusLabel, getStatusColor, formatDate, formatCurrency } from '@/lib/crm-utils';
import { apiFetch } from '@/lib/api-fetch';
import { toast } from '@/hooks/use-toast';

interface CoordinationViewProps {
  events: EventData[];
  handleWorkflowAction: (eventId: string, action: string, comment?: string, uin?: string) => Promise<void>;
  setSelectedEvent: (event: EventData | null) => void;
  setShowEventDialog: (show: boolean) => void;
}

export function CoordinationView({
  events,
  handleWorkflowAction,
  setSelectedEvent,
  setShowEventDialog,
}: CoordinationViewProps) {
  const [expandedCorrection, setExpandedCorrection] = useState<string | null>(null);
  const [correctionEdits, setCorrectionEdits] = useState<Record<string, Record<number, number>>>({});
  const [correctionComments, setCorrectionComments] = useState<Record<string, string>>({});

  const pendingEvents = events.filter(e => ['coordination_budget_review', 'pending_approval'].includes(e.status));
  const budgetApprovedEvents = events.filter(e => ['uin_assignment', 'budget_approved'].includes(e.status));
  const pendingActualEvents = events.filter(e => ['coordination_actual_budget_review', 'pending_actual_approval'].includes(e.status));
  const approvedEvents = events.filter(e => [
    'agd_date_review',
    'calendar_approved',
    'organization_assignment',
    'approved',
    'uin_assigned',
    'in_progress',
    'event_finished',
    'methodology_actual_budget_review',
    'actual_budget_approved',
    'archived',
    'pending_actual_budget',
    'completed',
  ].includes(e.status));
  const rejectedEvents = events.filter(e => ['revision_requested', 'rejected'].includes(e.status));
  const totalPendingBudget = pendingEvents.reduce((s, e) => s + (e.budget || 0), 0);
  const totalApprovedBudget = approvedEvents.reduce((s, e) => s + (e.budget || 0), 0);

  /** Save inline budget corrections from CoordinationView */
  const saveInlineCorrections = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const comment = correctionComments[eventId];
    if (!comment?.trim()) {
      toast({ title: 'Укажите причину корректировки', variant: 'destructive' });
      return;
    }

    const edits = correctionEdits[eventId] || {};
    const hasEdits = Object.keys(edits).length > 0;
    if (!hasEdits) {
      toast({ title: 'Укажите хотя бы одну скорректированную сумму', variant: 'destructive' });
      return;
    }

    const correctedItems = event.budgetItems.map((item, index) => {
      const newAmount = edits[index];
      if (newAmount !== undefined && newAmount !== item.plannedAmount) {
        return {
          ...item,
          originalAmount: item.originalAmount ?? item.plannedAmount,
          plannedAmount: newAmount,
          correctedAmount: newAmount,
          correctedBy: 'Координация',
          correctionComment: comment,
        };
      }
      return item;
    });

    await apiFetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budgetItems: correctedItems, changedBy: 'Координация' }),
    });

    setExpandedCorrection(null);
    setCorrectionEdits(prev => { const next = { ...prev }; delete next[eventId]; return next; });
    setCorrectionComments(prev => { const next = { ...prev }; delete next[eventId]; return next; });
    toast({ title: 'Корректировка бюджета сохранена' });
    // Reload events by triggering a parent refresh
    window.location.reload();
  };

  /** Revert a single budget item */
  const revertInlineItem = async (eventId: string, itemIndex: number) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    const item = event.budgetItems[itemIndex];
    if (!item.originalAmount) return;

    const revertedItems = [...event.budgetItems];
    revertedItems[itemIndex] = {
      ...revertedItems[itemIndex],
      plannedAmount: item.originalAmount,
      correctedAmount: undefined,
      correctedBy: undefined,
      correctionComment: undefined,
      originalAmount: undefined,
    };

    await apiFetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budgetItems: revertedItems, changedBy: 'Координация' }),
    });
    toast({ title: 'Позиция возвращена к исходной сумме' });
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Согласование мероприятий</h2>
        <p className="text-muted-foreground text-sm mt-1">Согласование бюджета, корректировка позиций, присвоение УИН, управление статусами</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <Card className="crm-stat-card amber crm-gradient-card border-0 shadow-sm">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2.5 bg-amber-100 rounded-lg sm:rounded-xl shrink-0"><AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" /></div>
              <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">Ожидают согласования</p><p className="text-lg sm:text-2xl font-bold crm-stat-number crm-count-up">{pendingEvents.length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="crm-stat-card emerald crm-gradient-card border-0 shadow-sm">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2.5 bg-[#FFE0E5] rounded-lg sm:rounded-xl shrink-0"><ThumbsUp className="h-4 w-4 sm:h-5 sm:w-5 text-[#E4002B]" /></div>
              <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">Согласовано</p><p className="text-lg sm:text-2xl font-bold crm-stat-number crm-count-up">{approvedEvents.length}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="crm-stat-card blue crm-gradient-card border-0 shadow-sm">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2.5 bg-sky-100 rounded-lg sm:rounded-xl shrink-0"><Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-sky-600" /></div>
              <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">Бюджет на согл.</p><p className="text-base sm:text-xl font-bold crm-stat-number crm-count-up">{formatCurrency(totalPendingBudget)}</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="crm-stat-card green crm-gradient-card border-0 shadow-sm">
          <CardContent className="p-2.5 sm:p-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2.5 bg-green-100 rounded-lg sm:rounded-xl shrink-0"><Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" /></div>
              <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground font-medium leading-tight">Согл. бюджет</p><p className="text-base sm:text-xl font-bold crm-stat-number crm-count-up">{formatCurrency(totalApprovedBudget)}</p></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Events */}
      <Card className="shadow-sm border-0">
        <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-5 w-5 text-amber-500" /> Ожидают согласования ({pendingEvents.length})</CardTitle></CardHeader>
        <CardContent>
          {pendingEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">Нет мероприятий, ожидающих согласования</p>
              <p className="text-sm mt-1">Все мероприятия обработаны</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingEvents.map(event => {
                const isExpanded = expandedCorrection === event.id;
                const existingCorrections = event.budgetItems.filter(b => b.originalAmount !== undefined && b.originalAmount !== null);
                const totalCorrection = event.budgetItems.reduce((s, b) => {
                  if (b.originalAmount !== undefined && b.originalAmount !== null) {
                    return s + (b.plannedAmount - b.originalAmount);
                  }
                  return s;
                }, 0);

                return (
                  <div key={event.id} className="border rounded-xl p-3 sm:p-5 space-y-4 bg-white dark:bg-gray-900 hover:shadow-md transition-shadow overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg truncate">{event.title}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-xs sm:text-sm text-muted-foreground">
                          {event.programDirector && <span className="flex items-center gap-1 min-w-0"><UserCheck className="h-3.5 w-3.5 shrink-0" /><span className="truncate">Рук.: {event.programDirector}</span></span>}
                          {event.startDate && <span className="flex items-center gap-1 min-w-0"><Calendar className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{formatDate(event.startDate)} — {formatDate(event.endDate)}</span></span>}
                          {event.participantCount && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 shrink-0" />{event.participantCount} чел.</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {existingCorrections.length > 0 && (
                          <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200">
                            <Edit className="h-3 w-3 mr-1" />{existingCorrections.length} изм.
                          </Badge>
                        )}
                        <Badge className={`crm-badge shrink-0 ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge>
                      </div>
                    </div>

                    {/* Budget Items — visual bars with inline correction */}
                    {event.budgetItems.length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <Banknote className="h-4 w-4 text-[#E4002B]" />
                            Бюджет: <span className="text-[#E4002B]">{formatCurrency(event.budget)}</span>
                          </h4>
                          {totalCorrection !== 0 && (
                            <Badge variant="outline" className={`text-[10px] ${totalCorrection > 0 ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                              Корректировка: {totalCorrection > 0 ? '+' : ''}{formatCurrency(totalCorrection)}
                            </Badge>
                          )}
                        </div>

                        {/* Budget items table */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs sm:text-sm">
                            <thead>
                              <tr className="border-b text-muted-foreground">
                                <th className="text-left py-2 pr-2 font-medium">Категория</th>
                                <th className="text-right py-2 px-2 font-medium">План</th>
                                {isExpanded && <th className="text-right py-2 px-2 font-medium bg-sky-50">Новое значение</th>}
                                {!isExpanded && <th className="text-right py-2 px-2 font-medium">Корректировка</th>}
                                <th className="py-2 px-2 w-8"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {event.budgetItems.map((bi, i) => {
                                const hasCorrection = bi.originalAmount !== undefined && bi.originalAmount !== null;
                                const correctionDiff = hasCorrection ? bi.plannedAmount - (bi.originalAmount || 0) : 0;
                                const isPositive = correctionDiff > 0;
                                const percent = event.budget ? (bi.plannedAmount / event.budget) * 100 : 0;

                                return (
                                  <tr key={i} className={`border-b last:border-0 ${hasCorrection ? 'bg-sky-50/30' : ''}`}>
                                    <td className="py-2 pr-2">
                                      <div>
                                        <span className="font-medium">{bi.category}</span>
                                        {bi.description && <span className="text-muted-foreground ml-1">({bi.description})</span>}
                                      </div>
                                      {/* Visual bar under category */}
                                      <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[200px]">
                                        <div className="h-full bg-[#E4002B] rounded-full" style={{ width: `${Math.min(percent, 100)}%` }} />
                                      </div>
                                    </td>
                                    <td className="text-right py-2 px-2 font-medium">
                                      {formatCurrency(bi.plannedAmount)}
                                      {hasCorrection && (
                                        <span className={`block text-[10px] ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
                                          было: {formatCurrency(bi.originalAmount!)}
                                        </span>
                                      )}
                                    </td>
                                    {isExpanded ? (
                                      <td className="text-right py-2 px-2 bg-sky-50">
                                        <Input
                                          type="number"
                                          min={0}
                                          className="w-28 h-7 text-xs"
                                          placeholder={String(bi.plannedAmount)}
                                          value={correctionEdits[event.id]?.[i] ?? ''}
                                          onChange={e => {
                                            const val = e.target.value === '' ? undefined : parseFloat(e.target.value) || 0;
                                            setCorrectionEdits(prev => {
                                              const eventEdits = { ...(prev[event.id] || {}) };
                                              if (val !== undefined) {
                                                eventEdits[i] = val;
                                              } else {
                                                delete eventEdits[i];
                                              }
                                              return { ...prev, [event.id]: eventEdits };
                                            });
                                          }}
                                        />
                                      </td>
                                    ) : (
                                      <td className="text-right py-2 px-2">
                                        {hasCorrection ? (
                                          <Badge variant="outline" className={`text-[10px] ${isPositive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                            {isPositive ? '+' : ''}{formatCurrency(correctionDiff)}
                                          </Badge>
                                        ) : (
                                          <span className="text-muted-foreground">—</span>
                                        )}
                                      </td>
                                    )}
                                    <td className="py-2 px-2">
                                      {hasCorrection && !isExpanded && (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => revertInlineItem(event.id, i)}>
                                                <RotateCcw className="h-3 w-3 text-muted-foreground" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p className="text-xs">Вернуть к {formatCurrency(bi.originalAmount!)}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr className="font-bold border-t-2 border-gray-300">
                                <td className="py-2 pr-2">ИТОГО</td>
                                <td className="text-right py-2 px-2 text-[#E4002B]">{formatCurrency(event.budgetItems.reduce((s, b) => s + b.plannedAmount, 0))}</td>
                                {isExpanded && (
                                  <td className="text-right py-2 px-2 bg-sky-50">
                                    {formatCurrency(event.budgetItems.reduce((s, b, i) => s + (correctionEdits[event.id]?.[i] ?? b.plannedAmount), 0))}
                                  </td>
                                )}
                                {!isExpanded && (
                                  <td className="text-right py-2 px-2">
                                    {totalCorrection !== 0 ? (
                                      <Badge variant="outline" className={`text-[10px] ${totalCorrection > 0 ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                                        {totalCorrection > 0 ? '+' : ''}{formatCurrency(totalCorrection)}
                                      </Badge>
                                    ) : '—'}
                                  </td>
                                )}
                                <td></td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Correction controls */}
                        {isExpanded && (
                          <div className="mt-3 p-3 rounded-lg bg-sky-50 border border-sky-200 space-y-2">
                            <Label className="text-xs text-muted-foreground">Причина корректировки (обязательно)</Label>
                            <Input
                              placeholder="Укажите причину корректировки..."
                              value={correctionComments[event.id] || ''}
                              onChange={e => setCorrectionComments(prev => ({ ...prev, [event.id]: e.target.value }))}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-sky-600 hover:bg-sky-700 gap-1.5 text-xs" onClick={() => saveInlineCorrections(event.id)}>
                                <Save className="h-3 w-3" /> Сохранить корректировку
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => {
                                setExpandedCorrection(null);
                                setCorrectionEdits(prev => { const next = { ...prev }; delete next[event.id]; return next; });
                              }}>
                                Отмена
                              </Button>
                            </div>
                          </div>
                        )}

                        {!isExpanded && (
                          <div className="mt-3">
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setExpandedCorrection(event.id)}>
                              <Edit className="h-3 w-3" /> Корректировать бюджет
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* No budget items yet */}
                    {event.budgetItems.length === 0 && (
                      <div className="text-sm text-muted-foreground p-3 bg-gray-50 rounded-lg">
                        Бюджетные позиции не заполнены
                      </div>
                    )}

                    {/* UIN Assignment */}
                    <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
                      <div className="flex-1">
                        <Label className="text-xs text-muted-foreground">УИН</Label>
                        <Input placeholder="Присвоить УИН" defaultValue={event.uin || ''} onChange={async (e) => {
                          if (e.target.value) {
                            await apiFetch(`/api/events/${event.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ uin: e.target.value, changedBy: 'Координация' }),
                            });
                          }
                        }} />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button onClick={() => handleWorkflowAction(event.id, 'approve_budget')} className="bg-[#E4002B] hover:bg-[#BD0024] crm-btn-hover gap-1.5 text-xs sm:text-sm">
                        <ThumbsUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Согласовать бюджет
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="gap-1.5 text-xs sm:text-sm">
                            <ThumbsDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Отклонить
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Отклонить мероприятие?</AlertDialogTitle>
                            <AlertDialogDescription>Мероприятие «{event.title}» будет возвращено на доработку.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive" onClick={() => handleWorkflowAction(event.id, 'reject', 'Требуется доработка')}>Отклонить</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button variant="outline" className="gap-1.5 text-xs sm:text-sm" onClick={() => { setSelectedEvent(event); setShowEventDialog(true); }}>
                        <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Подробнее
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Approved — waiting for UIN assignment */}
      {budgetApprovedEvents.length > 0 && (
        <Card className="shadow-sm border-0 border-l-4 border-l-sky-400">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Hash className="h-5 w-5 text-sky-500" /> Бюджет согласован — ожидает УИН ({budgetApprovedEvents.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {budgetApprovedEvents.map(event => (
                <div key={event.id} className="border rounded-xl p-3 sm:p-5 space-y-4 bg-white dark:bg-gray-900 hover:shadow-md transition-shadow overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base sm:text-lg truncate">{event.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs sm:text-sm text-muted-foreground">
                        {event.programDirector && <span className="flex items-center gap-1 min-w-0"><UserCheck className="h-3.5 w-3.5 shrink-0" /><span className="truncate">Рук.: {event.programDirector}</span></span>}
                        {event.startDate && <span className="flex items-center gap-1 min-w-0"><Calendar className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{formatDate(event.startDate)} — {formatDate(event.endDate)}</span></span>}
                      </div>
                    </div>
                    <Badge className={`crm-badge shrink-0 ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge>
                  </div>

                  {/* UIN Assignment */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Присвоить УИН</Label>
                      <Input placeholder="Введите УИН" defaultValue={event.uin || ''} id={`uin-${event.id}`} />
                    </div>
                    <Button className="bg-sky-600 hover:bg-sky-700 gap-1.5 shrink-0 text-xs sm:text-sm" onClick={() => {
                      const uinInput = document.getElementById(`uin-${event.id}`) as HTMLInputElement;
                      const uinValue = uinInput?.value?.trim();
                      if (!uinValue) {
                        toast({ title: 'УИН обязателен', description: 'Введите УИН перед подтверждением', variant: 'destructive' });
                        return;
                      }
                      handleWorkflowAction(event.id, 'assign_uin', undefined, uinValue);
                    }}>
                      <Hash className="h-4 w-4" /> Присвоить УИН
                    </Button>
                  </div>

                  <Button variant="outline" className="gap-1.5 text-xs sm:text-sm" onClick={() => { setSelectedEvent(event); setShowEventDialog(true); }}>
                    <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Подробнее
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Speaker Cost Approvals — for events with pending speaker costs */}
      {(() => {
        const eventsWithPendingSpeakerCosts = events.filter(e =>
          ['agd_date_review', 'calendar_approved', 'organization_assignment', 'approved', 'uin_assigned', 'in_progress', 'event_finished', 'actual_budget_approved', 'archived', 'completed'].includes(e.status) &&
          e.speakers.some(s => s.costApprovalStatus === 'pending' && s.actualCost !== undefined && s.actualCost > 0)
        );
        if (eventsWithPendingSpeakerCosts.length === 0) return null;
        return (
          <Card className="shadow-sm border-0 border-l-4 border-l-amber-400">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Star className="h-5 w-5 text-amber-500" />
                Фактические расходы спикеров — на согласовании ({eventsWithPendingSpeakerCosts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">Методология внесла фактические расходы по спикерам. Согласуйте или отклоните.</p>
              <div className="space-y-4">
                {eventsWithPendingSpeakerCosts.map(event => {
                  const pendingSpeakers = event.speakers.filter(s => s.costApprovalStatus === 'pending' && s.actualCost !== undefined && s.actualCost > 0);
                  const totalPendingActual = pendingSpeakers.reduce((s, sp) => s + (sp.actualCost || 0), 0);
                  const totalPendingPlanned = pendingSpeakers.reduce((s, sp) => s + (sp.plannedCost || 0), 0);
                  const isOverBudget = totalPendingActual > totalPendingPlanned && totalPendingPlanned > 0;

                  return (
                    <div key={event.id} className="border rounded-xl p-3 sm:p-4 space-y-3 bg-white dark:bg-gray-900 overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base truncate">{event.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{pendingSpeakers.length} спикер(ов) ожидают согласования</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isOverBudget && <Badge variant="destructive" className="text-[10px]">Перерасход</Badge>}
                          <Badge className={`crm-badge ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge>
                        </div>
                      </div>

                      {/* Speaker cost summary */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div className="p-2 rounded-lg bg-slate-50 border">
                          <p className="text-[10px] text-muted-foreground">План</p>
                          <p className="text-sm font-bold">{formatCurrency(totalPendingPlanned)}</p>
                        </div>
                        <div className={`p-2 rounded-lg border ${isOverBudget ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                          <p className="text-[10px] text-muted-foreground">Факт</p>
                          <p className={`text-sm font-bold ${isOverBudget ? 'text-red-600' : 'text-amber-700'}`}>{formatCurrency(totalPendingActual)}</p>
                        </div>
                        <div className={`p-2 rounded-lg border ${isOverBudget ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                          <p className="text-[10px] text-muted-foreground">Отклонение</p>
                          <p className={`text-sm font-bold ${isOverBudget ? 'text-red-600' : 'text-green-700'}`}>{formatCurrency(totalPendingPlanned - totalPendingActual)}</p>
                        </div>
                      </div>

                      {/* Individual speakers pending */}
                      <div className="space-y-2">
                        {pendingSpeakers.map((speaker, si) => (
                          <div key={si} className="flex items-center justify-between p-2 rounded-lg bg-amber-50/50 border border-amber-100 gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center shrink-0 text-xs font-bold text-violet-600">
                                {speaker.fullName ? speaker.fullName.charAt(0) : '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-medium truncate">{speaker.fullName}</p>
                                <p className="text-[10px] text-muted-foreground">План: {formatCurrency(speaker.plannedCost)} → Факт: <span className={speaker.actualCost && speaker.plannedCost && speaker.actualCost > speaker.plannedCost ? 'text-red-600 font-semibold' : 'text-amber-700 font-semibold'}>{formatCurrency(speaker.actualCost)}</span></p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { setSelectedEvent(event); setShowEventDialog(true); }}>
                        <Eye className="h-3.5 w-3.5" /> Открыть карточку для согласования
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Pending Actual Budget Approval Events */}
      {pendingActualEvents.length > 0 && (
        <Card className="shadow-sm border-l-4 border-l-purple-400">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Banknote className="h-5 w-5 text-purple-500" /> Фактический бюджет на согласовании ({pendingActualEvents.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingActualEvents.map(event => (
                <div key={event.id} className="border rounded-xl p-4 space-y-3 bg-white dark:bg-gray-900 hover:shadow-md transition-shadow overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{event.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs sm:text-sm text-muted-foreground">
                        {event.uin && <Badge variant="secondary" className="text-xs font-mono">{event.uin}</Badge>}
                        <span>План: {formatCurrency(event.budget)}</span>
                        <span>Факт: {formatCurrency(event.actualCost)}</span>
                        {event.actualCost && event.budget && (
                          <span className={event.actualCost > event.budget ? 'text-red-600 font-medium' : 'text-green-600'}>
                            Отклонение: {formatCurrency(event.actualCost - event.budget)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge className={`crm-badge shrink-0 ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge>
                  </div>
                  {/* Actual budget items summary */}
                  {event.budgetItems.length > 0 && (
                    <div className="bg-purple-50 rounded-lg p-3 space-y-1.5">
                      <p className="text-xs font-medium text-purple-800">Статьи бюджета (план / факт)</p>
                      {event.budgetItems.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate">{item.category}</span>
                          <span className="font-mono shrink-0">
                            {formatCurrency(item.plannedAmount)} / <span className={item.actualAmount && item.actualAmount > item.plannedAmount ? 'text-red-600 font-medium' : 'text-green-600'}>{formatCurrency(item.actualAmount)}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="bg-purple-600 hover:bg-purple-700 gap-1.5" onClick={() => handleWorkflowAction(event.id, 'approve_actual_budget')}>
                      <ThumbsUp className="h-3.5 w-3.5" /> Согласовать факт. бюджет
                    </Button>
                    <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 gap-1.5" onClick={() => handleWorkflowAction(event.id, 'reject_actual_budget', 'Фактический бюджет отклонён')}>
                      <ThumbsDown className="h-3.5 w-3.5" /> Отклонить факт. бюджет
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setSelectedEvent(event); setShowEventDialog(true); }}>
                      <Eye className="h-3.5 w-3.5" /> Карточка
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approved Events */}
      <Card className="shadow-sm border-0">
        <CardHeader><CardTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-[#E4002B]" /> Согласованные мероприятия ({approvedEvents.length})</CardTitle></CardHeader>
        <CardContent>
          {approvedEvents.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Нет согласованных мероприятий</p>
          ) : (
            <div className="space-y-2">
              {approvedEvents.map(event => (
                <div key={event.id} className="flex items-center justify-between p-3 rounded-xl border bg-white dark:bg-gray-900 hover:shadow-sm transition-shadow cursor-pointer gap-2" onClick={() => { setSelectedEvent(event); setShowEventDialog(true); }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${event.status === 'completed' ? 'bg-green-400' : event.status === 'in_progress' ? 'bg-blue-400' : 'bg-[#E4002B]'}`} />
                    <span className="font-medium truncate">{event.title}</span>
                    {event.uin && <Badge variant="secondary" className="text-xs font-mono shrink-0">{event.uin}</Badge>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge className={`crm-badge ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge>
                    <span className="text-sm font-medium hidden sm:inline">{formatCurrency(event.budget)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejected Events */}
      {rejectedEvents.length > 0 && (
        <Card className="shadow-sm border-0">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><XCircle className="h-5 w-5 text-red-500" /> Отклонённые ({rejectedEvents.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rejectedEvents.map(event => (
                <div key={event.id} className="flex items-center justify-between p-3 rounded-xl border bg-white dark:bg-gray-900 cursor-pointer hover:shadow-sm overflow-hidden gap-2" onClick={() => { setSelectedEvent(event); setShowEventDialog(true); }}>
                  <div className="min-w-0">
                    <span className="font-medium truncate">{event.title}</span>
                    {event.coordinatorComment && <p className="text-xs text-muted-foreground mt-0.5">Комментарий: {event.coordinatorComment}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`crm-badge ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge>
                    <Button size="sm" variant="outline" className="gap-1 text-xs sm:text-sm" onClick={(e) => { e.stopPropagation(); handleWorkflowAction(event.id, 'submit_for_approval'); }}>
                      <Send className="h-3 w-3" /> Повторить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
