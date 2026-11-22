import {cents,validateTransaction,balances} from './ledger.js';
import {loanMeta,encodeLoan,personKey} from './loan-meta.js';
export const isLoanAccount = account => ['receivable','loan'].includes(account?.type);
export function loanSummary(account,transactions,balance) {
 const people=new Map();let advanced=0,returned=0,opening=0,allocated=0;
 for(const row of transactions){
  const meta=loanMeta(row);if(!meta||meta.loanId!==account.id)continue;
  const key=personKey(meta.person),p=people.get(key)||{key,name:meta.person,advanced:0,returned:0,opening:0,rows:[]};
  const amount=cents(row.amount);p.rows.push(row);
  if(['opening','allocate'].includes(meta.action)){if(meta.action==='allocate')allocated+=amount;p.opening+=amount;opening+=amount;}
  else if(['lend','borrow'].includes(meta.action)){p.advanced+=amount;advanced+=amount;}
  else {p.returned+=amount;returned+=amount;}
  people.set(key,p);
 }
 const list=[...people.values()].map(p=>({...p,balance:(p.opening+p.advanced-p.returned)/100,advanced:p.advanced/100,returned:p.returned/100,opening:p.opening/100}));
 const outstanding=account.type==='loan'?-balance:balance;
 return {people:list,advanced:advanced/100,returned:returned/100,opening:opening/100,allocated:allocated/100,outstanding,unassigned:Math.round((outstanding-list.reduce((s,p)=>s+p.balance,0))*100)/100};
}
export function loanPayload(form,accounts,transactions,values,existing) {
 const loan=accounts.find(a=>a.id===form.loan_id);if(!isLoanAccount(loan))throw Error('Choose a loan account.');
 const person=form.person.trim().replace(/\s+/g,' ');if(!person||person.length>80)throw Error('Enter a person name (up to 80 characters).');
 const action=form.action,allowed=loan.type==='receivable'?['lend','collect','opening','allocate']:['borrow','repay','opening','allocate'];
 if(!allowed.includes(action))throw Error('Choose a valid loan action.');
 const amount=cents(form.amount)/100;if(amount<=0)throw Error('Amount must be greater than zero.');
 const other=accounts.find(a=>a.id===form.cash_id);
 if(!['opening','allocate'].includes(action)&&!['cash','bank','mobile_banking'].includes(other?.type))throw Error('Choose a cash, bank or mobile banking account.');
 const previous=transactions.filter(t=>t.id!==existing?.id),summary=loanSummary(loan,previous,0);
 if(action==='allocate'){
  const current=balances(accounts,previous)[loan.id];
  if(amount>loanSummary(loan,previous,current).unassigned)throw Error('Amount exceeds the existing unassigned balance.');
 }
 if(['collect','repay'].includes(action)){
  const p=summary.people.find(p=>p.key===personKey(person));
  if(!p||cents(amount)>cents(p.balance))throw Error('Return cannot exceed this person\'s remaining balance. Record their previous balance first if needed.');
 }
 // Changing a historic entry must not leave that person with a negative balance.
 const meta={loanId:loan.id,person,action};
 const increasing=['lend','borrow','opening','allocate'].includes(action);
 const fromLoan=loan.type==='receivable'?!increasing:increasing;
 const payload={type:['opening','allocate'].includes(action)?(loan.type==='receivable'?'income':'expense'):'transfer',account_id:['opening','allocate'].includes(action)?loan.id:fromLoan?loan.id:other.id,transfer_account_id:['opening','allocate'].includes(action)?null:fromLoan?other.id:loan.id,amount,category:['opening','allocate'].includes(action)?'Loan opening balance':'Loan transfer',note:encodeLoan(meta,form.note||''),transaction_date:form.transaction_date};
 validateTransaction(payload);
 const after=loanSummary(loan,[...previous,payload],0);
 if(after.people.some(p=>cents(p.balance)<0))throw Error('This change would make a person\'s remaining balance negative. Correct the related repayments first.');
 return payload;
}
