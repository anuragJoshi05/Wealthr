import { Trash2, AlertTriangle } from 'lucide-react';
import Card from '../common/Card';
import { formatCurrency } from '../../utils/formatters';

export default function BudgetCard({ budget, onDelete }) {
  const percent = Math.min(100, budget.percentUsed);
  const isOver = budget.percentUsed >= 100;
  const isNear = budget.percentUsed >= 80 && budget.percentUsed < 100;

  const barColor = isOver ? 'bg-expense' : isNear ? 'bg-amber-500' : 'bg-brand-600';

  return (
    <Card>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-900 dark:text-ink-50 truncate">{budget.category}</p>
          <p className="text-xs text-ink-400 mt-0.5 truncate">
            {formatCurrency(budget.spent)} of {formatCurrency(budget.limit)}
          </p>
        </div>
        <button
          onClick={() => onDelete(budget)}
          className="p-1.5 rounded-lg text-ink-400 hover:text-expense hover:bg-rose-50 dark:hover:bg-rose-500/10 shrink-0"
          aria-label="Delete budget"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="h-2 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden mb-2">
        <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${percent}%` }} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-ink-400">{formatCurrency(budget.remaining)} remaining</span>
        <span className={`text-xs font-bold ${isOver ? 'text-expense' : isNear ? 'text-amber-600' : 'text-ink-500'}`}>
          {budget.percentUsed}%
        </span>
      </div>

      {(isOver || isNear) && (
        <div className={`flex items-center gap-1.5 mt-2.5 text-xs font-medium ${isOver ? 'text-expense' : 'text-amber-600'}`}>
          <AlertTriangle size={13} />
          {isOver ? 'Budget exceeded' : 'Approaching limit'}
        </div>
      )}
    </Card>
  );
}
