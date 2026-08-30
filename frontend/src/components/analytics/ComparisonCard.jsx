import { ArrowUp, ArrowDown } from 'lucide-react';
import Card from '../common/Card';
import { formatPercent } from '../../utils/formatters';

function Row({ label, pct, invert }) {
  const positive = invert ? pct <= 0 : pct >= 0;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-ink-100 dark:border-ink-800 last:border-0">
      <span className="text-sm text-ink-600 dark:text-ink-300">{label}</span>
      <span className={`flex items-center gap-1 text-sm font-bold ${positive ? 'text-income' : 'text-expense'}`}>
        {pct >= 0 ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
        {formatPercent(Math.abs(pct))}
      </span>
    </div>
  );
}

export default function ComparisonCard({ comparison }) {
  return (
    <Card>
      <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50 mb-1">vs Previous Period</h3>
      <div>
        <Row label="Income" pct={comparison.incomeChangePct} />
        <Row label="Expenses" pct={comparison.expenseChangePct} invert />
        <Row label="Net Savings" pct={comparison.savingsChangePct} />
      </div>
    </Card>
  );
}
