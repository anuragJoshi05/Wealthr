-- ============================================================================
-- Wealthr — Accounts & Self Transfer
-- Run this AFTER schema.sql and storage.sql, but BEFORE rpc.sql, people.sql,
-- and sharing.sql — those files' functions (lending, repayments, split
-- expenses) reference the `accounts` table created here.
--
-- What this file does:
--   1. Introduces a first-class `accounts` table (e.g. "HDFC Bank", "Cash
--      Wallet", "Amazon Pay"). Every income / expense / refund / lend /
--      borrow / repayment transaction now belongs to exactly one account.
--   2. Replaces the old payment-mode-to-payment-mode "transfer" concept with
--      a proper Self Transfer: from_account -> to_account, same user, never
--      income or expense, never changes total money across all accounts.
--   3. Adds a dedicated `refund` transaction type. A refund is money coming
--      back from a previous expense — it is NEVER counted as income, and it
--      reduces *effective* expense instead.
--   4. Migrates existing data losslessly: every historical payment_mode
--      becomes a real account (per user), every transaction is backfilled
--      to point at the right account(s), and old 'transfer' rows become
--      'self_transfer' rows with real from/to accounts.
--
-- Idempotent: safe to run multiple times, and safe on both a brand-new
-- database and an existing Wealthr database that already has data.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. ACCOUNTS TABLE
-- ---------------------------------------------------------------------------
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  -- The balance the user reports as "currently in this account" at the
  -- moment they add it. Every transaction against this account afterwards
  -- is applied on top of this starting point (see get_account_balances()),
  -- so the live balance never needs a separate running-total column that
  -- could drift out of sync.
  opening_balance numeric(12,2) not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists idx_accounts_user on accounts (user_id);
create unique index if not exists idx_accounts_one_default_per_user
  on accounts (user_id) where is_default;

alter table accounts enable row level security;

drop policy if exists "Users manage their own accounts" on accounts;
create policy "Users manage their own accounts"
  on accounts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists trg_accounts_updated_at on accounts;
create trigger trg_accounts_updated_at
  before update on accounts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. MIGRATE EXISTING DATA — create real accounts from historical
--    payment_mode / to_payment_mode values, one set per user, before we
--    touch the transactions table at all.
-- ---------------------------------------------------------------------------
do $$
declare
  v_mode_label jsonb := '{
    "upi": "UPI", "cash": "Cash", "card": "Card",
    "bank_transfer": "Bank Transfer", "online": "Online", "other": "Other"
  }'::jsonb;
begin
  if exists (select 1 from information_schema.columns where table_name = 'transactions' and column_name = 'payment_mode') then
    insert into accounts (user_id, name)
    select distinct t.user_id, coalesce(v_mode_label ->> t.payment_mode, initcap(t.payment_mode))
    from transactions t
    where t.payment_mode is not null
    on conflict (user_id, name) do nothing;

    if exists (select 1 from information_schema.columns where table_name = 'transactions' and column_name = 'to_payment_mode') then
      insert into accounts (user_id, name)
      select distinct t.user_id, coalesce(v_mode_label ->> t.to_payment_mode, initcap(t.to_payment_mode))
      from transactions t
      where t.to_payment_mode is not null
      on conflict (user_id, name) do nothing;
    end if;
  end if;
end $$;

-- Every user who has at least one account but none marked default gets one
-- (prefers an account literally named "Cash", falling back to the oldest).
do $$
declare
  v_user record;
  v_account_id uuid;
begin
  for v_user in
    select distinct a.user_id
    from accounts a
    where not exists (select 1 from accounts d where d.user_id = a.user_id and d.is_default)
  loop
    select id into v_account_id from accounts
    where user_id = v_user.user_id
    order by (name = 'Cash') desc, created_at asc
    limit 1;

    update accounts set is_default = true where id = v_account_id;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 3. TRANSACTIONS — add account columns, backfill, then enforce constraints.
-- ---------------------------------------------------------------------------
alter table transactions add column if not exists account_id uuid references accounts(id);
alter table transactions add column if not exists to_account_id uuid references accounts(id);

-- Backfill account_id from the transaction's own payment_mode.
update transactions t
set account_id = a.id
from accounts a
where t.account_id is null
  and t.payment_mode is not null
  and a.user_id = t.user_id
  and a.name = coalesce(
    ('{"upi":"UPI","cash":"Cash","card":"Card","bank_transfer":"Bank Transfer","online":"Online","other":"Other"}'::jsonb ->> t.payment_mode),
    initcap(t.payment_mode)
  );

