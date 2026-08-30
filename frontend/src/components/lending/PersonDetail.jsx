import { useState, useEffect, useCallback } from 'react';
import { Trash2, HandCoins, Users, CheckCircle2, Circle } from 'lucide-react';
import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import LendingItem from './LendingItem';
import LendingDetail from './LendingDetail';
import { Skeleton } from '../common/SkeletonLoader';
import EmptyState from '../common/EmptyState';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { lendingService } from '../../services/lendingService';
import { peopleService } from '../../services/peopleService';
import { sharedExpenseService } from '../../services/sharedExpenseService';
import { getApiErrorMessage } from '../../services/api';
import { notify } from '../../utils/toast';
import { useDataChangedListener } from '../../utils/events';

function ShareRow({ label, amount, settled, onToggle, busy }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onToggle}
      className="w-full flex items-center gap-2.5 bg-white dark:bg-ink-900 rounded-xl px-3 py-2.5 border border-ink-100 dark:border-ink-800 text-left disabled:opacity-60"
    >
      {settled ? <CheckCircle2 size={17} className="text-income shrink-0" /> : <Circle size={17} className="text-ink-300 shrink-0" />}
      <span className="flex-1 text-sm text-ink-700 dark:text-ink-200 truncate">{label}</span>
      <span className={`text-sm font-bold tabular-nums ${settled ? 'text-income' : 'text-ink-900 dark:text-ink-50'}`}>
        {formatCurrency(amount)}
      </span>
    </button>
  );
}

export default function PersonDetail({ person, personId, open, onClose }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [confirmRemovePerson, setConfirmRemovePerson] = useState(false);

  const [sharesOwed, setSharesOwed] = useState([]);
  const [fronted, setFronted] = useState([]);
  const [loadingSharing, setLoadingSharing] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!person) return;
    setLoading(true);
    try {
      const res = await lendingService.list({ person });
      setRecords(res.items);
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [person]);

  const loadSharing = useCallback(async () => {
    if (!person) return;
    setLoadingSharing(true);
    try {
      const [owed, frontedList] = await Promise.all([
        sharedExpenseService.listSharesForPerson(person),
        sharedExpenseService.listFrontedForPerson(person),
      ]);
      setSharesOwed(owed);
      setFronted(frontedList);
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setLoadingSharing(false);
    }
  }, [person]);

  useEffect(() => {
    if (open) {
      load();
      loadSharing();
    }
  }, [open, load, loadSharing]);

  useDataChangedListener(load, ['all']);
  useDataChangedListener(loadSharing, ['all']);

  const netBalance = records.reduce(
    (sum, r) => sum + (r.direction === 'lent' ? r.remainingAmount : -r.remainingAmount),
    0
  );

  const sharingNet =
    sharesOwed.filter((s) => !s.settled).reduce((s, r) => s + r.amount, 0) -
    fronted.filter((f) => !f.share_settled).reduce((s, r) => s + Number(r.amount), 0);

  async function toggleShareOwed(share) {
    setBusyId(share.id);
    try {
      await sharedExpenseService.setShareSettled(share.id, !share.settled);
      await loadSharing();
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function toggleFronted(tx) {
    setBusyId(tx.id);
    try {
      await sharedExpenseService.setTransactionShareSettled(tx.id, !tx.share_settled);
      await loadSharing();
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemovePerson() {
    try {
      if (personId) await peopleService.remove(personId);
      notify.success('Contact removed');
      onClose();
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title={person} size="md">
        <div className="space-y-5">
          {/* ---- Lending & Borrowing ---- */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-400 mb-2">
              <HandCoins size={13} /> Lending &amp; Borrowing
            </div>
            <div className="p-4 rounded-2xl bg-ink-50 dark:bg-ink-800 text-center mb-3">
              <p className="text-xs text-ink-400 mb-1">
                {netBalance > 0 ? 'Owes you' : netBalance < 0 ? 'You owe' : 'All settled up'}
              </p>
              <p className={`text-2xl font-extrabold ${netBalance > 0 ? 'text-lend' : netBalance < 0 ? 'text-borrow' : 'text-ink-400'}`}>
                {formatCurrency(Math.abs(netBalance))}
              </p>
            </div>

            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                ))}
              </div>
            ) : records.length === 0 ? (
              <EmptyState icon={HandCoins} title="No records" description="Nothing tracked with this person yet." />
            ) : (
              <div className="space-y-2">
                {records.map((r) => (
                  <LendingItem key={r.id} item={r} onClick={() => setSelectedId(r.id)} />
                ))}
              </div>
            )}
          </div>

          {/* ---- Shared Expenses — deliberately separate from Lending ---- */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-500 mb-2">
              <Users size={13} /> Shared Expenses
            </div>
            <div className="p-4 rounded-2xl bg-brand-50/60 dark:bg-brand-500/5 text-center mb-3">
              <p className="text-xs text-ink-400 mb-1">
                {sharingNet > 0 ? 'Owes you' : sharingNet < 0 ? 'You owe' : 'All settled up'}
              </p>
              <p className={`text-2xl font-extrabold ${sharingNet > 0 ? 'text-lend' : sharingNet < 0 ? 'text-borrow' : 'text-ink-400'}`}>
                {formatCurrency(Math.abs(sharingNet))}
              </p>
            </div>

            {loadingSharing ? (
              <Skeleton className="h-20 w-full rounded-2xl" />
            ) : sharesOwed.length === 0 && fronted.length === 0 ? (
              <EmptyState icon={Users} title="No shared bills" description="Split a bill with this person to see it here." />
            ) : (
              <div className="space-y-1.5">
                {sharesOwed.map((s) => (
                  <ShareRow
                    key={s.id}
                    label={`${formatDate(s.transactionDate)} · ${s.transactionCategory || 'Shared expense'}`}
                    amount={s.amount}
                    settled={s.settled}
                    busy={busyId === s.id}
                    onToggle={() => toggleShareOwed(s)}
                  />
                ))}
                {fronted.map((tx) => (
                  <ShareRow
                    key={tx.id}
                    label={`${formatDate(tx.date)} · They paid your share · ${tx.category}`}
                    amount={-tx.amount}
                    settled={tx.share_settled}
                    busy={busyId === tx.id}
                    onToggle={() => toggleFronted(tx)}
                  />
                ))}
              </div>
            )}
          </div>

          {personId && (
            <button
              onClick={() => setConfirmRemovePerson(true)}
              className="flex items-center justify-center gap-1.5 w-full text-sm font-semibold text-expense hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl py-2.5 transition-colors"
            >
              <Trash2 size={14} />
              Remove Contact
            </button>
          )}
        </div>
      </Modal>

      <LendingDetail id={selectedId} open={Boolean(selectedId)} onClose={() => setSelectedId(null)} />

      <ConfirmDialog
        open={confirmRemovePerson}
        onClose={() => setConfirmRemovePerson(false)}
        onConfirm={handleRemovePerson}
        title="Remove this contact?"
        message="This only removes them from your saved People list — their lending, borrowing, and shared expense history is kept."
      />
    </>
  );
}
