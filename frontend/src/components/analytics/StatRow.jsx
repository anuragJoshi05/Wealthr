import Card from '../common/Card';
import { formatCurrency } from '../../utils/formatters';

export default function StatRow({ current }) {
  const stats = [
    { label: 'Savings Rate', value: `${current.savingsRate}%` },
    { label: 'Transactions', value: current.transactionCount },
    { label: 'Net Savings', value: formatCurrency(current.netSavings) },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <Card key={s.label} className="!p-3.5 text-center">
          <p className="text-lg font-extrabold text-ink-900 dark:text-ink-50">{s.value}</p>
          <p className="text-[11px] text-ink-400 mt-0.5">{s.label}</p>
        </Card>
      ))}
    </div>
  );
}
