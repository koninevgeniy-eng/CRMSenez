'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar, MapPin, Edit, CheckCircle2, Pin, Crown, UserCheck,
  ArrowRight, XCircle, Play, Send, Clock, Hash, Download, Copy,
  Trash2, ThumbsUp, ThumbsDown, Banknote, Plus,
} from 'lucide-react';

// QuickNoteBadge - loads from localStorage after mount to avoid SSR/hydration issues
function QuickNoteBadge({ eventId }: { eventId: string }) {
  const [noteText, setNoteText] = useState('');
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`crm-notes-${eventId}`);
      if (stored) {
        // Using requestAnimationFrame to avoid synchronous setState in effect
        requestAnimationFrame(() => setNoteText(stored));
      }
    } catch {}
  }, [eventId]);
  if (!noteText) return null;
  return (
    <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-100 flex items-start gap-2">
      <Pin className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
      <p className="text-xs text-amber-800 whitespace-pre-wrap line-clamp-2">{noteText}</p>
    </div>
  );
}
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import { Separator } from '@/components/ui/separator';
import { ClipboardList } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  EventData, EventStatus, WORKFLOW_STAGES,
} from '@/lib/crm-types';
import {
  getStatusLabel, getStatusColor, formatDate, formatCurrency,
  canSubmitForApproval, canApproveBudget, canAssignUin, canAddToCalendar, canStartEvent, canCompleteEvent, canReject,
  canSubmitActualBudget, canApproveActualBudget, canRejectActualBudget, canFinalizeEvent,
  canApproveMethodology, canApproveMethodologyActualBudget, canRequestCancel, canConfirmCancel,
} from '@/lib/crm-utils';
import { apiFetch } from '@/lib/api-fetch';
import { EVENT_FORM_FIELDS } from '@/lib/event-policy';
import { AssignmentsTab } from '@/components/crm/AssignmentsTab';
import { ContactsTab } from '@/components/crm/ContactsTab';
import { SpeakersTab } from '@/components/crm/SpeakersTab';
import { BudgetTab } from '@/components/crm/BudgetTab';
import { RoomsTab } from '@/components/crm/RoomsTab';
import { MealsTab } from '@/components/crm/MealsTab';
import { TransfersTab } from '@/components/crm/TransfersTab';
import { AccommodationsTab } from '@/components/crm/AccommodationsTab';
import { TasksTab } from '@/components/crm/TasksTab';
import { CommentsTab } from '@/components/crm/CommentsTab';
import { PaymentsTab } from '@/components/crm/PaymentsTab';
import { AnalyticalReportTab } from '@/components/crm/AnalyticalReportTab';

