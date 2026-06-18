'use client';

import React from 'react';
import {
  Calendar, Star, Eye, CheckCircle2, Play, Users as UsersIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EventData, EventStatus } from '@/lib/crm-types';
import { getStatusLabel, getStatusColor, formatDate } from '@/lib/crm-utils';

interface AGDViewProps {
  events: EventData[];
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date) => void;
  handleWorkflowAction: (eventId: string, action: string, comment?: string, uin?: string) => Promise<void>;
  setSelectedEvent: (event: EventData | null) => void;
  setShowEventDialog: (show: boolean) => void;
  mounted: boolean;
}

export function AGDView({
  events,
  selectedDate,
  setSelectedDate,
  handleWorkflowAction,
  setSelectedEvent,
  setShowEventDialog,
  mounted,
}: AGDViewProps) {
  const year = selectedDate ? selectedDate.getFullYear() : new Date().getFullYear();
  const month = selectedDate ? selectedDate.getMonth() : new Date().getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const monthName = selectedDate ? selectedDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' }) : '';
  const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const getEventsForDate = (day: number) => {
    const date = new Date(year, month, day);
    return events.filter(e => {
      if (!e.startDate || !e.endDate) return false;
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      return date >= start && date <= end;
    });
  };

  const selectedDayEvents = selectedDate ? getEventsForDate(selectedDate.getDate()) : [];

  // VIP events
  const vipEvents = events.filter(e => e.vipGuests);

  // Events waiting for calendar approval
  const waitingForCalendar = events.filter(e => ['agd_date_review', 'uin_assigned'].includes(e.status));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Календарь мероприятий</h2>
        <p className="text-muted-foreground">Календарь активностей, VIP-гости, добавление в календарь</p>
      </div>

      {/* Events waiting for calendar addition */}
      {waitingForCalendar.length > 0 && (
        <Card className="shadow-sm border-l-4 border-l-violet-400">
          <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Calendar className="h-5 w-5 text-violet-500" /> Ожидают добавления в календарь ({waitingForCalendar.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {waitingForCalendar.map(event => (
                <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-xl border bg-white dark:bg-gray-900 hover:shadow-sm overflow-hidden">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{event.title}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                      {event.uin && <Badge variant="secondary" className="text-xs font-mono shrink-0">{event.uin}</Badge>}
                      {event.startDate && <span className="flex items-center gap-1 min-w-0"><Calendar className="h-3 w-3 shrink-0" /><span className="truncate">{formatDate(event.startDate)} — {formatDate(event.endDate)}</span></span>}
                      {event.venue && <span className="truncate">{event.venue}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={`crm-badge ${getStatusColor(event.status)}`}>{getStatusLabel(event.status)}</Badge>
                    <Button size="sm" className="bg-violet-600 hover:bg-violet-700 gap-1.5 text-xs sm:text-sm" onClick={() => handleWorkflowAction(event.id, 'add_to_calendar')}>
                      <Calendar className="h-3.5 w-3.5" /> В календарь
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setSelectedEvent(event); setShowEventDialog(true); }}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="capitalize text-sm sm:text-base">{monthName}</CardTitle>
              <div className="flex gap-1 sm:gap-2">
                <Button variant="outline" size="sm" className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" onClick={() => setSelectedDate(new Date(year, month - 1, 1))}>←</Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => setSelectedDate(new Date())}>Сегодня</Button>
                <Button variant="outline" size="sm" className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" onClick={() => setSelectedDate(new Date(year, month + 1, 1))}>→</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {days.map(d => <div key={d} className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground p-1 sm:p-2">{d}</div>)}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`empty-${i}`} className="p-1 sm:p-2" />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = getEventsForDate(day);
                const isToday = mounted && day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
                const isSelected = selectedDate ? day === selectedDate.getDate() && month === selectedDate.getMonth() : false;
                return (
                  <div
                    key={day}
                    className={`p-0.5 sm:p-1.5 min-h-[44px] sm:min-h-[70px] rounded-lg border cursor-pointer transition-colors text-sm
                      ${isToday ? 'border-[#FF9DAF] bg-[#FFF1F3]' : ''}
                      ${isSelected ? 'ring-2 ring-[#E4002B]' : ''}
                      hover:bg-accent/50`}
                    onClick={() => setSelectedDate(new Date(year, month, day))}
                  >
                    <div className={`text-[11px] sm:text-xs font-medium mb-0.5 sm:mb-1 ${isToday ? 'text-[#E4002B]' : ''}`}>{day}</div>
                    {dayEvents.slice(0, 2).map((e, ei) => (
                      <div key={ei} className="text-[9px] sm:text-[10px] px-0.5 sm:px-1 py-0.5 rounded bg-[#FFE0E5] text-[#BD0024] truncate mb-0.5">
                        {e.title.substring(0, 10)}...
                      </div>
                    ))}
                    {dayEvents.length > 2 && <div className="text-[9px] sm:text-[10px] text-muted-foreground">+{dayEvents.length - 2}</div>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Day Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Сводка на {mounted && selectedDate ? selectedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : ''}</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDayEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Нет мероприятий</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayEvents.map(e => (
                    <div key={e.id} className="p-2 rounded border cursor-pointer hover:bg-accent/50 overflow-hidden" onClick={() => { setSelectedEvent(e); setShowEventDialog(true); }}>
                      <p className="font-medium text-sm truncate">{e.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{e.venue} • {e.participantCount} чел.</p>
                      {e.vipGuests && <p className="text-xs text-amber-600 mt-1"><Star className="h-3 w-3 inline mr-1" />VIP: {e.vipGuests}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* VIP List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1"><Star className="h-4 w-4 text-amber-500" /> VIP-гости</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-64">
                {vipEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 text-center">Нет VIP-гостей</p>
                ) : (
                  <div className="space-y-2">
                    {vipEvents.map(e => (
                      <div key={e.id} className="p-2 rounded border overflow-hidden">
                        <p className="font-medium text-xs truncate">{e.title}</p>
                        <p className="text-xs text-amber-600 truncate">{e.vipGuests}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Активности</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-xs sm:text-sm"><span className="text-muted-foreground">В процессе</span><span className="font-medium">{events.filter(e => e.status === 'in_progress').length}</span></div>
              <div className="flex justify-between text-xs sm:text-sm"><span className="text-muted-foreground">Предстоящие</span><span className="font-medium">{mounted ? events.filter(e => e.startDate && new Date(e.startDate) > new Date()).length : '–'}</span></div>
              <div className="flex justify-between text-xs sm:text-sm"><span className="text-muted-foreground">Завершенные</span><span className="font-medium">{events.filter(e => ['archived', 'completed'].includes(e.status)).length}</span></div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Хронология мероприятий (Gantt) */}
      <Card className="shadow-sm border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-400" />
            Хронология мероприятий
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const eventsWithDates = events.filter(e => e.startDate && e.endDate);
            if (eventsWithDates.length === 0) {
              return (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Нет мероприятий с указанными датами</p>
                </div>
              );
            }
            const allDates = eventsWithDates.flatMap(e => [new Date(e.startDate!).getTime(), new Date(e.endDate!).getTime()]);
            const timelineStart = new Date(Math.min(...allDates));
            timelineStart.setDate(timelineStart.getDate() - 3);
            const timelineEnd = new Date(Math.max(...allDates));
            timelineEnd.setDate(timelineEnd.getDate() + 3);
            const totalMs = timelineEnd.getTime() - timelineStart.getTime();

            const statusGanttColors: Record<string, string> = {
              draft: 'bg-gray-400',
              pending_approval: 'bg-amber-400',
              budget_approved: 'bg-sky-400',
              approved: 'bg-[#E4002B]',
              uin_assigned: 'bg-teal-400',
              in_progress: 'bg-blue-400',
              pending_actual_budget: 'bg-orange-400',
              pending_actual_approval: 'bg-purple-400',
              actual_budget_approved: 'bg-indigo-400',
              completed: 'bg-green-400',
              rejected: 'bg-red-400',
              cancelled: 'bg-gray-300',
            };

            // Generate month labels
            const months: { label: string; left: number }[] = [];
            const current = new Date(timelineStart.getFullYear(), timelineStart.getMonth(), 1);
            while (current <= timelineEnd) {
              const monthStart = new Date(Math.max(current.getTime(), timelineStart.getTime()));
              const left = ((monthStart.getTime() - timelineStart.getTime()) / totalMs) * 100;
              months.push({ label: current.toLocaleString('ru-RU', { month: 'short', year: '2-digit' }), left });
              current.setMonth(current.getMonth() + 1);
            }

            return (
              <div className="overflow-x-auto crm-scroll">
                <div className="min-w-[600px]">
                  {/* Month labels */}
                  <div className="relative h-6 mb-2 border-b border-gray-200">
                    {months.map((m, i) => (
                      <span key={i} className="absolute text-[10px] text-muted-foreground font-medium" style={{ left: `${Math.min(m.left, 95)}%` }}>{m.label}</span>
                    ))}
                  </div>
                  {/* Event bars */}
                  <div className="space-y-2">
                    {eventsWithDates.map(event => {
                      const start = new Date(event.startDate!);
                      const end = new Date(event.endDate!);
                      const leftPercent = ((start.getTime() - timelineStart.getTime()) / totalMs) * 100;
                      const widthPercent = ((end.getTime() - start.getTime()) / totalMs) * 100;
                      const barColor = statusGanttColors[event.status] || 'bg-gray-400';
                      return (
                        <div key={event.id} className="relative h-8 group cursor-pointer" onClick={() => { setSelectedEvent(event); setShowEventDialog(true); }}>
                          <div
                            className={`absolute top-1 h-6 rounded-md ${barColor} opacity-80 hover:opacity-100 transition-opacity flex items-center px-2 overflow-hidden`}
                            style={{ left: `${leftPercent}%`, width: `${Math.max(widthPercent, 1)}%` }}
                          >
                            <span className="text-[10px] text-white font-medium whitespace-nowrap truncate drop-shadow-sm">{event.title}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}
