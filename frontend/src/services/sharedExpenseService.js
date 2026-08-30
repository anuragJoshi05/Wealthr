import { supabase } from '../lib/supabaseClient';
import { getCurrentUserId } from './api';

function mapShare(row) {
  return {
    id: row.id,
    transactionId: row.transaction_id,
    person: row.person,
    amount: Number(row.amount),
    settled: row.settled,
    settledAt: row.settled_at,
    createdAt: row.created_at,
  };
}

function mapBalance(row) {
  return {
    person: row.person,
    sharesOwedToYou: Number(row.shares_owed_to_you),
    sharesYouOwe: Number(row.shares_you_owe),
    openShares: row.open_shares,
    lastActivity: row.last_activity,
  };
}

export const sharedExpenseService = {
  // Flow A — create a transaction for the user's own share of a bill, plus
  // one expense_shares row per other participant who still owes theirs.
  async createSplit(payload) {
    const { data, error } = await supabase.rpc('create_split_expense', {
      p_amount: payload.amount,
      p_split_total: payload.splitTotal,
      p_date: payload.date,
      p_category: payload.category,
      p_subcategory: payload.subcategory || null,
      p_description: payload.description || null,
      p_payment_mode: payload.paymentMode,
      p_tags: payload.tags || [],
      p_shares: payload.shares.map((s) => ({ person: s.person, amount: s.amount })),
      p_account_id: payload.accountId,
    });
    if (error) throw error;
    return data;
  },

  // All shares for one transaction (Flow A), most recent first.
  async listSharesForTransaction(transactionId) {
    const { data, error } = await supabase
      .from('expense_shares')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data.map(mapShare);
  },

  // Every share owed to the user by one person, across all their split bills.
  async listSharesForPerson(person) {
    const uid = await getCurrentUserId();
    const { data, error } = await supabase
      .from('expense_shares')
      .select('*, transactions(date, category, description)')
      .eq('user_id', uid)
      .eq('person', person)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((row) => ({
      ...mapShare(row),
      transactionDate: row.transactions?.date,
      transactionCategory: row.transactions?.category,
      transactionDescription: row.transactions?.description,
    }));
  },

  async setShareSettled(shareId, settled) {
    const { data, error } = await supabase.rpc('set_share_settled', {
      p_share_id: shareId,
      p_settled: settled,
    });
    if (error) throw error;
    return mapShare(data);
  },

  // Flow B — mark "someone paid my share" as paid back.
  async setTransactionShareSettled(transactionId, settled) {
    const { error } = await supabase.rpc('set_transaction_share_settled', {
      p_transaction_id: transactionId,
      p_settled: settled,
    });
    if (error) throw error;
  },

  // Every Flow-B transaction (someone else fronted the user's share) for one person.
  async listFrontedForPerson(person) {
    const uid = await getCurrentUserId();
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', uid)
      .eq('paid_by_person', person)
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  // Net sharing balance per person — deliberately separate from
  // peopleService.balances() (lending).
  async balances() {
    const { data, error } = await supabase.rpc('get_people_sharing_balances');
    if (error) throw error;
    return data.map(mapBalance);
  },
};
