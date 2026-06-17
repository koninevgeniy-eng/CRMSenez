'use client';

import React, { useState } from 'react';
import { Upload, Camera, Star, Plus, X, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle, Banknote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Speaker, SpeakerCostApprovalStatus } from '@/lib/crm-types';
import { formatCurrency } from '@/lib/crm-utils';
import { apiFetch } from '@/lib/api-fetch';
import { toast } from '@/hooks/use-toast';

const COST_APPROVAL_LABELS: Record<SpeakerCostApprovalStatus, string> = {
  pending: 'Ожидает согласования',
  approved: 'Согласовано',
  rejected: 'Отклонено',
};

const COST_APPROVAL_COLORS: Record<SpeakerCostApprovalStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-300',
  approved: 'bg-green-50 text-green-700 border-green-300',
  rejected: 'bg-red-50 text-red-700 border-red-300',
};

interface SpeakersTabProps {
  speakers: Speaker[];
  eventId: string;
  onUpdate: () => void;
  editing: boolean;
  /** Which department context is viewing this tab */
  departmentContext?: 'methodology' | 'coordination' | 'other';
  /** Whether the event is in closing stage (completed or about to complete) */
  isClosingStage?: boolean;
}

function SpeakersTab({ speakers, eventId, onUpdate, editing, departmentContext = 'other', isClosingStage = false }: SpeakersTabProps) {
  const [items, setItems] = useState(speakers);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [approvalComments, setApprovalComments] = useState<Record<number, string>>({});

  React.useEffect(() => { setItems(speakers); }, [speakers]);

  const isMethodology = departmentContext === 'methodology';
  const isCoordination = departmentContext === 'coordination';

  const addItem = () => setItems([...items, { fullName: '', topic: '', cost: 0, plannedCost: 0, actualCost: 0, costApprovalStatus: 'pending' }]);

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const saveItems = async () => {
    await apiFetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speakers: items.filter(s => s.fullName), changedBy: 'Пользователь' }),
    });
    onUpdate();
    toast({ title: 'Спикеры сохранены' });
  };

  /** Save only planned costs (methodology) */
  const savePlannedCosts = async () => {
    const updated = items.map(s => ({
      ...s,
      plannedCost: s.plannedCost || 0,
    }));
    await apiFetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speakers: updated.filter(s => s.fullName), changedBy: 'Методология' }),
    });
    onUpdate();
    toast({ title: 'Плановые стоимости спикеров сохранены' });
  };

  /** Save only actual costs (methodology at closing stage) */
  const saveActualCosts = async () => {
    const updated = items.map(s => ({
      ...s,
      actualCost: s.actualCost || 0,
      costApprovalStatus: s.actualCost !== undefined && s.actualCost > 0 ? 'pending' as SpeakerCostApprovalStatus : s.costApprovalStatus,
    }));
    await apiFetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speakers: updated.filter(s => s.fullName), changedBy: 'Методология' }),
    });
    onUpdate();
    toast({ title: 'Фактические стоимости спикеров сохранены и отправлены на согласование' });
  };

  /** Approve a speaker's actual cost (coordination) */
  const approveCost = async (index: number) => {
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      costApprovalStatus: 'approved',
      costApprovalComment: approvalComments[index] || '',
    };
    setItems(updated);
    await apiFetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speakers: updated.filter(s => s.fullName), changedBy: 'Координация' }),
    });
    onUpdate();
    toast({ title: `Расходы спикера «${updated[index].fullName}» согласованы` });
  };

  /** Reject a speaker's actual cost (coordination) */
  const rejectCost = async (index: number) => {
    const comment = approvalComments[index];
    if (!comment) {
      toast({ title: 'Укажите причину отклонения', variant: 'destructive' });
      return;
    }
    const updated = [...items];
    updated[index] = {
      ...updated[index],
      costApprovalStatus: 'rejected',
      costApprovalComment: comment,
    };
    setItems(updated);
    await apiFetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ speakers: updated.filter(s => s.fullName), changedBy: 'Координация' }),
    });
    onUpdate();
    toast({ title: `Расходы спикера «${updated[index].fullName}» отклонены`, variant: 'destructive' });
  };

  const handlePhotoUpload = async (index: number, file: File) => {
    setUploadingIndex(index);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiFetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        updateItem(index, 'photoUrl', data.url);
        toast({ title: 'Фото загружено' });
      } else {
        const errData = await res.json();
        toast({ title: errData.error || 'Ошибка загрузки', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Ошибка загрузки файла', variant: 'destructive' });
    }
    setUploadingIndex(null);
  };

  // Computed totals
  const totalPlannedCost = items.reduce((s, sp) => s + (sp.plannedCost || 0), 0);
  const totalActualCost = items.reduce((s, sp) => s + (sp.actualCost || 0), 0);
  const pendingApprovalCount = items.filter(s => s.costApprovalStatus === 'pending' && s.actualCost).length;

  if (items.length === 0 && !editing) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Star className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p className="text-lg font-medium">Спикеры не указаны</p>
        <p className="text-sm mt-1">Добавьте спикеров мероприятия в режиме редактирования</p>
        {editing && <Button variant="outline" size="sm" className="mt-3" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Добавить спикера</Button>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Speaker Cost Summary */}
      {items.length > 0 && items.some(s => s.plannedCost || s.actualCost) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">План (спикеры)</p>
            <p className="text-base sm:text-lg font-bold">{formatCurrency(totalPlannedCost)}</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">Факт (спикеры)</p>
            <p className="text-base sm:text-lg font-bold text-amber-700">{formatCurrency(totalActualCost)}</p>
          </div>
          <div className="p-3 rounded-lg bg-sky-50 border border-sky-200">
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">На согласовании</p>
            <p className="text-base sm:text-lg font-bold text-sky-700">{pendingApprovalCount}</p>
          </div>
        </div>
      )}

      {/* Pending approvals alert for coordination */}
      {isCoordination && pendingApprovalCount > 0 && (
        <div className="flex items-center gap-2 p-3 border border-amber-200 rounded-lg bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700">{pendingApprovalCount} спикер(ов) ожидают согласования фактических расходов</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Фото</TableHead>
              <TableHead>ФИО</TableHead>
              <TableHead>Тема</TableHead>
              <TableHead className="text-right">План (₽)</TableHead>
              <TableHead className="text-right">Факт (₽)</TableHead>
              <TableHead>Статус</TableHead>
              {(isCoordination || editing) && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((s, i) => {
              const approvalStatus = s.costApprovalStatus || 'pending';
              const hasActualCost = s.actualCost !== undefined && s.actualCost > 0;
              const isOverBudget = s.actualCost !== undefined && s.plannedCost !== undefined && s.actualCost > s.plannedCost && s.plannedCost > 0;

              return (
                <React.Fragment key={i}>
                  <TableRow className={isOverBudget ? 'bg-red-50/50' : ''}>
                    <TableCell>
                      <div className="relative group w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center overflow-hidden shrink-0">
                        {s.photoUrl ? (
                          <img src={s.photoUrl} alt={s.fullName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-bold text-violet-600">{s.fullName ? s.fullName.charAt(0) : '?'}</span>
                        )}
                        {editing && (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full cursor-pointer">
                            <label className="cursor-pointer text-white">
                              {uploadingIndex === i ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) await handlePhotoUpload(i, file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {editing ? <Input value={s.fullName} onChange={e => updateItem(i, 'fullName', e.target.value)} placeholder="ФИО" /> : s.fullName}
                    </TableCell>
                    <TableCell>
                      {editing ? <Input value={s.topic || ''} onChange={e => updateItem(i, 'topic', e.target.value)} /> : s.topic || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {isMethodology ? (
                        <Input
                          type="number"
                          min={0}
                          value={s.plannedCost || ''}
                          onChange={e => updateItem(i, 'plannedCost', parseFloat(e.target.value) || 0)}
                          className="w-28"
                          placeholder="0"
                        />
                      ) : (
                        <span className={isOverBudget ? 'font-semibold' : ''}>{formatCurrency(s.plannedCost)}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isMethodology && isClosingStage ? (
                        <Input
                          type="number"
                          min={0}
                          value={s.actualCost || ''}
                          onChange={e => updateItem(i, 'actualCost', parseFloat(e.target.value) || 0)}
                          className="w-28"
                          placeholder="0"
                        />
                      ) : (
                        <span className={isOverBudget ? 'text-red-600 font-semibold' : ''}>{formatCurrency(s.actualCost)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasActualCost ? (
                        <Badge variant="outline" className={`text-[10px] ${COST_APPROVAL_COLORS[approvalStatus]}`}>
                          {COST_APPROVAL_LABELS[approvalStatus]}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {(isCoordination || editing) && (
                      <TableCell>
                        {editing && <Button variant="ghost" size="sm" onClick={() => removeItem(i)}><X className="h-3 w-3" /></Button>}
                      </TableCell>
                    )}
                  </TableRow>

                  {/* Coordination: approval actions for pending costs */}
                  {isCoordination && hasActualCost && approvalStatus === 'pending' && (
                    <TableRow className="bg-amber-50/50">
                      <TableCell colSpan={7} className="p-3">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <Label className="text-xs text-muted-foreground">Комментарий координации</Label>
                            <Input
                              placeholder="Причина отклонения (обязательно при отклонении)"
                              value={approvalComments[i] || ''}
                              onChange={e => setApprovalComments(prev => ({ ...prev, [i]: e.target.value }))}
                              className="mt-1 text-xs"
                            />
                          </div>
                          <div className="flex gap-2 shrink-0 mt-2 sm:mt-5">
                            <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-xs" onClick={() => approveCost(i)}>
                              <CheckCircle2 className="h-3 w-3" /> Согласовать
                            </Button>
                            <Button size="sm" variant="destructive" className="gap-1 text-xs" onClick={() => rejectCost(i)}>
                              <XCircle className="h-3 w-3" /> Отклонить
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}

                  {/* Show rejection comment if rejected */}
                  {isCoordination && approvalStatus === 'rejected' && s.costApprovalComment && (
                    <TableRow className="bg-red-50/30">
                      <TableCell colSpan={7} className="p-2">
                        <p className="text-xs text-red-600"><strong>Причина отклонения:</strong> {s.costApprovalComment}</p>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
            {/* Totals row */}
            {items.length > 0 && (
              <TableRow className="font-bold border-t-2 border-gray-300">
                <TableCell colSpan={3}>ИТОГО (спикеры)</TableCell>
                <TableCell className="text-right">{formatCurrency(totalPlannedCost)}</TableCell>
                <TableCell className={`text-right ${totalActualCost > totalPlannedCost && totalPlannedCost > 0 ? 'text-red-600' : ''}`}>
                  {formatCurrency(totalActualCost)}
                </TableCell>
                <TableCell />
                {(isCoordination || editing) && <TableCell />}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        {editing && <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Добавить спикера</Button>}
        {editing && <Button size="sm" onClick={saveItems} className="bg-[#E4002B]">Сохранить спикеров</Button>}
        {isMethodology && items.some(s => s.plannedCost !== undefined) && (
          <Button size="sm" onClick={savePlannedCosts} className="bg-teal-600 hover:bg-teal-700 text-xs sm:text-sm">
            <Banknote className="h-3 w-3 mr-1" /> Сохранить плановые стоимости
          </Button>
        )}
        {isMethodology && isClosingStage && items.some(s => s.actualCost !== undefined && s.actualCost > 0) && (
          <Button size="sm" onClick={saveActualCosts} className="bg-amber-600 hover:bg-amber-700 text-xs sm:text-sm">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Отправить факт на согласование
          </Button>
        )}
      </div>
    </div>
  );
}

export { SpeakersTab };
export default SpeakersTab;
