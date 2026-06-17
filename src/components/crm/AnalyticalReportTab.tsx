'use client';

import React, { useState } from 'react';
import { FileText, CheckCircle2, AlertTriangle, Users, Upload, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { EventData } from '@/lib/crm-types';
import { apiFetch } from '@/lib/api-fetch';

function AnalyticalReportTab({ event, onUpdate, editing }: { event: EventData; onUpdate: () => void; editing: boolean }) {
  const [report, setReport] = useState(event.analyticalReport || '');
  const [saving, setSaving] = useState(false);

  const saveReport = async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analyticalReport: report }),
      });
      toast({ title: 'Отчет сохранен' });
      onUpdate();
    } catch {
      toast({ title: 'Ошибка сохранения', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Analytical Report */}
      <div className="p-4 rounded-xl border bg-gradient-to-r from-[#FFF1F3] to-[#FFE0E5]">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="h-5 w-5 text-[#E4002B]" />
          <h4 className="font-semibold">Аналитический отчет по мероприятию</h4>
        </div>
        {editing ? (
          <div className="space-y-3">
            <Label className="text-sm">Содержание отчета</Label>
            <Textarea
              rows={8}
              value={report}
              onChange={e => setReport(e.target.value)}
              placeholder="Введите аналитический отчет по мероприятию: результаты, выводы, рекомендации..."
              className="bg-white"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" className="bg-[#E4002B] hover:bg-[#BD0024]" onClick={saveReport} disabled={saving}>
                {saving ? 'Сохранение...' : 'Сохранить отчет'}
              </Button>
              <p className="text-xs text-muted-foreground">Отчет сохраняется отдельно от остальных изменений</p>
            </div>
          </div>
        ) : (
          <div>
            {event.analyticalReport ? (
              <div className="whitespace-pre-wrap text-sm bg-white p-4 rounded-lg border">{event.analyticalReport}</div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Аналитический отчет еще не добавлен</p>
                <p className="text-xs text-muted-foreground mt-1">Включите режим редактирования, чтобы добавить отчет</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Speaker Photos Section */}
      <div className="p-4 rounded-xl border">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-5 w-5 text-violet-600" />
          <h4 className="font-semibold">Фото спикеров</h4>
        </div>
        {event.speakers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {event.speakers.map(speaker => (
              <div key={speaker.id} className="flex items-center gap-3 p-3 rounded-lg border bg-white">
                <div className="relative group w-12 h-12 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center overflow-hidden shrink-0">
                  {speaker.photoUrl ? (
                    <img src={speaker.photoUrl} alt={speaker.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-violet-600">{speaker.fullName.charAt(0)}</span>
                  )}
                  {editing && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full cursor-pointer">
                      <label className="cursor-pointer text-white">
                        <Camera className="h-4 w-4" />
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const formData = new FormData();
                            formData.append('file', file);
                            try {
                              const res = await apiFetch('/api/upload', { method: 'POST', body: formData });
                              if (res.ok) {
                                const data = await res.json();
                                await apiFetch(`/api/events/${event.id}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    speakers: event.speakers.map(s => s.id === speaker.id ? { ...s, photoUrl: data.url } : s),
                                  }),
                                });
                                onUpdate();
                                toast({ title: 'Фото обновлено' });
                              } else {
                                const errData = await res.json();
                                toast({ title: errData.error || 'Ошибка загрузки', variant: 'destructive' });
                              }
                            } catch (err) {
                              toast({ title: 'Ошибка загрузки файла', variant: 'destructive' });
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{speaker.fullName}</p>
                  {speaker.topic && <p className="text-xs text-muted-foreground truncate">{speaker.topic}</p>}
                </div>
                {editing && (
                  <label className="shrink-0 cursor-pointer">
                    <Button variant="outline" size="sm" className="text-xs pointer-events-none" asChild>
                      <span><Upload className="h-3 w-3 mr-1" />Фото</span>
                    </Button>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const formData = new FormData();
                        formData.append('file', file);
                        try {
                          const res = await apiFetch('/api/upload', { method: 'POST', body: formData });
                          if (res.ok) {
                            const data = await res.json();
                            await apiFetch(`/api/events/${event.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                speakers: event.speakers.map(s => s.id === speaker.id ? { ...s, photoUrl: data.url } : s),
                              }),
                            });
                            onUpdate();
                            toast({ title: 'Фото обновлено' });
                          } else {
                            const errData = await res.json();
                            toast({ title: errData.error || 'Ошибка загрузки', variant: 'destructive' });
                          }
                        } catch (err) {
                          toast({ title: 'Ошибка загрузки файла', variant: 'destructive' });
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Нет спикеров</p>
        )}
      </div>

      {/* Program/Plan Status */}
      <div className="p-4 rounded-xl border">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-5 w-5 text-amber-600" />
          <h4 className="font-semibold">Программа / План</h4>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox checked={event.hasProgram} disabled />
            <span className="text-sm">Программа мероприятия</span>
            {event.hasProgram && <Badge className="bg-green-50 text-green-700 text-[10px]">Прикреплена</Badge>}
          </div>
          {event.hasProgram && event.program && (
            <div className="ml-6 p-3 rounded-lg bg-gray-50 text-sm whitespace-pre-wrap">{event.program}</div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox checked={event.hasPlan} disabled />
            <span className="text-sm">Примерный план</span>
            {event.hasPlan && <Badge className="bg-green-50 text-green-700 text-[10px]">Прикреплен</Badge>}
          </div>
          {event.hasPlan && event.eventPlan && (
            <div className="ml-6 p-3 rounded-lg bg-gray-50 text-sm whitespace-pre-wrap">{event.eventPlan}</div>
          )}
          {!event.hasProgram && !event.hasPlan && (
            <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />Для отправки на согласование необходимо добавить программу или план</p>
          )}
        </div>
      </div>
    </div>
  );
}

export { AnalyticalReportTab };
export default AnalyticalReportTab;
