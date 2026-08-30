// Pure aggregation functions — no network calls. analyticsService fetches
// rows from Supabase and hands them here, same split of concerns the old
// Express analyticsController had (fetch, then summarize).

export function rangeForPeriod(period, customStart, customEnd) {
  const now = new Date();
  let start;
  let end = now;

  switch (period) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week': {
      const day = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - day);
      start.setHours(0, 0, 0, 0);
      break;
    }
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      start = new Date(customStart);
      end = new Date(customEnd);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

export function previousRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const durationMs = e.getTime() - s.getTime();
  const prevEnd = new Date(s.getTime());
  const prevStart = new Date(s.getTime() - durationMs);
  return { start: prevStart.toISOString(), end: prevEnd.toISOString() };
}

// A refund is money returned from a PREVIOUS EXPENSE — it is never income.
// It's tracked in its own `refund` bucket and reduces `netExpense`
// (= expense - refund), which is what every "effective spend" figure in the
// app (balance, savings, budgets) should use instead of raw `expense`.
// Self Transfers move the user's own money between their own accounts —
// they never touch income, expense, or refund, and total money across all
// accounts is unchanged by construction (see accounts.sql), so they're
// intentionally excluded from every bucket below.
export function summarize(transactions) {
  let income = 0,
    expense = 0,
    refund = 0,
    lent = 0,
    borrowed = 0,
    repaymentReceived = 0,
    repaymentMade = 0,
    selfTransferOut = 0,
    selfTransferIn = 0;

  const byCategory = {};
  const refundByCategory = {};
  const byPaymentMode = {};
  const incomeBySource = {};

  transactions.forEach((t) => {
    const amount = Number(t.amount);
    switch (t.type) {
      case 'income':
        income += amount;
        incomeBySource[t.category] = (incomeBySource[t.category] || 0) + amount;
        break;
      case 'expense':
        expense += amount;
        byCategory[t.category] = (byCategory[t.category] || 0) + amount;
        break;
      case 'refund':
        refund += amount;
        refundByCategory[t.category] = (refundByCategory[t.category] || 0) + amount;
        break;
      case 'lend':
        lent += amount;
        break;
      case 'borrow':
        borrowed += amount;
        break;
      case 'repayment_received':
        repaymentReceived += amount;
        break;
      case 'repayment_made':
        repaymentMade += amount;
        break;
      case 'self_transfer':
        // Not income/expense — tracked only so it can be surfaced as its
        // own "transfer analysis" figure, never mixed into cash flow.
        selfTransferOut += amount;
        selfTransferIn += amount;
        break;
      default:
        break;
    }
    if ((t.type === 'expense' || t.type === 'income') && (t.paymentMode || t.payment_mode)) {
      const mode = t.paymentMode || t.payment_mode;
      byPaymentMode[mode] = (byPaymentMode[mode] || 0) + amount;
    }
  });

  // Effective expense = what actually left your pocket net of refunds. This
  // is the figure everything downstream (balance, savings rate, budgets)
  // should use instead of raw `expense`.
  const netExpense = Math.max(0, expense - refund);
  const netSavings = income - netExpense;
  const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0;

  return {
    income,
    expense,
    refund,
    netExpense,
    lent,
    borrowed,
    repaymentReceived,
    repaymentMade,
    selfTransferOut,
    selfTransferIn,
    netSavings,
    savingsRate,
    byCategory,
    refundByCategory,
    byPaymentMode,
    incomeBySource,
    transactionCount: transactions.length,
  };
}

export function pctChange(curr, prior) {
  if (prior === 0) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prior) / prior) * 100);
}

// ---------------------------------------------------------------------------
// Deep time-based spending analysis — when do you generally spend money?
// Pure function: takes every expense transaction (any range) and returns a
// full breakdown by hour, time-of-day segment, day of week, and month, plus
// which of each is the highest/lowest so it reads as analysis, not just a
// chart. Split expenses already carry only the user's own share in
// `amount`, so this never double-counts anyone else's portion.
// ---------------------------------------------------------------------------