-- Any remaining rows with no payment_mode at all fall back to the user's
-- default account, so account_id is never left null.
update transactions t
set account_id = d.id
from accounts d
where t.account_id is null
  and d.user_id = t.user_id
  and d.is_default;

-- Backfill to_account_id for legacy 'transfer' rows from to_payment_mode.
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'transactions' and column_name = 'to_payment_mode') then
    update transactions t
    set to_account_id = a.id
    from accounts a
    where t.type = 'transfer'
      and t.to_account_id is null
      and t.to_payment_mode is not null
      and a.user_id = t.user_id
      and a.name = coalesce(
        ('{"upi":"UPI","cash":"Cash","card":"Card","bank_transfer":"Bank Transfer","online":"Online","other":"Other"}'::jsonb ->> t.to_payment_mode),
        initcap(t.to_payment_mode)
      );
  end if;
end $$;

-- Legacy transfers that still have no distinguishable to_account (e.g. same
-- mode on both sides from old data) get routed through the default account
-- pair so the not-null / different-accounts constraints below never fail.
update transactions t
set to_account_id = d.id
from accounts d
where t.type = 'transfer'
  and (t.to_account_id is null or t.to_account_id = t.account_id)
  and d.user_id = t.user_id
  and d.is_default
  and d.id <> t.account_id;

-- Rename the old free-form 'transfer' type to the new 'self_transfer' type.
update transactions set type = 'self_transfer' where type = 'transfer';

-- Introduce 'refund' and 'self_transfer' into the allowed type set.
alter table transactions drop constraint if exists transactions_type_check;
alter table transactions add constraint transactions_type_check
  check (type in ('income','expense','refund','self_transfer','lend','borrow','repayment_received','repayment_made'));

-- payment_mode is now purely informational ("how did you pay") and no
-- longer the source of truth for money movement — self_transfer no longer
-- uses it at all, so it must be nullable.
alter table transactions alter column payment_mode drop not null;

-- to_payment_mode is fully superseded by to_account_id.
alter table transactions drop column if exists to_payment_mode;
drop index if exists idx_transactions_to_payment_mode;

-- Every transaction must have an account now that backfill is complete.
alter table transactions alter column account_id set not null;

alter table transactions drop constraint if exists chk_self_transfer_accounts;
alter table transactions add constraint chk_self_transfer_accounts check (
  (type = 'self_transfer' and to_account_id is not null and to_account_id <> account_id)
  or (type <> 'self_transfer' and to_account_id is null)
);

create index if not exists idx_transactions_account on transactions (account_id);
create index if not exists idx_transactions_to_account on transactions (to_account_id) where to_account_id is not null;

-- ---------------------------------------------------------------------------
-- 4. ACCOUNT MANAGEMENT RPCs — atomic create / default-switch / delete.
-- ---------------------------------------------------------------------------

-- Creates an account and, if it's the user's very first one (or the caller
-- asked for it explicitly), atomically makes it the default — clearing any
-- previous default in the same statement so the "only one default" rule
-- (see idx_accounts_one_default_per_user) is never violated mid-way.
create or replace function create_account(
  p_name text,
  p_opening_balance numeric default 0,
  p_make_default boolean default false
) returns accounts as $$
declare
  v_uid uuid := auth.uid();
  v_account accounts;
  v_is_first boolean;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_name is null or char_length(trim(p_name)) = 0 then
    raise exception 'Account name is required';
  end if;

  select not exists (select 1 from accounts where user_id = v_uid) into v_is_first;

  if v_is_first or p_make_default then
    update accounts set is_default = false where user_id = v_uid and is_default;
  end if;

  insert into accounts (user_id, name, opening_balance, is_default)
  values (v_uid, trim(p_name), coalesce(p_opening_balance, 0), v_is_first or p_make_default)
  returning * into v_account;

  return v_account;
exception
  when unique_violation then
    raise exception 'You already have an account named "%"', trim(p_name);
end;
$$ language plpgsql security invoker;

