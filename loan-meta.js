const prefix = '[IFT-LOAN:1]';
export function loanMeta(row) {
 try { const line=(row.note||'').split('\n')[0]; if(!line.startsWith(prefix))return null;
 const data=JSON.parse(line.slice(prefix.length));
 return data.person && ['lend','collect','borrow','repay','opening','allocate'].includes(data.action) ? data : null;
 } catch { return null; }
}
export function loanNote(row) { return loanMeta(row)?(row.note||'').split('\n').slice(1).join('\n'):(row.note||''); }
export const isLoanOpening = row => ['opening','allocate'].includes(loanMeta(row)?.action);
export const personKey = name => name.trim().replace(/\s+/g,' ').toLocaleLowerCase();
export function encodeLoan(data,note='') { return prefix+JSON.stringify(data)+'\n'+note.trim(); }
export function loanLabel(row) { const m=loanMeta(row);return m?`${({lend:'Lent to',collect:'Returned by',borrow:'Borrowed from',repay:'Repaid to',opening:'Previous balance for',allocate:'Assigned balance to'})[m.action]} ${m.person}`:loanNote(row)||row.category||row.type; }
