import Card from '../common/Card';
import { formatCurrency } from '../../utils/formatters';

export default function TopCategories({ categories }) {
  const max = categories[0]?.amount || 1;
  return (
    <Card>
      <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50 mb-3">Highest Spending Categories</h3>
      {categories.length === 0 ? (
        <p className="text-sm text-ink-400">No expenses in this period.</p>
      ) : (
        <div className="space-y-3">
          {categories.map((c) => (
            <div key={c.category}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-ink-700 dark:text-ink-200">{c.category}</span>
                <span className="font-bold text-ink-900 dark:text-ink-50">{formatCurrency(c.amount)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
                <div className="h-full bg-brand-600 rounded-full" style={{ width: `${(c.amount / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
