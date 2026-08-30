import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { sharedExpenseService } from '../../services/sharedExpenseService';
import { formatCurrency } from '../../utils/formatters';
import { notify } from '../../utils/toast';
import { getApiErrorMessage } from '../../services/api';
import { emitDataChanged } from '../../utils/events';
import { Skeleton } from '../common/SkeletonLoader';

export default function SplitSharesSummary({ transactionId, splitTotal, myShare }) {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await sharedExpenseService.listSharesForTransaction(transactionId);
      setShares(res);
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(share) {
    setBusyId(share.id);
    try {
      const updated = await sharedExpenseService.setShareSettled(share.id, !share.settled);
      setShares((prev) => prev.map((s) => (s.id === share.id ? updated : s)));
      emitDataChanged('all');
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-200 dark:border-brand-500/30 bg-brand-50/50 dark:bg-brand-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-bold text-brand-700 dark:text-brand-300">Split bill · {formatCurrency(splitTotal)} total</span>
        <span className="text-ink-500 dark:text-ink-400">Your share {formatCurrency(myShare)}</span>
      </div>
      <div className="space-y-1.5">
        {shares.map((s) => (
          <button
            type="button"
            key={s.id}
            disabled={busyId === s.id}
            onClick={() => toggle(s)}
            className="w-full flex items-center gap-2.5 bg-white dark:bg-ink-900 rounded-xl px-3 py-2.5 border border-ink-100 dark:border-ink-800 text-left disabled:opacity-60"
          >
            {s.settled ? (
              <CheckCircle2 size={18} className="text-income shrink-0" />
            ) : (
              <Circle size={18} className="text-ink-300 shrink-0" />
            )}
            <span className="flex-1 text-sm font-medium text-ink-800 dark:text-ink-100 truncate">{s.person}</span>
            <span className={`text-sm font-bold tabular-nums ${s.settled ? 'text-income' : 'text-ink-700 dark:text-ink-200'}`}>
              {formatCurrency(s.amount)}
            </span>
            <span className={`text-[10px] font-semibold uppercase tracking-wide ${s.settled ? 'text-income' : 'text-lend'}`}>
              {s.settled ? 'Settled' : 'Unsettled'}
            </span>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-ink-400">Tap a person to mark their share settled once they pay you back.</p>
    </div>
  );
}
