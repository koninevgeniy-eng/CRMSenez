'use client';

import React, { useState } from 'react';
import { Plus, Trash2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Payment, PaymentStatus, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '@/lib/crm-types';
import { formatCurrency, formatDate } from '@/lib/crm-utils';
import { apiFetch } from '@/lib/api-fetch';

function PaymentsTab({ payments, eventId, onUpdate, editing }: { payments: Payment[]; eventId: string; onUpdate: () => void; editing: boolean }) {
  const [newPayment, setNewPayment] = useState<Partial<Payment>>({ contractor: '', description: '', amount: 0, status: 'pending' });

  const totalAmount = payments.reduce((s, p) => s + p.amount, 0);
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.paidAmount || p.amount), 0);
  const overdueCount = payments.filter(p => p.status === 'overdue').length;

  const handleAddPayment = async () => {
    if (!newPayment.contractor || !newPayment.description || !newPayment.amount) return;
    try {
      const res = await apiFetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payments: [...payments, { ...newPayment, status: newPayment.status || 'pending' }],
          changedBy: 'Пользователь',
        }),
      });
      if (res.ok) {
        toast({ title: 'Платёж добавлен' });
        setNewPayment({ contractor: '', description: '', amount: 0, status: 'pending' });
        onUpdate();
      }
    } catch { toast({ title: 'Ошибка', variant: 'destructive' }); }
  };

  const handleUpdatePaymentStatus = async (index: number, newStatus: PaymentStatus) => {
    const updated = payments.map((p, i) => i === index ? { ...p, status: newStatus, paidAmount: newStatus === 'paid' ? p.amount : p.paidAmount, paidDate: newStatus === 'paid' ? new Date().toISOString() : p.paidDate } : p);
    try {
      const res = await apiFetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments: updated, changedBy: 'Пользователь' }),
      });
      if (res.ok) { toast({ title: 'Статус обновлён' }); onUpdate(); }
    } catch { toast({ title: 'Ошибка', variant: 'destructive' }); }
  };

  const handleDeletePayment = async (index: number) => {
    const updated = payments.filter((_, i) => i !== index);
    try {
      const res = await apiFetch(`/api/events/${eventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments: updated, changedBy: 'Пользователь' }),
      });
      if (res.ok) { toast({ title: 'Платёж удалён' }); onUpdate(); }
    } catch { toast({ title: 'Ошибка', variant: 'destructive' }); }
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-gray-50 border">
          <p className="text-[11px] text-muted-foreground font-medium">Общая сумма</p>
          <p className="text-lg font-bold">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="p-3 rounded-lg bg-green-50 border border-green-100">
          <p className="text-[11px] text-muted-foreground font-medium">Оплачено</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="p-3 rounded-lg bg-red-50 border border-red-100">
          <p className="text-[11px] text-muted-foreground font-medium">Просрочено</p>
          <p className="text-lg font-bold text-red-600">{overdueCount}</p>
        </div>
      </div>

      {/* Payments Table */}
      {payments.length > 0 ? (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Подрядчик</TableHead>
              <TableHead>Описание</TableHead>
              <TableHead>Сумма</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Срок</TableHead>
              {editing && <TableHead className="w-20" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment, i) => (
              <TableRow key={i} className="crm-table-row">
                <TableCell className="font-medium">{payment.contractor}</TableCell>
                <TableCell className="text-sm">{payment.description}</TableCell>
                <TableCell className="font-semibold">{formatCurrency(payment.amount)}</TableCell>
                <TableCell>
                  {editing ? (
                    <Select value={payment.status || 'pending'} onValueChange={(v) => handleUpdatePaymentStatus(i, v as PaymentStatus)}>
                      <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className={`crm-badge text-[10px] ${PAYMENT_STATUS_COLORS[(payment.status as PaymentStatus) || 'pending']}`}>
                      {PAYMENT_STATUS_LABELS[(payment.status as PaymentStatus) || 'pending']}
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{payment.dueDate ? formatDate(payment.dueDate) : '—'}</TableCell>
                {editing && (
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDeletePayment(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Нет платежей</p>
          <p className="text-sm mt-1">Добавьте информацию об оплатах подрядчикам</p>
        </div>
      )}

      {/* Add Payment Form */}
      {editing && (
        <div className="p-4 rounded-xl border border-dashed space-y-3">
          <h4 className="font-medium text-sm flex items-center gap-2"><CreditCard className="h-4 w-4 text-[#E4002B]" />Новый платёж</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs text-muted-foreground">Подрядчик</Label><Input value={newPayment.contractor || ''} onChange={e => setNewPayment(p => ({ ...p, contractor: e.target.value }))} placeholder="ООО «Пример»" /></div>
            <div><Label className="text-xs text-muted-foreground">Описание</Label><Input value={newPayment.description || ''} onChange={e => setNewPayment(p => ({ ...p, description: e.target.value }))} placeholder="Оказание услуг" /></div>
            <div><Label className="text-xs text-muted-foreground">Сумма (₽)</Label><Input type="number" value={newPayment.amount || ''} onChange={e => setNewPayment(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))} placeholder="0" /></div>
            <div><Label className="text-xs text-muted-foreground">Срок оплаты</Label><Input type="date" value={newPayment.dueDate || ''} onChange={e => setNewPayment(p => ({ ...p, dueDate: e.target.value }))} /></div>
          </div>
          <Button size="sm" className="bg-[#E4002B] hover:bg-[#BD0024] crm-btn-hover gap-1.5" onClick={handleAddPayment} disabled={!newPayment.contractor || !newPayment.amount}>
            <Plus className="h-3.5 w-3.5" /> Добавить платёж
          </Button>
        </div>
      )}
    </div>
  );
}

export { PaymentsTab };
export default PaymentsTab;
