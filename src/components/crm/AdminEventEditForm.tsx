'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { EventData, STATUS_LABELS, PROGRAM_CLASSES, PROGRAM_TYPES } from '@/lib/crm-types';
import { apiFetch } from '@/lib/api-fetch';

function AdminEventEditForm({ event, onClose, onSave }: { event: EventData; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    title: event.title || '',
    status: event.status || 'draft',
    uin: event.uin || '',
    startDate: event.startDate ? new Date(event.startDate).toISOString().split('T')[0] : '',
    endDate: event.endDate ? new Date(event.endDate).toISOString().split('T')[0] : '',
    venue: event.venue || '',
    campus: event.campus || '',
    budget: event.budget?.toString() || '',
    fundingSource: event.fundingSource || '',
    participantCount: event.participantCount?.toString() || '',
    totalParticipants: event.totalParticipants?.toString() || '',
    programDirector: event.programDirector || '',
    coOrganizers: event.coOrganizers || '',
    targetAudience: event.targetAudience || '',
    customerName: event.customerName || '',
    contractorName: event.contractorName || '',
    programClass: event.programClass || '',
    programType: event.programType || '',
    quarter: event.quarter || '',
    plannedDates: event.plannedDates || '',
    client: event.client || '',
    coOrganizer: event.coOrganizer || '',
    finance: event.finance || '',
    comments: event.comments || '',
    tags: event.tags || '',
    vipGuests: event.vipGuests || '',
    coordinatorComment: event.coordinatorComment || '',
    budgetApproved: event.budgetApproved ? 'true' : 'false',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: any = {
        ...form,
        budget: form.budget ? parseFloat(form.budget) : null,
        participantCount: form.participantCount ? parseInt(form.participantCount) : null,
        totalParticipants: form.totalParticipants ? parseInt(form.totalParticipants) : null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        budgetApproved: form.budgetApproved === 'true',
        changedBy: 'Администратор',
      };
      await apiFetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      toast({ title: 'Мероприятие обновлено' });
      onSave();
    } catch {
      toast({ title: 'Ошибка сохранения', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label>Название</Label>
          <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
        </div>
        <div className="space-y-2">
          <Label>Статус</Label>
          <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>УИН</Label>
          <Input value={form.uin} onChange={e => setForm({ ...form, uin: e.target.value })} placeholder="Уникальный идентификационный номер" />
        </div>
        <div className="space-y-2">
          <Label>Дата начала</Label>
          <Input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Дата окончания</Label>
          <Input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Площадка</Label>
          <Input value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Корпус</Label>
          <Input value={form.campus} onChange={e => setForm({ ...form, campus: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Бюджет (₽)</Label>
          <Input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Источник финансирования</Label>
          <Input value={form.fundingSource} onChange={e => setForm({ ...form, fundingSource: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Кол-во участников</Label>
          <Input type="number" value={form.participantCount} onChange={e => setForm({ ...form, participantCount: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Общее кол-во участников</Label>
          <Input type="number" value={form.totalParticipants} onChange={e => setForm({ ...form, totalParticipants: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Руководитель программы</Label>
          <Input value={form.programDirector} onChange={e => setForm({ ...form, programDirector: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Со-организаторы</Label>
          <Input value={form.coOrganizers} onChange={e => setForm({ ...form, coOrganizers: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Целевая аудитория</Label>
          <Input value={form.targetAudience} onChange={e => setForm({ ...form, targetAudience: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Заказчик</Label>
          <Input value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Подрядчик</Label>
          <Input value={form.contractorName} onChange={e => setForm({ ...form, contractorName: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Класс программы</Label>
          <Select value={form.programClass || '_none'} onValueChange={v => setForm({ ...form, programClass: v === '_none' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Выберите класс" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Не указан</SelectItem>
              {PROGRAM_CLASSES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Тип программы</Label>
          <Select value={form.programType || '_none'} onValueChange={v => setForm({ ...form, programType: v === '_none' ? '' : v })}>
            <SelectTrigger><SelectValue placeholder="Выберите тип" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">Не указан</SelectItem>
              {PROGRAM_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Квартал</Label>
          <Input value={form.quarter} onChange={e => setForm({ ...form, quarter: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Клиент</Label>
          <Input value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Со-организатор (орг.)</Label>
          <Input value={form.coOrganizer} onChange={e => setForm({ ...form, coOrganizer: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Финансирование</Label>
          <Input value={form.finance} onChange={e => setForm({ ...form, finance: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>VIP-гости</Label>
          <Input value={form.vipGuests} onChange={e => setForm({ ...form, vipGuests: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Теги (через запятую)</Label>
          <Input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>Бюджет согласован</Label>
          <Select value={form.budgetApproved} onValueChange={v => setForm({ ...form, budgetApproved: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Да</SelectItem>
              <SelectItem value="false">Нет</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Комментарий координатора</Label>
          <Input value={form.coordinatorComment} onChange={e => setForm({ ...form, coordinatorComment: e.target.value })} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Комментарии</Label>
          <Textarea rows={3} value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} />
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
        <Button type="submit" disabled={saving} className="bg-[#E4002B] hover:bg-[#BD0024]">
          {saving ? 'Сохранение...' : 'Сохранить изменения'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export { AdminEventEditForm };
export default AdminEventEditForm;
