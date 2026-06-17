'use client';

import React, { useState } from 'react';
import { ClipboardList, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Task, TASK_CATEGORIES } from '@/lib/crm-types';
import { apiFetch } from '@/lib/api-fetch';

function TasksTab({ tasks, eventId, onUpdate, editing }: { tasks: Task[]; eventId: string; onUpdate: () => void; editing: boolean }) {
  const [items, setItems] = useState(tasks);

  React.useEffect(() => { setItems(tasks); }, [tasks]);

  const addItem = () => setItems([...items, { category: 'technical', title: '', description: '', assignee: '', completed: false, priority: 'medium' }]);
  const updateItem = (index: number, field: string, value: any) => { const u = [...items]; u[index] = { ...u[index], [field]: value }; setItems(u); };
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const saveItems = async () => {
    const validItems = items.filter(t => t.title);
    const retainedIds = new Set(validItems.flatMap(t => t.id ? [t.id] : []));
    const removedTasks = tasks.filter(t => t.id && !retainedIds.has(t.id));

    await Promise.all(removedTasks.map(task =>
      apiFetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
    ));

    await Promise.all(validItems.map(task => {
      if (task.id) {
        return apiFetch(`/api/tasks/${task.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(task),
        });
      }
      return apiFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId,
          category: task.category,
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          priority: task.priority,
          assigneeIds: [],
        }),
      });
    }));
    onUpdate();
  };

  if (items.length === 0 && !editing) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">Задачи не созданы</p>
        <p className="text-sm mt-1">Добавьте задачи для подготовки мероприятия в режиме редактирования</p>
        {editing && <Button variant="outline" size="sm" className="mt-3" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Добавить задачу</Button>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Категория</TableHead><TableHead>Задача</TableHead><TableHead>Ответственный</TableHead><TableHead>Приоритет</TableHead><TableHead>Статус</TableHead>{editing && <TableHead></TableHead>}</TableRow></TableHeader>
        <TableBody>
          {items.map((t, i) => (
            <TableRow key={i}>
              <TableCell>{editing ? <Select value={t.category} onValueChange={v => updateItem(i, 'category', v)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{TASK_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent></Select> : TASK_CATEGORIES.find(c => c.value === t.category)?.label || t.category}</TableCell>
              <TableCell>{editing ? <Input value={t.title} onChange={e => updateItem(i, 'title', e.target.value)} /> : t.title}</TableCell>
              <TableCell>{editing ? <Input value={t.assignee || ''} onChange={e => updateItem(i, 'assignee', e.target.value)} /> : t.assignee || '—'}</TableCell>
              <TableCell>{editing ? <Select value={t.priority || 'medium'} onValueChange={v => updateItem(i, 'priority', v)}><SelectTrigger className="w-24"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="high">Высокий</SelectItem><SelectItem value="medium">Средний</SelectItem><SelectItem value="low">Низкий</SelectItem></SelectContent></Select> : <Badge variant={t.priority === 'high' ? 'destructive' : t.priority === 'medium' ? 'default' : 'secondary'} className="text-xs">{t.priority === 'high' ? 'Высокий' : t.priority === 'medium' ? 'Средний' : 'Низкий'}</Badge>}</TableCell>
              <TableCell><Checkbox checked={t.completed} onCheckedChange={checked => { updateItem(i, 'completed', !!checked); }} /></TableCell>
              {editing && <TableCell><Button variant="ghost" size="sm" onClick={() => removeItem(i)}><X className="h-3 w-3" /></Button></TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      {editing && <><Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Добавить задачу</Button><Button size="sm" onClick={saveItems} className="ml-2 bg-[#E4002B]">Сохранить задачи</Button></>}
    </div>
  );
}

export { TasksTab };
export default TasksTab;
