'use client';

import React, { useState } from 'react';
import { Utensils, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Meal, MEAL_TYPES } from '@/lib/crm-types';
import { apiFetch } from '@/lib/api-fetch';

function MealsTab({ meals, eventId, onUpdate, editing }: { meals: Meal[]; eventId: string; onUpdate: () => void; editing: boolean }) {
  const [items, setItems] = useState(meals);

  React.useEffect(() => { setItems(meals); }, [meals]);

  const addItem = () => setItems([...items, { date: '', time: '', location: '', mealType: '', headcount: 0 }]);
  const updateItem = (index: number, field: string, value: any) => { const u = [...items]; u[index] = { ...u[index], [field]: value }; setItems(u); };
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const saveItems = async () => {
    await apiFetch(`/api/events/${eventId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meals: items, changedBy: 'Пользователь' }) });
    onUpdate();
  };

  if (items.length === 0 && !editing) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Utensils className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">Питание не запланировано</p>
        <p className="text-sm mt-1">Добавьте расписание питания в режиме редактирования</p>
        {editing && <Button variant="outline" size="sm" className="mt-3" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Добавить приём пищи</Button>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Время</TableHead><TableHead>Локация</TableHead><TableHead>Тип</TableHead><TableHead>Кол-во</TableHead>{editing && <TableHead></TableHead>}</TableRow></TableHeader>
        <TableBody>
          {items.map((m, i) => (
            <TableRow key={i}>
              <TableCell>{editing ? <Input value={m.date || ''} onChange={e => updateItem(i, 'date', e.target.value)} className="w-20" /> : m.date || '—'}</TableCell>
              <TableCell>{editing ? <Input value={m.time || ''} onChange={e => updateItem(i, 'time', e.target.value)} className="w-24" /> : m.time || '—'}</TableCell>
              <TableCell>{editing ? <Input value={m.location || ''} onChange={e => updateItem(i, 'location', e.target.value)} /> : m.location || '—'}</TableCell>
              <TableCell>{editing ? <Select value={m.mealType || ''} onValueChange={v => updateItem(i, 'mealType', v)}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{MEAL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select> : m.mealType || '—'}</TableCell>
              <TableCell>{editing ? <Input type="number" value={m.headcount || ''} onChange={e => updateItem(i, 'headcount', parseInt(e.target.value) || 0)} className="w-16" /> : m.headcount || '—'}</TableCell>
              {editing && <TableCell><Button variant="ghost" size="sm" onClick={() => removeItem(i)}><X className="h-3 w-3" /></Button></TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      {editing && <><Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Добавить</Button><Button size="sm" onClick={saveItems} className="ml-2 bg-[#E4002B]">Сохранить</Button></>}
    </div>
  );
}

export { MealsTab };
export default MealsTab;
