-- ============================================================================
-- Wealthr — Expense Sharing (split expenses)
-- Run this AFTER schema.sql, storage.sql, accounts.sql, rpc.sql and people.sql
--
-- This is a DELIBERATELY separate concept from Lending & Borrowing
-- (supabase/rpc.sql / lending table). Lending is a loan: money moves from
-- one person to another with an expectation of full repayment. Sharing is
-- a single expense event whose cost is split between people at the moment
-- it happened — nobody "lent" anybody anything, they just each owe their
-- own slice of one bill.
--
-- Two flows, both represented on the `transactions` row itself
-- (see schema.sql), plus this table for the "other people's shares" list:
--
--  Flow A — "I paid the full bill, others owe me their share"
--    transactions.is_split = true, amount = MY share only,
--    split_total_amount = the full bill. Every other participant's slice
--    is a row here in expense_shares, unsettled until marked otherwise.
--
--  Flow B — "someone else paid my share for me"
--    A plain transaction row with paid_by_person set to who fronted it
--    and share_settled = false until the user pays them back. No row is
--    needed here — it's fully described by the transaction itself.
-- ============================================================================

-- ============================================================================
-- Migration safety net for existing installations: schema.sql's
-- `create table if not exists transactions (...)` will NOT add the new
-- sharing columns to a transactions table that already exists (Postgres
-- only creates the table if missing — it never retrofits columns). These
-- ADD COLUMN IF NOT EXISTS statements make it safe to apply this file to
-- either a brand-new database or an existing Wealthr database.
--
-- Note: `to_payment_mode` is NOT part of this — that column belonged to
-- the old free-form "transfer" type and is fully superseded by
-- `to_account_id` (see accounts.sql, which runs before this file and
-- drops to_payment_mode for good). Re-adding it here would silently
-- resurrect a deprecated, unused column on every fresh install.
-- ============================================================================
alter table transactions add column if not exists is_split boolean not null default false;
alter table transactions add column if not exists split_total_amount numeric(12,2);
alter table transactions add column if not exists paid_by_person text;
alter table transactions add column if not exists share_settled boolean not null default true;
alter table transactions add column if not exists share_settled_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chk_split_fields') then
    alter table transactions add constraint chk_split_fields check (
      (is_split = false and split_total_amount is null)
      or (is_split = true and split_total_amount is not null and split_total_amount >= amount)
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'chk_paid_by_not_self_split') then
    alter table transactions add constraint chk_paid_by_not_self_split check (
      not (is_split = true and paid_by_person is not null)
    );
  end if;
end $$;

create index if not exists idx_transactions_paid_by on transactions (user_id, paid_by_person) where paid_by_person is not null;

