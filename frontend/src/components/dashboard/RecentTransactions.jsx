import { Link } from 'react-router-dom';
import { ChevronRight, Receipt } from 'lucide-react';
import Card from '../common/Card';
import TransactionItem from '../transactions/TransactionItem';
import EmptyState from '../common/EmptyState';

export default function RecentTransactions({ items, onEdit }) {
  return (
    <Card padded={false}>
      <div className="flex items-center justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-3">
        <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">Recent Transactions</h3>
        <Link to="/transactions" className="flex items-center text-xs font-semibold text-brand-600 dark:text-brand-400">
          View all <ChevronRight size={14} />
        </Link>
      </div>
      {items.length === 0 ? (
        <EmptyState icon={Receipt} title="Nothing here yet" description="Your recent activity will show up here." />
      ) : (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-2">
          {items.map((tx) => (
            <TransactionItem key={tx.id} tx={tx} onEdit={onEdit} />
          ))}
        </div>
      )}
    </Card>
  );
}
