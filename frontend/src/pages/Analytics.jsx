import { useState, useEffect, useCallback } from 'react';
import PeriodFilter from '../components/analytics/PeriodFilter';
import ComparisonCard from '../components/analytics/ComparisonCard';
import StatRow from '../components/analytics/StatRow';
import TopCategories from '../components/analytics/TopCategories';
import AverageSpend from '../components/analytics/AverageSpend';
import TimePatterns from '../components/analytics/TimePatterns';
import TrendChart from '../components/dashboard/TrendChart';
import InsightsCard from '../components/dashboard/InsightsCard';
import { DashboardSkeleton } from '../components/common/SkeletonLoader';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';
import { analyticsService } from '../services/analyticsService';
import { getApiErrorMessage } from '../services/api';
import { useDataChangedListener } from '../utils/events';
import { toInputDate, formatCurrency } from '../utils/formatters';

export default function Analytics() {
  const [period, setPeriod] = useState('month');
  const [customRange, setCustomRange] = useState({ start: toInputDate(), end: toInputDate() });
  const [data, setData] = useState(null);
  const [timeData, setTimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { period };
      if (period === 'custom') {
        params.startDate = customRange.start;
        params.endDate = customRange.end;
      }
      const [res, time] = await Promise.all([analyticsService.analytics(params), analyticsService.timePatterns()]);
      setData(res);
      setTimeData(time);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [period, customRange]);

  useEffect(() => {
    load();
  }, [load]);

  useDataChangedListener(load, ['all']);

  return (
    <div className="space-y-4">
      <PeriodFilter period={period} onChange={setPeriod} customRange={customRange} onCustomRangeChange={setCustomRange} />

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <EmptyState title="Couldn't load analytics" description={error} action={<Button onClick={load}>Retry</Button>} />
      ) : (
        <>
          <StatRow current={data.current} />
          <ComparisonCard comparison={data.comparisonToPrevious} />

          {/* Refund analysis — refunds are never income, but they DO reduce
              effective expense (netExpense above). Surfaced separately so
              it's clear at a glance that refunds are their own thing. */}
          {data.current.refund > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-100 dark:border-cyan-500/20 p-3.5 text-center">
                <p className="text-lg font-extrabold text-refund">{formatCurrency(data.current.refund)}</p>
                <p className="text-[11px] text-ink-400 mt-0.5">Total Refunds</p>
              </div>
              <div className="rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 p-3.5 text-center">
                <p className="text-lg font-extrabold text-expense">{formatCurrency(data.current.netExpense)}</p>
                <p className="text-[11px] text-ink-400 mt-0.5">Net Expense (after refunds)</p>
              </div>
            </div>
          )}

          {/* Self Transfer analysis — never income/expense, shown purely as
              "how much moved between my own accounts". */}
          {(data.current.selfTransferOut > 0) && (
            <div className="rounded-2xl bg-brand-50 dark:bg-brand-500/10 border border-brand-100 dark:border-brand-500/20 p-3.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-brand-700 dark:text-brand-300">Moved between my accounts</span>
              <span className="text-sm font-extrabold text-brand-700 dark:text-brand-300">{formatCurrency(data.current.selfTransferOut)}</span>
            </div>
          )}

          <TrendChart data={data.monthlyTrend} title="6-Month Income vs Expense Trend" />
          <AverageSpend
            avgDailySpend={data.avgDailySpend}
            avgWeeklySpend={data.avgWeeklySpend}
            avgMonthlySpend={data.avgMonthlySpend}
          />
          <TopCategories categories={data.topCategories} />
          <InsightsCard byCategory={data.current.byCategory} byPaymentMode={data.current.byPaymentMode} />
          <TimePatterns data={timeData} />
        </>
      )}
    </div>
  );
}
