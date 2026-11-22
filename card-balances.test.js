import test from 'node:test';
import assert from 'node:assert/strict';
import { balances } from './ledger.js';
import { cardAmounts, fundSummary, creditCardPayload } from './card-balances.js';

test('spendable funds exclude savings, receivables and card credit without deducting debts', () => {
  const accounts = [{id:'cash',type:'cash'},{id:'bank',type:'bank'},{id:'save',type:'savings'},{id:'card',type:'credit_card'},{id:'loan',type:'loan'}];
  assert.deepEqual(fundSummary(accounts,{cash:5000,bank:10000,save:50000,card:-30000,loan:-2000}), {available:15000,cards:30000,otherDebt:2000});
});
test('card spending and bill payment update both card figures', () => {
  const card={id:'card',type:'credit_card',opening_balance:-20000,credit_limit:100000};
  const accounts=[card,{id:'bank',type:'bank',opening_balance:50000}];
  let values=balances(accounts,[{account_id:'card',type:'expense',amount:5000}]);
  assert.deepEqual(cardAmounts(card,values.card),{available:75000,outstanding:25000});
  values=balances(accounts,[{account_id:'card',type:'expense',amount:5000},{account_id:'bank',transfer_account_id:'card',type:'transfer',amount:10000}]);
  assert.deepEqual(cardAmounts(card,values.card),{available:85000,outstanding:15000});
  assert.equal(fundSummary(accounts,values).available,40000);
});
test('editing current card amounts preserves past transactions and is repeatable', () => {
  const existing={opening_balance:-20000};
  const result=creditCardPayload('70000','30000',existing,-25000);
  assert.deepEqual(result,{credit_limit:100000,opening_balance:-25000});
  assert.equal(result.opening_balance-5000,-30000);
  assert.deepEqual(creditCardPayload('70000','30000',result,-30000),result);
  assert.throws(()=>creditCardPayload('-1','0',null,0));
  assert.deepEqual(cardAmounts({},-20000),{available:null,outstanding:20000});
});
