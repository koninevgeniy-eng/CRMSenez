'use client';

import React from 'react';
import {
  Play, Send, Eye, CheckCircle2, CheckCircle, ClipboardList,
  Calendar, MapPin, Users as UsersIcon, UserCheck, Badge as BadgeIcon,
  Banknote,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { EventData, UserData, TASK_CATEGORIES } from '@/lib/crm-types';
import { getStatusLabel, getStatusColor, formatDate, canStartEvent, canCompleteEvent } from '@/lib/crm-utils';
import { apiFetch } from '@/lib/api-fetch';
import { toast } from '@/hooks/use-toast';

interface OrganizationViewProps {
  events: EventData[];
  users: UserData[];
  isManager: boolean;
  handleWorkflowAction: (eventId: string, action: string, comment?: string, uin?: string) => Promise<void>;
  setSelectedEvent: (event: EventData | null) => void;
  setShowEventDialog: (show: boolean) => void;
  fetchEvents: () => void;
}

export function OrganizationView({
  events,
  users,
  isManager,
  handleWorkflowAction,
  setSelectedEvent,
  setShowEventDialog,
  fetchEvents,
}: OrganizationViewProps) {
  // Организация видит: согласованные АГД мероприятия + in_progress (в работе)
  const newEvents = events.filter(e => ['calendar_approved', 'organization_assignment', 'approved'].includes(e.status));
  const inProgressEvents = events.filter(e => e.status === 'in_progress');
  const completedEvents = events.filter(e => [
    'event_finished',
    'methodology_actual_budget_review',
    'coordination_actual_budget_review',
    'pending_actual_budget',
    'pending_actual_approval',
    'actual_budget_approved',
  ].includes(e.status));
  const activeEvents = [...newEvents, ...inProgressEvents];
  // Сотрудники организации для назначения
  const orgUsers = users.filter(u => u.department === 'organization' && u.isActive);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Организация мероприятий</h2>
        <p className="text-muted-foreground text-sm mt-1">Руководитель распределяет мероприятия по сотрудникам, назначает ответственных, контролирует задачи</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Card className="crm-stat-card emerald crm-gradient-card border-0 crm-shadow-elevated"><CardContent className="p-3 sm:p-4"><div className="flex items-center gap-2 sm:gap-3"><div className="p-2 sm:p-2.5 bg-[#FFE0E5] rounded-xl"><Play className="h-4 w-4 sm:h-5 sm:w-5 text-[#E4002B]" /></div><div><p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Активные</p><p className="text-xl sm:text-2xl font-bold crm-stat-number crm-count-up">{activeEvents.length}</p></div></div></CardContent></Card>
        <Card className="crm-stat-card sky crm-gradient-card border-0 crm-shadow-elevated"><CardContent className="p-3 sm:p-4"><div className="flex items-center gap-2 sm:gap-3"><div className="p-2 sm:p-2.5 bg-sky-100 rounded-xl"><Send className="h-4 w-4 sm:h-5 sm:w-5 text-sky-600" /></div><div><p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Ожидают</p><p className="text-xl sm:text-2xl font-bold crm-stat-number crm-count-up">{newEvents.length}</p></div></div></CardContent></Card>
        <Card className="crm-stat-card blue crm-gradient-card border-0 crm-shadow-elevated"><CardContent className="p-3 sm:p-4"><div className="flex items-center gap-2 sm:gap-3"><div className="p-2 sm:p-2.5 bg-blue-100 rounded-xl"><ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" /></div><div><p className="text-[10px] sm:text-xs text-muted-foreground font-medium">В работе</p><p className="text-xl sm:text-2xl font-bold crm-stat-number crm-count-up">{inProgressEvents.length}</p></div></div></CardContent></Card>
        <Card className="crm-stat-card green crm-gradient-card border-0 crm-shadow-elevated"><CardContent className="p-3 sm:p-4"><div className="flex items-center gap-2 sm:gap-3"><div className="p-2 sm:p-2.5 bg-green-100 rounded-xl"><CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" /></div><div><p className="text-[10px] sm:text-xs text-muted-foreground font-medium truncate">Задач вып.</p><p className="text-xl sm:text-2xl font-bold crm-stat-number crm-count-up">{activeEvents.reduce((s, e) => s + e.tasks.filter(t => t.completed).length, 0)}</p></div></div></CardContent></Card>
      </div>

      {/* New events — waiting for manager to assign */}
      {newEvents.length > 0 && (
        <Card className="shadow-sm border-l-4 border-l-sky-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Send className="h-5 w-5 text-sky-500" />
              Новые мероприятия — назначьте ответственных ({newEvents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {newEvents.map(event => (
                <div key={event.id} className="border rounded-xl p-3 sm:p-5 space-y-3 sm:space-y-4 bg-white dark:bg-gray-900 hover:shadow-md transition-shadow overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
                    <div className="min-w-0 overflow-hidden">
                      <h3 className="font-semibold text-sm sm:text-lg truncate">{event.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-xs sm:text-sm text-muted-foreground">
                        {event.uin && <Badge variant="secondary" className="text-xs font-mono">{event.uin}</Badge>}
                        {event.startDate && <span className="flex items-center gap-1"><Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />{formatDate(event.startDate)} — {formatDate(event.endDate)}</span>}
                        {event.venue && <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" /><span className="truncate">{event.venue}</span></span>}
                        {event.participantCount && <span className="flex items-center gap-1"><UsersIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />{event.participantCount} чел.</span>}
                      </div>
                    </div>
                    <Badge className={`crm-badge shrink-0 ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge>
                  </div>

                  {/* Assign responsible employees */}
                  {isManager && orgUsers.length > 0 && (
                    <div className="bg-sky-50 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-3 overflow-hidden">
                      <h4 className="font-medium text-xs sm:text-sm flex items-center gap-2">
                        <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-sky-600 shrink-0" />
                        Назначить ответственных
                      </h4>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {orgUsers.map(u => {
                          const isAssigned = event.assignments?.some(a => a.userId === u.id);
                          return (
                            <Button
                              key={u.id}
                              size="sm"
                              variant={isAssigned ? 'default' : 'outline'}
                              className={`gap-1.5 ${isAssigned ? 'bg-sky-600 hover:bg-sky-700' : 'border-sky-300 text-sky-700 hover:bg-sky-50'}`}
                              onClick={async () => {
                                if (isAssigned) return;
                                try {
                                  const res = await apiFetch('/api/assignments', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      eventId: event.id,
                                      userId: u.id,
                                      role: 'SUPPORT',
                                      responsibilityZone: 'Организация',
                                    }),
                                  });
                                  if (res.ok) {
                                    toast({ title: `${u.name} назначен(а) на мероприятие` });
                                    fetchEvents();
                                  }
                                } catch { toast({ title: 'Ошибка назначения', variant: 'destructive' }); }
                              }}
                            >
                              <UsersIcon className="h-3 w-3" />
                              {u.name.split(' ')[0]}
                              {isAssigned && <CheckCircle2 className="h-3 w-3 ml-1" />}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="bg-[#E4002B] hover:bg-[#BD0024] crm-btn-hover gap-1.5 text-xs sm:text-sm" onClick={() => handleWorkflowAction(event.id, 'start')}>
                      <Play className="h-3.5 w-3.5" /> Взять в работу
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs sm:text-sm" onClick={() => { setSelectedEvent(event); setShowEventDialog(true); }}>
                      <Eye className="h-3.5 w-3.5" /> Карточка
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* In-progress events */}
      {inProgressEvents.map(event => {
        const tasksByCategory = TASK_CATEGORIES.map(cat => ({
          ...cat,
          tasks: event.tasks.filter(t => t.category === cat.value),
        })).filter(c => c.tasks.length > 0);

        const completionPercent = event.tasks.length > 0
          ? Math.round((event.tasks.filter(t => t.completed).length / event.tasks.length) * 100)
          : 0;

        return (
          <Card key={event.id} className="shadow-sm border-0 overflow-hidden">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                <div className="min-w-0 overflow-hidden">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <span className="truncate">{event.title}</span>
                    <Badge className={`crm-badge shrink-0 ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge>
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs sm:text-sm truncate">{formatDate(event.startDate)} — {formatDate(event.endDate)} • {event.venue}</CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {canStartEvent(event.status) && (
                    <Button size="sm" className="bg-[#E4002B] hover:bg-[#BD0024] crm-btn-hover gap-1.5 text-xs" onClick={() => handleWorkflowAction(event.id, 'start')}>
                      <Play className="h-3.5 w-3.5" /> Начать
                    </Button>
                  )}
                  {canCompleteEvent(event.status) && (
                    <Button size="sm" className="bg-[#164194] hover:bg-[#190B62] gap-1.5 text-xs" onClick={() => handleWorkflowAction(event.id, 'complete')}>
                      <CheckCircle className="h-3.5 w-3.5" /> Мероприятие проведено
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => { setSelectedEvent(event); setShowEventDialog(true); }}>
                    <Eye className="h-3.5 w-3.5" /> Карточка
                  </Button>
                </div>
              </div>
              <div className="mt-2 sm:mt-3">
                <div className="flex items-center justify-between text-xs sm:text-sm mb-1.5">
                  <span className="font-medium">Готовность: {completionPercent}%</span>
                  <span className="text-muted-foreground">{event.tasks.filter(t => t.completed).length}/{event.tasks.length} задач</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="crm-progress-bar h-full rounded-full" style={{ width: `${completionPercent}%` }} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {tasksByCategory.map(cat => (
                  <div key={cat.value} className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      {cat.label}
                      <Badge variant="secondary" className="text-xs">{cat.tasks.length}</Badge>
                    </h4>
                    <div className="space-y-1">
                      {cat.tasks.map((task, ti) => (
                        <div key={ti} className="flex items-center gap-2 p-1.5 sm:p-2 rounded border text-xs sm:text-sm">
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={async (checked) => {
                              const updatedTasks = event.tasks.map((t, idx) =>
                                event.tasks.indexOf(task) === idx ? { ...t, completed: !!checked } : t
                              );
                              await apiFetch(`/api/events/${event.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ tasks: updatedTasks, changedBy: 'Организация' }),
                              });
                              fetchEvents();
                            }}
                          />
                          <span className={`min-w-0 ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
                          {task.assignee && <span className="ml-auto text-[10px] sm:text-xs text-muted-foreground shrink-0">{task.assignee}</span>}
                          {task.priority === 'high' && <Badge variant="destructive" className="text-[10px] px-1 shrink-0">!</Badge>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Completed events — awaiting actual budget from Methodology */}
      {completedEvents.length > 0 && (
        <Card className="shadow-sm border-l-4 border-l-green-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Проведённые мероприятия ({completedEvents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedEvents.map(event => (
                <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border bg-white dark:bg-gray-900 hover:shadow-sm overflow-hidden">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{event.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                      {event.uin && <Badge variant="secondary" className="text-xs font-mono shrink-0">{event.uin}</Badge>}
                      <Badge className={`crm-badge ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => { setSelectedEvent(event); setShowEventDialog(true); }}>
                    <Eye className="h-3.5 w-3.5" /> Карточка
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeEvents.length === 0 && completedEvents.length === 0 && (
        <Card><CardContent className="py-12 text-center text-muted-foreground"><ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>Нет активных мероприятий для организации</p></CardContent></Card>
      )}
    </div>
  );
}
