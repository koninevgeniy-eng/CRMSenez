'use client';

import React, { useState } from 'react';
import { MapPin, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RoomBooking } from '@/lib/crm-types';
import { apiFetch } from '@/lib/api-fetch';

function RoomsTab({ rooms, eventId, onUpdate, editing }: { rooms: RoomBooking[]; eventId: string; onUpdate: () => void; editing: boolean }) {
  const [items, setItems] = useState(rooms);

  React.useEffect(() => { setItems(rooms); }, [rooms]);

  const addItem = () => setItems([...items, { roomName: '', dateFrom: '', dateTo: '' }]);
  const updateItem = (index: number, field: string, value: any) => { const u = [...items]; u[index] = { ...u[index], [field]: value }; setItems(u); };
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const saveItems = async () => {
    await apiFetch(`/api/events/${eventId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rooms: items.filter(r => r.roomName), changedBy: 'Пользователь' }) });
    onUpdate();
  };

  if (items.length === 0 && !editing) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">Залы не забронированы</p>
        <p className="text-sm mt-1">Добавьте бронирование помещений в режиме редактирования</p>
        {editing && <Button variant="outline" size="sm" className="mt-3" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Добавить зал</Button>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Помещение</TableHead><TableHead>Даты</TableHead>{editing && <TableHead></TableHead>}</TableRow></TableHeader>
        <TableBody>
          {items.map((r, i) => (
            <TableRow key={i}>
              <TableCell>{editing ? <Input value={r.roomName} onChange={e => updateItem(i, 'roomName', e.target.value)} /> : r.roomName}</TableCell>
              <TableCell>{editing ? <><Input value={r.dateFrom || ''} onChange={e => updateItem(i, 'dateFrom', e.target.value)} placeholder="С" className="w-20 inline" /> — <Input value={r.dateTo || ''} onChange={e => updateItem(i, 'dateTo', e.target.value)} placeholder="По" className="w-20 inline" /></> : `${r.dateFrom || '—'} — ${r.dateTo || '—'}`}</TableCell>
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

export { RoomsTab };
export default RoomsTab;
