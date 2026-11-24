begin;
alter table public.accounts
  add column if not exists last_billing_date date,
  add column if not exists next_cycle_end_date date,
  add column if not exists next_payment_due_date date,
  add column if not exists statement_due_amount numeric(16,2) not null default 0
    check (statement_due_amount >= 0);
commit;
