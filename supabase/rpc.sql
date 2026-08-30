-- ============================================================================
-- Wealthr — RPC functions
-- Run this AFTER schema.sql, storage.sql, and accounts.sql (lending and
-- repayment transactions require a real account — see accounts.sql).
--
-- These replace what used to be Firestore batch writes on the Express
-- backend: creating a lending record and its mirrored transaction (or a
-- repayment and its mirrored transaction) needs to happen atomically, so a
-- crash mid-way never leaves a lending record without its transaction, or a
-- repayment without an updated balance. Postgres functions give us that for
-- free — no separate backend needed.
--
-- These run with SECURITY INVOKER (the default), so auth.uid() resolves to
-- the calling user's own id inside the function body — the row level
-- security policies from schema.sql still apply on every insert/update here,
-- exactly as if the client had issued the statements directly.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Create a lending/borrowing record + its mirrored transaction, atomically.
-- ---------------------------------------------------------------------------
create or replace function create_lending_with_transaction(
  p_direction text,
  p_person text,
  p_amount numeric,
  p_date timestamptz,
  p_due_date timestamptz,
  p_note text,
  p_account_id uuid
) returns lending as $$
declare
  v_uid uuid := auth.uid();
  v_lending lending;
  v_tx_type text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_direction not in ('lent', 'borrowed') then
    raise exception 'Invalid direction';
  end if;

  if p_account_id is null or not exists (select 1 from accounts where id = p_account_id and user_id = v_uid) then
    raise exception 'A valid account is required';
  end if;

  insert into lending (user_id, direction, person, amount, date, due_date, note, repaid_amount, remaining_amount, status)
  values (v_uid, p_direction, p_person, p_amount, p_date, p_due_date, p_note, 0, p_amount, 'pending')
  returning * into v_lending;

  -- Lending money out is cash leaving the account it came from; borrowing
  -- is cash landing in the account it arrived in — both are real money
  -- movement, so both require (and get) a real account. See
  -- get_account_balances() in accounts.sql for the sign convention.
  v_tx_type := case when p_direction = 'lent' then 'lend' else 'borrow' end;

  insert into transactions (user_id, type, amount, date, category, description, account_id, person, linked_lending_id)
  values (
    v_uid,
    v_tx_type,
    p_amount,
    p_date,
    'Lending & Borrowing',
    coalesce(p_note, case when p_direction = 'lent' then 'Lent to ' || p_person else 'Borrowed from ' || p_person end),
    p_account_id,
    p_person,
    v_lending.id
  );

  return v_lending;
end;
$$ language plpgsql security invoker;

-- ---------------------------------------------------------------------------
-- Record a repayment: inserts the repayment row, updates the parent lending
-- record's running totals/status, and mirrors it as a transaction — atomically.
-- ---------------------------------------------------------------------------
create or replace function add_repayment(
  p_lending_id uuid,
  p_amount numeric,
  p_date timestamptz,
  p_note text,
  p_account_id uuid,
  p_payment_mode text default 'other'
) returns lending_repayments as $$
declare
  v_uid uuid := auth.uid();
  v_lending lending;
  v_repayment lending_repayments;
  v_new_repaid numeric;
  v_tx_type text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if p_account_id is null or not exists (select 1 from accounts where id = p_account_id and user_id = v_uid) then
    raise exception 'A valid account is required';
  end if;

  select * into v_lending from lending where id = p_lending_id and user_id = v_uid for update;
  if not found then
    raise exception 'Lending record not found';
  end if;

  v_new_repaid := v_lending.repaid_amount + p_amount;
  if v_new_repaid > v_lending.amount + 0.01 then
    raise exception 'Repayment exceeds remaining amount';
  end if;

  insert into lending_repayments (lending_id, user_id, amount, date, note, payment_mode)
  values (p_lending_id, v_uid, p_amount, p_date, p_note, p_payment_mode)
  returning * into v_repayment;

  update lending
  set repaid_amount = v_new_repaid,
      remaining_amount = greatest(0, amount - v_new_repaid),
      status = case
        when v_new_repaid <= 0 then 'pending'
        when v_new_repaid >= amount then 'completed'
        else 'partially_paid'
      end
  where id = p_lending_id;

  v_tx_type := case when v_lending.direction = 'lent' then 'repayment_received' else 'repayment_made' end;

  insert into transactions (user_id, type, amount, date, category, description, payment_mode, account_id, person, linked_lending_id)
  values (
    v_uid,
    v_tx_type,
    p_amount,
    p_date,
    'Lending & Borrowing',
    case when v_tx_type = 'repayment_received' then 'Repayment from ' || v_lending.person else 'Repayment to ' || v_lending.person end,
    p_payment_mode,
    p_account_id,
    v_lending.person,
    p_lending_id
  );

  return v_repayment;
end;
$$ language plpgsql security invoker;

-- ---------------------------------------------------------------------------
-- Delete a lending record along with every transaction it mirrored.
-- Repayment rows cascade automatically via the FK on lending_repayments.
-- ---------------------------------------------------------------------------
create or replace function delete_lending_cascade(p_lending_id uuid) returns void as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from transactions where linked_lending_id = p_lending_id and user_id = v_uid;
  delete from lending where id = p_lending_id and user_id = v_uid;
end;
$$ language plpgsql security invoker;
