begin;
alter table public.accounts add column if not exists credit_limit numeric(16,2) check (credit_limit >= 0);
grant select, insert, update on public.accounts, public.transactions to authenticated;
commit;
