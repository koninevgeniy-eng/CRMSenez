'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { UserData, DEPARTMENTS } from '@/lib/crm-types';
import { apiFetch } from '@/lib/api-fetch';

function UserForm({ user, onClose, onSave }: { user: UserData | null; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'employee',
    department: user?.department || 'methodology',
    isActive: user?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: any = { ...form };
      if (!body.password) delete body.password;
      if (user) {
        await apiFetch(`/api/users/${user.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } else {
        await apiFetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      }
      toast({ title: user ? 'Пользователь обновлен' : 'Пользователь создан' });
      onSave();
    } catch {
      toast({ title: 'Ошибка', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Имя</Label>
        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>Email</Label>
        <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
      </div>
      <div className="space-y-2">
        <Label>{user ? 'Новый пароль (оставьте пустым чтобы не менять)' : 'Пароль'}</Label>
        <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required={!user} />
      </div>
      <div className="space-y-2">
        <Label>Роль</Label>
        <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Администратор</SelectItem>
            <SelectItem value="manager">Руководитель</SelectItem>
            <SelectItem value="employee">Сотрудник</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Подразделение</Label>
        <Select value={form.department} onValueChange={v => setForm({ ...form, department: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {DEPARTMENTS.filter(d => d.id !== 'dashboard').map(d => (
              <SelectItem key={d.id} value={d.id}>{d.shortName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {user && (
        <div className="flex items-center gap-2">
          <Checkbox id="isActive" checked={form.isActive} onCheckedChange={c => setForm({ ...form, isActive: !!c })} />
          <Label htmlFor="isActive">Активен</Label>
        </div>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Отмена</Button>
        <Button type="submit" disabled={saving} className="bg-[#E4002B] hover:bg-[#BD0024]">
          {saving ? 'Сохранение...' : user ? 'Сохранить' : 'Создать'}
        </Button>
      </DialogFooter>
    </form>
  );
}

export { UserForm };
export default UserForm;
