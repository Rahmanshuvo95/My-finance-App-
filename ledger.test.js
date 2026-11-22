import test from 'node:test';
import assert from 'node:assert/strict';
import { balances, cents, totals, validateTransaction, csvCell } from './ledger.js';
const accounts=[{id:'bank',opening_balance:1000},{id:'cash',opening_balance:100},{id:'card',opening_balance:-500}];
test('transfers conserve net worth, card payments reduce debt, decimals remain exact',()=>{
 const rows=[{account_id:'bank',transfer_account_id:'card',type:'transfer',amount:200},{account_id:'cash',type:'expense',amount:0.10},{account_id:'cash',type:'expense',amount:0.20}];
 assert.deepEqual(balances(accounts,rows),{bank:800,cash:99.7,card:-300});
});
test('income and expense totals exclude transfers and other months',()=>{
 const row={transaction_date:'2026-11-01',amount:100};
 assert.deepEqual(totals([{...row,type:'income'},{...row,type:'expense',amount:30},{...row,type:'transfer'},{...row,type:'income',transaction_date:'2026-10-01'}],'2026-11'),{income:100,expense:30});
});
test('invalid precision, zero amount and self transfers are rejected',()=>{
 assert.throws(()=>cents('2.001')); assert.throws(()=>cents('Infinity'));
 const t={type:'transfer',amount:20,account_id:'bank',transfer_account_id:'bank',transaction_date:'2026-11-01'};
 assert.throws(()=>validateTransaction(t)); assert.throws(()=>validateTransaction({...t,transfer_account_id:'cash',amount:0}));
});
test('legacy transfers without destination do not silently corrupt balances',()=>assert.deepEqual(balances(accounts,[{type:'transfer',account_id:'bank',amount:200}]),{bank:1000,cash:100,card:-500}));
test('CSV quotes data and prevents spreadsheet formula injection',()=>{assert.equal(csvCell('=SUM(1)'), '"\'=SUM(1)"');assert.equal(csvCell('a"b'),'"a""b"');});
