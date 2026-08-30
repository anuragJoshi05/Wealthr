import { formatCurrency, formatDate } from '../../utils/formatters';
import Badge from '../common/Badge';

const statusColor = {
  pending: 'neutral',
  partially_paid: 'lend',
  completed: 'income',
};

const statusLabel = {
  pending: 'Pending',
  partially_paid: 'Partially Paid',
  completed: 'Completed',
};

export default function LendingItem({ item, onClick }) {
  const percent = item.amount > 0 ? Math.min(100, Math.round((item.repaidAmount / item.amount) * 100)) : 0;
  const isLent = item.direction === 'lent';
  const overdue = item.dueDate && item.status !== 'completed' && new Date(item.dueDate) < new Date();

  return (
    <div
      onClick={onClick}
      className="p-4 rounded-2xl bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 hover:shadow-card-hover transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-900 dark:text-ink-50 truncate">{item.person}</p>
          <p className="text-xs text-ink-400 mt-0.5 truncate">
            {isLent ? 'You lent' : 'You borrowed'} · {formatDate(item.date)}
            {item.dueDate ? ` · Due ${formatDate(item.dueDate)}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge color={statusColor[item.status]}>{statusLabel[item.status]}</Badge>
          {overdue && <Badge color="expense">Overdue</Badge>}
        </div>
      </div>

      <div className="flex items-end justify-between mb-1.5">
        <span className={`text-lg font-extrabold ${isLent ? 'text-lend' : 'text-borrow'}`}>
          {formatCurrency(item.remainingAmount)}
        </span>
        <span className="text-xs text-ink-400">
          of {formatCurrency(item.amount)} {isLent ? 'lent' : 'borrowed'}
        </span>
      </div>

      <div className="h-1.5 rounded-full bg-ink-100 dark:bg-ink-800 overflow-hidden">
        <div
          className={`h-full rounded-full ${isLent ? 'bg-lend' : 'bg-borrow'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