const TIME_SEGMENTS = [
  { key: 'early_morning', label: 'Early Morning', range: '5 AM – 8 AM', test: (h) => h >= 5 && h < 8 },
  { key: 'morning', label: 'Morning', range: '8 AM – 12 PM', test: (h) => h >= 8 && h < 12 },
  { key: 'afternoon', label: 'Afternoon', range: '12 PM – 5 PM', test: (h) => h >= 12 && h < 17 },
  { key: 'evening', label: 'Evening', range: '5 PM – 9 PM', test: (h) => h >= 17 && h < 21 },
  { key: 'night', label: 'Night', range: '9 PM – 12 AM', test: (h) => h >= 21 && h < 24 },
  { key: 'late_night', label: 'Late Night', range: '12 AM – 5 AM', test: (h) => h >= 0 && h < 5 },
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function topAndBottom(entries) {
  // entries: [{ key/label, amount, count }]. Only considers buckets with
  // at least one transaction for "lowest" so an untouched 3 AM slot
  // doesn't win by default.
  const active = entries.filter((e) => e.count > 0);
  if (active.length === 0) return { highest: null, lowest: null };
  const sorted = [...active].sort((a, b) => b.amount - a.amount);
  return { highest: sorted[0], lowest: sorted[sorted.length - 1] };
}

export function computeTimePatterns(transactions) {
  const expenses = transactions.filter((t) => t.type === 'expense');

  const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, amount: 0, count: 0 }));
  const bySegment = TIME_SEGMENTS.map((s) => ({ ...s, amount: 0, count: 0 }));
  const byDayOfWeek = DAY_LABELS.map((label, day) => ({ day, label, amount: 0, count: 0 }));
  const monthMap = new Map(); // 'YYYY-MM' -> { label, amount, count, sortKey }

  expenses.forEach((t) => {
    const d = new Date(t.date);
    const hour = d.getHours();
    const amount = Number(t.amount) || 0;

    byHour[hour].amount += amount;
    byHour[hour].count += 1;

    const segment = bySegment.find((s) => s.test(hour));
    if (segment) {
      segment.amount += amount;
      segment.count += 1;
    }

    const dow = d.getDay();
    byDayOfWeek[dow].amount += amount;
    byDayOfWeek[dow].count += 1;

    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        key: monthKey,
        label: d.toLocaleString('default', { month: 'short', year: 'numeric' }),
        amount: 0,
        count: 0,
        sortKey: d.getFullYear() * 12 + d.getMonth(),
      });
    }
    const bucket = monthMap.get(monthKey);
    bucket.amount += amount;
    bucket.count += 1;
  });

  const byMonth = Array.from(monthMap.values()).sort((a, b) => a.sortKey - b.sortKey);

  const totalExpense = expenses.reduce((s, t) => s + Number(t.amount), 0);
  const round = (n) => Math.round(n * 100) / 100;

  return {
    totalTransactions: expenses.length,
    byHour: byHour.map((h) => ({ ...h, amount: round(h.amount) })),
    bySegment: bySegment.map((s) => ({ ...s, amount: round(s.amount) })),
    byDayOfWeek: byDayOfWeek.map((d) => ({ ...d, amount: round(d.amount) })),
    byMonth: byMonth.map((m) => ({ ...m, amount: round(m.amount) })),
    hourStats: topAndBottom(byHour.map((h) => ({ ...h, label: `${h.hour % 12 || 12} ${h.hour < 12 ? 'AM' : 'PM'}` }))),
    segmentStats: topAndBottom(bySegment),
    dayOfWeekStats: topAndBottom(byDayOfWeek),
    monthStats: topAndBottom(byMonth),
    avgPerTransaction: expenses.length > 0 ? round(totalExpense / expenses.length) : 0,
  };
}
