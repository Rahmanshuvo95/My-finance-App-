export function accountBrand(account) {
 const name=(account.name||'').toLowerCase().replace(/[^a-z0-9\u0980-\u09ff]/g,'');
 if(account.type==='credit_card' && (name.includes('amex') || name.includes('americanexpress'))) return 'amex';
 if(name.includes('citybank')||name.includes('cityamex')||name.startsWith('amex')||name.includes('সিটিব্যাংক'))return 'city';
 if(name.includes('bkash')||name.includes('বিকাশ'))return 'bkash';
 if(name.includes('sebl')||name.includes('southeast')||name.includes('সাউথইস্ট'))return 'sebl';
 return account.type||'bank';
}
