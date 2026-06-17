'use client';

import React, { useState } from 'react';
import { Bus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Transfer } from '@/lib/crm-types';
import { apiFetch } from '@/lib/api-fetch';

function TransfersTab({ transfers, eventId, onUpdate, editing }: { transfers: Transfer[]; eventId: string; onUpdate: () => void; editing: boolean }) {
  const [items, setItems] = useState(transfers);

  React.useEffect(() => { setItems(transfers); }, [transfers]);

  const addItem = () => setItems([...items, { date: '', time: '', from: '', to: '', vehicleType: '', headcount: 0 }]);
  const updateItem = (index: number, field: string, value: any) => { const u = [...items]; u[index] = { ...u[index], [field]: value }; setItems(u); };
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const saveItems = async () => {
    await apiFetch(`/api/events/${eventId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transfers: items, changedBy: 'Пользователь' }) });
    onUpdate();
  };

  if (items.length === 0 && !editing) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Bus className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">Трансфер не запланирован</p>
        <p className="text-sm mt-1">Добавьте информацию о трансфере в режиме редактирования</p>
        {editing && <Button variant="outline" size="sm" className="mt-3" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Добавить трансфер</Button>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
      <Table>
        <TableHeader><TableRow><TableHead>Дата</TableHead><TableHead>Время</TableHead><TableHead>Откуда</TableHead><TableHead>Куда</TableHead><TableHead>Транспорт</TableHead><TableHead>Кол-во</TableHead>{editing && <TableHead></TableHead>}</TableRow></TableHeader>
        <TableBody>
          {items.map((t, i) => (
            <TableRow key={i}>
              <TableCell>{editing ? <Input value={t.date || ''} onChange={e => updateItem(i, 'date', e.target.value)} className="w-20" /> : t.date || '—'}</TableCell>
              <TableCell>{editing ? <Input value={t.time || ''} onChange={e => updateItem(i, 'time', e.target.value)} className="w-20" /> : t.time || '—'}</TableCell>
              <TableCell>{editing ? <Input value={t.from || ''} onChange={e => updateItem(i, 'from', e.target.value)} /> : t.from || '—'}</TableCell>
              <TableCell>{editing ? <Input value={t.to || ''} onChange={e => updateItem(i, 'to', e.target.value)} /> : t.to || '—'}</TableCell>
              <TableCell>{editing ? <Input value={t.vehicleType || ''} onChange={e => updateItem(i, 'vehicleType', e.target.value)} /> : t.vehicleType || '—'}</TableCell>
              <TableCell>{editing ? <Input type="number" value={t.headcount || ''} onChange={e => updateItem(i, 'headcount', parseInt(e.target.value) || 0)} className="w-16" /> : t.headcount || '—'}</TableCell>
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

export { TransfersTab };
export default TransfersTab;
