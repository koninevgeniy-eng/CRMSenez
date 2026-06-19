'use client';

import React, { useEffect, useState } from 'react';
import { Plus, X, Star, Users, Banknote, Camera, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { BUDGET_CATEGORIES, ReferenceDictionary } from '@/lib/crm-types';
import { formatCurrency } from '@/lib/crm-utils';
import { apiFetch } from '@/lib/api-fetch';
import { getReferenceOptions } from '@/lib/reference-utils';

function CreateEventDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: () => void }) {
  const [form, setForm] = useState<any>({
    title: '', status: 'draft', programDirector: '', startDate: '', endDate: '',
    participantCount: '', venue: '', campus: 'Южный', budget: '', fundingSource: '',
    programType: '', program: '', eventPlan: '', hasProgram: false, hasPlan: false,
    targetAudience: '', customerName: '', contractorName: '',
    coOrganizers: '', vipGuests: '',
    speakers: [], budgetItems: [], tasks: [], contacts: [], rooms: [],
    meals: [], transfers: [], accommodations: [],
  });
  const [createTab, setCreateTab] = useState('main');
  const [validationErrors, setValidationErrors] = useState<{ title?: string; startDate?: string; endDate?: string; program?: string }>({});
  const [dictionaries, setDictionaries] = useState<ReferenceDictionary[]>([]);

  useEffect(() => {
    if (!open) return;
    apiFetch('/api/dictionaries')
      .then(async res => {
        if (!res.ok) return;
        const data = await res.json();
        setDictionaries(data.dictionaries || []);
      })
      .catch(() => {});
  }, [open]);

  const referenceOptions = (code: string, currentValue?: string) => getReferenceOptions(dictionaries, code, currentValue);

  const updateField = (field: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field as keyof typeof validationErrors]) {
      setValidationErrors((prev: any) => { const next = { ...prev }; delete next[field]; return next; });
    }
  };

  // Speaker management
  const addSpeaker = () => setForm((prev: any) => ({ ...prev, speakers: [...prev.speakers, { fullName: '', topic: '', cost: 0, photoUrl: '' }] }));
  const updateSpeaker = (i: number, field: string, value: any) => setForm((prev: any) => ({ ...prev, speakers: prev.speakers.map((s: any, idx: number) => idx === i ? { ...s, [field]: value } : s) }));
  const removeSpeaker = (i: number) => setForm((prev: any) => ({ ...prev, speakers: prev.speakers.filter((_: any, idx: number) => idx !== i) }));

  const handleSpeakerPhotoUpload = async (index: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await apiFetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        updateSpeaker(index, 'photoUrl', data.url);
        toast({ title: 'Фото загружено' });
      } else {
        const errData = await res.json();
        toast({ title: errData.error || 'Ошибка загрузки', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Ошибка загрузки файла', variant: 'destructive' });
    }
  };

  // Budget item management
  const addBudgetItem = () => setForm((prev: any) => ({ ...prev, budgetItems: [...prev.budgetItems, { category: '', description: '', plannedAmount: 0 }] }));
  const updateBudgetItem = (i: number, field: string, value: any) => setForm((prev: any) => ({ ...prev, budgetItems: prev.budgetItems.map((b: any, idx: number) => idx === i ? { ...b, [field]: value } : b) }));
  const removeBudgetItem = (i: number) => setForm((prev: any) => ({ ...prev, budgetItems: prev.budgetItems.filter((_: any, idx: number) => idx !== i) }));

  // Contact management
  const addContact = () => setForm((prev: any) => ({ ...prev, contacts: [...prev.contacts, { role: '', fullName: '', phone: '', type: 'customer' }] }));
  const updateContact = (i: number, field: string, value: any) => setForm((prev: any) => ({ ...prev, contacts: prev.contacts.map((c: any, idx: number) => idx === i ? { ...c, [field]: value } : c) }));
  const removeContact = (i: number) => setForm((prev: any) => ({ ...prev, contacts: prev.contacts.filter((_: any, idx: number) => idx !== i) }));

  const handleCreate = async () => {
    const errors: { title?: string; startDate?: string; endDate?: string; program?: string } = {};
    if (!form.title) errors.title = 'Укажите название мероприятия';
    if (!form.startDate) errors.startDate = 'Укажите дату начала';
    if (!form.endDate) errors.endDate = 'Укажите дату окончания';
    if (!form.hasProgram && !form.hasPlan) errors.program = 'Необходимо отметить наличие программы или плана мероприятия';
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setCreateTab('main');
      return;
    }
    try {
      const res = await apiFetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          participantCount: form.participantCount ? parseInt(form.participantCount) : null,
          budget: form.budget ? parseFloat(form.budget) : null,
          speakers: form.speakers.filter((s: any) => s.fullName),
          budgetItems: form.budgetItems.filter((b: any) => b.category),
          contacts: form.contacts.filter((c: any) => c.fullName),
        }),
      });
      if (res.ok) {
        toast({ title: 'Мероприятие создано', description: 'Карточка мероприятия создана и сохранена' });
        onCreate();
        setCreateTab('main');
        setForm({
          title: '', status: 'draft', programDirector: '', startDate: '', endDate: '',
          participantCount: '', venue: '', campus: 'Южный', budget: '', fundingSource: '',
          programType: '', program: '', eventPlan: '', hasProgram: false, hasPlan: false,
          targetAudience: '', customerName: '', contractorName: '',
          coOrganizers: '', vipGuests: '',
          speakers: [], budgetItems: [], tasks: [], contacts: [], rooms: [],
          meals: [], transfers: [], accommodations: [],
        });
        setValidationErrors({});
      } else {
        toast({ title: 'Ошибка создания', variant: 'destructive' });
      }
    } catch (err) {
      toast({ title: 'Ошибка сети', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[100vw] sm:max-w-[95vw] sm:max-w-3xl h-[100dvh] sm:h-auto sm:max-h-[85vh] overflow-hidden flex flex-col crm-dialog-enter crm-dialog-glow p-2 sm:p-6 gap-2 sm:gap-4">
        <DialogHeader className="shrink-0 pr-10 sm:pr-8">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg"><Plus className="h-5 w-5 text-[#E4002B]" />Новое мероприятие</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">Заполните данные карточки мероприятия. Основные поля обязательны.</DialogDescription>
        </DialogHeader>

        <Tabs value={createTab} onValueChange={setCreateTab} className="min-h-0 flex-1 overflow-hidden">
          <TabsList className="shrink-0 flex flex-nowrap overflow-x-auto crm-scroll h-auto gap-1">
            <TabsTrigger value="main" className="text-xs whitespace-nowrap">Основное</TabsTrigger>
            <TabsTrigger value="speakers" className="text-xs whitespace-nowrap">Спикеры {form.speakers.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{form.speakers.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="budget" className="text-xs whitespace-nowrap">Бюджет {form.budgetItems.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{form.budgetItems.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="contacts" className="text-xs whitespace-nowrap">Контакты {form.contacts.length > 0 && <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1">{form.contacts.length}</Badge>}</TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 mt-2 sm:mt-4 pr-3 overflow-y-auto crm-scroll">
            <TabsContent value="main" className="space-y-4 mt-0">
              <div>
                <Label className="text-sm font-medium">Наименование мероприятия *</Label>
                <Input value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="Образовательная программа «...»" className={`mt-1 ${validationErrors.title ? 'border-red-400 focus-visible:ring-red-200' : ''}`} />
                {validationErrors.title && <p className="text-xs text-red-500 mt-1">{validationErrors.title}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-sm font-medium">Дата начала</Label>
                  <Input type="date" value={form.startDate} onChange={e => updateField('startDate', e.target.value)} className={`mt-1 ${validationErrors.startDate ? 'border-red-400 focus-visible:ring-red-200' : ''}`} />
                  {validationErrors.startDate && <p className="text-xs text-red-500 mt-1">{validationErrors.startDate}</p>}
                </div>
                <div>
                  <Label className="text-sm font-medium">Дата окончания</Label>
                  <Input type="date" value={form.endDate} onChange={e => updateField('endDate', e.target.value)} className={`mt-1 ${validationErrors.endDate ? 'border-red-400 focus-visible:ring-red-200' : ''}`} />
                  {validationErrors.endDate && <p className="text-xs text-red-500 mt-1">{validationErrors.endDate}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div><Label className="text-sm font-medium">Руководитель программы</Label><Input value={form.programDirector} onChange={e => updateField('programDirector', e.target.value)} className="mt-1" /></div>
                <div><Label className="text-sm font-medium">Заказчик</Label><Input value={form.customerName} onChange={e => updateField('customerName', e.target.value)} className="mt-1" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div><Label className="text-sm font-medium">Тип мероприятия</Label><Select value={form.programType} onValueChange={v => updateField('programType', v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Выберите тип" /></SelectTrigger><SelectContent>{referenceOptions('event_types', form.programType).map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-sm font-medium">Площадка</Label><Select value={form.venue} onValueChange={v => updateField('venue', v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Выберите площадку" /></SelectTrigger><SelectContent>{referenceOptions('venues', form.venue).map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div><Label className="text-sm font-medium">Кампус</Label><Select value={form.campus} onValueChange={v => updateField('campus', v)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{referenceOptions('campuses', form.campus).map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-sm font-medium">Источник финансирования</Label><Select value={form.fundingSource} onValueChange={v => updateField('fundingSource', v)}><SelectTrigger className="mt-1"><SelectValue placeholder="Выберите" /></SelectTrigger><SelectContent>{referenceOptions('funding_sources', form.fundingSource).map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div><Label className="text-sm font-medium">Бюджет (₽)</Label><Input type="number" value={form.budget} onChange={e => updateField('budget', e.target.value)} className="mt-1" /></div>
                <div><Label className="text-sm font-medium">Количество участников</Label><Input type="number" value={form.participantCount} onChange={e => updateField('participantCount', e.target.value)} className="mt-1" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div><Label className="text-sm font-medium">Подрядчик</Label><Input value={form.contractorName} onChange={e => updateField('contractorName', e.target.value)} className="mt-1" /></div>
              </div>
              <div><Label className="text-sm font-medium">Соорганизаторы</Label><Textarea value={form.coOrganizers} onChange={e => updateField('coOrganizers', e.target.value)} placeholder="Перечислите соорганизаторов и их задачи" className="mt-1" /></div>
              <div><Label className="text-sm font-medium">VIP-гости</Label><Textarea value={form.vipGuests} onChange={e => updateField('vipGuests', e.target.value)} placeholder="Перечислите VIP-гостей" className="mt-1" /></div>
              <div><Label className="text-sm font-medium">Целевая аудитория</Label><Textarea value={form.targetAudience} onChange={e => updateField('targetAudience', e.target.value)} className="mt-1" /></div>
              <div className="space-y-3 p-4 rounded-xl border bg-amber-50/50">
                <p className="text-sm font-semibold text-amber-800">Программа / План мероприятия (обязательно хотя бы одно)</p>
                {validationErrors.program && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{validationErrors.program}</p>}
                <div className="flex items-center gap-2">
                  <Checkbox id="hasProgram" checked={form.hasProgram} onCheckedChange={c => updateField('hasProgram', !!c)} />
                  <Label htmlFor="hasProgram" className="text-sm">Есть программа мероприятия</Label>
                </div>
                {form.hasProgram && (
                  <div><Label className="text-xs text-muted-foreground">Программа мероприятия</Label><Textarea rows={4} value={form.program} onChange={e => updateField('program', e.target.value)} placeholder="Опишите программу мероприятия..." className="mt-1" /></div>
                )}
                <div className="flex items-center gap-2">
                  <Checkbox id="hasPlan" checked={form.hasPlan} onCheckedChange={c => updateField('hasPlan', !!c)} />
                  <Label htmlFor="hasPlan" className="text-sm">Есть примерный план</Label>
                </div>
                {form.hasPlan && (
                  <div><Label className="text-xs text-muted-foreground">Примерный план мероприятия</Label><Textarea rows={4} value={form.eventPlan} onChange={e => updateField('eventPlan', e.target.value)} placeholder="Опишите примерный план мероприятия..." className="mt-1" /></div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="speakers" className="space-y-3 mt-0">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Добавьте спикеров мероприятия</p>
                <Button variant="outline" size="sm" onClick={addSpeaker} className="gap-1.5"><Plus className="h-3 w-3" />Добавить спикера</Button>
              </div>
              {form.speakers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><Star className="h-10 w-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Спикеры не добавлены</p></div>
              ) : (
                <div className="space-y-3">
                  {form.speakers.map((s: any, i: number) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-[40px_1fr_1fr_100px_36px] gap-2 items-end p-3 rounded-lg border bg-gray-50/50">
                      <div className="relative group">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center overflow-hidden">
                          {s.photoUrl ? (
                            <img src={s.photoUrl} alt={s.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-violet-600">{s.fullName ? s.fullName.charAt(0) : '?'}</span>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full cursor-pointer">
                          <label className="cursor-pointer text-white">
                            <Camera className="h-3 w-3" />
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/gif,image/webp"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) await handleSpeakerPhotoUpload(i, file);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      <div><Label className="text-xs">ФИО</Label><Input value={s.fullName} onChange={e => updateSpeaker(i, 'fullName', e.target.value)} placeholder="ФИО спикера" /></div>
                      <div><Label className="text-xs">Тема</Label><Input value={s.topic} onChange={e => updateSpeaker(i, 'topic', e.target.value)} placeholder="Тема выступления" /></div>
                      <div><Label className="text-xs">Стоимость (₽)</Label><Input type="number" value={s.cost || ''} onChange={e => updateSpeaker(i, 'cost', parseFloat(e.target.value) || 0)} /></div>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => removeSpeaker(i)}><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="budget" className="space-y-3 mt-0">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Распределите бюджет по категориям</p>
                <Button variant="outline" size="sm" onClick={addBudgetItem} className="gap-1.5"><Plus className="h-3 w-3" />Добавить строку</Button>
              </div>
              {form.budgetItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><Banknote className="h-10 w-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Бюджет не распределен</p></div>
              ) : (
                <div className="space-y-2">
                  {form.budgetItems.map((b: any, i: number) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_100px_36px] gap-2 items-end p-3 rounded-lg border bg-gray-50/50">
                      <div><Label className="text-xs">Категория</Label><Select value={b.category} onValueChange={v => updateBudgetItem(i, 'category', v)}><SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger><SelectContent>{BUDGET_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label className="text-xs">Описание</Label><Input value={b.description} onChange={e => updateBudgetItem(i, 'description', e.target.value)} placeholder="Описание расхода" /></div>
                      <div><Label className="text-xs">Сумма (₽)</Label><Input type="number" value={b.plannedAmount || ''} onChange={e => updateBudgetItem(i, 'plannedAmount', parseFloat(e.target.value) || 0)} /></div>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => removeBudgetItem(i)}><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  <div className="flex justify-end text-sm font-semibold pt-1">
                    Итого: {formatCurrency(form.budgetItems.reduce((s: number, b: any) => s + (b.plannedAmount || 0), 0))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="contacts" className="space-y-3 mt-0">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Добавьте контактных лиц</p>
                <Button variant="outline" size="sm" onClick={addContact} className="gap-1.5"><Plus className="h-3 w-3" />Добавить контакт</Button>
              </div>
              {form.contacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground"><Users className="h-10 w-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Контакты не добавлены</p></div>
              ) : (
                <div className="space-y-2">
                  {form.contacts.map((c: any, i: number) => (
                    <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_36px] gap-2 items-end p-3 rounded-lg border bg-gray-50/50">
                      <div><Label className="text-xs">Роль</Label><Input value={c.role} onChange={e => updateContact(i, 'role', e.target.value)} placeholder="Роль" /></div>
                      <div><Label className="text-xs">ФИО</Label><Input value={c.fullName} onChange={e => updateContact(i, 'fullName', e.target.value)} placeholder="ФИО" /></div>
                      <div><Label className="text-xs">Телефон</Label><Input value={c.phone} onChange={e => updateContact(i, 'phone', e.target.value)} placeholder="+7 (___) ___-__-__" /></div>
                      <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => removeContact(i)}><X className="h-3 w-3" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="shrink-0 border-t pt-3 sm:pt-4">
          <Button variant="outline" onClick={onClose}>Отмена</Button>
          <Button onClick={handleCreate} className="bg-[#E4002B] hover:bg-[#BD0024] crm-btn-hover gap-1.5"><Plus className="h-4 w-4" />Создать</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { CreateEventDialog };
export default CreateEventDialog;