create table if not exists expense_shares (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  person text not null,
  amount numeric(12,2) not null check (amount > 0),
  settled boolean not null default false,
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_shares_transaction on expense_shares (transaction_id);
create index if not exists idx_shares_user_person on expense_shares (user_id, person);
create index if not exists idx_shares_user_settled on expense_shares (user_id, settled);

alter table expense_shares enable row level security;

create policy "Users manage their own expense shares"
  on expense_shares for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Create a split expense + all participant shares atomically (Flow A).
-- p_shares is a jsonb array like [{"person":"Alice","amount":100}, ...] —
-- one entry per OTHER participant. The signed-in user's own share is
-- p_my_amount and becomes transactions.amount directly.
-- ---------------------------------------------------------------------------
create or replace function create_split_expense(
  p_amount numeric,          -- the user's own share (what actually leaves their pocket)
  p_split_total numeric,     -- the full bill
  p_date timestamptz,
  p_category text,
  p_subcategory text,
  p_description text,
  p_payment_mode text,
  p_tags text[],
  p_shares jsonb,
  p_account_id uuid
) returns transactions as $$
declare
  v_uid uuid := auth.uid();
  v_tx transactions;
  v_share jsonb;
  v_shares_total numeric := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Your share must be greater than zero';
  end if;

  if p_account_id is null or not exists (select 1 from accounts where id = p_account_id and user_id = v_uid) then
    raise exception 'A valid account is required';
  end if;

  for v_share in select * from jsonb_array_elements(coalesce(p_shares, '[]'::jsonb))
  loop
    v_shares_total := v_shares_total + (v_share->>'amount')::numeric;
  end loop;

  if abs((p_amount + v_shares_total) - p_split_total) > 0.02 then
    raise exception 'Shares (%) plus your amount (%) must add up to the total bill (%)',
      v_shares_total, p_amount, p_split_total;
  end if;

  -- Only the user's own share actually leaves their account — the full
  -- bill amount never touches `amount`/the account balance, matching the
  -- existing rule that `amount` always reflects the signed-in user's own
  -- real cost (see schema.sql).
  insert into transactions (
    user_id, type, amount, date, category, subcategory, description,
    payment_mode, account_id, tags, is_split, split_total_amount
  ) values (
    v_uid, 'expense', p_amount, p_date, p_category, p_subcategory, p_description,
    p_payment_mode, p_account_id, coalesce(p_tags, '{}'), true, p_split_total
  ) returning * into v_tx;

  for v_share in select * from jsonb_array_elements(coalesce(p_shares, '[]'::jsonb))
  loop
    insert into expense_shares (transaction_id, user_id, person, amount)
    values (v_tx.id, v_uid, v_share->>'person', (v_share->>'amount')::numeric);
  end loop;

  return v_tx;
end;
$$ language plpgsql security invoker;

-- ---------------------------------------------------------------------------
-- Toggle a single participant's share settled/unsettled (Flow A).
-- ---------------------------------------------------------------------------
create or replace function set_share_settled(p_share_id uuid, p_settled boolean)
returns expense_shares as $$
declare
  v_uid uuid := auth.uid();
  v_share expense_shares;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  update expense_shares
  set settled = p_settled,
      settled_at = case when p_settled then now() else null end
  where id = p_share_id and user_id = v_uid
  returning * into v_share;

  if not found then
    raise exception 'Share not found';
  end if;

  return v_share;
end;
$$ language plpgsql security invoker;

-- ---------------------------------------------------------------------------
-- Mark a Flow-B transaction (someone else paid the user's share) settled —
-- i.e. the user has now paid that person back for fronting the expense.
-- ---------------------------------------------------------------------------
create or replace function set_transaction_share_settled(p_transaction_id uuid, p_settled boolean)
returns transactions as $$
declare
  v_uid uuid := auth.uid();
  v_tx transactions;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  update transactions
  set share_settled = p_settled,
      share_settled_at = case when p_settled then now() else null end
  where id = p_transaction_id and user_id = v_uid and paid_by_person is not null
  returning * into v_tx;

  if not found then
    raise exception 'Transaction not found or is not a shared expense someone else paid';
  end if;

  return v_tx;
end;
$$ language plpgsql security invoker;

-- ---------------------------------------------------------------------------
-- Per-person shared-expense balances, computed live — kept entirely
-- separate from get_people_balances() (lending) in people.sql. Positive
-- shares_owed_to_you = they still owe you for bills you fronted; positive
-- shares_you_owe = you still owe them for bills they fronted for you.
-- ---------------------------------------------------------------------------
create or replace function get_people_sharing_balances()
returns table (
  person text,
  shares_owed_to_you numeric,
  shares_you_owe numeric,
  open_shares integer,
  last_activity timestamptz
) as $$
  with owed_to_you as (
    select s.person, s.amount, s.settled, s.created_at
    from expense_shares s
    where s.user_id = auth.uid()
  ),
  you_owe as (
    select t.paid_by_person as person, t.amount, t.share_settled as settled, t.created_at
    from transactions t
    where t.user_id = auth.uid() and t.paid_by_person is not null
  ),
  combined as (
    select person, amount, settled, created_at, 'owed_to_you' as kind from owed_to_you
    union all
    select person, amount, settled, created_at, 'you_owe' as kind from you_owe
  )
  select
    person,
    coalesce(sum(amount) filter (where kind = 'owed_to_you' and not settled), 0) as shares_owed_to_you,
    coalesce(sum(amount) filter (where kind = 'you_owe' and not settled), 0) as shares_you_owe,
    count(*) filter (where not settled)::integer as open_shares,
    max(created_at) as last_activity
  from combined
  group by person
  order by max(created_at) desc;
$$ language sql security invoker stable;
