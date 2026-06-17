'use client';

import React, { useState } from 'react';
import { Users, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Contact } from '@/lib/crm-types';
import { apiFetch } from '@/lib/api-fetch';

function ContactsTab({ contacts, eventId, onUpdate, editing }: { contacts: Contact[]; eventId: string; onUpdate: () => void; editing: boolean }) {
  const [items, setItems] = useState(contacts);

  React.useEffect(() => { setItems(contacts); }, [contacts]);

  const addItem = () => setItems([...items, { role: '', fullName: '', phone: '', email: '', type: 'customer' }]);
  const updateItem = (index: number, field: string, value: any) => { const u = [...items]; u[index] = { ...u[index], [field]: value }; setItems(u); };
  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const saveItems = async () => {
    await apiFetch(`/api/events/${eventId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contacts: items.filter(c => c.fullName), changedBy: 'Пользователь' }) });
    onUpdate();
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && !editing ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Контактные лица не указаны</p>
          <p className="text-sm mt-1">Добавьте контактных лиц в режиме редактирования</p>
          {editing && <Button variant="outline" size="sm" className="mt-3" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Добавить контакт</Button>}
        </div>
      ) : (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Роль</TableHead><TableHead>ФИО</TableHead><TableHead>Телефон</TableHead><TableHead>Email</TableHead><TableHead>Тип</TableHead>{editing && <TableHead></TableHead>}</TableRow></TableHeader>
          <TableBody>
            {items.map((c, i) => (
              <TableRow key={i}>
                <TableCell>{editing ? <Input value={c.role} onChange={e => updateItem(i, 'role', e.target.value)} placeholder="Роль" /> : c.role || '—'}</TableCell>
                <TableCell>{editing ? <Input value={c.fullName} onChange={e => updateItem(i, 'fullName', e.target.value)} placeholder="ФИО" /> : <span className="font-medium">{c.fullName}</span>}</TableCell>
                <TableCell>{editing ? <Input value={c.phone || ''} onChange={e => updateItem(i, 'phone', e.target.value)} placeholder="+7 (___) ___-__-__" /> : c.phone || '—'}</TableCell>
                <TableCell>{editing ? <Input value={c.email || ''} onChange={e => updateItem(i, 'email', e.target.value)} placeholder="email@example.com" /> : c.email || '—'}</TableCell>
                <TableCell>{editing ? <Select value={c.type || 'customer'} onValueChange={v => updateItem(i, 'type', v)}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="customer">Заказчик</SelectItem><SelectItem value="contractor">Подрядчик</SelectItem><SelectItem value="speaker">Спикер</SelectItem><SelectItem value="other">Другое</SelectItem></SelectContent></Select> : <Badge variant="outline" className="text-xs">{c.type === 'customer' ? 'Заказчик' : c.type === 'contractor' ? 'Подрядчик' : c.type === 'speaker' ? 'Спикер' : 'Другое'}</Badge>}</TableCell>
                {editing && <TableCell><Button variant="ghost" size="sm" onClick={() => removeItem(i)}><X className="h-3 w-3" /></Button></TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      )}
      {editing && (<><Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Добавить контакт</Button><Button size="sm" onClick={saveItems} className="ml-2 bg-[#E4002B]">Сохранить</Button></>)}
    </div>
  );
}

export { ContactsTab };
export default ContactsTab;
