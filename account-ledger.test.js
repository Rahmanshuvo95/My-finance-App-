import test from 'node:test';
import assert from 'node:assert/strict';
import { accountLedger, localTransactionDate } from './account-ledger.js';

test('ledger includes both transfer sides and running opening balance in date order', () => {
  const rows = [
    { id: 'b', account_id: 'cash', transfer_account_id: 'bank', type: 'transfer', amount: 300, transaction_date: '2026-11-02' },
    { id: 'a', account_id: 'bank', type: 'expense', amount: 50, transaction_date: '2026-11-01' },
    { id: 'c', account_id: 'bank', transfer_account_id: 'card', type: 'transfer', amount: 100, transaction_date: '2026-11-03' },
    { id: 'd', account_id: 'other', type: 'income', amount: 999, transaction_date: '2026-11-01' }
  ];
  assert.deepEqual(accountLedger({ id: 'bank', opening_balance: 1000 }, rows).map(row => [row.id, row.change, row.balance]), [['a', -50, 950], ['b', 300, 1250], ['c', -100, 1150]]);
  assert.equal(accountLedger({ id: 'card', opening_balance: -500 }, rows)[0].balance, -400);
});
test('automatic date follows the device calendar rather than UTC conversion', () => {
  const local = new Date(2026, 10, 22, 0, 5);
  assert.equal(localTransactionDate(local), '2026-11-22');
});
