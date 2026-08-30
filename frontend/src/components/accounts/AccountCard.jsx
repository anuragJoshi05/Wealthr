import { Star, ChevronRight, Wallet, MoreVertical } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function AccountCard({ account, onClick, onMore }) {
  const isNegative = account.balance < 0;
  return (
    <div className="w-full flex items-center gap-1 rounded-2xl bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-card-hover transition-all">
      <button onClick={onClick} className="flex-1 min-w-0 flex items-center gap-3.5 p-4 text-left">
        <div className="w-11 h-11 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center text-brand-600 dark:text-brand-300 shrink-0">
          <Wallet size={19} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-ink-900 dark:text-ink-50 truncate">{account.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <p className="text-xs text-ink-400">
              {account.transactionCount} transaction{account.transactionCount !== 1 ? 's' : ''}
            </p>
            {account.isDefault && (
              <span className="flex items-center gap-0.5 text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 rounded-full px-1.5 py-0.5 shrink-0">
                <Star size={9} fill="currentColor" /> DEFAULT
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-base font-extrabold ${isNegative ? 'text-expense' : 'text-ink-900 dark:text-ink-50'}`}>
            {formatCurrency(account.balance)}
          </p>
        </div>
        <ChevronRight size={16} className="text-ink-300 shrink-0" />
      </button>
      {/*
        A persistent icon button rather than a hover-revealed overlay — hover
        states don't exist on touch, so a group-hover reveal left mobile
        users with no way to edit or delete an account at all.
      */}
      {onMore && (
        <button
          onClick={(e) => { e.stopPropagation(); onMore(); }}
          aria-label="Account options"
          className="shrink-0 p-2.5 mr-2 rounded-xl text-ink-400 hover:text-ink-700 dark:hover:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
        >
          <MoreVertical size={17} />
        </button>
      )}
    </div>
  );
}
