import { cents } from './ledger.js';

export function categoryInsights(transactions, month, type) {
 const groups = new Map();
 for (const row of transactions) {
  if (row.type !== type || row.transaction_date.slice(0, 7) !== month) continue;
  const name = row.category?.trim() || 'Other';
  groups.set(name, (groups.get(name) || 0) + cents(row.amount));
 }
 const totalCents = [...groups.values()].reduce((a, b) => a + b, 0);
 return {total: totalCents / 100, categories: [...groups].sort((a,b) => b[1]-a[1]).map(([name, value]) => ({name, amount:value/100, share:totalCents ? value/totalCents*100 : 0}))};
}
