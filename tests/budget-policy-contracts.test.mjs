import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';
import vm from 'node:vm';

const require = createRequire(import.meta.url);

async function loadBudgetPolicy() {
  const source = await readFile(new URL('../src/lib/budget-policy.ts', import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    exports: module.exports,
    module,
    require,
  });
  return module.exports;
}

test('actual budget values on legacy rows do not require planned budget reapproval', async () => {
  const { hasPlannedBudgetChange } = await loadBudgetPolicy();

  const existingItems = [
    {
      id: 'budget-1',
      category: 'Питание',
      description: 'Питание участников',
      plannedAmount: 120000,
      actualAmount: null,
    },
  ];
  const nextItems = [
    {
      id: 'budget-1',
      category: 'Питание',
      description: 'Питание участников',
      plannedAmount: 120000,
      actualAmount: 115000,
    },
  ];

  assert.equal(hasPlannedBudgetChange(existingItems, nextItems), false);
});

test('real planned budget changes still require reapproval', async () => {
  const { hasPlannedBudgetChange } = await loadBudgetPolicy();

  const existingItems = [
    {
      id: 'budget-1',
      category: 'Питание',
      description: 'Питание участников',
      plannedAmount: 120000,
    },
  ];
  const nextItems = [
    {
      id: 'budget-1',
      category: 'Питание',
      description: 'Питание участников',
      plannedAmount: 130000,
    },
  ];

  assert.equal(hasPlannedBudgetChange(existingItems, nextItems), true);
});
