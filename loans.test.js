import test from 'node:test';
import assert from 'node:assert/strict';
import {balances,totals} from './ledger.js';
import {fundSummary} from './card-balances.js';
import {loanSummary,loanPayload} from './loans.js';
import {categoryInsights} from './insights.js';
const accounts=[{id:'cash',type:'cash',opening_balance:50000},{id:'r',type:'receivable',opening_balance:0},{id:'p',type:'loan',opening_balance:0}];
const form=(loan_id,action,amount,person='Rahim')=>({loan_id,action,amount,person,cash_id:'cash',note:'Test',transaction_date:'2026-11-22'});
function append(rows,f){const p=loanPayload(f,accounts,rows,balances(accounts,rows));return [...rows,{...p,id:String(rows.length)}];}
test('lending and partial returns update cash and person totals without recording income',()=>{
 let rows=append([],form('r','lend',10000));rows=append(rows,form('r','lend',5000,'Karim'));rows=append(rows,form('r','collect',3000));
 const values=balances(accounts,rows),s=loanSummary(accounts[1],rows,values.r);
 assert.equal(values.cash,38000);assert.equal(s.outstanding,12000);assert.equal(s.people[0].balance,7000);assert.equal(s.unassigned,0);assert.deepEqual(totals(rows,'2026-11'),{income:0,expense:0});assert.equal(fundSummary(accounts,values).available,38000);
 assert.throws(()=>append(rows,form('r','collect',7001)));
});
test('borrowing and repayment move actual funds and reduce the correct liability',()=>{
 let rows=append([],form('p','borrow',20000));rows=append(rows,form('p','repay',5000));const v=balances(accounts,rows);
 assert.equal(v.cash,65000);assert.equal(v.p,-15000);assert.equal(loanSummary(accounts[2],rows,v.p).people[0].balance,15000);assert.equal(fundSummary(accounts,v).otherDebt,15000);assert.deepEqual(totals(rows,'2026-11'),{income:0,expense:0});
});
test('previous balances do not change available funds or analytics for either side',()=>{
 let rows=append([],form('r','opening',10000));rows=append(rows,form('p','opening',20000));const v=balances(accounts,rows);
 assert.deepEqual(v,{cash:50000,r:10000,p:-20000});assert.deepEqual(totals(rows,'2026-11'),{income:0,expense:0});assert.equal(categoryInsights(rows,'2026-11','income').total,0);assert.equal(categoryInsights(rows,'2026-11','expense').total,0);
 rows=append(rows,form('r','collect',1000));assert.equal(balances(accounts,rows).cash,51000);
});
test('editing a lending entry cannot erase amounts already repaid',()=>{
 let rows=append([],form('r','lend',10000));rows=append(rows,form('r','collect',8000));assert.throws(()=>loanPayload(form('r','lend',7000),accounts,rows,{},rows[0]));
});
test('same normalized person groups together and legacy balances remain visible',()=>{
 let rows=append([],form('r','lend',100,' Rahim  '));rows=append(rows,form('r','lend',200,'rahim'));const s=loanSummary({...accounts[1],opening_balance:500},rows,800);assert.equal(s.people.length,1);assert.equal(s.people[0].balance,300);assert.equal(s.unassigned,500);
});
