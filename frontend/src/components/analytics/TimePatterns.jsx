import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Sunrise, Sun, Sunset, Moon, CloudMoon, CloudSun, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import Card from '../common/Card';
import EmptyState from '../common/EmptyState';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatters';

const SEGMENT_ICONS = {
  early_morning: Sunrise,
  morning: CloudSun,
  afternoon: Sun,
  evening: Sunset,
  night: CloudMoon,
  late_night: Moon,
};

function hourLabel(hour) {
  const h = hour % 12 || 12;
  return `${h}${hour < 12 ? 'a' : 'p'}`;
}

export default function TimePatterns({ data }) {
  if (!data || data.totalTransactions === 0) {
    return (
      <Card>
        <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50 mb-1">When You Spend</h3>
        <EmptyState icon={Clock} title="Not enough data yet" description="Add a few expenses to see when you tend to spend." />
      </Card>
    );
  }

  const { byHour, bySegment, byDayOfWeek, byMonth, hourStats, segmentStats, dayOfWeekStats, monthStats, avgPerTransaction } = data;

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">When You Spend</h3>
          <span className="text-[11px] text-ink-400">All-time · {data.totalTransactions} expenses</span>
        </div>
        <p className="text-xs text-ink-500 dark:text-ink-400 mb-4">
          A breakdown of your spending habits across the day, week, and year — {formatCurrency(avgPerTransaction)} average per expense.
        </p>

        {/* Highlight callouts */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 p-3">
            <p className="flex items-center gap-1 text-[11px] font-semibold text-expense mb-1"><TrendingUp size={12} /> Peak spending</p>
            <p className="text-sm font-bold text-ink-900 dark:text-ink-50">{segmentStats.highest?.label}</p>
            <p className="text-xs text-ink-500 dark:text-ink-400">{formatCurrency(segmentStats.highest?.amount)} · {segmentStats.highest?.range}</p>
          </div>
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3">
            <p className="flex items-center gap-1 text-[11px] font-semibold text-income mb-1"><TrendingDown size={12} /> Quietest period</p>
            <p className="text-sm font-bold text-ink-900 dark:text-ink-50">{segmentStats.lowest?.label}</p>
            <p className="text-xs text-ink-500 dark:text-ink-400">{formatCurrency(segmentStats.lowest?.amount)} · {segmentStats.lowest?.range}</p>
          </div>
        </div>

        {/* Time-of-day segment cards */}
        <div className="grid grid-cols-3 gap-2 mb-1">
          {bySegment.map((s) => {
            const Icon = SEGMENT_ICONS[s.key];
            const isHigh = segmentStats.highest?.key === s.key;
            return (
              <div
                key={s.key}
                className={`rounded-xl p-2.5 text-center border ${
                  isHigh
                    ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10'
                    : 'border-ink-100 dark:border-ink-800 bg-ink-50 dark:bg-ink-800/50'
                }`}
              >
                <Icon size={16} className={`mx-auto mb-1 ${isHigh ? 'text-brand-600' : 'text-ink-400'}`} />
                <p className="text-[10px] font-semibold text-ink-500 dark:text-ink-400 leading-tight">{s.label}</p>
                <p className="text-xs font-extrabold text-ink-900 dark:text-ink-50 mt-0.5">{formatCompactCurrency(s.amount)}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50 mb-1">Spending by Hour of Day</h3>
        <p className="text-xs text-ink-500 dark:text-ink-400 mb-3">
          Highest around <span className="font-semibold text-ink-700 dark:text-ink-200">{hourStats.highest ? hourLabel(hourStats.highest.hour).replace('a', ' AM').replace('p', ' PM') : '—'}</span>,
          lowest around <span className="font-semibold text-ink-700 dark:text-ink-200">{hourStats.lowest ? hourLabel(hourStats.lowest.hour).replace('a', ' AM').replace('p', ' PM') : '—'}</span>.
        </p>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byHour} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-100 dark:text-ink-800" vertical={false} />
              <XAxis dataKey="hour" tickFormatter={hourLabel} tick={{ fontSize: 9 }} interval={1} stroke="currentColor" className="text-ink-400" />
              <YAxis tickFormatter={formatCompactCurrency} tick={{ fontSize: 10 }} stroke="currentColor" className="text-ink-400" />
              <Tooltip
                formatter={(v) => formatCurrency(v)}
                labelFormatter={(h) => `${hourLabel(h).replace('a', ' AM').replace('p', ' PM')}`}
                contentStyle={{ borderRadius: 12, fontSize: 12 }}
              />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {byHour.map((h, i) => (
                  <Cell key={i} fill={hourStats.highest?.hour === h.hour ? '#4F46E5' : '#C7D2FE'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50 mb-1">Spending by Day of Week</h3>
        <p className="text-xs text-ink-500 dark:text-ink-400 mb-3">
          You spend the most on <span className="font-semibold text-ink-700 dark:text-ink-200">{dayOfWeekStats.highest?.label}s</span> and the least on{' '}
          <span className="font-semibold text-ink-700 dark:text-ink-200">{dayOfWeekStats.lowest?.label}s</span>.
        </p>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byDayOfWeek} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-100 dark:text-ink-800" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" className="text-ink-400" />
              <YAxis tickFormatter={formatCompactCurrency} tick={{ fontSize: 10 }} stroke="currentColor" className="text-ink-400" />
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                {byDayOfWeek.map((d, i) => (
                  <Cell key={i} fill={dayOfWeekStats.highest?.day === d.day ? '#7C3AED' : '#DDD6FE'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {byMonth.length > 1 && (
        <Card>
          <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50 mb-1">Month-wise Spending Pattern</h3>
          <p className="text-xs text-ink-500 dark:text-ink-400 mb-3">
            Your highest-spending month was <span className="font-semibold text-ink-700 dark:text-ink-200">{monthStats.highest?.label}</span>
            {' '}({formatCurrency(monthStats.highest?.amount)}); your lowest was{' '}
            <span className="font-semibold text-ink-700 dark:text-ink-200">{monthStats.lowest?.label}</span> ({formatCurrency(monthStats.lowest?.amount)}).
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMonth} margin={{ left: -20, right: 5, top: 5, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-100 dark:text-ink-800" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="currentColor" className="text-ink-400" />
                <YAxis tickFormatter={formatCompactCurrency} tick={{ fontSize: 10 }} stroke="currentColor" className="text-ink-400" />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {byMonth.map((m, i) => (
                    <Cell key={i} fill={monthStats.highest?.key === m.key ? '#059669' : '#A7F3D0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
