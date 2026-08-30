import { supabase } from '../lib/supabaseClient';
import { getCurrentUserId } from './api';

function mapRow(row) {
  return {
    id: row.id,
    category: row.category,
    month: row.month,
    limit: Number(row.limit),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const budgetService = {
  async list(month) {
    const uid = await getCurrentUserId();

    const { data: budgetRows, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', uid)
      .eq('month', month);
    if (error) throw error;

    // Compute spend-per-category for the month from expense transactions,
    // same logic the old backend did server-side.
    const monthStart = new Date(`${month}-01T00:00:00.000Z`);
    const monthEnd = new Date(monthStart);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

    const { data: txRows, error: txError } = await supabase
      .from('transactions')
      .select('type, category, amount')
      .eq('user_id', uid)
      .in('type', ['expense', 'refund'])
      .gte('date', monthStart.toISOString())
      .lt('date', monthEnd.toISOString());
    if (txError) throw txError;

    // A refund reverses a previous expense — it must reduce spend against
    // that category's budget, not just vanish. It's never treated as
    // income anywhere (see analyticsEngine.js), only as a reduction here.
    const spentByCategory = {};
    txRows.forEach((t) => {
      const delta = t.type === 'refund' ? -Number(t.amount) : Number(t.amount);
      spentByCategory[t.category] = (spentByCategory[t.category] || 0) + delta;
    });

    const items = budgetRows.map((b) => {
      const budget = mapRow(b);
      const spent = Math.max(0, spentByCategory[budget.category] || 0);
      const remaining = Math.max(0, budget.limit - spent);
      const percentUsed = budget.limit > 0 ? Math.round((spent / budget.limit) * 100) : 0;
      return { ...budget, spent, remaining, percentUsed };
    });

    return { items };
  },

  async create(payload) {
    const uid = await getCurrentUserId();
    const { data, error } = await supabase
      .from('budgets')
      .insert({
        user_id: uid,
        category: payload.category,
        month: payload.month,
        limit: payload.limit,
      })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        throw new Error('A budget for this category already exists this month');
      }
      throw error;
    }
    return mapRow(data);
  },

  async update(id, payload) {
    const row = {};
    if (payload.category !== undefined) row.category = payload.category;
    if (payload.month !== undefined) row.month = payload.month;
    if (payload.limit !== undefined) row.limit = payload.limit;
    const { data, error } = await supabase.from('budgets').update(row).eq('id', id).select().single();
    if (error) throw error;
    return mapRow(data);
  },

  async remove(id) {
    const { error } = await supabase.from('budgets').delete().eq('id', id);
    if (error) throw error;
  },
};
