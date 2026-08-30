import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, PlusCircle, Wallet } from 'lucide-react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Select from '../common/Select';
import TextArea from '../common/TextArea';
import Button from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';
import Badge from '../common/Badge';
import EmptyState from '../common/EmptyState';
import { formatCurrency, formatDate, toInputDate } from '../../utils/formatters';
import { lendingService } from '../../services/lendingService';
import { accountService } from '../../services/accountService';
import { getApiErrorMessage } from '../../services/api';
import { notify } from '../../utils/toast';
import { emitDataChanged } from '../../utils/events';

const statusColor = { pending: 'neutral', partially_paid: 'lend', completed: 'income' };
const statusLabel = { pending: 'Pending', partially_paid: 'Partially Paid', completed: 'Completed' };

export default function LendingDetail({ id, open, onClose }) {
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRepayForm, setShowRepayForm] = useState(false);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayDate, setRepayDate] = useState(toInputDate());
  const [repayNote, setRepayNote] = useState('');
  const [repayAccountId, setRepayAccountId] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settling, setSettling] = useState(false);

  useEffect(() => {
    if (!open) return;
    accountService
      .list()
      .then((list) => {
        setAccounts(list);
        const def = list.find((a) => a.isDefault) || list[0];
        if (def) setRepayAccountId(def.id);
      })
      .catch(() => {});
  }, [open]);

  async function handleMarkSettled() {
    if (!repayAccountId) {
      notify.error('Select which account this settles through');
      return;
    }
    setSettling(true);
    try {
      await lendingService.addRepayment(id, {
        amount: item.remainingAmount,
        date: new Date().toISOString(),
        note: 'Marked as fully settled',
        accountId: repayAccountId,
      });
      notify.success(isLent ? 'Marked as paid back in full' : 'Marked as paid off in full');
      const fresh = await lendingService.get(id);
      setItem(fresh);
      emitDataChanged('all');
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setSettling(false);
    }
  }

  useEffect(() => {
    if (!open || !id) return;
    setLoading(true);
    lendingService
      .get(id)
      .then(setItem)
      .catch((err) => notify.error(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [open, id]);

  async function handleAddRepayment(e) {
    e.preventDefault();
    if (!repayAmount || Number(repayAmount) <= 0) {
      notify.error('Enter a valid repayment amount');
      return;
    }
    if (!repayAccountId) {
      notify.error('Select an account');
      return;
    }
    setSubmitting(true);
    try {
      await lendingService.addRepayment(id, {
        amount: Number(repayAmount),
        date: new Date(repayDate).toISOString(),
        note: repayNote || undefined,
        accountId: repayAccountId,
      });
      notify.success('Repayment recorded');
      const fresh = await lendingService.get(id);
      setItem(fresh);
      setShowRepayForm(false);
      setRepayAmount('');
      setRepayNote('');
      emitDataChanged('all');
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await lendingService.remove(id);
      notify.success('Record deleted');
      emitDataChanged('all');
      onClose();
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  const isLent = item?.direction === 'lent';

  return (
    <>
      <Modal open={open} onClose={onClose} title={loading ? 'Loading...' : item?.person} size="md">
        {loading || !item ? (
          <div className="animate-pulse space-y-3">
            <div className="h-20 bg-ink-100 dark:bg-ink-800 rounded-xl" />
            <div className="h-10 bg-ink-100 dark:bg-ink-800 rounded-xl" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-ink-400 mb-1">{isLent ? 'You lent' : 'You borrowed'}</p>
                <p className="text-2xl font-extrabold text-ink-900 dark:text-ink-50">
                  {formatCurrency(item.amount)}
                </p>
              </div>
              <Badge color={statusColor[item.status]}>{statusLabel[item.status]}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-ink-50 dark:bg-ink-800">
                <p className="text-xs text-ink-400">Repaid</p>
                <p className="text-sm font-bold text-income mt-0.5">{formatCurrency(item.repaidAmount)}</p>
              </div>
              <div className="p-3 rounded-xl bg-ink-50 dark:bg-ink-800">
                <p className="text-xs text-ink-400">Remaining</p>
                <p className={`text-sm font-bold mt-0.5 ${isLent ? 'text-lend' : 'text-borrow'}`}>
                  {formatCurrency(item.remainingAmount)}
                </p>
              </div>
            </div>

            <div className="text-xs text-ink-400 space-y-1">
              <p>Date: {formatDate(item.date)}</p>
              {item.dueDate && <p>Due: {formatDate(item.dueDate)}</p>}
              {item.note && <p>Note: {item.note}</p>}
            </div>

            {item.status !== 'completed' && accounts.length === 0 && (
              <EmptyState
                icon={Wallet}
                title="Add an account first"
                description="Repayments move money through one of your accounts."
                action={
                  <Button onClick={() => { onClose?.(); navigate('/accounts'); }}>
                    <PlusCircle size={16} /> Add Account
                  </Button>
                }
              />
            )}
            {item.status !== 'completed' && accounts.length > 0 && (
              <>
                <Select
                  label="Settle through account"
                  value={repayAccountId}
                  onChange={(e) => setRepayAccountId(e.target.value)}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}{a.isDefault ? ' (Default)' : ''}</option>
                  ))}
                </Select>
                {!showRepayForm ? (
                  <div className="flex gap-2">
                    <Button variant="outline" fullWidth onClick={() => setShowRepayForm(true)}>
                      Record Partial
                    </Button>
                    <Button fullWidth loading={settling} onClick={handleMarkSettled}>
                      Mark Fully Settled
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleAddRepayment} className="space-y-3 p-3.5 rounded-xl bg-ink-50 dark:bg-ink-800">
                    <Input
                      label="Repayment Amount"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      max={item.remainingAmount}
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value)}
                    />
                    <Input label="Date" type="date" value={repayDate} onChange={(e) => setRepayDate(e.target.value)} />
                    <TextArea label="Note (optional)" rows={2} value={repayNote} onChange={(e) => setRepayNote(e.target.value)} />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" fullWidth onClick={() => setShowRepayForm(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" fullWidth loading={submitting}>
                        Confirm
                      </Button>
                    </div>
                  </form>
                )}
              </>
            )}

            <div>
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-2">Repayment History</p>
              {item.repayments?.length ? (
                <div className="space-y-2">
                  {item.repayments.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800">
                      <div>
                        <p className="text-sm font-semibold text-ink-900 dark:text-ink-50">{formatCurrency(r.amount)}</p>
                        <p className="text-xs text-ink-400">{formatDate(r.date)}{r.note ? ` · ${r.note}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-400">No repayments recorded yet.</p>
              )}
            </div>

            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center justify-center gap-1.5 w-full text-sm font-semibold text-expense hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl py-2.5 transition-colors"
            >
              <Trash2 size={14} />
              Delete Record
            </button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete this record?"
        message="This removes the lending/borrowing record along with its full repayment history. This can't be undone."
        loading={deleting}
      />
    </>
  );
}
