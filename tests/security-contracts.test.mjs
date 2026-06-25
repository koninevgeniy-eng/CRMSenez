import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('public event endpoint uses an explicit safe select', async () => {
  const source = await read('src/app/api/events/route.ts');
  assert.match(source, /const publicSelect = \{/);
  assert.doesNotMatch(
    source.slice(source.indexOf('const publicSelect'), source.indexOf('const includeConfig')),
    /budget|customerName|vipGuests|assignments|tasks/
  );
});

test('event deletion is admin-only', async () => {
  const source = await read('src/app/api/events/[id]/route.ts');
  assert.match(source, /canDeleteEvent\(authUser\)/);
  assert.match(source, /Только администратор может удалять мероприятия/);
});

test('Caddy cannot proxy to a user-provided port', async () => {
  const source = await read('Caddyfile');
  assert.doesNotMatch(source, /XTransformPort|\{query\./);
  assert.match(source, /reverse_proxy localhost:3000/);
});

test('runtime database and environment files stay untracked', async () => {
  const source = await read('.gitignore');
  assert.match(source, /\.env\*/);
  assert.match(source, /\*\.db/);
  assert.match(source, /\/upload\//);
});

test('actual budget goes directly to coordination before methodology archival', async () => {
  const source = await read('src/app/api/events/[id]/workflow/route.ts');
  const submitStart = source.indexOf("case 'submit_actual_budget'");
  const methodologyApproveStart = source.indexOf("case 'methodology_approve_actual_budget'");
  const coordinationApproveStart = source.indexOf("case 'approve_actual_budget'");
  const rejectStart = source.indexOf("case 'reject_actual_budget'");
  const submitBlock = source.slice(submitStart, methodologyApproveStart);
  const coordinationApproveBlock = source.slice(coordinationApproveStart, rejectStart);

  assert.match(submitBlock, /newStatus = 'coordination_actual_budget_review'/);
  assert.doesNotMatch(submitBlock, /newStatus = 'methodology_actual_budget_review'/);
  assert.match(coordinationApproveBlock, /возвращен в методологию/);
});
