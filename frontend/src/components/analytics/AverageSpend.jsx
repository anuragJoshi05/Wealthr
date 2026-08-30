import Card from '../common/Card';
import { formatCurrency } from '../../utils/formatters';

export default function AverageSpend({ avgDailySpend, avgWeeklySpend, avgMonthlySpend }) {
  const rows = [
    { label: 'Daily Average', value: avgDailySpend },
    { label: 'Weekly Average', value: avgWeeklySpend },
    { label: 'Monthly Average', value: avgMonthlySpend },
  ];
  return (
    <Card>
      <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50 mb-3">Average Spending</h3>
      <div className="grid grid-cols-3 gap-3">
        {rows.map((r) => (
          <div key={r.label} className="text-center">
            <p className="text-sm font-extrabold text-ink-900 dark:text-ink-50">{formatCurrency(r.value)}</p>
            <p className="text-[11px] text-ink-400 mt-0.5">{r.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
