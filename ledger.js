import {isLoanOpening} from './loan-meta.js';
export const accountTypes = { cash: 'Cash', bank: 'Bank', mobile_banking: 'Mobile banking', credit_card: 'Credit card', savings: 'Savings', loan: 'Loan payable', receivable: 'Receivable' };
export const money = value => new Intl.NumberFormat('en-BD', {style:'currency',currency:'BDT',currencyDisplay:'narrowSymbol',maximumFractionDigits:2}).format(value || 0);
export function cents(value) {
  const text = String(value).trim();
  if (!/^-?\d+(\.\d{1,2})?$/.test(text)) throw new Error('Enter an amount with at most two decimal places.');
  const n = Math.round(Number(text) * 100);
  if (!Number.isSafeInteger(n) || Math.abs(n) > 99999999999999) throw new Error('Amount is too large.');
  return n;
}
export function balances(accounts, transactions) {
  const values = Object.fromEntries(accounts.map(a => [a.id, cents(a.opening_balance || 0)]));
  for (const t of transactions) {
    const amount = cents(t.amount);
    if (t.type === 'transfer' && !t.transfer_account_id) continue;
    if (Object.hasOwn(values,t.account_id)) values[t.account_id] += t.type === 'income' ? amount : -amount;
    if (t.type === 'transfer' && Object.hasOwn(values,t.transfer_account_id)) values[t.transfer_account_id] += amount;
  }
  return Object.fromEntries(Object.entries(values).map(([id,value])=>[id,value/100]));
}
export function totals(transactions, month) {
  const rows = transactions.filter(t=>!isLoanOpening(t)&&t.transaction_date.slice(0,7) === month);
  return {income:rows.filter(t=>t.type==='income').reduce((sum,t)=>sum+cents(t.amount),0)/100,expense:rows.filter(t=>t.type==='expense').reduce((sum,t)=>sum+cents(t.amount),0)/100};
}
export function validateTransaction(t) {
  if (!['income','expense','transfer'].includes(t.type)) throw new Error('Choose a transaction type.');
  if (cents(t.amount) <= 0) throw new Error('Amount must be greater than zero.');
  if (!t.account_id) throw new Error('Choose an account.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t.transaction_date)) throw new Error('Choose a valid date.');
  if(t.type==='transfer' && (!t.transfer_account_id || t.account_id===t.transfer_account_id)) throw new Error('Choose two different accounts for a transfer.');
}
export function csvCell(value) {
  let s=String(value ?? '');
  if (/^[\s]*[=+\-@\t\r]/.test(s)) s="'"+s;
  return '"'+s.replaceAll('"','""')+'"';
}
