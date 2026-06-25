export const CUSTOM_FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'date',
  'boolean',
  'select',
  'multiselect',
] as const;

export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export type CustomFieldDefinitionLike = {
  id: string;
  key: string;
  label: string;
  fieldType: string;
  options?: string | null;
  required?: boolean | null;
  isActive?: boolean | null;
};

export type NormalizedCustomFieldValue = {
  fieldId: string;
  value: string;
  valueNumber?: number | null;
  valueDate?: Date | null;
  valueBoolean?: boolean | null;
};

export function isCustomFieldType(value: string): value is CustomFieldType {
  return (CUSTOM_FIELD_TYPES as readonly string[]).includes(value);
}

export function normalizeCustomFieldKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9а-яё_ -]/gi, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function parseCustomFieldOptions(options?: string | null): string[] {
  if (!options) return [];
  try {
    const parsed = JSON.parse(options);
    if (Array.isArray(parsed)) {
      return parsed.map(item => String(item).trim()).filter(Boolean);
    }
  } catch {}
  return options
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);
}

function stringifyValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean).join(', ');
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value).trim();
}

function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  const text = stringifyValue(value).toLowerCase();
  if (['true', '1', 'yes', 'да'].includes(text)) return true;
  if (['false', '0', 'no', 'нет'].includes(text)) return false;
  return null;
}

export function normalizeCustomFieldValues(
  definitions: CustomFieldDefinitionLike[],
  values: Record<string, unknown> | undefined,
  options: { requireRequired?: boolean } = {},
): { ok: true; values: NormalizedCustomFieldValue[] } | { ok: false; error: string } {
  if (!values || typeof values !== 'object') {
    const missing = definitions.find(field => field.required && field.isActive !== false);
    if (options.requireRequired && missing) {
      return { ok: false, error: `Поле "${missing.label}" обязательно` };
    }
    return { ok: true, values: [] };
  }

  const normalized: NormalizedCustomFieldValue[] = [];
  for (const field of definitions.filter(item => item.isActive !== false)) {
    const raw = values[field.id] ?? values[field.key];
    const text = stringifyValue(raw);

    if (!text) {
      if (options.requireRequired && field.required) {
        return { ok: false, error: `Поле "${field.label}" обязательно` };
      }
      continue;
    }

    const fieldType = isCustomFieldType(field.fieldType) ? field.fieldType : 'text';
    const allowedOptions = parseCustomFieldOptions(field.options);
    const next: NormalizedCustomFieldValue = {
      fieldId: field.id,
      value: text,
      valueNumber: null,
      valueDate: null,
      valueBoolean: null,
    };

    if (fieldType === 'number') {
      const parsed = Number(text);
      if (!Number.isFinite(parsed)) {
        return { ok: false, error: `Поле "${field.label}" должно быть числом` };
      }
      next.valueNumber = parsed;
    }

    if (fieldType === 'date') {
      const parsed = new Date(text);
      if (Number.isNaN(parsed.getTime())) {
        return { ok: false, error: `Поле "${field.label}" должно быть датой` };
      }
      next.valueDate = parsed;
    }

    if (fieldType === 'boolean') {
      const parsed = normalizeBoolean(raw);
      if (parsed === null) {
        return { ok: false, error: `Поле "${field.label}" должно быть да/нет` };
      }
      next.value = parsed ? 'true' : 'false';
      next.valueBoolean = parsed;
    }

    if (fieldType === 'select' && allowedOptions.length > 0 && !allowedOptions.includes(text)) {
      return { ok: false, error: `Значение поля "${field.label}" отсутствует в списке вариантов` };
    }

    if (fieldType === 'multiselect' && allowedOptions.length > 0) {
      const selected = text.split(',').map(item => item.trim()).filter(Boolean);
      const invalid = selected.find(item => !allowedOptions.includes(item));
      if (invalid) {
        return { ok: false, error: `Значение "${invalid}" отсутствует в списке вариантов поля "${field.label}"` };
      }
    }

    normalized.push(next);
  }

  return { ok: true, values: normalized };
}

export function valuesChanged(
  previous: Array<{ fieldId: string; value: string }>,
  next: NormalizedCustomFieldValue[],
): boolean {
  const previousMap = new Map(previous.map(item => [item.fieldId, item.value || '']));
  const nextMap = new Map(next.map(item => [item.fieldId, item.value || '']));
  if (previousMap.size !== nextMap.size) return true;
  for (const [fieldId, value] of nextMap) {
    if ((previousMap.get(fieldId) || '') !== value) return true;
  }
  return false;
}
