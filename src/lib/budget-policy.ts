export type BudgetValidationResult = {
  ok: boolean;
  error?: string;
};

const PLANNED_CHANGE_FIELDS = [
  'number',
  'article',
  'quantity',
  'unitPrice',
  'comment',
  'category',
  'description',
  'plannedAmount',
];

function toNumber(value: unknown, fallback = 0): number {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeBudgetItem(item: any, index: number) {
  const quantity = toNumber(item.quantity, item.plannedAmount ? 1 : 0);
  const unitPrice = toNumber(
    item.unitPrice,
    quantity > 0 && item.plannedAmount !== undefined ? toNumber(item.plannedAmount) / quantity : toNumber(item.plannedAmount)
  );
  const plannedAmount = item.plannedAmount !== undefined
    ? toNumber(item.plannedAmount)
    : quantity * unitPrice;
  const article = text(item.article) || text(item.category);
  const comment = text(item.comment) || text(item.description);

  return {
    number: toOptionalNumber(item.number) ?? index + 1,
    article,
    quantity,
    unitPrice,
    comment,
    overrunReason: text(item.overrunReason) || null,
    category: text(item.category) || article,
    description: text(item.description) || comment,
    plannedAmount,
    actualAmount: toOptionalNumber(item.actualAmount),
    originalAmount: toOptionalNumber(item.originalAmount),
    correctedAmount: toOptionalNumber(item.correctedAmount),
    correctedBy: text(item.correctedBy) || null,
    correctionComment: text(item.correctionComment) || null,
    status: text(item.status) || 'planned',
  };
}

export function normalizeBudgetItems(items: any[] = []) {
  return items.map((item, index) => normalizeBudgetItem(item, index));
}

export function validateBudgetItems(items: any[] | undefined): BudgetValidationResult {
  if (!Array.isArray(items)) return { ok: true };

  const normalized = normalizeBudgetItems(items);
  for (const item of normalized) {
    const label = item.article || item.category || `строка ${item.number}`;
    if (!Number.isInteger(item.number) || item.number <= 0) {
      return { ok: false, error: `В бюджетной строке "${label}" номер должен быть положительным целым числом` };
    }
    if (!item.article) {
      return { ok: false, error: `В бюджетной строке №${item.number} необходимо указать статью` };
    }
    if (item.quantity < 0) {
      return { ok: false, error: `Количество в бюджетной строке "${label}" не может быть отрицательным` };
    }
    if (item.unitPrice < 0) {
      return { ok: false, error: `Цена в бюджетной строке "${label}" не может быть отрицательной` };
    }
    if (item.plannedAmount < 0) {
      return { ok: false, error: `Сумма в бюджетной строке "${label}" не может быть отрицательной` };
    }
    if (!item.comment) {
      return { ok: false, error: `В бюджетной строке "${label}" комментарий обязателен` };
    }
    if (item.actualAmount !== null && item.actualAmount < 0) {
      return { ok: false, error: `Фактическая сумма бюджетной строки "${label}" не может быть отрицательной` };
    }
    if (item.actualAmount !== null && item.actualAmount > item.plannedAmount && !item.overrunReason) {
      return { ok: false, error: `Для перерасхода по бюджетной строке "${label}" необходимо указать причину` };
    }
  }

  return { ok: true };
}

function normalizeComparable(value: unknown): string {
  return String(value ?? '').trim();
}

export function hasPlannedBudgetChange(existingItems: any[], nextItems: any[]): boolean {
  const existingById = new Map(existingItems.filter(item => item.id).map(item => [item.id, item]));
  const normalizedNext = normalizeBudgetItems(nextItems);

  if (existingItems.length !== normalizedNext.length) return true;

  return normalizedNext.some((next, index) => {
    const previous = nextItems[index]?.id ? existingById.get(nextItems[index].id) : existingItems[index];
    if (!previous) return true;

    return PLANNED_CHANGE_FIELDS.some(field => {
      const prevValue = field === 'article'
        ? previous.article || previous.category
        : field === 'comment'
          ? previous.comment || previous.description
          : previous[field];
      return normalizeComparable(prevValue) !== normalizeComparable((next as any)[field]);
    });
  });
}
