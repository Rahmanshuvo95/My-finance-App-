import test from 'node:test';
import assert from 'node:assert/strict';
import {categoryInsights} from './insights.js';
test('category analytics isolate month and type, exclude transfers, and preserve cents',()=>{
 const rows=[
  {type:'expense',transaction_date:'2026-11-01',category:'Food',amount:10.25},
  {type:'expense',transaction_date:'2026-11-12',category:'Food',amount:5.15},
  {type:'expense',transaction_date:'2026-11-12',category:'Travel',amount:15.4},
  {type:'income',transaction_date:'2026-11-01',category:'Salary',amount:100},
  {type:'transfer',transaction_date:'2026-11-01',category:'Food',amount:500},
  {type:'expense',transaction_date:'2026-10-01',category:'Food',amount:300}
 ];
 const expenses=categoryInsights(rows,'2026-11','expense');
 assert.equal(expenses.total,30.8);
 assert.deepEqual(expenses.categories.map(c=>[c.name,c.amount,c.share]),[['Food',15.4,50],['Travel',15.4,50]]);
 assert.equal(categoryInsights(rows,'2026-11','income').total,100);
 assert.deepEqual(categoryInsights(rows,'2027-01','expense'),{total:0,categories:[]});
});
