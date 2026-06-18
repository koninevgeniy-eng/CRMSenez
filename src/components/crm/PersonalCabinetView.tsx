'use client';

import React from 'react';
import {
  Briefcase, LayoutDashboard, ClipboardList, Users, BarChart3,
  CheckCircle2, Clock, Calendar, Target, CheckCircle, Play,
  Plus, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { EventData, DEPARTMENTS, TASK_CATEGORIES, PersonalView as PersonalViewType, USER_ROLE_LABELS, USER_ROLE_COLORS, UserRole } from '@/lib/crm-types';
import { formatDate, formatCurrency } from '@/lib/crm-utils';
import { apiFetch } from '@/lib/api-fetch';
import { toast } from '@/hooks/use-toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

interface PersonalCabinetViewProps {
  user: any;
  isManager: boolean;
  isAdmin: boolean;
  events: EventData[];
  myTasks: any[];
  deptTasks: any[];
  myEventAssignments: any[];
  deptUsers: any[];
  personalView: PersonalViewType;
  setPersonalView: (view: PersonalViewType) => void;
  showCreateTaskDialog: boolean;
  setShowCreateTaskDialog: (show: boolean) => void;
  newTaskForm: { eventId: string; category: string; title: string; description: string; dueDate: string; priority: string; assigneeIds: string[] };
  setNewTaskForm: (form: any) => void;
  fetchPersonalData: () => void;
}

export function PersonalCabinetView({
  user,
  isManager,
  isAdmin,
  events,
  myTasks,
  deptTasks,
  myEventAssignments,
  deptUsers,
  personalView,
  setPersonalView,
  showCreateTaskDialog,
  setShowCreateTaskDialog,
  newTaskForm,
  setNewTaskForm,
  fetchPersonalData,
}: PersonalCabinetViewProps) {
  const completedTasks = myTasks.filter((t: any) => t.task?.completed).length;
  const pendingTasks = myTasks.filter((t: any) => !t.task?.completed).length;
  const upcomingEvents = myEventAssignments.filter((a: any) => {
    const e = a.event;
    return e && e.startDate && new Date(e.startDate) > new Date() && !['archived', 'completed', 'cancelled'].includes(e.status);
  }).length;

  const handleToggleTask = async (taskId: string, currentCompleted: boolean) => {
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !currentCompleted }),
      });
      if (res.ok) {
        toast({ title: !currentCompleted ? 'Задача выполнена' : 'Задача возвращена в работу' });
        fetchPersonalData();
      }
    } catch {
      toast({ title: 'Ошибка обновления задачи', variant: 'destructive' });
    }
  };

  const handleCreateTask = async () => {
    try {
      const res = await apiFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTaskForm),
      });
      if (res.ok) {
        toast({ title: 'Задача создана и назначена' });
        setShowCreateTaskDialog(false);
        setNewTaskForm({ eventId: '', category: 'technical', title: '', description: '', dueDate: '', priority: 'medium', assigneeIds: [] });
        fetchPersonalData();
      } else {
        const err = await res.json();
        toast({ title: 'Ошибка', description: err.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка создания задачи', variant: 'destructive' });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const res = await apiFetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: 'Задача удалена' });
        fetchPersonalData();
      }
    } catch {
      toast({ title: 'Ошибка удаления', variant: 'destructive' });
    }
  };

  const toggleAssignee = (uid: string) => {
    setNewTaskForm((prev: any) => ({
      ...prev,
      assigneeIds: prev.assigneeIds.includes(uid)
        ? prev.assigneeIds.filter((id: string) => id !== uid)
        : [...prev.assigneeIds, uid],
    }));
  };

  // Workload data for manager chart
  const workloadData = deptUsers.map((u: any) => {
    const userTasks = deptTasks.filter((t: any) => t.userId === u.id);
    const completed = userTasks.filter((t: any) => t.task?.completed).length;
    const pending = userTasks.filter((t: any) => !t.task?.completed).length;
    return {
      name: u.name?.split(' ')[0] || u.email?.split('@')[0] || '—',
      fullName: u.name || u.email,
      completed,
      pending,
      total: completed + pending,
    };
  });

  const priorityColors: Record<string, string> = {
    high: 'bg-red-100 text-red-700 border-red-300',
    medium: 'bg-amber-100 text-amber-700 border-amber-300',
    low: 'bg-green-100 text-green-700 border-green-300',
  };
  const priorityLabels: Record<string, string> = {
    high: 'Высокий',
    medium: 'Средний',
    low: 'Низкий',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-[#E4002B]" />
            Мой кабинет
          </h2>
          <p className="text-sm text-muted-foreground">
            {user?.name || 'Пользователь'} • {user?.department ? DEPARTMENTS.find(d => d.id === user.department)?.shortName : '—'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={USER_ROLE_COLORS[user?.role as UserRole] || ''}>
            {USER_ROLE_LABELS[user?.role as UserRole] || user?.role}
          </Badge>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex items-center gap-1 p-1 bg-white rounded-xl border shadow-sm">
        {[
          { key: 'overview' as PersonalViewType, label: 'Обзор', icon: LayoutDashboard },
          { key: 'my-tasks' as PersonalViewType, label: 'Мои задачи', icon: ClipboardList },
          ...(isManager || isAdmin ? [
            { key: 'team' as PersonalViewType, label: 'Команда', icon: Users },
            { key: 'workload' as PersonalViewType, label: 'Нагрузка', icon: BarChart3 },
          ] : []),
        ].map(item => (
          <button
            key={item.key}
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px]
              ${personalView === item.key ? 'bg-[#FFE0E5] text-[#E4002B]' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
            onClick={() => setPersonalView(item.key)}
          >
            <item.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        ))}
      </div>

      {/* ==================== OVERVIEW ==================== */}
      {personalView === 'overview' && (
        <div className="space-y-6 crm-fade-in">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Card className="crm-gradient-card border-0 shadow-sm crm-shadow-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#FFE0E5] text-[#E4002B]"><CheckCircle2 className="h-5 w-5" /></div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Выполнено</p>
                    <p className="text-xl font-bold crm-stat-number">{completedTasks}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="crm-gradient-card border-0 shadow-sm crm-shadow-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-100 text-amber-600"><Clock className="h-5 w-5" /></div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">В работе</p>
                    <p className="text-xl font-bold crm-stat-number">{pendingTasks}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="crm-gradient-card border-0 shadow-sm crm-shadow-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600"><Calendar className="h-5 w-5" /></div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Предстоящих событий</p>
                    <p className="text-xl font-bold crm-stat-number">{upcomingEvents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="crm-gradient-card border-0 shadow-sm crm-shadow-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-100 text-violet-600"><Target className="h-5 w-5" /></div>
                  <div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Всего задач</p>
                    <p className="text-xl font-bold crm-stat-number">{myTasks.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Ring */}
          {myTasks.length > 0 && (
            <Card className="crm-gradient-card border-0 shadow-sm crm-shadow-elevated">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative">
                    <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" stroke="#e5e7eb" strokeWidth="10" fill="none" />
                      <circle
                        cx="60" cy="60" r="50"
                        stroke="#10b981"
                        strokeWidth="10"
                        fill="none"
                        strokeDasharray={`${(completedTasks / myTasks.length) * 314} 314`}
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-bold">{myTasks.length > 0 ? Math.round((completedTasks / myTasks.length) * 100) : 0}%</span>
                    </div>
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-lg font-semibold mb-1">Прогресс выполнения</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Выполнено {completedTasks} из {myTasks.length} задач
                    </p>
                    <div className="flex gap-4 justify-center sm:justify-start">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#E4002B]" />
                        <span className="text-sm text-muted-foreground">В работе: {pendingTasks}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#10b981]" />
                        <span className="text-sm text-muted-foreground">Выполнено: {completedTasks}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* My upcoming events */}
          {myEventAssignments.length > 0 && (
            <Card className="shadow-sm border-0">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-5 w-5 text-[#E4002B]" />Мои мероприятия</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {myEventAssignments.slice(0, 5).map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border overflow-hidden gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-xs sm:text-sm truncate">{a.event?.title || '—'}</p>
                        <p className="text-xs text-muted-foreground">{a.event?.startDate ? formatDate(a.event.startDate) : '—'} • {a.role === 'LEAD' ? 'Руководитель' : 'Участник'}</p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">{a.responsibilityZone || a.role}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ==================== MY TASKS ==================== */}
      {personalView === 'my-tasks' && (
        <div className="space-y-6 crm-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-[#E4002B]" />
              Мои задачи ({myTasks.length})
            </h3>
            <Button size="sm" className="gap-1.5 bg-[#E4002B] hover:bg-[#BD0024]" onClick={() => setShowCreateTaskDialog(true)}>
              <Plus className="h-4 w-4" /> Создать задачу
            </Button>
          </div>

          {myTasks.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">Нет задач</p>
              <p className="text-sm mt-1">Создайте задачу или дождитесь назначения</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {myTasks.map((ta: any) => {
                const task = ta.task;
                if (!task) return null;
                return (
                  <div key={ta.id} className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border ${task.completed ? 'bg-gray-50/50' : 'bg-white'} hover:shadow-sm transition-shadow overflow-hidden`}>
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => handleToggleTask(ta.taskId, task.completed)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                      {task.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>}
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {task.dueDate && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(task.dueDate)}</span>}
                        {task.priority && <Badge variant="outline" className={`text-[10px] ${priorityColors[task.priority] || ''}`}>{priorityLabels[task.priority] || task.priority}</Badge>}
                        {ta.event?.title && <span className="text-[10px] text-muted-foreground bg-gray-100 rounded px-1.5 py-0.5">{ta.event.title}</span>}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-8 w-8 p-0" onClick={() => handleDeleteTask(ta.taskId)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== TEAM (Manager Only) ==================== */}
      {(isManager || isAdmin) && personalView === 'team' && (
        <div className="space-y-6 crm-fade-in">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-[#E4002B]" />
            Моя команда ({deptUsers.length})
          </h3>
          {deptUsers.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">Нет сотрудников в команде</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {deptUsers.map((u: any) => {
                const userTasks = deptTasks.filter((t: any) => t.userId === u.id);
                const userCompleted = userTasks.filter((t: any) => t.task?.completed).length;
                const userPending = userTasks.filter((t: any) => !t.task?.completed).length;
                return (
                  <Card key={u.id} className="shadow-sm border-0 overflow-hidden">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-[#FFE0E5] text-[#E4002B] flex items-center justify-center text-sm font-bold shrink-0">
                          {u.name?.charAt(0) || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-xs sm:text-sm truncate">{u.name}</p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] ml-auto ${USER_ROLE_COLORS[u.role as UserRole] || ''}`}>
                          {USER_ROLE_LABELS[u.role as UserRole] || u.role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-green-600 font-medium">✓ {userCompleted} выполнено</span>
                        <span className="text-amber-600 font-medium">⏳ {userPending} в работе</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== WORKLOAD (Manager Only) ==================== */}
      {(isManager || isAdmin) && personalView === 'workload' && (
        <div className="space-y-6 crm-fade-in">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#E4002B]" />
            Анализ нагрузки команды
          </h3>

          {/* Workload Bar Chart */}
          <Card className="shadow-sm border-0">
            <CardHeader>
              <CardTitle className="text-base">Задачи по сотрудникам</CardTitle>
            </CardHeader>
            <CardContent>
              {workloadData.length === 0 ? (
                <p className="text-center py-8 text-sm text-muted-foreground">Нет данных для отображения</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={workloadData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <RTooltip />
                    <Legend />
                    <Bar dataKey="completed" name="Выполнено" fill="#10b981" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="pending" name="В работе" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Workload Table */}
          <Card className="shadow-sm border-0">
            <CardHeader><CardTitle className="text-base">Детализация нагрузки</CardTitle></CardHeader>
            <CardContent>
              {workloadData.length === 0 ? (
                <p className="text-center py-4 text-sm text-muted-foreground">Нет данных</p>
              ) : (
                <div className="space-y-3">
                  {workloadData.map((w: any) => (
                    <div key={w.name} className="flex items-center gap-3 sm:gap-4 p-3 rounded-lg border overflow-hidden">
                      <div className="w-8 h-8 rounded-full bg-[#FFE0E5] text-[#E4002B] flex items-center justify-center text-xs font-bold shrink-0">
                        {w.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-xs sm:text-sm truncate">{w.fullName}</p>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                          <div className="flex h-full">
                            <div className="bg-[#10b981] h-full" style={{ width: `${w.total > 0 ? (w.completed / w.total) * 100 : 0}%` }} />
                            <div className="bg-[#f59e0b] h-full" style={{ width: `${w.total > 0 ? (w.pending / w.total) * 100 : 0}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-[10px] sm:text-xs space-y-0.5 shrink-0">
                        <p className="text-green-600">{w.completed} вып.</p>
                        <p className="text-amber-600">{w.pending} в раб.</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Task Dialog */}
      <Dialog open={showCreateTaskDialog} onOpenChange={setShowCreateTaskDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#E4002B]" />
              Создать задачу
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Мероприятие</Label>
              <Select value={newTaskForm.eventId} onValueChange={v => setNewTaskForm((p: any) => ({ ...p, eventId: v }))}>
                <SelectTrigger><SelectValue placeholder="Выберите мероприятие" /></SelectTrigger>
                <SelectContent>
                  {events.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Категория</Label>
                <Select value={newTaskForm.category} onValueChange={v => setNewTaskForm((p: any) => ({ ...p, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TASK_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Приоритет</Label>
                <Select value={newTaskForm.priority} onValueChange={v => setNewTaskForm((p: any) => ({ ...p, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Высокий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="low">Низкий</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={newTaskForm.title} onChange={e => setNewTaskForm((p: any) => ({ ...p, title: e.target.value }))} placeholder="Название задачи" />
            </div>
            <div className="space-y-2">
              <Label>Описание</Label>
              <Textarea value={newTaskForm.description} onChange={e => setNewTaskForm((p: any) => ({ ...p, description: e.target.value }))} placeholder="Описание задачи" className="min-h-[60px]" />
            </div>
            <div className="space-y-2">
              <Label>Срок</Label>
              <Input type="date" value={newTaskForm.dueDate} onChange={e => setNewTaskForm((p: any) => ({ ...p, dueDate: e.target.value }))} />
            </div>
            {/* Assignees (for managers) */}
            {(isManager || isAdmin) && deptUsers.length > 0 && (
              <div className="space-y-2">
                <Label>Назначить на</Label>
                <div className="flex flex-wrap gap-2">
                  {deptUsers.map((u: any) => (
                    <button
                      key={u.id}
                      type="button"
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                        newTaskForm.assigneeIds.includes(u.id)
                          ? 'bg-[#FFE0E5] text-[#E4002B] border-[#FF9DAF]'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => toggleAssignee(u.id)}
                    >
                      {u.name?.split(' ')[0] || u.email?.split('@')[0]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTaskDialog(false)}>Отмена</Button>
            <Button
              className="bg-[#E4002B] hover:bg-[#BD0024]"
              onClick={handleCreateTask}
              disabled={!newTaskForm.title || !newTaskForm.eventId}
            >
              Создать и назначить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
