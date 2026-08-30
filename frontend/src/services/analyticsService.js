import { supabase } from '../lib/supabaseClient';
import { getCurrentUserId } from './api';
import { rangeForPeriod, previousRange, summarize, pctChange, computeTimePatterns } from '../utils/analyticsEngine';

const SELECT_WITH_ACCOUNTS = `*,
  account:accounts!transactions_account_id_fkey(id,name),
  to_account:accounts!transactions_to_account_id_fkey(id,name)`;

async function fetchTransactionsInRange(uid, start, end) {
  const { data, error } = await supabase
    .from('transactions')
    .select(SELECT_WITH_ACCOUNTS)
    .eq('user_id', uid)
    .gte('date', start)
    .lt('date', end);
  if (error) throw error;
  return data.map((t) => ({
    ...t,
    paymentMode: t.payment_mode,
    accountName: t.account?.name || null,
    toAccountName: t.to_account?.name || null,
  }));
}

export const analyticsService = {
  async dashboard() {
    const uid = await getCurrentUserId();

    const [{ data: allTxRaw, error: txError }, { data: lendingRows, error: lendError }] = await Promise.all([
      supabase.from('transactions').select(SELECT_WITH_ACCOUNTS).eq('user_id', uid),
      supabase.from('lending').select('*').eq('user_id', uid),
    ]);
    if (txError) throw txError;
    if (lendError) throw lendError;

    const allTx = allTxRaw.map((t) => ({
      ...t,
      paymentMode: t.payment_mode,
      accountName: t.account?.name || null,
      toAccountName: t.to_account?.name || null,
    }));
    const all = summarize(allTx);
    // Balance reflects actual cash flow only: income minus *effective*
    // expense (expense net of refunds — a refund is money coming back from
    // a previous expense, never income, so it belongs on the expense side
    // of this calculation, not added to income). Lending/borrowing/
    // repayments and self-transfers deliberately do NOT touch this number
    // — lending money out just converts cash into a receivable, it doesn't
    // reduce your wealth, so it's shown as its own stat instead.
    const balance = all.income - all.netExpense;

    const { start, end } = rangeForPeriod('month');
    const monthTx = allTx.filter((t) => t.date >= start && t.date < end);
    const month = summarize(monthTx);

    const moneyLent = lendingRows
      .filter((l) => l.direction === 'lent' && l.status !== 'completed')
      .reduce((s, l) => s + Number(l.remaining_amount), 0);
    const moneyBorrowed = lendingRows
      .filter((l) => l.direction === 'borrowed' && l.status !== 'completed')
      .reduce((s, l) => s + Number(l.remaining_amount), 0);
    const pendingRepayments = lendingRows.filter((l) => l.status !== 'completed').length;

    const recentTransactions = [...allTx]
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 10)
      .map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        date: t.date,
        category: t.category,
        subcategory: t.subcategory,
        description: t.description,
        paymentMode: t.payment_mode,
        person: t.person,
        tags: t.tags || [],
        receiptUrl: t.receipt_url || null,
        linkedLendingId: t.linked_lending_id,
        accountId: t.account_id,
        accountName: t.accountName,
        toAccountId: t.to_account_id,
        toAccountName: t.toAccountName,
        isSplit: t.is_split || false,
        splitTotalAmount: t.split_total_amount != null ? Number(t.split_total_amount) : null,
        paidByPerson: t.paid_by_person || null,
        shareSettled: t.share_settled ?? true,
      }));

    return {
      balance,
      totalIncome: month.income,
      totalExpense: month.expense,
      totalRefund: month.refund,
      netExpense: month.netExpense,
      netSavings: month.netSavings,
      savingsRate: month.savingsRate,
      moneyLent,
      moneyBorrowed,
      pendingRepayments,
      recentTransactions,
      spendingByCategory: month.byCategory,
      spendingByPaymentMode: month.byPaymentMode,
      incomeBySource: month.incomeBySource,
    };
  },

  async analytics(params = {}) {
    const uid = await getCurrentUserId();
    const { period = 'month', startDate, endDate } = params;

    const { start, end } = rangeForPeriod(period, startDate, endDate);
    const current = await fetchTransactionsInRange(uid, start, end);
    const currentSummary = summarize(current);

    const prev = previousRange(start, end);
    const previous = await fetchTransactionsInRange(uid, prev.start, prev.end);
    const previousSummary = summarize(previous);

    // 6-month trend
    const trend = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
      const monthTx = await fetchTransactionsInRange(uid, mStart, mEnd);
      const s = summarize(monthTx);
      trend.push({
        month: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        income: s.income,
        expense: s.expense,
      });
    }

    const daysInRange = Math.max(1, Math.round((new Date(end) - new Date(start)) / 86400000));
    const avgDailySpend = Math.round(currentSummary.expense / daysInRange);
    const avgWeeklySpend = Math.round(avgDailySpend * 7);
    const avgMonthlySpend = Math.round(avgDailySpend * 30);

    const topCategories = Object.entries(currentSummary.byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amount]) => ({ category, amount }));

    return {
      period,
      range: { start, end },
      current: currentSummary,
      comparisonToPrevious: {
        incomeChangePct: pctChange(currentSummary.income, previousSummary.income),
        expenseChangePct: pctChange(currentSummary.expense, previousSummary.expense),
        savingsChangePct: pctChange(currentSummary.netSavings, previousSummary.netSavings),
      },
      monthlyTrend: trend,
      avgDailySpend,
      avgWeeklySpend,
      avgMonthlySpend,
      topCategories,
    };
  },

  // Deep time-based spending analysis — deliberately independent of the
  // Analytics page's period filter, since "when do I generally spend"
  // is a habit question best answered from full history, not one month.
  async timePatterns() {
    const uid = await getCurrentUserId();
    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount, date')
      .eq('user_id', uid)
      .eq('type', 'expense')
      .order('date', { ascending: true })
      .range(0, 9999);
    if (error) throw error;
    return computeTimePatterns(data.map((t) => ({ ...t, amount: Number(t.amount) })));
  },
};
