'use client';

import React from 'react';
import { Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CustomFieldDefinition, CustomFieldValue } from '@/lib/crm-types';
import { parseCustomFieldOptions } from '@/lib/custom-fields';

function valueFromExisting(values: CustomFieldValue[] | undefined, field: CustomFieldDefinition) {
  return values?.find(item => item.fieldId === field.id)?.value || '';
}

function formatValue(field: CustomFieldDefinition, value: string) {
  if (!value) return '—';
  if (field.fieldType === 'boolean') return value === 'true' ? 'Да' : 'Нет';
  if (field.fieldType === 'date') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('ru-RU');
  }
  return value;
}

export function CustomFieldsPanel({
  fields,
  values,
  editing = false,
  onChange,
}: {
  fields: CustomFieldDefinition[];
  values: Record<string, unknown> | CustomFieldValue[];
  editing?: boolean;
  onChange?: (fieldId: string, value: unknown) => void;
}) {
  const activeFields = fields
    .filter(field => field.isActive)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.label.localeCompare(b.label));

  const getValue = (field: CustomFieldDefinition) => {
    if (Array.isArray(values)) return valueFromExisting(values, field);
    return String(values?.[field.id] ?? values?.[field.key] ?? '');
  };

  if (activeFields.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Settings2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
        <p className="text-sm font-medium">Гибкие поля еще не настроены</p>
        <p className="text-xs mt-1">Администратор может добавить поля в кабинете администратора.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {activeFields.map(field => {
          const rawValue = getValue(field);
          const options = parseCustomFieldOptions(field.options);
          const commonLabel = (
            <div className="flex items-center gap-1.5 mb-1">
              <Label className="text-sm font-medium">{field.label}</Label>
              {field.required && <Badge variant="outline" className="text-[10px] border-red-200 text-red-700">обяз.</Badge>}
              {field.department && <Badge variant="outline" className="text-[10px]">{field.department}</Badge>}
            </div>
          );

          if (!editing) {
            return (
              <div key={field.id} className="rounded-lg border bg-white p-3 min-w-0">
                {commonLabel}
                <p className="text-sm whitespace-pre-wrap break-words">{formatValue(field, rawValue)}</p>
                {field.description && <p className="text-xs text-muted-foreground mt-1">{field.description}</p>}
              </div>
            );
          }

          if (field.fieldType === 'textarea') {
            return (
              <div key={field.id} className="sm:col-span-2">
                {commonLabel}
                <Textarea value={rawValue} onChange={e => onChange?.(field.id, e.target.value)} rows={3} />
                {field.description && <p className="text-xs text-muted-foreground mt-1">{field.description}</p>}
              </div>
            );
          }

          if (field.fieldType === 'select') {
            return (
              <div key={field.id}>
                {commonLabel}
                <Select value={rawValue} onValueChange={value => onChange?.(field.id, value)}>
                  <SelectTrigger><SelectValue placeholder="Выберите значение" /></SelectTrigger>
                  <SelectContent>
                    {options.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                  </SelectContent>
                </Select>
                {field.description && <p className="text-xs text-muted-foreground mt-1">{field.description}</p>}
              </div>
            );
          }

          if (field.fieldType === 'boolean') {
            return (
              <div key={field.id} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Checkbox checked={rawValue === 'true'} onCheckedChange={checked => onChange?.(field.id, Boolean(checked))} />
                  {commonLabel}
                </div>
                {field.description && <p className="text-xs text-muted-foreground mt-1">{field.description}</p>}
              </div>
            );
          }

          return (
            <div key={field.id}>
              {commonLabel}
              <Input
                type={field.fieldType === 'number' ? 'number' : field.fieldType === 'date' ? 'date' : 'text'}
                value={rawValue}
                onChange={e => onChange?.(field.id, e.target.value)}
                placeholder={field.fieldType === 'multiselect' ? 'Значения через запятую' : undefined}
              />
              {field.fieldType === 'multiselect' && options.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">Варианты: {options.join(', ')}</p>
              )}
              {field.description && <p className="text-xs text-muted-foreground mt-1">{field.description}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CustomFieldsPanel;
