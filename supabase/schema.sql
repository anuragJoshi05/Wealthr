-- ============================================================================
-- Wealthr — Supabase schema
-- Run this once in Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. TRANSACTIONS
-- ---------------------------------------------------------------------------
create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 'refund' = money returned from a PREVIOUS expense (never income — see
  -- analyticsEngine.summarize). 'self_transfer' = moving money between two
  -- of the user's own accounts (see supabase/accounts.sql for account_id /
  -- to_account_id, added once the `accounts` table exists).
  type text not null check (type in ('income','expense','refund','self_transfer','lend','borrow','repayment_received','repayment_made')),
  amount numeric(12,2) not null check (amount > 0),
  date timestamptz not null,
  category text not null,
  subcategory text,
  description text,
  -- Informational only ("how did you pay") — decoupled from which account
  -- the money actually moved through. Nullable because self_transfer never
  -- uses it (see accounts.sql).
  payment_mode text check (payment_mode in ('upi','cash','card','bank_transfer','online','other')),
  person text,
  tags text[] default '{}',
  receipt_url text,
  linked_lending_id uuid,
  -- ------------------------------------------------------------------
  -- Expense sharing (completely separate concept from Lending & Borrowing,
  -- see supabase/sharing.sql). `amount` above ALWAYS represents only the
  -- signed-in user's own real cost for this transaction — it never
  -- includes anyone else's portion, so personal totals never double-count.
  -- ------------------------------------------------------------------
  -- Flow A — "I paid, others owe me their share": is_split = true and
  -- split_total_amount holds the full bill; each other participant's
  -- share lives in the expense_shares table, not here.
  is_split boolean not null default false,
  split_total_amount numeric(12,2),
  -- Flow B — "someone else paid my share for me": paid_by_person names
  -- who fronted the money, and share_settled tracks whether the user has
  -- paid them back yet. Null paid_by_person = the user paid it themself.
  paid_by_person text,
  share_settled boolean not null default true,
  share_settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_split_fields check (
    (is_split = false and split_total_amount is null)
    or (is_split = true and split_total_amount is not null and split_total_amount >= amount)
  ),
  constraint chk_paid_by_not_self_split check (not (is_split = true and paid_by_person is not null))
);

create index if not exists idx_transactions_user_date on transactions (user_id, date desc);
create index if not exists idx_transactions_user_type on transactions (user_id, type);
create index if not exists idx_transactions_user_category on transactions (user_id, category);
create index if not exists idx_transactions_linked_lending on transactions (linked_lending_id);
create index if not exists idx_transactions_paid_by on transactions (user_id, paid_by_person) where paid_by_person is not null;

alter table transactions enable row level security;

create policy "Users manage their own transactions"
  on transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. LENDING / BORROWING
-- ---------------------------------------------------------------------------
create table if not exists lending (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  direction text not null check (direction in ('lent','borrowed')),
  person text not null,
  amount numeric(12,2) not null check (amount > 0),
  date timestamptz not null,
  due_date timestamptz,
  note text,
  repaid_amount numeric(12,2) not null default 0,
  remaining_amount numeric(12,2) not null,
  status text not null default 'pending' check (status in ('pending','partially_paid','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lending_user_date on lending (user_id, date desc);
create index if not exists idx_lending_user_direction on lending (user_id, direction);

alter table lending enable row level security;

create policy "Users manage their own lending records"
  on lending for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. REPAYMENTS (child of lending)
-- ---------------------------------------------------------------------------
create table if not exists lending_repayments (
  id uuid primary key default gen_random_uuid(),
  lending_id uuid not null references lending(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  date timestamptz not null,
  note text,
  payment_mode text default 'other',
  created_at timestamptz not null default now()
);

create index if not exists idx_repayments_lending on lending_repayments (lending_id, date desc);

alter table lending_repayments enable row level security;

create policy "Users manage their own repayments"
  on lending_repayments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 4. BUDGETS
-- ---------------------------------------------------------------------------
create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  "limit" numeric(12,2) not null check ("limit" > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category, month)
);

create index if not exists idx_budgets_user_month on budgets (user_id, month);

alter table budgets enable row level security;

create policy "Users manage their own budgets"
  on budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 5. Keep updated_at fresh automatically
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_transactions_updated_at on transactions;
create trigger trg_transactions_updated_at
  before update on transactions
  for each row execute function set_updated_at();

drop trigger if exists trg_lending_updated_at on lending;
create trigger trg_lending_updated_at
  before update on lending
  for each row execute function set_updated_at();

drop trigger if exists trg_budgets_updated_at on budgets;
create trigger trg_budgets_updated_at
  before update on budgets
  for each row execute function set_updated_at();

-- ============================================================================
-- Done. Next: Storage bucket setup — see supabase/storage.sql
-- ============================================================================
