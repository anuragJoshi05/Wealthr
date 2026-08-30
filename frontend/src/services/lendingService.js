import { supabase } from '../lib/supabaseClient';
import { getCurrentUserId } from './api';

function mapRow(row) {
  return {
    id: row.id,
    direction: row.direction,
    person: row.person,
    amount: Number(row.amount),
    date: row.date,
    dueDate: row.due_date || null,
    note: row.note || '',
    repaidAmount: Number(row.repaid_amount),
    remainingAmount: Number(row.remaining_amount),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRepayment(row) {
  return {
    id: row.id,
    amount: Number(row.amount),
    date: row.date,
    note: row.note || '',
    paymentMode: row.payment_mode,
    createdAt: row.created_at,
  };
}

export const lendingService = {
  async list(params = {}) {
    const uid = await getCurrentUserId();
    let q = supabase.from('lending').select('*').eq('user_id', uid);
    if (params.direction) q = q.eq('direction', params.direction);
    if (params.person) q = q.eq('person', params.person);
    q = q.order('date', { ascending: false });

    const { data, error } = await q;
    if (error) throw error;

    let items = data.map(mapRow);
    if (params.status) items = items.filter((i) => i.status === params.status);
    return { items };
  },

  async get(id) {
    const [{ data: lending, error: lendErr }, { data: repayments, error: repayErr }] = await Promise.all([
      supabase.from('lending').select('*').eq('id', id).single(),
      supabase.from('lending_repayments').select('*').eq('lending_id', id).order('date', { ascending: false }),
    ]);
    if (lendErr) throw lendErr;
    if (repayErr) throw repayErr;
    return { ...mapRow(lending), repayments: repayments.map(mapRepayment) };
  },

  async create(payload) {
    const { data, error } = await supabase.rpc('create_lending_with_transaction', {
      p_direction: payload.direction,
      p_person: payload.person,
      p_amount: payload.amount,
      p_date: payload.date,
      p_due_date: payload.dueDate || null,
      p_note: payload.note || null,
      p_account_id: payload.accountId,
    });
    if (error) throw error;
    return mapRow(data);
  },

  async update(id, payload) {
    const row = {};
    if (payload.person !== undefined) row.person = payload.person;
    if (payload.dueDate !== undefined) row.due_date = payload.dueDate || null;
    if (payload.note !== undefined) row.note = payload.note || null;
    // Amount changes are intentionally not supported post-creation to avoid
    // desyncing the mirrored transaction and repayment math — delete and
    // recreate instead if the original amount was wrong.
    const { data, error } = await supabase.from('lending').update(row).eq('id', id).select().single();
    if (error) throw error;
    return mapRow(data);
  },

  async remove(id) {
    const { error } = await supabase.rpc('delete_lending_cascade', { p_lending_id: id });
    if (error) throw error;
  },

  async addRepayment(id, payload) {
    const { data, error } = await supabase.rpc('add_repayment', {
      p_lending_id: id,
      p_amount: payload.amount,
      p_date: payload.date,
      p_note: payload.note || null,
      p_account_id: payload.accountId,
      p_payment_mode: payload.paymentMode || 'other',
    });
    if (error) throw error;
    return mapRepayment(data);
  },
};
