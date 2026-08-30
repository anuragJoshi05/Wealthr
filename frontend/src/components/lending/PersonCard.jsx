import { HandCoins, Users } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Badge from '../common/Badge';

export default function PersonCard({ balance, onClick }) {
  const isOwedToYou = balance.netBalance > 0;
  const isSettled = balance.netBalance === 0;

  const sharingNet = (balance.sharesOwedToYou || 0) - (balance.sharesYouOwe || 0);
  const hasSharing = Boolean(balance.sharesOwedToYou || balance.sharesYouOwe);

  return (
    <div
      onClick={onClick}
      className="p-4 rounded-2xl bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 hover:shadow-card-hover transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold text-sm shrink-0">
            {balance.person[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-ink-900 dark:text-ink-50 truncate">{balance.person}</p>
            <p className="text-xs text-ink-400 truncate">
              {balance.lastActivity ? `Last activity ${formatDate(balance.lastActivity)}` : 'No activity yet'}
            </p>
          </div>
        </div>
      </div>

      {/* Lending & Borrowing — kept visually separate from Shared Expenses below */}
      <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-ink-50 dark:bg-ink-800/60">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-500 dark:text-ink-400">
          <HandCoins size={13} /> Lending
        </span>
        {isSettled ? (
          <Badge color="income">Settled</Badge>
        ) : (
          <span className={`text-sm font-extrabold ${isOwedToYou ? 'text-lend' : 'text-borrow'}`}>
            {isOwedToYou ? 'Owes you ' : 'You owe '}
            {formatCurrency(Math.abs(balance.netBalance))}
          </span>
        )}
      </div>

      {hasSharing && (
        <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-brand-50/60 dark:bg-brand-500/5 mt-1.5">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400">
            <Users size={13} /> Shared Expenses
          </span>
          <span className={`text-sm font-extrabold ${sharingNet >= 0 ? 'text-lend' : 'text-borrow'}`}>
            {sharingNet >= 0 ? 'Owes you ' : 'You owe '}
            {formatCurrency(Math.abs(sharingNet))}
          </span>
        </div>
      )}
    </div>
  );
}
