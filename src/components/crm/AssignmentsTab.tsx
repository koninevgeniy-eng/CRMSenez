'use client';

import React, { useState } from 'react';
import { Users, Crown, UserCheck, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { EventAssignment, UserData } from '@/lib/crm-types';
import { apiFetch } from '@/lib/api-fetch';

function AssignmentsTab({ assignments, eventId, onUpdate }: { assignments: EventAssignment[]; eventId: string; onUpdate: () => void }) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [adding, setAdding] = useState(false);
  const [newRole, setNewRole] = useState<string>('SUPPORT');
  const [newUserId, setNewUserId] = useState<string>('');
  const [newZone, setNewZone] = useState<string>('');

  React.useEffect(() => {
    apiFetch('/api/users?isActive=true').then(r => r.ok ? r.json() : []).then(setUsers).catch(() => {});
  }, []);

  const leads = assignments.filter(a => a.role === 'LEAD');
  const supports = assignments.filter(a => a.role === 'SUPPORT');

  const handleAdd = async () => {
    if (!newUserId) return;
    try {
      await apiFetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': localStorage.getItem('csrf-token') || '' },
        body: JSON.stringify({ eventId, userId: newUserId, role: newRole, responsibilityZone: newZone || undefined }),
      });
      setAdding(false);
      setNewUserId('');
      setNewZone('');
      onUpdate();
      toast({ title: 'Назначение добавлено' });
    } catch {
      toast({ title: 'Ошибка добавления', variant: 'destructive' });
    }
  };

  const handleRemove = async (assignmentId: string) => {
    try {
      await apiFetch(`/api/assignments?id=${assignmentId}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': localStorage.getItem('csrf-token') || '' },
      });
      onUpdate();
      toast({ title: 'Назначение удалено' });
    } catch {
      toast({ title: 'Ошибка удаления', variant: 'destructive' });
    }
  };

  const departmentLabel = (dept?: string) => {
    const map: Record<string, string> = { methodology: 'Методология', organization: 'Организация', coordination: 'Координация', agd: 'АГД', analytics: 'Аналитика' };
    return dept ? map[dept] || dept : '';
  };

  return (
    <div className="space-y-5">
      {leads.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Crown className="h-4 w-4 text-amber-500" />Руководители</h4>
          <div className="space-y-2">
            {leads.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-[#FFE0E5] bg-[#FFF1F3]/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#FFE0E5] flex items-center justify-center text-[#E4002B] font-bold text-sm">
                    {a.user?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{a.user?.name || 'Неизвестный'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {a.user?.department && <Badge variant="outline" className="text-[10px] h-4 px-1">{departmentLabel(a.user.department)}</Badge>}
                      {a.responsibilityZone && <span>{a.responsibilityZone}</span>}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemove(a.id!)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {supports.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><UserCheck className="h-4 w-4 text-sky-500" />Сопровождение</h4>
          <div className="space-y-2">
            {supports.map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg border border-sky-100 bg-sky-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-sky-100 flex items-center justify-center text-sky-700 font-bold text-sm">
                    {a.user?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{a.user?.name || 'Неизвестный'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {a.user?.department && <Badge variant="outline" className="text-[10px] h-4 px-1">{departmentLabel(a.user.department)}</Badge>}
                      {a.responsibilityZone && <span>{a.responsibilityZone}</span>}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemove(a.id!)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {assignments.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Нет назначений</p>
          <p className="text-sm mt-1">Руководители и сопровождающие будут отображаться здесь</p>
        </div>
      )}

      <div className="pt-2">
        {!adding ? (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5" />Добавить назначение</Button>
        ) : (
          <div className="p-4 rounded-lg border border-dashed space-y-3 bg-slate-50">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Сотрудник</Label>
                <Select value={newUserId} onValueChange={setNewUserId}>
                  <SelectTrigger><SelectValue placeholder="Выберите..." /></SelectTrigger>
                  <SelectContent className="max-h-64">
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name} {u.department ? `(${departmentLabel(u.department)})` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Роль</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEAD">Руководитель</SelectItem>
                    <SelectItem value="SUPPORT">Сопровождение</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Зона ответственности</Label>
                <Input placeholder="Например: Трансфер" value={newZone} onChange={e => setNewZone(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-[#E4002B] hover:bg-[#BD0024]" onClick={handleAdd}>Добавить</Button>
              <Button variant="outline" size="sm" onClick={() => { setAdding(false); setNewUserId(''); setNewZone(''); }}>Отмена</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { AssignmentsTab };
export default AssignmentsTab;
