import { cents } from './ledger.js';

export function cardAmounts(account, balance) {
  return {
    outstanding: Math.max(-balance, 0),
    available: account.credit_limit == null ? null : Math.max(Number(account.credit_limit) + balance, 0)
  };
}

export function fundSummary(accounts, values) {
  let available = 0;
  let cards = 0;
  let otherDebt = 0;
  for (const account of accounts) {
    const balance = cents(values[account.id] || 0);
    if (['cash', 'bank', 'mobile_banking'].includes(account.type)) available += Math.max(balance, 0);
    if (account.type === 'credit_card') cards += Math.max(-balance, 0);
    else otherDebt += Math.max(-balance, 0);
  }
  return { available: available / 100, cards: cards / 100, otherDebt: otherDebt / 100 };
}

export function creditCardPayload(available, outstanding, existing, currentBalance) {
  const availableCents = cents(available);
  const outstandingCents = cents(outstanding);
  if (availableCents < 0 || outstandingCents < 0) throw new Error('Available limit and outstanding must be zero or greater.');
  const transactionChange = existing ? cents(currentBalance) - cents(existing.opening_balance || 0) : 0;
  return {
    credit_limit: (availableCents + outstandingCents) / 100,
    opening_balance: (-outstandingCents - transactionChange) / 100
  };
}
