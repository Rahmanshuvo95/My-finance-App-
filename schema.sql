-- Non-destructive upgrade for the original accounts / transactions schema.
begin;
create table if not exists public.accounts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null, type text not null, opening_balance numeric(16,2) not null default 0, created_at timestamptz not null default now()
);
create table if not exists public.transactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 account_id uuid not null references public.accounts(id), type text not null check(type in ('income','expense','transfer')),
 category text, amount numeric(16,2) not null check(amount>0), note text, transaction_date date not null default current_date, created_at timestamptz not null default now()
);
alter table public.accounts drop constraint if exists accounts_type_check;
alter table public.accounts add constraint accounts_type_check check(type in ('cash','bank','mobile_banking','credit_card','savings','loan','receivable'));
alter table public.transactions add column if not exists transfer_account_id uuid references public.accounts(id);
do $$ begin
 if exists(select 1 from public.transactions where type='transfer' and transfer_account_id is null) then
  raise exception 'Existing transfer entries need destinations before upgrading. No changes have been committed.';
 end if;
end $$;
alter table public.transactions drop constraint if exists transactions_transfer_check;
alter table public.transactions add constraint transactions_transfer_check check (
 (type='transfer' and transfer_account_id is not null and transfer_account_id<>account_id) or
 (type<>'transfer' and transfer_account_id is null)
);
alter table public.accounts enable row level security;
alter table public.accounts add column if not exists credit_limit numeric(16,2) check (credit_limit >= 0);
alter table public.accounts add column if not exists last_billing_date date;
alter table public.accounts add column if not exists next_cycle_end_date date;
alter table public.accounts add column if not exists next_payment_due_date date;
alter table public.accounts add column if not exists statement_due_amount numeric(16,2) not null default 0 check (statement_due_amount >= 0);
grant select, insert, update on public.accounts, public.transactions to authenticated;
alter table public.transactions enable row level security;
drop policy if exists "Own accounts" on public.accounts;
create policy "Own accounts" on public.accounts for all to authenticated
 using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists "Own transactions" on public.transactions;
create policy "Own transactions" on public.transactions for all to authenticated
 using(user_id=(select auth.uid()))
 with check(user_id=(select auth.uid())
 and exists(select 1 from public.accounts a where a.id=account_id and a.user_id=(select auth.uid()))
 and (transfer_account_id is null or exists(select 1 from public.accounts a where a.id=transfer_account_id and a.user_id=(select auth.uid()))));
-- Changing an account's owner would invalidate old transaction ownership.
create or replace function public.ift_keep_account_owner() returns trigger
language plpgsql set search_path='' as $$ begin
 if new.user_id is distinct from old.user_id then raise exception 'Account ownership cannot be changed'; end if;
 return new;
end $$;
drop trigger if exists ift_keep_account_owner on public.accounts;
create trigger ift_keep_account_owner before update on public.accounts for each row execute function public.ift_keep_account_owner();
create index if not exists ift_accounts_user_idx on public.accounts(user_id);
create index if not exists ift_transactions_user_date_idx on public.transactions(user_id,transaction_date desc,id desc);
create index if not exists ift_transactions_source_idx on public.transactions(account_id);
create index if not exists ift_transactions_destination_idx on public.transactions(transfer_account_id);
commit;
select 'IFT schema ready: ownership enforced, transfers atomic, loans and receivables enabled.' as status;