-- Atomically switches the default account.
create or replace function set_default_account(p_account_id uuid) returns void as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (select 1 from accounts where id = p_account_id and user_id = v_uid) then
    raise exception 'Account not found';
  end if;

  update accounts set is_default = false where user_id = v_uid and is_default and id <> p_account_id;
  update accounts set is_default = true where id = p_account_id and user_id = v_uid;
end;
$$ language plpgsql security invoker;

-- Deletes an account. Refuses if any transaction still references it (as
-- either its account or a self-transfer destination) so a transaction can
-- never end up without a valid, mandatory account.
create or replace function delete_account(p_account_id uuid) returns void as $$
declare
  v_uid uuid := auth.uid();
  v_in_use integer;
  v_was_default boolean;
  v_next uuid;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select count(*) into v_in_use from transactions
  where user_id = v_uid and (account_id = p_account_id or to_account_id = p_account_id);

  if v_in_use > 0 then
    raise exception 'This account has % transaction(s) on it. Move or delete them first.', v_in_use;
  end if;

  select is_default into v_was_default from accounts where id = p_account_id and user_id = v_uid;
  if v_was_default is null then
    raise exception 'Account not found';
  end if;

  delete from accounts where id = p_account_id and user_id = v_uid;

  if v_was_default then
    select id into v_next from accounts where user_id = v_uid order by created_at asc limit 1;
    if v_next is not null then
      update accounts set is_default = true where id = v_next;
    end if;
  end if;
end;
$$ language plpgsql security invoker;

-- Records a Self Transfer as a single atomic transaction row. Balance is
-- computed live from account_id (-amount) and to_account_id (+amount) by
-- get_account_balances() below, so total money across all accounts is
-- mathematically unchanged by construction — no separate balance writes
-- needed, and nothing to desync.
create or replace function create_self_transfer(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_date timestamptz,
  p_description text default null
) returns transactions as $$
declare
  v_uid uuid := auth.uid();
  v_tx transactions;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  if p_from_account_id = p_to_account_id then
    raise exception 'Pick two different accounts to transfer between';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter a valid amount';
  end if;
  if not exists (select 1 from accounts where id = p_from_account_id and user_id = v_uid) then
    raise exception 'Source account not found';
  end if;
  if not exists (select 1 from accounts where id = p_to_account_id and user_id = v_uid) then
    raise exception 'Destination account not found';
  end if;

  insert into transactions (user_id, type, amount, date, category, description, account_id, to_account_id)
  values (v_uid, 'self_transfer', p_amount, p_date, 'Self Transfer', p_description, p_from_account_id, p_to_account_id)
  returning * into v_tx;

  return v_tx;
end;
$$ language plpgsql security invoker;

-- ---------------------------------------------------------------------------
-- 5. LIVE ACCOUNT BALANCES — same "compute from source of truth" pattern
--    as get_people_balances() / get_people_sharing_balances(), so a balance
--    can never drift out of sync with the underlying transactions.
--
--    Sign convention:
--      +amount : income, refund, repayment_received, borrow, self_transfer (destination leg)
--      -amount : expense, lend, repayment_made, self_transfer (source leg)
--    Refunds add cash back to the account but are excluded from `income`
--    everywhere else in the app (see analyticsEngine.js) — this function
--    only cares about actual money movement, not income/expense labelling.
-- ---------------------------------------------------------------------------
create or replace function get_account_balances()
returns table (
  account_id uuid,
  name text,
  opening_balance numeric,
  balance numeric,
  is_default boolean,
  transaction_count integer
) as $$
  with flows as (
    select
      t.account_id as acc,
      case
        when t.type in ('income', 'refund', 'repayment_received', 'borrow') then t.amount
        when t.type in ('expense', 'lend', 'repayment_made', 'self_transfer') then -t.amount
        else 0
      end as delta
    from transactions t
    where t.user_id = auth.uid()
    union all
    select t.to_account_id as acc, t.amount as delta
    from transactions t
    where t.user_id = auth.uid() and t.type = 'self_transfer'
  )
  select
    a.id,
    a.name,
    a.opening_balance,
    a.opening_balance + coalesce(sum(f.delta), 0) as balance,
    a.is_default,
    count(f.delta)::integer as transaction_count
  from accounts a
  left join flows f on f.acc = a.id
  where a.user_id = auth.uid()
  group by a.id, a.name, a.opening_balance, a.is_default
  order by a.is_default desc, a.created_at asc;
$$ language sql security invoker stable;
