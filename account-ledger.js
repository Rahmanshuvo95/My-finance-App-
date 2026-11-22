import {loanMeta} from './loan-meta.js';
import { cents } from './ledger.js';

export function accountLedger(account, transactions) {
  let running = cents(account.opening_balance || 0);
  const entries = transactions
    .filter(row => row.account_id === account.id || row.transfer_account_id === account.id)
    .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date)
      || (a.created_at || '').localeCompare(b.created_at || '')
      || a.id.localeCompare(b.id));
  return entries.map(row => {
    const amount = cents(row.amount);
    const incoming = row.type === 'income' || (row.type === 'transfer' && row.transfer_account_id === account.id);
    const change = loanMeta(row)?.action==='allocate' ? 0 : row.type === 'transfer' && !row.transfer_account_id ? 0 : incoming ? amount : -amount;
    running += change;
    return { ...row, incoming, change: change / 100, balance: running / 100 };
  });
}

export function localTransactionDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
