import React,{useState} from 'react';
import {money} from './ledger.js';
import {loanSummary} from './loans.js';
import {loanMeta,loanNote,loanLabel} from './loan-meta.js';
import './loans.css';
export function LoanPanel({account,transactions,balance,onBack,onEdit,onOpen,onTransaction,accountName}) {
 const [person,setPerson]=useState(null),[search,setSearch]=useState('');
 const s=loanSummary(account,transactions,balance),receivable=account.type==='receivable';
 const selected=s.people.find(p=>p.key===person),list=s.people.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));
 const rows=selected?selected.rows:transactions.filter(t=>t.account_id===account.id||t.transfer_account_id===account.id);
 return <section className="loan-view">
  <div className="toolbar"><button className="secondary" onClick={onBack}>Accounts</button><button className="secondary" onClick={onEdit}>Edit account</button></div>
  <section className="panel loan-summary"><p>{receivable?'Outstanding receivable':'Outstanding payable'}</p><h2 className={receivable?'positive':'negative'}>{money(s.outstanding)}</h2><p className="muted">{receivable?'Money owed to you. Not available cash.':'Money you owe. Only money received enters available funds.'}</p><div className="loan-stats"><div><span>{receivable?'Total lent':'Total borrowed'}</span><strong>{money(s.advanced)}</strong></div><div><span>{receivable?'Returned':'Repaid'}</span><strong>{money(s.returned)}</strong></div><div><span>Previous balances</span><strong>{money(s.opening-s.allocated+Number(account.type==='loan'?-account.opening_balance:account.opening_balance))}</strong></div></div></section>
  <div className="quick-actions"><button className="primary" onClick={()=>onOpen(receivable?'lend':'borrow',selected?.name)}>{receivable?'+ Lend money':'+ Borrow money'}</button><button className="secondary" disabled={!s.people.some(p=>p.balance>0)} onClick={()=>onOpen(receivable?'collect':'repay',selected?.name)}>{receivable?'Record return':'Repay money'}</button></div>
  <p className="help-note">Principal movements do not count as income or expenses. Record any interest or fees separately as income or expense.</p>
  <div className="section-heading"><h2>People <span className="count">{s.people.length}</span></h2><button className="text-button" onClick={()=>onOpen('opening')}>Add previous balance</button></div>
  {s.unassigned!==0&&<div className="loan-warning">Unassigned / legacy balance: <b>{money(s.unassigned)}</b>. {s.unassigned>0&&<button className="text-button" onClick={()=>onOpen('allocate')}>Assign to a person</button>} Existing opening balances and older entries are preserved. Do not add the same balance again.</div>}
  <input className="search loan-search" aria-label="Search people" placeholder="Search people" value={search} onChange={e=>setSearch(e.target.value)}/>
  <div className="panel loan-people">{list.length?list.map(p=><button className={'loan-person '+(person===p.key?'selected':'')} key={p.key} onClick={()=>setPerson(person===p.key?null:p.key)}><span className="person-avatar">{p.name.slice(0,1).toUpperCase()}</span><span className="person-name"><strong>{p.name}</strong><small>{receivable?'Lent':'Borrowed'} {money(p.advanced)} · {receivable?'Returned':'Repaid'} {money(p.returned)}{p.opening>0?` · Previous ${money(p.opening)}`:''}</small></span><span><strong className={receivable?'positive':'negative'}>{money(p.balance)}</strong><small>Remaining</small></span></button>):<p className="muted">No people yet. Record a loan or a previous balance to start.</p>}</div>
  <div className="section-heading"><h2>{selected?selected.name+' — ledger':'Recent activity'}</h2>{selected&&<button className="text-button" onClick={()=>setPerson(null)}>Show all</button>}</div>
  <div className="panel loan-activity">{[...rows].sort((a,b)=>b.transaction_date.localeCompare(a.transaction_date)||(b.created_at||'').localeCompare(a.created_at||'')).map(t=><button className="loan-entry" key={t.id} onClick={()=>onTransaction(t)}><span><strong>{loanLabel(t)}</strong><small>{t.transaction_date} · {t.type==='transfer'?`${accountName(t.account_id)} → ${accountName(t.transfer_account_id)}`:'Previous balance · no cash movement'}{loanNote(t)?' · '+loanNote(t):''}</small></span><b>{money(t.amount)}</b></button>)}{!rows.length&&<p className="muted">Your loan activity will appear here.</p>}</div>
 </section>;
}
export function LoanFields({item,accounts,transactions,values}) {
 const loan=accounts.find(a=>a.id===item.loan_id),rec=loan.type==='receivable',s=loanSummary(loan,transactions,values[loan.id]);
 const action=item.action,isReturn=['collect','repay'].includes(action),people=isReturn?s.people.filter(p=>p.balance>0||p.name===item.person):s.people;
 return <>
 <input type="hidden" name="loan_id" value={loan.id}/><input type="hidden" name="action" value={action}/>
 <p className="muted">{loan.name}</p>
 <label>Person{isReturn?<select name="person" defaultValue={item.person||''} required><option value="" disabled>Choose a person</option>{people.map(p=><option key={p.key} value={p.name}>{p.name} — {money(p.balance)}</option>)}</select>:<input name="person" list="loan-people" required maxLength="80" placeholder="Person name (use a distinct name for each person)" defaultValue={item.person||''}/>}</label>
 <datalist id="loan-people">{people.map(p=><option key={p.key} value={p.name}/>)}</datalist>
 <label>Amount (BDT)<input name="amount" type="number" min="0.01" step="0.01" required defaultValue={item.amount||''}/></label>
 {!['opening','allocate'].includes(action)&&<label>{['lend','repay'].includes(action)?'Pay from':'Receive into'}<select name="cash_id" required defaultValue={item.cash_id||''}><option value="" disabled>Choose cash, bank or mobile banking</option>{accounts.filter(a=>['cash','bank','mobile_banking'].includes(a.type)).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}
 <label>Date<input name="transaction_date" type="date" required defaultValue={item.transaction_date}/></label>
 <label>Note (optional)<input name="note" maxLength="300" defaultValue={item.note||''}/></label>
 <p className="help-note">{action==='allocate'?'Assigns an existing unassigned balance to a person. Total balance, available funds and income/expenses stay unchanged.':action==='opening'?'Adds a previous balance for this person without changing cash or monthly income/expenses. Use only for amounts not already recorded in this account.':rec?'Lending reduces available funds. Returns increase funds only in the receiving account.':'Borrowing increases funds only in the receiving account. Repayment reduces funds.'}</p>
 </>;
}
export function loanEditItem(row) {const m=loanMeta(row);return {id:row.id,loan_id:m.loanId,action:m.action,person:m.person,amount:row.amount,cash_id:row.account_id===m.loanId?row.transfer_account_id:row.account_id,transaction_date:row.transaction_date,note:loanNote(row)};}
