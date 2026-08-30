import { supabase } from '../lib/supabaseClient';
import { getCurrentUserId } from './api';

function mapPerson(row) {
  return { id: row.id, name: row.name, notes: row.notes || '', createdAt: row.created_at };
}

function mapBalance(row) {
  return {
    person: row.person,
    totalLent: Number(row.total_lent),
    totalBorrowed: Number(row.total_borrowed),
    outstandingReceivable: Number(row.outstanding_receivable),
    outstandingPayable: Number(row.outstanding_payable),
    netBalance: Number(row.net_balance),
    openRecords: row.open_records,
    lastActivity: row.last_activity,
  };
}

export const peopleService = {
  async list() {
    const uid = await getCurrentUserId();
    const { data, error } = await supabase
      .from('people')
      .select('*')
      .eq('user_id', uid)
      .order('name', { ascending: true });
    if (error) throw error;
    return data.map(mapPerson);
  },

  // Creates the person if they don't already exist (case-sensitive match on
  // name), otherwise silently no-ops. Used so typing a new name into the
  // Lending form's person field "just works" without a separate add step.
  async getOrCreate(name) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const uid = await getCurrentUserId();
    const { data, error } = await supabase
      .from('people')
      .upsert({ user_id: uid, name: trimmed }, { onConflict: 'user_id,name', ignoreDuplicates: true })
      .select()
      .maybeSingle();
    if (error) throw error;
    return data ? mapPerson(data) : null;
  },

  async remove(id) {
    const { error } = await supabase.from('people').delete().eq('id', id);
    if (error) throw error;
  },

  // Net balance per person, computed live from the lending table via the
  // get_people_balances() Postgres function (supabase/people.sql).
  async balances() {
    const { data, error } = await supabase.rpc('get_people_balances');
    if (error) throw error;
    return data.map(mapBalance);
  },
};
