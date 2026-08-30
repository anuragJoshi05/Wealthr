import { ArrowDownLeft, ArrowUpRight, ArrowLeftRight, HandCoins, Landmark, Users, Clock, RotateCcw } from 'lucide-react';
import { formatCurrency, formatRelativeDate } from '../../utils/formatters';
import Badge from '../common/Badge';

const iconFor = {
  income: ArrowDownLeft,
  expense: ArrowUpRight,
  refund: RotateCcw,
  self_transfer: ArrowLeftRight,
  lend: HandCoins,
  borrow: HandCoins,
  repayment_received: Landmark,
  repayment_made: Landmark,
};

const iconColorFor = {
  income: 'text-income bg-emerald-50 dark:bg-emerald-500/10',
  expense: 'text-expense bg-rose-50 dark:bg-rose-500/10',
  refund: 'text-refund bg-cyan-50 dark:bg-cyan-500/10',
  self_transfer: 'text-brand-600 bg-brand-50 dark:bg-brand-500/10',
  lend: 'text-lend bg-amber-50 dark:bg-amber-500/10',
  borrow: 'text-borrow bg-violet-50 dark:bg-violet-500/10',
  repayment_received: 'text-income bg-emerald-50 dark:bg-emerald-500/10',
  repayment_made: 'text-expense bg-rose-50 dark:bg-rose-500/10',
};

// Refund shows '+' (cash comes back) but is rendered in its own refund
// color, never the income color — it must never read as income.
const sign = {
  income: '+',
  repayment_received: '+',
  expense: '-',
  repayment_made: '-',
  refund: '+',
  lend: '-',
  borrow: '+',
  self_transfer: '',
};

const amountColorFor = {
  income: 'text-income',
  repayment_received: 'text-income',
  refund: 'text-refund',
  borrow: 'text-income',
  expense: 'text-expense',
  repayment_made: 'text-expense',
  lend: 'text-expense',
  self_transfer: 'text-ink-700 dark:text-ink-200',
};

export default function TransactionItem({ tx, onEdit }) {
  const Icon = tx.isSplit ? Users : iconFor[tx.type] || ArrowLeftRight;
  const isFronted = tx.type === 'expense' && Boolean(tx.paidByPerson);

  return (
    <div
      onClick={() => !tx.linkedLendingId && onEdit(tx)}
      className={`group flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 transition-shadow ${
        tx.linkedLendingId ? '' : 'hover:shadow-card-hover cursor-pointer'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconColorFor[tx.type]}`}>
        <Icon size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ink-900 dark:text-ink-50 truncate flex items-center gap-1.5">
          {tx.type === 'self_transfer' ? (
            <>
              {tx.accountName} <ArrowLeftRight size={11} className="text-ink-300 shrink-0" /> {tx.toAccountName}
            </>
          ) : (
            <>
              {tx.category}
              {tx.subcategory ? ` · ${tx.subcategory}` : ''}
            </>
          )}
        </p>
        <p className="text-xs text-ink-400 truncate">
          {formatRelativeDate(tx.date)}
          {tx.type !== 'self_transfer' && tx.accountName ? ` · ${tx.accountName}` : ''}
          {tx.person ? ` · ${tx.person}` : ''}
          {tx.description ? ` · ${tx.description}` : ''}
        </p>
        {(tx.isSplit || isFronted || tx.type === 'refund') && (
          <div className="flex items-center gap-1.5 mt-1">
            {tx.type === 'refund' && <Badge color="refund">Refund</Badge>}
            {tx.isSplit && <Badge color="brand">Split · {formatCurrency(tx.splitTotalAmount)} total</Badge>}
            {isFronted && (
              <Badge color={tx.shareSettled ? 'income' : 'lend'}>
                {tx.shareSettled ? `Settled with ${tx.paidByPerson}` : `Owed to ${tx.paidByPerson}`}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="text-right shrink-0">
        <p className={`text-sm font-bold ${amountColorFor[tx.type] || 'text-ink-700 dark:text-ink-200'}`}>
          {sign[tx.type]}
          {formatCurrency(tx.amount)}
        </p>
        {tx.linkedLendingId && (
          <p className="text-[10px] text-ink-400 mt-0.5">via Lending</p>
        )}
        {isFronted && !tx.shareSettled && (
          <p className="text-[10px] text-lend mt-0.5 flex items-center justify-end gap-0.5"><Clock size={9} /> unsettled</p>
        )}
      </div>
    </div>
  );
}
