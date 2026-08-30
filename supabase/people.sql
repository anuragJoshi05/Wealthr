-- ============================================================================
-- Wealthr — People (payees) table
-- Run this AFTER schema.sql, storage.sql, and rpc.sql
--
-- Lets a person save a named contact once, then track a running net balance
-- with them across every lend/borrow record — instead of only seeing one
-- loan at a time. "Net balance" = sum of what they owe you minus what you
-- owe them, computed live from the `lending` table (see rpc function below),
-- so it never drifts out of sync with the underlying records.
-- ============================================================================

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists idx_people_user on people (user_id);

alter table people enable row level security;

create policy "Users manage their own people"
  on people for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Returns one row per distinct person who appears in `lending`, with their
-- lifetime totals and current net balance. Positive net_balance means they
-- owe you; negative means you owe them. Computed on the fly from `lending`
-- (the source of truth), so it's always accurate even if records are edited
-- or deleted after the fact.
-- ---------------------------------------------------------------------------
create or replace function get_people_balances()
returns table (
  person text,
  total_lent numeric,
  total_borrowed numeric,
  outstanding_receivable numeric,
  outstanding_payable numeric,
  net_balance numeric,
  open_records integer,
  last_activity timestamptz
) as $$
  select
    person,
    coalesce(sum(amount) filter (where direction = 'lent'), 0) as total_lent,
    coalesce(sum(amount) filter (where direction = 'borrowed'), 0) as total_borrowed,
    coalesce(sum(remaining_amount) filter (where direction = 'lent'), 0) as outstanding_receivable,
    coalesce(sum(remaining_amount) filter (where direction = 'borrowed'), 0) as outstanding_payable,
    coalesce(sum(remaining_amount) filter (where direction = 'lent'), 0)
      - coalesce(sum(remaining_amount) filter (where direction = 'borrowed'), 0) as net_balance,
    count(*) filter (where status != 'completed')::integer as open_records,
    max(date) as last_activity
  from lending
  where user_id = auth.uid()
  group by person
  order by max(date) desc;
$$ language sql security invoker stable;
