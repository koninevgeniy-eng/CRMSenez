'use client';

import React, { useState } from 'react';
import { BedDouble, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Accommodation } from '@/lib/crm-types';
import { apiFetch } from '@/lib/api-fetch';

function AccommodationsTab({ accommodations, eventId, onUpdate, editing }: { accommodations: Accommodation[]; eventId: string; onUpdate: () => void; editing: boolean }) {
  const [items, setItems] = useState(accommodations);

  React.useEffect(() => { setItems(accommodations); }, [accommodations]);

  const addItem = () => setItems([...items, { roomType: '', count: 0, checkIn: '', checkOut: '' }]);
  const updateItem = (index: number, field: string, value: any) => { const u = [...items]; u[index] = { ...u[index], [field]: value }; setItems(u); };
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const saveItems = async () => {
    await apiFetch(`/api/events/${eventId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accommodations: items, changedBy: 'Пользователь' }) });
    onUpdate();
  };

  if (items.length === 0 && !editing) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BedDouble className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">Проживание не запланировано</p>
        <p className="text-sm mt-1">Добавьте информацию о проживании в режиме редактирования</p>
        {editing && <Button variant="outline" size="sm" className="mt-3" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Добавить размещение</Button>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Тип номера</TableHead><TableHead>Кол-во</TableHead><TableHead>Заезд</TableHead><TableHead>Выезд</TableHead>{editing && <TableHead></TableHead>}</TableRow></TableHeader>
        <TableBody>
          {items.map((a, i) => (
            <TableRow key={i}>
              <TableCell>{editing ? <Select value={a.roomType || ''} onValueChange={v => updateItem(i, 'roomType', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Одноместные">Одноместные</SelectItem><SelectItem value="Двухместные">Двухместные</SelectItem><SelectItem value="Люкс">Люкс</SelectItem><SelectItem value="Маломобильные">Маломобильные</SelectItem></SelectContent></Select> : a.roomType || '—'}</TableCell>
              <TableCell>{editing ? <Input type="number" value={a.count || ''} onChange={e => updateItem(i, 'count', parseInt(e.target.value) || 0)} className="w-16" /> : a.count || '—'}</TableCell>
              <TableCell>{editing ? <Input value={a.checkIn || ''} onChange={e => updateItem(i, 'checkIn', e.target.value)} /> : a.checkIn || '—'}</TableCell>
              <TableCell>{editing ? <Input value={a.checkOut || ''} onChange={e => updateItem(i, 'checkOut', e.target.value)} /> : a.checkOut || '—'}</TableCell>
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

export { AccommodationsTab };
export default AccommodationsTab;
