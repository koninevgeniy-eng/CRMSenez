import { ReferenceDictionary } from '@/lib/crm-types';

export type ReferenceOption = {
  value: string;
  label: string;
};

export const REFERENCE_FALLBACKS: Record<string, ReferenceOption[]> = {
  event_types: [
    { value: 'Образовательная программа', label: 'Образовательная программа' },
    { value: 'Модульная программа', label: 'Модульная программа' },
    { value: 'Форум', label: 'Форум' },
    { value: 'Семинар', label: 'Семинар' },
    { value: 'Постсопровождение', label: 'Постсопровождение' },
  ],
  venues: [
    { value: 'Сенеж', label: 'Сенеж' },
    { value: 'ТехноСенеж', label: 'ТехноСенеж' },
    { value: 'Конференц-зал', label: 'Конференц-зал' },
    { value: 'Выездная площадка', label: 'Выездная площадка' },
  ],
  campuses: [
    { value: 'Южный', label: 'Южный' },
    { value: 'Северный', label: 'Северный' },
  ],
  funding_sources: [
    { value: 'Образовательная субсидия', label: 'Образовательная субсидия' },
    { value: 'Субсидия ВГ', label: 'Субсидия ВГ' },
    { value: 'Внебюджет', label: 'Внебюджет' },
    { value: 'Предпринимательская деятельность', label: 'Предпринимательская деятельность' },
  ],
  event_formats: [
    { value: 'Очный', label: 'Очный' },
    { value: 'Онлайн', label: 'Онлайн' },
    { value: 'Гибридный', label: 'Гибридный' },
  ],
};

export function getReferenceOptions(
  dictionaries: ReferenceDictionary[],
  code: string,
  currentValue?: string | null,
): ReferenceOption[] {
  const dictionary = dictionaries.find(item => item.code === code);
  const options = dictionary?.items
    ?.filter(item => item.isActive)
    ?.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'ru'))
    ?.map(item => ({ value: item.value, label: item.label }))
    ?? REFERENCE_FALLBACKS[code]
    ?? [];

  if (currentValue && !options.some(item => item.value === currentValue)) {
    return [{ value: currentValue, label: currentValue }, ...options];
  }

  return options;
}
