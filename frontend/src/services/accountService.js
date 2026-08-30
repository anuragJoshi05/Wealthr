import { supabase } from '../lib/supabaseClient';
import { getCurrentUserId } from './api';

function mapAccount(row) {
  return {
    id: row.id,
    name: row.name,
    openingBalance: Number(row.opening_balance),
    isDefault: row.is_default,
    createdAt: row.created_at,
  };
}

function mapBalance(row) {
  return {
    id: row.account_id,
    name: row.name,
    openingBalance: Number(row.opening_balance),
    balance: Number(row.balance),
    isDefault: row.is_default,
    transactionCount: row.transaction_count,
  };
}

export const accountService = {
  // Plain rows, no computed balance — used for pickers/selects where only
  // name + id + default flag matter.
  async list() {
    const uid = await getCurrentUserId();
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', uid)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data.map(mapAccount);
  },

  // Live balances, computed from the transactions ledger via
  // get_account_balances() (see supabase/accounts.sql) — never stored, so
  // it can never drift out of sync with the underlying transactions.
  async balances() {
    const { data, error } = await supabase.rpc('get_account_balances');
    if (error) throw error;
    return data.map(mapBalance);
  },

  async create({ name, openingBalance = 0, makeDefault = false }) {
    const { data, error } = await supabase.rpc('create_account', {
      p_name: name,
      p_opening_balance: openingBalance || 0,
      p_make_default: makeDefault,
    });
    if (error) throw error;
    return mapAccount(data);
  },

  async rename(id, name) {
    const { data, error } = await supabase.from('accounts').update({ name }).eq('id', id).select().single();
    if (error) throw error;
    return mapAccount(data);
  },

  async setDefault(id) {
    const { error } = await supabase.rpc('set_default_account', { p_account_id: id });
    if (error) throw error;
  },

  async remove(id) {
    const { error } = await supabase.rpc('delete_account', { p_account_id: id });
    if (error) throw error;
  },
};