function EventDetailDialog({ event, open, onClose, onUpdate, onDelete, onWorkflowAction, onExport, onDuplicate, canEdit = false, canDelete = false, canManageWorkflow = false, canDuplicate = false, departmentContext = 'other' }: {
  event: EventData;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  onWorkflowAction: (id: string, action: string, comment?: string, uin?: string) => void;
  onExport: () => void;
  onDuplicate: () => void;
  canEdit?: boolean;
  canDelete?: boolean;
  canManageWorkflow?: boolean;
  canDuplicate?: boolean;
  departmentContext?: 'methodology' | 'coordination' | 'other';
}) {
  const [activeTab, setActiveTab] = useState('main');
  const tabScrollRef = useRef<HTMLDivElement>(null);

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (tabScrollRef.current) {
      const activeEl = tabScrollRef.current.querySelector('[data-state="active"]') as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeTab]);
  const initialFormData = {
    ...event,
    startDate: event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : '',
    endDate: event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : '',
  };
  const [formData, setFormData] = useState<any>(initialFormData);
  const [editing, setEditing] = useState(false);

  const handleSave = async () => {
    try {
      const payload = Object.fromEntries(
        EVENT_FORM_FIELDS
          .filter(field => formData[field] !== undefined)
          .map(field => [field, formData[field]])
      );
      const res = await apiFetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          changeDescription: `Редактирование мероприятия "${event.title}"`,
        }),
      });
      if (res.ok) {
        toast({ title: 'Сохранено' });
        setEditing(false);
        onUpdate();
      } else {
        toast({ title: 'Ошибка сохранения', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Ошибка сети', variant: 'destructive' });
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const askRequiredComment = (message: string) => {
    const comment = prompt(message);
    if (!comment?.trim()) {
      toast({
        title: 'Нужен комментарий',
        description: 'Возврат или отмена карточки требуют указать причину.',
        variant: 'destructive',
      });
      return null;
    }
    return comment.trim();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] sm:max-w-[95vw] sm:max-w-4xl h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden crm-dialog-enter crm-dialog-glow p-2 sm:p-6 gap-2 sm:gap-4" style={{ display: 'flex', flexDirection: 'column' }}>
        <DialogHeader className="pb-1 sm:pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2 pr-8 sm:pr-8">
            <DialogTitle className="text-sm sm:text-xl flex items-center gap-2 truncate min-w-0">{event.title}</DialogTitle>
            <div className="flex items-center gap-2">
              <Badge className={`crm-badge text-sm px-3 py-1 ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge>
              {event.uin && <Badge variant="secondary" className="font-mono text-xs">{event.uin}</Badge>}
              {!editing && canEdit ? (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditing(true)}><Edit className="h-3 w-3" />Ред.</Button>
              ) : editing ? (
                <Button size="sm" className="gap-1.5 bg-[#E4002B] hover:bg-[#BD0024] crm-btn-hover" onClick={handleSave}>Сохранить</Button>
              ) : null}
            </div>
          </div>
          {/* Workflow Progress Indicator */}
          <div className="mt-1 sm:mt-2 overflow-x-auto crm-scroll -mx-1 px-1">
            <div className="flex items-center gap-0 min-w-[560px]">
              {WORKFLOW_STAGES.map((stage, index) => {
                // Calculate effective index for the progress indicator
                const statusOrder: Record<string, number> = {
                  'draft': 0,
                  'methodology_review': 1,
                  'revision_requested': 0,
                  'coordination_budget_review': 2,
                  'uin_assignment': 3,
                  'agd_date_review': 4,
                  'calendar_approved': 5,
                  'organization_assignment': 5,
                  'in_progress': 6,
                  'event_finished': 7,
                  'methodology_actual_budget_review': 8,
                  'coordination_actual_budget_review': 9,
                  'actual_budget_approved': 9,
                  'archived': 10,
                  'pending_approval': 2,
                  'budget_approved': 3,
                  'uin_assigned': 4,
                  'approved': 5,
                  'pending_actual_budget': 7,
                  'pending_actual_approval': 9,
                  'completed': 10,
                  'rejected': -1,
                  'cancel_requested': -1,
                  'cancelled': -1,
                };
                const effectiveIdx = statusOrder[event.status] ?? 0;
                const effCompleted = index < effectiveIdx;
                const effCurrent = index === effectiveIdx;

                return (
                  <div key={stage.key} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div className={`crm-step-dot w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all
                        ${effCompleted ? 'bg-[#E4002B] text-white completed' : effCurrent ? 'bg-[#E4002B] text-white ring-4 ring-[#FFE0E5]' : 'bg-gray-200 text-gray-400'}`}>
                        {effCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : effCurrent ? index + 1 : index + 1}
                      </div>
                      <span className={`text-[9px] mt-1 leading-tight text-center max-w-[60px] ${effCompleted || effCurrent ? 'text-[#E4002B] font-semibold' : 'text-muted-foreground'}`}>{stage.label}</span>
                    </div>
                    {index < WORKFLOW_STAGES.length - 1 && (
                      <div className={`crm-step-connector ${effCompleted ? 'bg-[#E4002B]' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Quick Note in header - loaded after mount to avoid SSR issues */}
          <QuickNoteBadge eventId={event.id} />
          <DialogDescription className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm">
            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5 shrink-0" />{formatDate(event.startDate)} — {formatDate(event.endDate)}</span>
            {event.venue && <span className="flex items-center gap-1.5 truncate"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{event.venue}</span></span>}
            {event.budget && <span className="flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5 shrink-0" />{formatCurrency(event.budget)}</span>}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="overflow-hidden" style={{ flex: '1 1 0%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div ref={tabScrollRef} className="crm-tab-bar relative overflow-x-auto crm-scroll -mx-1 px-1 scroll-smooth shrink-0" style={{ WebkitOverflowScrolling: 'touch' }}>
            <TabsList className="flex flex-nowrap h-auto gap-1 min-w-max">
              <TabsTrigger value="main" className="text-xs data-[state=active]:text-[#E4002B] data-[state=active]:font-semibold">Основное</TabsTrigger>
              <TabsTrigger value="assignments" className="text-xs data-[state=active]:text-[#E4002B] data-[state=active]:font-semibold">Назначения {event.assignments?.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{event.assignments.length}</Badge>}</TabsTrigger>
              <TabsTrigger value="contacts" className="text-xs data-[state=active]:text-[#E4002B] data-[state=active]:font-semibold">Контакты {event.contacts.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{event.contacts.length}</Badge>}</TabsTrigger>
              <TabsTrigger value="speakers" className="text-xs data-[state=active]:text-[#E4002B] data-[state=active]:font-semibold">Спикеры {event.speakers.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{event.speakers.length}</Badge>}</TabsTrigger>
              <TabsTrigger value="budget" className="text-xs data-[state=active]:text-[#E4002B] data-[state=active]:font-semibold">Бюджет {event.budgetItems.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{event.budgetItems.length}</Badge>}</TabsTrigger>
              <TabsTrigger value="rooms" className="text-xs data-[state=active]:text-[#E4002B] data-[state=active]:font-semibold">Залы {event.rooms.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{event.rooms.length}</Badge>}</TabsTrigger>
              <TabsTrigger value="meals" className="text-xs data-[state=active]:text-[#E4002B] data-[state=active]:font-semibold">Питание {event.meals.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{event.meals.length}</Badge>}</TabsTrigger>
              <TabsTrigger value="logistics" className="text-xs data-[state=active]:text-[#E4002B] data-[state=active]:font-semibold">Логистика</TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs data-[state=active]:text-[#E4002B] data-[state=active]:font-semibold">Задачи {event.tasks.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{event.tasks.length}</Badge>}</TabsTrigger>
              <TabsTrigger value="history" className="text-xs data-[state=active]:text-[#E4002B] data-[state=active]:font-semibold">История</TabsTrigger>
              <TabsTrigger value="comments" className="text-xs data-[state=active]:text-[#E4002B] data-[state=active]:font-semibold">Комментарии</TabsTrigger>
              <TabsTrigger value="payments" className="text-xs data-[state=active]:text-[#E4002B] data-[state=active]:font-semibold">Оплаты {event.payments?.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{event.payments.length}</Badge>}</TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs data-[state=active]:text-[#E4002B] data-[state=active]:font-semibold">Аналитика</TabsTrigger>
            </TabsList>
          </div>

          <div className="mt-4 overflow-y-auto crm-scroll" style={{ flex: '1 1 0%', minHeight: 0 }}>
            <TabsContent value="main" className="space-y-4 mt-0">
              {/* План мероприятия — organization fields */}
              {(event.number || event.client || event.programClass || event.quarter || event.plannedDates || event.programType || event.finance || event.coOrganizer) && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5"><ClipboardList className="h-3.5 w-3.5" />Данные плана</h4>
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 text-sm">
                    {event.number && <div><Label className="text-xs text-muted-foreground">№</Label><p className="font-mono font-medium">#{event.number}</p></div>}
                    {event.client && <div><Label className="text-xs text-muted-foreground">Заказчик (план)</Label><p>{event.client}</p></div>}
                    {event.programClass && <div><Label className="text-xs text-muted-foreground">Класс</Label><Badge className={event.programClass === 'A' ? 'bg-red-50 text-red-700 border-red-300' : event.programClass === 'B' ? 'bg-amber-50 text-amber-700 border-amber-300' : 'bg-slate-50 text-slate-700 border-slate-300'}>Класс {event.programClass}</Badge></div>}
                    {event.quarter && <div><Label className="text-xs text-muted-foreground">Квартал</Label><p>{event.quarter}</p></div>}
                    {event.plannedDates && <div><Label className="text-xs text-muted-foreground">Плановые даты</Label><p>{event.plannedDates}</p></div>}
                    {event.programType && <div><Label className="text-xs text-muted-foreground">Тип программы</Label><p>{event.programType}</p></div>}
                    {event.coOrganizer && <div><Label className="text-xs text-muted-foreground">Соорганизатор</Label><p>{event.coOrganizer}</p></div>}
                    {event.finance && <div><Label className="text-xs text-muted-foreground">Финансирование</Label><p>{event.finance}</p></div>}
                  </div>
                  {/* Quick assignments summary */}
                  {event.assignments?.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {event.assignments.filter(a => a.role === 'LEAD').map(a => (
                        <span key={a.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF1F3] border border-[#FF9DAF] text-xs text-[#BD0024]">
                          <Crown className="h-3 w-3" />{a.user?.name || a.userId}{a.responsibilityZone && <span className="text-[#E4002B]">({a.responsibilityZone})</span>}
                        </span>
                      ))}
                      {event.assignments.filter(a => a.role === 'SUPPORT').map(a => (
                        <span key={a.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-xs text-sky-800">
                          <UserCheck className="h-3 w-3" />{a.user?.name || a.userId}{a.responsibilityZone && <span className="text-sky-600">({a.responsibilityZone})</span>}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 break-words">
                <div className="min-w-0"><Label className="text-xs text-muted-foreground">Наименование</Label>{editing ? <Input value={formData.title || ''} onChange={e => updateField('title', e.target.value)} /> : <p className="font-medium break-words">{event.title}</p>}</div>
                <div className="min-w-0"><Label className="text-xs text-muted-foreground">Руководитель программы</Label>{editing ? <Input value={formData.programDirector || ''} onChange={e => updateField('programDirector', e.target.value)} /> : <p className="break-words">{event.programDirector || '—'}</p>}</div>
                <div className="min-w-0"><Label className="text-xs text-muted-foreground">Дата начала</Label>{editing ? <Input type="date" value={formData.startDate || ''} onChange={e => updateField('startDate', e.target.value)} /> : <p>{formatDate(event.startDate)}</p>}</div>
                <div className="min-w-0"><Label className="text-xs text-muted-foreground">Дата окончания</Label>{editing ? <Input type="date" value={formData.endDate || ''} onChange={e => updateField('endDate', e.target.value)} /> : <p>{formatDate(event.endDate)}</p>}</div>
                <div className="min-w-0"><Label className="text-xs text-muted-foreground">Заказчик</Label>{editing ? <Input value={formData.customerName || ''} onChange={e => updateField('customerName', e.target.value)} /> : <p className="break-words">{event.customerName || '—'}</p>}</div>
                <div className="min-w-0"><Label className="text-xs text-muted-foreground">Источник финансирования</Label>{editing ? <Select value={formData.fundingSource || ''} onValueChange={v => updateField('fundingSource', v)}><SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger><SelectContent><SelectItem value="Образовательная субсидия">Образовательная субсидия</SelectItem><SelectItem value="Субсидия ВГ">Субсидия ВГ</SelectItem><SelectItem value="Внебюджет">Внебюджет</SelectItem><SelectItem value="Предпринимательская деятельность">Предпринимательская деятельность</SelectItem></SelectContent></Select> : <p className="break-words">{event.fundingSource || '—'}</p>}</div>
                <div className="min-w-0"><Label className="text-xs text-muted-foreground">Площадка</Label>{editing ? <Input value={formData.venue || ''} onChange={e => updateField('venue', e.target.value)} /> : <p className="break-words">{event.venue || '—'}</p>}</div>
                <div className="min-w-0"><Label className="text-xs text-muted-foreground">Кампус</Label>{editing ? <Select value={formData.campus || ''} onValueChange={v => updateField('campus', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Южный">Южный</SelectItem><SelectItem value="Северный">Северный</SelectItem></SelectContent></Select> : <p>{event.campus || '—'}</p>}</div>
                <div className="min-w-0"><Label className="text-xs text-muted-foreground">Бюджет</Label>{editing ? <Input type="number" value={formData.budget || ''} onChange={e => updateField('budget', parseFloat(e.target.value))} /> : <p className="font-semibold">{formatCurrency(event.budget)}</p>}</div>
                <div className="min-w-0"><Label className="text-xs text-muted-foreground">Участников</Label>{editing ? <Input type="number" value={formData.participantCount || ''} onChange={e => updateField('participantCount', parseInt(e.target.value))} /> : <p>{event.participantCount || '—'}</p>}</div>
                <div className="min-w-0"><Label className="text-xs text-muted-foreground">УИН</Label>{editing ? <Input value={formData.uin || ''} onChange={e => updateField('uin', e.target.value)} /> : <p>{event.uin || '—'}</p>}</div>
                <div className="min-w-0"><Label className="text-xs text-muted-foreground">Подрядчик</Label>{editing ? <Input value={formData.contractorName || ''} onChange={e => updateField('contractorName', e.target.value)} /> : <p className="break-words">{event.contractorName || '—'}</p>}</div>
              </div>
              <div><Label className="text-xs text-muted-foreground">Целевая аудитория</Label>{editing ? <Textarea value={formData.targetAudience || ''} onChange={e => updateField('targetAudience', e.target.value)} /> : <p>{event.targetAudience || '—'}</p>}</div>
              <div><Label className="text-xs text-muted-foreground">Программа</Label>{editing ? <Textarea rows={4} value={formData.program || ''} onChange={e => updateField('program', e.target.value)} /> : <p className="whitespace-pre-wrap">{event.program || '—'}</p>}</div>
              <div><Label className="text-xs text-muted-foreground">Соорганизаторы</Label>{editing ? <Textarea value={formData.coOrganizers || ''} onChange={e => updateField('coOrganizers', e.target.value)} /> : <p>{event.coOrganizers || '—'}</p>}</div>
              <div><Label className="text-xs text-muted-foreground">VIP-гости</Label>{editing ? <Textarea value={formData.vipGuests || ''} onChange={e => updateField('vipGuests', e.target.value)} /> : <p>{event.vipGuests || '—'}</p>}</div>
            </TabsContent>

            <TabsContent value="assignments" className="mt-0">
              <AssignmentsTab assignments={event.assignments || []} eventId={event.id} onUpdate={onUpdate} />
            </TabsContent>

            <TabsContent value="contacts" className="mt-0">
              <ContactsTab contacts={event.contacts} eventId={event.id} onUpdate={onUpdate} editing={editing} />
            </TabsContent>

            <TabsContent value="speakers" className="mt-0">
              <SpeakersTab speakers={event.speakers} eventId={event.id} onUpdate={onUpdate} editing={editing} departmentContext={departmentContext} isClosingStage={['in_progress', 'event_finished', 'actual_budget_approved', 'archived', 'completed'].includes(event.status)} />
            </TabsContent>

            <TabsContent value="budget" className="mt-0">
              <BudgetTab budgetItems={event.budgetItems} totalBudget={event.budget} eventId={event.id} onUpdate={onUpdate} editing={editing} departmentContext={departmentContext} />
            </TabsContent>

            <TabsContent value="rooms" className="mt-0">
              <RoomsTab rooms={event.rooms} eventId={event.id} onUpdate={onUpdate} editing={editing} />
            </TabsContent>

            <TabsContent value="meals" className="mt-0">
              <MealsTab meals={event.meals} eventId={event.id} onUpdate={onUpdate} editing={editing} />
            </TabsContent>

            <TabsContent value="logistics" className="mt-0 space-y-6">
              <div>
                <h3 className="font-medium mb-2">Трансфер</h3>
                <TransfersTab transfers={event.transfers} eventId={event.id} onUpdate={onUpdate} editing={editing} />
              </div>
              <Separator />
              <div>
                <h3 className="font-medium mb-2">Проживание</h3>
                <AccommodationsTab accommodations={event.accommodations} eventId={event.id} onUpdate={onUpdate} editing={editing} />
              </div>
              <Separator />
              <div>
                <h3 className="font-medium mb-2">Застройка</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
                  <div><Label className="text-xs text-muted-foreground">Монтаж с</Label><p>{formatDate(event.setupStartDate)}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Монтаж по</Label><p>{formatDate(event.setupEndDate)}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Демонтаж с</Label><p>{formatDate(event.teardownStartDate)}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Демонтаж по</Label><p>{formatDate(event.teardownEndDate)}</p></div>
                </div>
                {event.setupDescription && <div className="mt-2"><Label className="text-xs text-muted-foreground">Описание застройки</Label><p>{event.setupDescription}</p></div>}
              </div>
            </TabsContent>

            <TabsContent value="tasks" className="mt-0">
              <TasksTab tasks={event.tasks} eventId={event.id} onUpdate={onUpdate} editing={editing} />
            </TabsContent>

            <TabsContent value="history" className="mt-0">
              <div className="space-y-3">
                {(event.changeLogs || []).length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="text-lg font-medium">Нет записей в истории</p>
                    <p className="text-sm mt-1">Изменения статуса и полей будут отображаться здесь</p>
                  </div>
                ) : (
                  (event.changeLogs || []).map((log, i) => {
                    const isStatusChange = log.field === 'status';
                    const getChangeIcon = () => {
                      if (isStatusChange) {
                        const newStatus = log.newValue as EventStatus;
                        if (['completed', 'archived', 'budget_approved', 'approved', 'calendar_approved', 'actual_budget_approved'].includes(newStatus)) return <CheckCircle2 className="h-4 w-4 text-[#E4002B]" />;
                        if (['rejected', 'cancelled'].includes(newStatus)) return <XCircle className="h-4 w-4 text-red-500" />;
                        if (newStatus === 'in_progress') return <Play className="h-4 w-4 text-blue-500" />;
                        if (['pending_approval', 'methodology_review', 'coordination_budget_review', 'agd_date_review', 'methodology_actual_budget_review', 'coordination_actual_budget_review'].includes(newStatus)) return <Send className="h-4 w-4 text-amber-500" />;
                        return <Clock className="h-4 w-4 text-gray-500" />;
                      }
                      return <Edit className="h-4 w-4 text-blue-400" />;
                    };
                    return (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-xl border bg-white hover:shadow-sm transition-shadow">
                        <div className={`p-1.5 rounded-lg shrink-0 ${isStatusChange ? 'bg-[#FFF1F3]' : 'bg-blue-50'}`}>
                          {getChangeIcon()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{log.changedBy || 'Система'}</span>
                            {isStatusChange ? (
                              <span className="text-sm text-muted-foreground">изменил(а) статус</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">изменил(а) поле <span className="font-medium">{log.field}</span></span>
                            )}
                          </div>
                          {isStatusChange ? (
                            <div className="flex items-center gap-2 mt-1">
                              {log.oldValue && <Badge variant="outline" className={`crm-badge text-[10px] ${getStatusColor(log.oldValue as EventStatus)}`}>{getStatusLabel(log.oldValue as EventStatus)}</Badge>}
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              {log.newValue && <Badge className={`crm-badge text-[10px] ${getStatusColor(log.newValue as EventStatus)}`}>{getStatusLabel(log.newValue as EventStatus)}</Badge>}
                            </div>
                          ) : (
                            <div className="mt-1 text-sm">
                              {log.oldValue && <span className="text-muted-foreground line-through mr-2">{log.oldValue}</span>}
                              {log.newValue && <span className="font-medium">{log.newValue}</span>}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground mt-1.5">{new Date(log.createdAt).toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="comments" className="mt-0">
              <CommentsTab eventId={event.id} />
            </TabsContent>

            <TabsContent value="payments" className="mt-0">
              <PaymentsTab payments={event.payments || []} eventId={event.id} onUpdate={onUpdate} editing={editing} />
            </TabsContent>

            {/* Analytical Report Tab */}
            <TabsContent value="analytics" className="mt-0 space-y-4">
              <AnalyticalReportTab event={event} onUpdate={onUpdate} editing={editing} />
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t pt-2 sm:pt-4 gap-2 overflow-x-auto crm-scroll">
          {canManageWorkflow && <div className="flex gap-2 flex-wrap">
            {canSubmitForApproval(event.status) && <Button size="sm" className="gap-1.5 bg-[#E4002B] hover:bg-[#BD0024] crm-btn-hover crm-pulse-btn whitespace-nowrap" onClick={() => onWorkflowAction(event.id, 'submit_for_approval')}><Send className="h-3 w-3" />На согласование</Button>}
            {canApproveMethodology(event.status) && <Button size="sm" className="gap-1.5 bg-[#E4002B] hover:bg-[#BD0024] whitespace-nowrap" onClick={() => onWorkflowAction(event.id, 'methodology_approve')}><ThumbsUp className="h-3 w-3" />Согласовать методологией</Button>}
            {canApproveBudget(event.status) && <Button size="sm" className="gap-1.5 bg-[#E4002B] hover:bg-[#BD0024] whitespace-nowrap" onClick={() => {
              const uinValue = prompt('Введите УИН (необязательно):');
              onWorkflowAction(event.id, 'approve_budget', undefined, uinValue || undefined);
            }}><ThumbsUp className="h-3 w-3" />Согласовать бюджет</Button>}
            {canAssignUin(event.status) && <Button size="sm" className="gap-1.5 bg-sky-600 hover:bg-sky-700 whitespace-nowrap" onClick={() => {
              const uinValue = prompt('Введите УИН:');
              if (uinValue) onWorkflowAction(event.id, 'assign_uin', undefined, uinValue);
            }}><Hash className="h-3 w-3" />Присвоить УИН</Button>}
            {canAddToCalendar(event.status) && <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700 whitespace-nowrap" onClick={() => onWorkflowAction(event.id, 'add_to_calendar')}><Calendar className="h-3 w-3" />В календарь</Button>}
            {canStartEvent(event.status) && <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 whitespace-nowrap" onClick={() => onWorkflowAction(event.id, 'start')}><Play className="h-3 w-3" />Взять в работу</Button>}
            {canCompleteEvent(event.status) && <Button size="sm" className="gap-1.5 bg-[#164194] hover:bg-[#190B62] whitespace-nowrap" onClick={() => onWorkflowAction(event.id, 'complete')}><CheckCircle2 className="h-3 w-3" />Мероприятие проведено</Button>}
            {canSubmitActualBudget(event.status) && <Button size="sm" className="gap-1.5 bg-orange-600 hover:bg-orange-700 whitespace-nowrap" onClick={() => onWorkflowAction(event.id, 'submit_actual_budget')}><Banknote className="h-3 w-3" />Отправить факт. бюджет</Button>}
            {canApproveMethodologyActualBudget(event.status) && <Button size="sm" className="gap-1.5 bg-[#E4002B] hover:bg-[#BD0024] whitespace-nowrap" onClick={() => onWorkflowAction(event.id, 'methodology_approve_actual_budget')}><ThumbsUp className="h-3 w-3" />Согласовать факт. методологией</Button>}
            {canApproveActualBudget(event.status) && <Button size="sm" className="gap-1.5 bg-purple-600 hover:bg-purple-700 whitespace-nowrap" onClick={() => onWorkflowAction(event.id, 'approve_actual_budget')}><ThumbsUp className="h-3 w-3" />Согласовать факт. бюджет</Button>}
            {canRejectActualBudget(event.status) && <Button size="sm" variant="outline" className="gap-1.5 border-orange-300 text-orange-700 whitespace-nowrap" onClick={() => {
              const comment = askRequiredComment('Почему фактический бюджет возвращается на доработку?');
              if (comment) onWorkflowAction(event.id, 'reject_actual_budget', comment);
            }}><ThumbsDown className="h-3 w-3" />Отклонить факт. бюджет</Button>}
            {canFinalizeEvent(event.status) && <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 whitespace-nowrap" onClick={() => onWorkflowAction(event.id, 'finalize_event')}><CheckCircle2 className="h-3 w-3" />Завершить мероприятие</Button>}
            {canReject(event.status) && <Button size="sm" variant="destructive" className="gap-1.5 whitespace-nowrap" onClick={() => {
              const comment = askRequiredComment('Почему карточка возвращается на доработку?');
              if (comment) onWorkflowAction(event.id, 'request_revision', comment);
            }}><ThumbsDown className="h-3 w-3" />На доработку</Button>}
            {canConfirmCancel(event.status) && <Button size="sm" variant="destructive" className="gap-1.5 whitespace-nowrap" onClick={() => onWorkflowAction(event.id, 'confirm_cancel')}><XCircle className="h-3 w-3" />Подтвердить отмену</Button>}
            {canRequestCancel(event.status) && <Button size="sm" variant="outline" className="gap-1.5 border-red-200 text-red-700 whitespace-nowrap" onClick={() => {
              const comment = askRequiredComment('Почему запрашивается отмена мероприятия?');
              if (comment) onWorkflowAction(event.id, 'request_cancel', comment);
            }}><XCircle className="h-3 w-3" />Запросить отмену</Button>}
          </div>}
          <div className="flex gap-2">
            {canDuplicate && <Button variant="outline" size="sm" className="gap-1.5 whitespace-nowrap" onClick={onDuplicate}><Copy className="h-3 w-3" />Дублировать</Button>}
            <Button variant="outline" size="sm" className="gap-1.5 whitespace-nowrap" onClick={onExport}><Download className="h-3 w-3" />Excel</Button>
            {canDelete && <Button variant="destructive" size="sm" className="gap-1.5 whitespace-nowrap" onClick={onDelete}><Trash2 className="h-3 w-3" />Удалить</Button>}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { EventDetailDialog };
export default EventDetailDialog;
