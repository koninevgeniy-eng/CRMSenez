'use client';

import React, { useState } from 'react';
import { Plus, X, Banknote, AlertTriangle, CheckCircle2, Edit, Save, RotateCcw, Info, Send, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BudgetItem, EventStatus } from '@/lib/crm-types';
import { BUDGET_CATEGORIES } from '@/lib/crm-types';
import { formatCurrency } from '@/lib/crm-utils';
import { apiFetch } from '@/lib/api-fetch';
import { toast } from '@/hooks/use-toast';

interface BudgetTabProps {
  budgetItems: BudgetItem[];
  totalBudget?: number;
  eventId: string;
  onUpdate: () => void;
  editing: boolean;
  /** Which department context is viewing this tab */
  departmentContext?: 'methodology' | 'coordination' | 'other';
  eventStatus?: EventStatus;
  canEditActualBudget?: boolean;
  onWorkflowAction?: (id: string, action: string, comment?: string, uin?: string) => void | Promise<void>;
}

function BudgetTab({
  budgetItems,
  totalBudget,
  eventId,
  onUpdate,
  editing,
  departmentContext = 'other',
  eventStatus,
  canEditActualBudget = false,
  onWorkflowAction,
}: BudgetTabProps) {
  const [items, setItems] = useState(budgetItems);
  const [budgetCorrectionMode, setBudgetCorrectionMode] = useState(false);
  const [correctionComment, setCorrectionComment] = useState('');
  const [correctionItems, setCorrectionItems] = useState<Record<number, number>>({});
  const [actualBudgetMode, setActualBudgetMode] = useState(false);
  const [isSavingActualBudget, setIsSavingActualBudget] = useState(false);

  React.useEffect(() => { setItems(budgetItems); }, [budgetItems]);

  const isCoordination = departmentContext === 'coordination';
  const canCorrectBudget = isCoordination;
  const canSubmitActualBudgetNow = canEditActualBudget
    && (eventStatus === 'event_finished' || eventStatus === 'pending_actual_budget');
  const isActualBudgetCoordinationReview = eventStatus === 'coordination_actual_budget_review'
    || eventStatus === 'pending_actual_approval';
  const isActualBudgetApproved = eventStatus === 'actual_budget_approved';
  const canEditActualFields = editing || actualBudgetMode;

  const getItemArticle = (item: BudgetItem) => item.article || item.category || '';
  const getItemComment = (item: BudgetItem) => item.comment || item.description || '';
  const getItemQuantity = (item: BudgetItem) => item.quantity ?? (item.plannedAmount ? 1 : 0);
  const getItemUnitPrice = (item: BudgetItem) => item.unitPrice ?? (getItemQuantity(item) > 0 ? item.plannedAmount / getItemQuantity(item) : item.plannedAmount);
  const getItemPlannedAmount = (item: BudgetItem) => item.plannedAmount ?? getItemQuantity(item) * getItemUnitPrice(item);

  const normalizeItemForSave = (item: BudgetItem, index: number): BudgetItem => {
    const quantity = getItemQuantity(item);
    const unitPrice = getItemUnitPrice(item);
    const plannedAmount = item.plannedAmount ?? quantity * unitPrice;
    const article = getItemArticle(item);
    const comment = getItemComment(item);

    return {
      ...item,
      number: item.number ?? index + 1,
      article,
      category: item.category || article,
      quantity,
      unitPrice,
      comment,
      description: item.description || comment,
      plannedAmount,
      overrunReason: item.overrunReason || undefined,
    };
  };

  const addItem = () => setItems([
    ...items,
    {
      number: items.length + 1,
      article: '',
      category: '',
      quantity: 1,
      unitPrice: 0,
      plannedAmount: 0,
      comment: '',
      description: '',
      actualAmount: 0,
      status: 'planned',
    },
  ]);

  const updateItem = (index: number, field: string, value: any) => {
    if (['number', 'quantity', 'unitPrice', 'plannedAmount', 'actualAmount', 'correctedAmount'].includes(field) && typeof value === 'number' && value < 0) {
      toast({ title: 'Числовые значения бюджета не могут быть отрицательными', variant: 'destructive' });
      return;
    }
    const updated = [...items];
    const nextItem = { ...updated[index], [field]: value };
    if (field === 'article') {
      nextItem.category = value;
    }
    if (field === 'comment') {
      nextItem.description = value;
    }
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? value : getItemQuantity(nextItem);
      const unitPrice = field === 'unitPrice' ? value : getItemUnitPrice(nextItem);
      nextItem.plannedAmount = quantity * unitPrice;
    }
    updated[index] = nextItem;
    setItems(updated);
  };

  const removeItem = (index: number) => setItems(items.filter((_, i) => i !== index));

  const validateItemsForSave = (validItems: BudgetItem[]) => {
    for (const item of validItems) {
      if (!item.number || item.number <= 0 || !Number.isInteger(item.number)) {
        toast({ title: 'У каждой строки бюджета должен быть положительный номер', variant: 'destructive' });
        return false;
      }
      if (!item.article) {
        toast({ title: `Укажите статью в строке №${item.number}`, variant: 'destructive' });
        return false;
      }
      if (item.quantity === undefined || item.quantity < 0) {
        toast({ title: `Количество не может быть отрицательным: ${item.article}`, variant: 'destructive' });
        return false;
      }
      if (item.unitPrice === undefined || item.unitPrice < 0) {
        toast({ title: `Цена не может быть отрицательной: ${item.article}`, variant: 'destructive' });
        return false;
      }
      if (item.plannedAmount < 0) {
        toast({ title: `Сумма не может быть отрицательной: ${item.article}`, variant: 'destructive' });
        return false;
      }
      if (!item.comment?.trim()) {
        toast({ title: `Комментарий обязателен: ${item.article}`, variant: 'destructive' });
        return false;
      }
      if (item.actualAmount !== null && item.actualAmount !== undefined && item.actualAmount < 0) {
        toast({ title: `Фактическая сумма не может быть отрицательной: ${item.article}`, variant: 'destructive' });
        return false;
      }
      if (item.actualAmount !== null && item.actualAmount !== undefined && item.actualAmount > item.plannedAmount && !item.overrunReason?.trim()) {
        toast({ title: `Укажите причину перерасхода: ${item.article}`, variant: 'destructive' });
        return false;
      }
    }
    return true;
  };

  const saveBudgetPayload = async (
    validItems: BudgetItem[],
    extraPayload: Record<string, unknown>,
    successTitle: string,
  ) => {
    const res = await apiFetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budgetItems: validItems, changedBy: 'Пользователь', ...extraPayload }),
    });
    if (!res.ok) {
      let description = 'Не удалось сохранить бюджет';
      try {
        const err = await res.json();
        description = err.error || description;
      } catch {}
      toast({ title: 'Ошибка', description, variant: 'destructive' });
      return false;
    }
    onUpdate();
    toast({ title: successTitle });
    return true;
  };

  const saveItems = async () => {
    const validItems = items.map(normalizeItemForSave);
    if (!validateItemsForSave(validItems)) return;
    await saveBudgetPayload(validItems, {}, 'Бюджет сохранён');
  };

  const saveActualBudget = async (sendToCoordination = false) => {
    if (!canSubmitActualBudgetNow) {
      toast({
        title: 'Фактический бюджет пока нельзя отправить',
        description: 'Дождитесь статуса «Мероприятие проведено».',
        variant: 'destructive',
      });
      return;
    }

    const validItems = items.map(normalizeItemForSave);
    if (!validateItemsForSave(validItems)) return;

    const hasAnyActualValue = validItems.some(item => item.actualAmount !== null && item.actualAmount !== undefined);
    if (!hasAnyActualValue) {
      toast({
        title: 'Заполните фактический бюджет',
        description: 'Укажите фактическую сумму хотя бы в одной строке бюджета.',
        variant: 'destructive',
      });
      return;
    }

    const actualCost = validItems.reduce((sum, item) => sum + (item.actualAmount || 0), 0);
    setIsSavingActualBudget(true);
    try {
      const saved = await saveBudgetPayload(
        validItems,
        {
          actualCost,
          changeDescription: sendToCoordination
            ? 'Фактический бюджет внесен и направлен в координацию'
            : 'Внесен фактический бюджет',
        },
        sendToCoordination ? 'Фактический бюджет сохранён' : 'Фактический бюджет сохранён'
      );
      if (!saved) return;

      setActualBudgetMode(false);
      if (sendToCoordination) {
        if (!onWorkflowAction) {
          toast({
            title: 'Бюджет сохранён',
            description: 'Отправка в координацию недоступна в этом представлении.',
          });
          return;
        }
        await onWorkflowAction(eventId, 'submit_actual_budget');
      }
    } finally {
      setIsSavingActualBudget(false);
    }
  };

  /** Save budget corrections (coordination department) — preserves original amounts */
  const saveCorrections = async () => {
    if (!correctionComment.trim()) {
      toast({ title: 'Укажите причину корректировки', variant: 'destructive' });
      return;
    }

    const hasAnyCorrection = Object.keys(correctionItems).length > 0;
    if (!hasAnyCorrection) {
      toast({ title: 'Укажите хотя бы одну скорректированную сумму', variant: 'destructive' });
      return;
    }

    const correctedItems = items.map((item, index) => {
      const newAmount = correctionItems[index];
      if (newAmount !== undefined && newAmount !== item.plannedAmount) {
        return {
          ...item,
          // Save original amount if not already saved
          originalAmount: item.originalAmount ?? item.plannedAmount,
          // Set corrected amount as new planned amount
          plannedAmount: newAmount,
          correctedAmount: newAmount,
          correctedBy: 'Координация',
          correctionComment: correctionComment,
        };
      }
      return item;
    });

    await apiFetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budgetItems: correctedItems, changedBy: 'Координация' }),
    });
    setBudgetCorrectionMode(false);
    setCorrectionComment('');
    setCorrectionItems({});
    onUpdate();
    toast({ title: 'Корректировка бюджета сохранена' });
  };

  /** Revert a single budget item to its original amount */
  const revertItem = async (index: number) => {
    const item = items[index];
    if (!item.originalAmount) return;

    const revertedItems = [...items];
    revertedItems[index] = {
      ...revertedItems[index],
      plannedAmount: item.originalAmount,
      correctedAmount: undefined,
      correctedBy: undefined,
      correctionComment: undefined,
      originalAmount: undefined,
    };

    await apiFetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ budgetItems: revertedItems, changedBy: 'Координация' }),
    });
    onUpdate();
    toast({ title: 'Позиция возвращена к исходной сумме' });
  };

  const totalPlanned = items.reduce((s, b) => s + getItemPlannedAmount(b), 0);
  const totalActual = items.reduce((s, b) => s + (b.actualAmount || 0), 0);
  const budgetVariance = totalPlanned - totalActual;
  const hasOverBudget = totalActual > totalPlanned && totalPlanned > 0;
  const paymentStatusMap: Record<string, { label: string; color: string }> = {
    planned: { label: 'Запланировано', color: 'bg-gray-100 text-gray-600' },
    in_progress: { label: 'В процессе', color: 'bg-blue-100 text-blue-600' },
    paid: { label: 'Оплачен', color: 'bg-[#FFE0E5] text-[#E4002B]' },
    partial: { label: 'Частично', color: 'bg-amber-100 text-amber-600' },
  };

  // Count how many items have corrections
  const correctedCount = items.filter(b => b.originalAmount !== undefined && b.originalAmount !== null).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-medium flex items-center gap-2">
          <Banknote className="h-4 w-4 text-[#E4002B]" />
          Бюджет: <span className="text-[#E4002B]">{formatCurrency(totalBudget)}</span>
          {correctedCount > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-700 border-sky-200">
                    {correctedCount} изм.
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{correctedCount} позиция(й) было скорректировано Координацией</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </h3>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">План: <span className="font-semibold">{formatCurrency(totalPlanned)}</span></span>
          <span className="text-muted-foreground">Факт: <span className="font-semibold text-amber-600">{formatCurrency(totalActual)}</span></span>
          {totalPlanned > 0 && (
            <Badge variant={budgetVariance >= 0 ? 'default' : 'destructive'} className="text-xs">
              Отклонение: {formatCurrency(budgetVariance)}
            </Badge>
          )}
        </div>
      </div>

      {canSubmitActualBudgetNow && (
        <div className="p-4 rounded-xl border-2 border-orange-200 bg-orange-50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-orange-600 text-white">Следующий шаг</Badge>
                <h4 className="font-semibold text-orange-900">Внести фактический бюджет</h4>
              </div>
              <p className="text-sm text-orange-800">
                Заполните колонку «Факт» по строкам бюджета. Если фактическая сумма выше плана,
                обязательно укажите причину перерасхода. После сохранения карточка уйдет сразу в координацию.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              {!actualBudgetMode && (
                <Button size="sm" variant="outline" className="gap-1.5 border-orange-300 text-orange-800" onClick={() => setActualBudgetMode(true)}>
                  <Edit className="h-3 w-3" /> Внести факт
                </Button>
              )}
              <Button
                size="sm"
                className="gap-1.5 bg-orange-600 hover:bg-orange-700"
                disabled={isSavingActualBudget}
                onClick={() => saveActualBudget(true)}
              >
                <Send className="h-3 w-3" /> Сохранить и отправить в координацию
              </Button>
            </div>
          </div>
          {actualBudgetMode && (
            <div className="flex items-start gap-2 p-2 rounded-lg bg-white/70 border border-orange-100">
              <Info className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-800">
                Сейчас открыт режим фактического бюджета: плановые поля заблокированы, редактируются только «Факт»,
                «Причина перерасхода» и «Статус оплаты».
              </p>
            </div>
          )}
        </div>
      )}

      {isActualBudgetCoordinationReview && (
        <div className="p-3 rounded-xl border border-purple-200 bg-purple-50 flex items-start gap-2">
          <Clock className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-purple-900">Фактический бюджет на согласовании координации</p>
            <p className="text-xs text-purple-800">После согласования карточка вернется в методологию для закрытия и отправки в архив.</p>
          </div>
        </div>
      )}

      {isActualBudgetApproved && canEditActualBudget && (
        <div className="p-3 rounded-xl border border-indigo-200 bg-indigo-50 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-indigo-900">Фактический бюджет согласован координацией</p>
            <p className="text-xs text-indigo-800">Карточка снова у методологии. Завершите мероприятие, чтобы отправить его в архив.</p>
          </div>
        </div>
      )}

      {/* Coordination: Budget correction button */}
      {canCorrectBudget && !budgetCorrectionMode && !editing && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => {
            setBudgetCorrectionMode(true);
            setCorrectionItems({});
          }}>
            <Edit className="h-3 w-3" /> Корректировать бюджет
          </Button>
        </div>
      )}

      {/* Budget correction mode */}
      {budgetCorrectionMode && (
        <div className="p-4 rounded-lg bg-sky-50 border border-sky-200 space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2">
            <Edit className="h-4 w-4 text-sky-600 shrink-0" />
            Корректировка бюджета (Координация)
          </h4>
          <div className="flex items-start gap-2 p-2 rounded-md bg-sky-100/50">
            <Info className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
            <p className="text-xs text-sky-800">
              Введите новые суммы в столбце «Скорректировано» для нужных позиций.
              Исходные плановые суммы сохраняются в истории. Пустые поля означают отсутствие изменений.
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Причина корректировки (обязательно)</Label>
            <Input
              value={correctionComment}
              onChange={e => setCorrectionComment(e.target.value)}
              placeholder="Укажите причину корректировки бюджета..."
              className="mt-1"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveCorrections} className="bg-sky-600 hover:bg-sky-700 text-xs gap-1.5">
              <Save className="h-3 w-3" /> Сохранить корректировку
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setBudgetCorrectionMode(false); setCorrectionComment(''); setCorrectionItems({}); }} className="text-xs">
              Отмена
            </Button>
          </div>
        </div>
      )}

      {/* Budget visual bar */}
      {totalPlanned > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Исполнение бюджета: {((totalActual / totalPlanned) * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${totalActual > totalPlanned ? 'bg-red-400' : 'bg-[#E4002B]'}`} style={{ width: `${Math.min((totalActual / totalPlanned) * 100, 100)}%` }} />
          </div>
        </div>
      )}

      {/* Warning when actual exceeds planned */}
      {hasOverBudget && (
        <div className="flex items-center gap-2 p-3 border border-amber-200 rounded-lg bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700">Фактические расходы ({formatCurrency(totalActual)}) превышают плановые ({formatCurrency(totalPlanned)}). Перерасход: {formatCurrency(totalActual - totalPlanned)}</p>
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">№</TableHead>
              <TableHead>Статья</TableHead>
              <TableHead className="text-right">Кол-во</TableHead>
              <TableHead className="text-right">Цена</TableHead>
              <TableHead className="text-right">Сумма</TableHead>
              <TableHead>Комментарий</TableHead>
              {budgetCorrectionMode && <TableHead className="text-right bg-sky-50">Скорректировано</TableHead>}
              {!budgetCorrectionMode && <TableHead className="text-right">Корректировка</TableHead>}
              <TableHead className="text-right">Факт</TableHead>
              <TableHead>Причина перерасхода</TableHead>
              <TableHead>Статус оплаты</TableHead>
              {canCorrectBudget && !budgetCorrectionMode && <TableHead></TableHead>}
              {editing && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((b, i) => {
              const payStatus = paymentStatusMap[b.status || 'planned'] || paymentStatusMap.planned;
              const plannedAmount = getItemPlannedAmount(b);
              const isOverBudget = b.actualAmount !== null && b.actualAmount !== undefined && b.actualAmount > plannedAmount && plannedAmount >= 0;
              const hasCorrection = b.originalAmount !== undefined && b.originalAmount !== null;
              const correctionDiff = hasCorrection ? plannedAmount - (b.originalAmount || 0) : 0;
              const isPositiveCorrection = correctionDiff > 0;
              const isNegativeCorrection = correctionDiff < 0;

              return (
                <TableRow key={i} className={`${isOverBudget ? 'bg-red-50' : ''} ${budgetCorrectionMode ? '' : ''}`}>
                  <TableCell className="text-xs sm:text-sm">
                    {editing ? (
                      <Input type="number" min={1} step={1} value={b.number ?? i + 1} onChange={e => updateItem(i, 'number', parseInt(e.target.value) || i + 1)} className="w-16" />
                    ) : (
                      <span>{b.number ?? i + 1}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm">
                    {editing ? (
                      <Select value={getItemArticle(b)} onValueChange={v => updateItem(i, 'article', v)}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>{BUDGET_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <span className="truncate">{getItemArticle(b)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editing ? (
                      <Input type="number" min={0} value={getItemQuantity(b)} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} className="w-24" />
                    ) : (
                      <span>{getItemQuantity(b)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editing ? (
                      <Input type="number" min={0} value={getItemUnitPrice(b)} onChange={e => updateItem(i, 'unitPrice', parseFloat(e.target.value) || 0)} className="w-28" />
                    ) : (
                      <span>{formatCurrency(getItemUnitPrice(b))}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {editing ? (
                      <Input type="number" min={0} value={plannedAmount} onChange={e => updateItem(i, 'plannedAmount', parseFloat(e.target.value) || 0)} className="w-28" />
                    ) : (
                      <span>
                        {formatCurrency(plannedAmount)}
                        {hasCorrection && (
                          <span className={`text-[10px] block ${isNegativeCorrection ? 'text-red-500' : 'text-green-600'}`}>
                            было: {formatCurrency(b.originalAmount!)} ({isPositiveCorrection ? '+' : ''}{formatCurrency(correctionDiff)})
                          </span>
                        )}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm min-w-[180px]">
                    {editing ? <Input value={getItemComment(b)} onChange={e => updateItem(i, 'comment', e.target.value)} placeholder="Обоснование строки" /> : getItemComment(b)}
                  </TableCell>

                  {/* Correction column: either input (correction mode) or display */}
                  {budgetCorrectionMode ? (
                    <TableCell className="text-right bg-sky-50/50">
                      <Input
                        type="number"
                        min={0}
                        value={correctionItems[i] ?? ''}
                        onChange={e => {
                          const val = e.target.value === '' ? undefined : parseFloat(e.target.value) || 0;
                          setCorrectionItems(prev => {
                            const next = { ...prev };
                            if (val !== undefined) {
                              next[i] = val;
                            } else {
                              delete next[i];
                            }
                            return next;
                          });
                        }}
                        className="w-28"
                        placeholder={String(plannedAmount)}
                      />
                    </TableCell>
                  ) : (
                    <TableCell className="text-right">
                      {hasCorrection ? (
                        <div className="flex items-center justify-end gap-1">
                          <Badge variant="outline" className={`text-[10px] ${isNegativeCorrection ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                            {isPositiveCorrection ? '+' : ''}{formatCurrency(correctionDiff)}
                          </Badge>
                          {b.correctionComment && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p className="text-xs font-medium">{b.correctedBy}: {b.correctionComment}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                  )}

                  <TableCell className="text-right">
                    {canEditActualFields ? (
                      <Input
                        type="number"
                        min={0}
                        value={b.actualAmount ?? ''}
                        onChange={e => updateItem(i, 'actualAmount', e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                        className={`w-28 ${actualBudgetMode ? 'border-orange-300 focus-visible:ring-orange-500 bg-orange-50/40' : ''}`}
                        placeholder="Факт"
                      />
                    ) : (
                      <span className={isOverBudget ? 'text-red-600 font-semibold' : ''}>{formatCurrency(b.actualAmount)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs sm:text-sm min-w-[180px]">
                    {canEditActualFields ? (
                      <Input
                        value={b.overrunReason || ''}
                        onChange={e => updateItem(i, 'overrunReason', e.target.value)}
                        placeholder={isOverBudget ? 'Причина обязательна' : '—'}
                        className={actualBudgetMode ? 'border-orange-200 focus-visible:ring-orange-500' : ''}
                      />
                    ) : (
                      isOverBudget
                        ? <span className={b.overrunReason ? '' : 'text-red-600 font-medium'}>{b.overrunReason || 'Не указана'}</span>
                        : <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {canEditActualFields ? (
                      <Select value={b.status || 'planned'} onValueChange={v => updateItem(i, 'status', v)}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planned">Запланировано</SelectItem>
                          <SelectItem value="in_progress">В процессе</SelectItem>
                          <SelectItem value="partial">Частично</SelectItem>
                          <SelectItem value="paid">Оплачен</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline" className={`text-[10px] ${payStatus.color}`}>{payStatus.label}</Badge>
                    )}
                  </TableCell>
                  {/* Revert button for coordination (non-correction mode) */}
                  {canCorrectBudget && !budgetCorrectionMode && (
                    <TableCell>
                      {hasCorrection && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => revertItem(i)}>
                                <RotateCcw className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Вернуть к исходной сумме ({formatCurrency(b.originalAmount!)})</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>
                  )}
                  {editing && <TableCell><Button variant="ghost" size="sm" onClick={() => removeItem(i)}><X className="h-3 w-3" /></Button></TableCell>}
                </TableRow>
              );
            })}
            <TableRow className="font-bold border-t-2 border-gray-300">
              <TableCell colSpan={4}>ИТОГО</TableCell>
              <TableCell className="text-right">{formatCurrency(totalPlanned)}</TableCell>
              <TableCell />
              {budgetCorrectionMode ? (
                <TableCell className="text-right bg-sky-50/50">
                  {formatCurrency(items.reduce((s, b, i) => s + (correctionItems[i] ?? getItemPlannedAmount(b)), 0))}
                </TableCell>
              ) : (
                <TableCell className="text-right">
                  {(() => {
                    const totalCorrection = items.reduce((s, b) => {
                      if (b.originalAmount !== undefined && b.originalAmount !== null) {
                        return s + (getItemPlannedAmount(b) - b.originalAmount);
                      }
                      return s;
                    }, 0);
                    if (totalCorrection === 0) return <span className="text-muted-foreground text-xs">—</span>;
                    return (
                      <Badge variant="outline" className={`text-[10px] ${totalCorrection > 0 ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                        {totalCorrection > 0 ? '+' : ''}{formatCurrency(totalCorrection)}
                      </Badge>
                    );
                  })()}
                </TableCell>
              )}
              <TableCell className={`text-right ${hasOverBudget ? 'text-red-600' : ''}`}>{formatCurrency(totalActual)}</TableCell>
              <TableCell />
              <TableCell>{hasOverBudget && <Badge variant="destructive" className="text-[10px]">Перерасход</Badge>}</TableCell>
              {canCorrectBudget && !budgetCorrectionMode && <TableCell />}
              {editing && <TableCell />}
            </TableRow>
          </TableBody>
        </Table>
      </div>
      {editing && (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Добавить строку</Button>
          <Button size="sm" onClick={saveItems} className="bg-[#E4002B]">Сохранить бюджет</Button>
        </div>
      )}
      {actualBudgetMode && !editing && (
        <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl border border-orange-200 bg-orange-50">
          <Button
            size="sm"
            variant="outline"
            className="border-orange-300 text-orange-800"
            disabled={isSavingActualBudget}
            onClick={() => saveActualBudget(false)}
          >
            <Save className="h-3 w-3 mr-1" />Сохранить факт
          </Button>
          <Button
            size="sm"
            className="bg-orange-600 hover:bg-orange-700"
            disabled={isSavingActualBudget}
            onClick={() => saveActualBudget(true)}
          >
            <Send className="h-3 w-3 mr-1" />Сохранить и отправить в координацию
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isSavingActualBudget}
            onClick={() => {
              setActualBudgetMode(false);
              setItems(budgetItems);
            }}
          >
            Отмена
          </Button>
        </div>
      )}
    </div>
  );
}

export { BudgetTab };
export default BudgetTab;
