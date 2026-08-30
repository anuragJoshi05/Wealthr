import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2, Paperclip, X, Loader2, TrendingUp, TrendingDown, ArrowLeftRight,
  RotateCcw, HandCoins, CheckCircle2, Wallet, PlusCircle,
} from 'lucide-react';
import Input from '../common/Input';
import Select from '../common/Select';
import TextArea from '../common/TextArea';
import Button from '../common/Button';
import ConfirmDialog from '../common/ConfirmDialog';
import EmptyState from '../common/EmptyState';
import SplitBuilder from './SplitBuilder';
import SplitSharesSummary from './SplitSharesSummary';
import { PAYMENT_MODES, categoriesForType, SHARE_MODES } from '../../utils/constants';
import { toInputDateTime, formatCurrency } from '../../utils/formatters';
import { transactionService } from '../../services/transactionService';
import { sharedExpenseService } from '../../services/sharedExpenseService';
import { peopleService } from '../../services/peopleService';
import { accountService } from '../../services/accountService';
import { getApiErrorMessage } from '../../services/api';
import { notify } from '../../utils/toast';
import { emitDataChanged } from '../../utils/events';
import { useAuth } from '../../contexts/AuthContext';

const TYPE_CARDS = [
  { value: 'income', label: 'Income', icon: TrendingUp, tone: 'income' },
  { value: 'expense', label: 'Expense', icon: TrendingDown, tone: 'expense' },
  { value: 'refund', label: 'Refund', icon: RotateCcw, tone: 'refund' },
  { value: 'self_transfer', label: 'Self Transfer', icon: ArrowLeftRight, tone: 'brand' },
];

const TONE_CLASSES = {
  income: {
    active: 'border-income bg-emerald-50 dark:bg-emerald-500/10 text-income',
    icon: 'bg-emerald-100 dark:bg-emerald-500/20 text-income',
  },
  expense: {
    active: 'border-expense bg-rose-50 dark:bg-rose-500/10 text-expense',
    icon: 'bg-rose-100 dark:bg-rose-500/20 text-expense',
  },
  refund: {
    active: 'border-refund bg-cyan-50 dark:bg-cyan-500/10 text-refund',
    icon: 'bg-cyan-100 dark:bg-cyan-500/20 text-refund',
  },
  brand: {
    active: 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300',
    icon: 'bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300',
  },
};

function initialShareMode(initial) {
  if (initial?.isSplit) return 'i_paid';
  if (initial?.paidByPerson) return 'they_paid';
  return 'mine';
}

export default function TransactionForm({ initial, onDone, onCancel, defaultType = 'expense' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEdit = Boolean(initial?.id);
  const isLockedSplit = isEdit && initial?.isSplit;

  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  const [form, setForm] = useState(() => ({
    type: initial?.type === 'self_transfer' ? 'self_transfer' : initial?.type || defaultType,
    amount: initial?.amount ?? '',
    date: toInputDateTime(initial?.date),
    category: initial?.category || '',
    subcategory: initial?.subcategory || '',
    description: initial?.description || '',
    paymentMode: initial?.paymentMode || 'upi',
    accountId: initial?.accountId || '',
    toAccountId: initial?.toAccountId || '',
    person: initial?.person || '',
    tags: initial?.tags?.join(', ') || '',
    shareMode: initialShareMode(initial),
    paidByPerson: initial?.paidByPerson || '',
    shareSettled: initial?.shareSettled ?? false,
    splitTotal: initial?.splitTotalAmount ?? '',
    splitStrategy: 'equal',
    participants: [],
  }));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState(initial?.receiptUrl || null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState(null);
  const [loadingReceiptPreview, setLoadingReceiptPreview] = useState(false);
  const [knownPeople, setKnownPeople] = useState([]);

  useEffect(() => {
    peopleService.list().then(setKnownPeople).catch(() => {});
  }, []);

  useEffect(() => {
    accountService
      .list()
      .then((list) => {
        setAccounts(list);
        // Pre-select the default account on a brand-new transaction so
        // "just add it" is the common case — the person can still change it.
        if (!isEdit) {
          const def = list.find((a) => a.isDefault) || list[0];
          if (def) {
            setForm((f) => ({
              ...f,
              accountId: f.accountId || def.id,
            }));
          }
        }
      })
      .catch((err) => notify.error(getApiErrorMessage(err)))
      .finally(() => setLoadingAccounts(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (existingReceiptUrl && isEdit) {
      setLoadingReceiptPreview(true);
      transactionService
        .getReceiptUrl(existingReceiptUrl)
        .then(setReceiptPreviewUrl)
        .catch(() => {})
        .finally(() => setLoadingReceiptPreview(false));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = useMemo(() => categoriesForType(form.type), [form.type]);

  useEffect(() => {
    if (form.type === 'self_transfer') return;
    if (!categories.includes(form.category)) {
      setForm((f) => ({ ...f, category: '' }));
    }
  }, [form.type]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (form.type !== 'expense' && form.shareMode !== 'mine') {
      setForm((f) => ({ ...f, shareMode: 'mine' }));
    }
  }, [form.type]); // eslint-disable-line react-hooks/exhaustive-deps

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  const isSelfTransfer = form.type === 'self_transfer';
  const isSplitCreate = form.type === 'expense' && form.shareMode === 'i_paid' && !isEdit;
  const isFronted = form.type === 'expense' && form.shareMode === 'they_paid';

  const yourShareForSplit = useMemo(() => {
    if (!isSplitCreate) return 0;
    const total = Number(form.splitTotal) || 0;
    if (form.splitStrategy === 'equal') {
      const heads = form.participants.length + 1;
      return heads > 0 ? total / heads : 0;
    }
    return Math.max(0, total - form.participants.reduce((s, p) => s + (Number(p.amount) || 0), 0));
  }, [isSplitCreate, form.splitTotal, form.splitStrategy, form.participants]);

  function validate() {
    const errs = {};
    if (isSelfTransfer) {
      if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Enter a valid amount';
      if (!form.accountId) errs.accountId = 'Pick a source account';
      if (!form.toAccountId) errs.toAccountId = 'Pick a destination account';
      if (form.accountId && form.accountId === form.toAccountId) errs.toAccountId = 'Pick a different destination account';
    } else if (isSplitCreate) {
      if (!form.splitTotal || Number(form.splitTotal) <= 0) errs.splitTotal = 'Enter the total bill amount';
      if (!form.accountId) errs.accountId = 'Select an account';
      if (form.participants.length === 0) errs.participants = 'Add at least one other person';
      if (form.splitStrategy === 'custom') {
        const sum = form.participants.reduce((s, p) => s + (Number(p.amount) || 0), 0) + yourShareForSplit;
        if (Math.abs(sum - Number(form.splitTotal)) > 0.02) errs.participants = 'Shares must add up to the total bill';
      }
      if (form.participants.some((p) => !Number(p.amount) && form.splitStrategy === 'custom')) {
        errs.participants = 'Every person needs a share greater than zero';
      }
    } else {
      if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Enter a valid amount';
      if (!form.accountId) errs.accountId = 'Select an account';
      if (isFronted && !form.paidByPerson.trim()) errs.paidByPerson = 'Who paid this for you?';
    }
    if (!form.date) errs.date = 'Date is required';
    if (!isSelfTransfer && !form.category) errs.category = 'Select a category';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      let receiptUrl = existingReceiptUrl;
      if (receiptFile) {
        receiptUrl = await transactionService.uploadReceipt(receiptFile, user.id);
      }
      // A receipt was replaced or removed — delete the now-orphaned file
      // from storage instead of leaving it behind forever (see
      // utils/imageCompression.js / storage.sql for the rest of the
      // storage-efficiency work).
      if (isEdit && initial?.receiptUrl && initial.receiptUrl !== receiptUrl) {
        transactionService.deleteReceipt(initial.receiptUrl).catch(() => {});
      }

      const tags = form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [];

      if (isSplitCreate) {
        await sharedExpenseService.createSplit({
          amount: Math.round(yourShareForSplit * 100) / 100,
          splitTotal: Number(form.splitTotal),
          date: new Date(form.date).toISOString(),
          category: form.category,
          subcategory: form.subcategory || undefined,
          description: form.description || undefined,
          paymentMode: form.paymentMode,
          tags,
          shares: form.participants.map((p) => ({ person: p.person, amount: Number(p.amount) })),
          accountId: form.accountId,
        });
        form.participants.forEach((p) => peopleService.getOrCreate(p.person).catch(() => {}));
        notify.success('Split expense recorded');
        emitDataChanged('all');
        onDone?.();
        return;
      }

      if (isSelfTransfer && !isEdit) {
        await transactionService.createSelfTransfer({
          fromAccountId: form.accountId,
          toAccountId: form.toAccountId,
          amount: Number(form.amount),
          date: new Date(form.date).toISOString(),
          description: form.description || undefined,
        });
        notify.success('Self transfer recorded');
        emitDataChanged('all');
        onDone?.();
        return;
      }

      const payload = {
        type: form.type,
        amount: Number(form.amount),
        date: new Date(form.date).toISOString(),
        category: isSelfTransfer ? 'Self Transfer' : form.category,
        subcategory: form.subcategory || undefined,
        description: form.description || undefined,
        paymentMode: isSelfTransfer ? null : form.paymentMode,
        accountId: form.accountId,
        toAccountId: isSelfTransfer ? form.toAccountId : undefined,
        person: form.person || undefined,
        tags,
        receiptUrl,
      };

      if (form.type === 'expense') {
        payload.paidByPerson = isFronted ? form.paidByPerson.trim() : null;
        payload.shareSettled = isFronted ? form.shareSettled : true;
      }

      if (isEdit) {
        await transactionService.update(initial.id, payload);
        notify.success('Transaction updated');
      } else {
        await transactionService.create(payload);
        if (isFronted && form.paidByPerson.trim()) {
          peopleService.getOrCreate(form.paidByPerson.trim()).catch(() => {});
        }
        notify.success('Transaction added');
      }
      emitDataChanged('all');
      onDone?.();
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      if (initial.receiptUrl) {
        await transactionService.deleteReceipt(initial.receiptUrl);
      }
      await transactionService.remove(initial.id);
      notify.success('Transaction deleted');
      emitDataChanged('all');
      onDone?.();
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  // A transaction can never exist without a real account — block the whole
  // form (rather than letting someone submit and hit a DB error) and hand
  // them straight to account creation instead.
  if (!loadingAccounts && accounts.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Add an account first"
        description="Every transaction needs an account it belongs to — like a bank account, wallet, or cash. Add one to get started."
        action={
          <Button
            onClick={() => {
              onCancel?.();
              navigate('/accounts');
            }}
          >
            <PlusCircle size={16} /> Add Account
          </Button>
        }
      />
    );
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type selector — elevated cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {TYPE_CARDS.map((t) => {
          const Icon = t.icon;
          const active = form.type === t.value;
          const tone = TONE_CLASSES[t.tone];
          return (
            <motion.button
              key={t.value}
              type="button"
              disabled={isEdit}
              whileTap={isEdit ? {} : { scale: 0.96 }}
              onClick={() => update('type', t.value)}
              className={`flex flex-col items-center gap-1.5 py-3.5 rounded-2xl border-2 transition-all disabled:opacity-50 ${
                active ? `${tone.active} shadow-card` : 'border-ink-100 dark:border-ink-800 text-ink-400 hover:border-ink-200 dark:hover:border-ink-700'
              }`}
            >
              <span className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-colors ${active ? tone.icon : 'bg-ink-100 dark:bg-ink-800'}`}>
                <Icon size={17} />
              </span>
              <span className="text-xs font-bold">{t.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Amount — the hero input */}
      <div>
        <span className="block text-xs font-semibold text-ink-400 uppercase tracking-wide mb-1.5 text-center">
          {isSplitCreate ? 'Total Bill Amount' : isFronted ? 'Your Share' : 'Amount'}
        </span>
        <div className="flex items-center justify-center gap-1 rounded-3xl bg-gradient-to-b from-ink-50 to-ink-100/60 dark:from-ink-800/60 dark:to-ink-800/30 py-5 px-4 ring-1 ring-inset ring-ink-100 dark:ring-ink-800">
          <span className="text-2xl font-bold text-ink-300 dark:text-ink-600">₹</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={isSplitCreate ? form.splitTotal : form.amount}
            onChange={(e) => update(isSplitCreate ? 'splitTotal' : 'amount', e.target.value)}
            disabled={isLockedSplit}
            className="flex-1 min-w-0 bg-transparent text-4xl font-extrabold text-ink-900 dark:text-ink-50 text-center focus:outline-none placeholder:text-ink-300 dark:placeholder:text-ink-700 disabled:opacity-60"
          />
        </div>
        {(errors.amount || errors.splitTotal) && (
          <p className="text-xs text-expense mt-1.5 text-center">{errors.amount || errors.splitTotal}</p>
        )}
        {isSplitCreate && Number(form.splitTotal) > 0 && (
          <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold mt-1.5 text-center">
            Your share: {formatCurrency(yourShareForSplit)}
          </p>
        )}
        {form.type === 'refund' && (
          <p className="text-xs text-refund font-medium mt-1.5 text-center">
            Money returned from a previous expense — not counted as income.
          </p>
        )}
      </div>

      {/* Expense sharing mode */}
      {form.type === 'expense' && !isLockedSplit && (
        <div>
          <span className="block text-sm font-medium text-ink-600 dark:text-ink-300 mb-1.5">Who paid?</span>
          <div className="grid grid-cols-3 gap-2">
            {SHARE_MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                disabled={isEdit && m.value !== form.shareMode && (m.value === 'i_paid')}
                onClick={() => update('shareMode', m.value)}
                className={`text-xs font-semibold px-2 py-2.5 rounded-xl border transition-colors leading-tight disabled:opacity-40 disabled:cursor-not-allowed ${
                  form.shareMode === m.value
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300'
                    : 'border-ink-200 dark:border-ink-700 text-ink-500 dark:text-ink-400 hover:border-ink-300'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLockedSplit && (
        <SplitSharesSummary transactionId={initial.id} splitTotal={initial.splitTotalAmount} myShare={initial.amount} />
      )}

      <AnimatePresence initial={false}>
        {isSplitCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <SplitBuilder
              total={form.splitTotal}
              participants={form.participants}
              onChange={(p) => update('participants', p)}
              strategy={form.splitStrategy}
              onStrategyChange={(s) => update('splitStrategy', s)}
            />
            {errors.participants && <p className="text-xs text-expense mt-1.5">{errors.participants}</p>}
          </motion.div>
        )}

        {isFronted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-2xl border border-lend/30 bg-amber-50/60 dark:bg-amber-500/5 p-4 space-y-3"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-lend">
              <HandCoins size={16} />
              Someone covered this for you
            </div>
            <Input
              label="Who paid?"
              placeholder="Name"
              list="fronted-known-people"
              value={form.paidByPerson}
              onChange={(e) => update('paidByPerson', e.target.value)}
              error={errors.paidByPerson}
            />
            <datalist id="fronted-known-people">
              {knownPeople.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
            <button
              type="button"
              onClick={() => update('shareSettled', !form.shareSettled)}
              className="w-full flex items-center gap-2.5 bg-white dark:bg-ink-900 rounded-xl px-3.5 py-2.5 border border-ink-100 dark:border-ink-800 text-left"
            >
              <CheckCircle2 size={18} className={form.shareSettled ? 'text-income' : 'text-ink-300'} />
              <span className="text-sm text-ink-700 dark:text-ink-200">
                {form.shareSettled ? "I've already paid them back" : 'Still unsettled — I owe them for this'}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Input
        label="Date & Time"
        type="datetime-local"
        value={form.date}
        onChange={(e) => update('date', e.target.value)}
        error={errors.date}
      />

      {isSelfTransfer ? (
        <div className="grid grid-cols-2 gap-3">
          <Select label="From Account" value={form.accountId} onChange={(e) => update('accountId', e.target.value)} error={errors.accountId}>
            <option value="">Select account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
          <Select label="To Account" value={form.toAccountId} onChange={(e) => update('toAccountId', e.target.value)} error={errors.toAccountId}>
            <option value="">Select account</option>
            {accounts.filter((a) => a.id !== form.accountId).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>
        </div>
      ) : (
        <>
          {!isLockedSplit && (
            <Select label="Category" value={form.category} onChange={(e) => update('category', e.target.value)} error={errors.category}>
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          )}

          <Input
            label="Subcategory (optional)"
            placeholder="e.g. Coffee, Fuel, Netflix"
            value={form.subcategory}
            onChange={(e) => update('subcategory', e.target.value)}
          />

          <Select label="Account" value={form.accountId} onChange={(e) => update('accountId', e.target.value)} error={errors.accountId}>
            <option value="">Select account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}{a.isDefault ? ' (Default)' : ''}</option>
            ))}
          </Select>

          {form.shareMode === 'mine' && (
            <Input
              label="Person (optional)"
              placeholder="Name"
              value={form.person}
              onChange={(e) => update('person', e.target.value)}
            />
          )}

          <Select label="Payment Mode" value={form.paymentMode} onChange={(e) => update('paymentMode', e.target.value)}>
            {PAYMENT_MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </Select>
        </>
      )}

      <TextArea
        label="Notes (optional)"
        rows={2}
        placeholder="Add a note..."
        value={form.description}
        onChange={(e) => update('description', e.target.value)}
      />

      {!isSelfTransfer && (
        <Input
          label="Tags (comma separated, optional)"
          placeholder="e.g. work, urgent"
          value={form.tags}
          onChange={(e) => update('tags', e.target.value)}
        />
      )}

      {!isSelfTransfer && (
        <div>
          <span className="block text-sm font-medium text-ink-600 dark:text-ink-300 mb-1.5">
            Receipt (optional)
          </span>
          {receiptFile ? (
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800">
              <span className="text-sm text-ink-700 dark:text-ink-200 truncate flex items-center gap-2">
                <Paperclip size={14} /> {receiptFile.name}
              </span>
              <button type="button" onClick={() => setReceiptFile(null)} className="text-ink-400 hover:text-expense">
                <X size={16} />
              </button>
            </div>
          ) : existingReceiptUrl ? (
            <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800">
              {loadingReceiptPreview ? (
                <span className="flex items-center gap-2 text-sm text-ink-400">
                  <Loader2 size={14} className="animate-spin" /> Loading receipt...
                </span>
              ) : receiptPreviewUrl ? (
                <a href={receiptPreviewUrl} target="_blank" rel="noreferrer" className="text-sm text-brand-600 dark:text-brand-400 font-medium flex items-center gap-2">
                  <Paperclip size={14} /> View attached receipt
                </a>
              ) : (
                <span className="text-sm text-ink-400">Receipt attached</span>
              )}
              <button
                type="button"
                onClick={() => {
                  setExistingReceiptUrl(null);
                  setReceiptPreviewUrl(null);
                }}
                className="text-ink-400 hover:text-expense"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl border border-dashed border-ink-300 dark:border-ink-700 text-sm text-ink-500 dark:text-ink-400 cursor-pointer hover:border-brand-400 hover:text-brand-600 transition-colors">
              <Paperclip size={15} />
              Attach a photo of the receipt
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              />
            </label>
          )}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" fullWidth loading={submitting}>
          {isEdit ? 'Save Changes' : isSplitCreate ? 'Record Split Expense' : isSelfTransfer ? 'Record Transfer' : 'Add Transaction'}
        </Button>
      </div>

      {isEdit && (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="flex items-center justify-center gap-1.5 w-full text-sm font-semibold text-expense hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl py-2.5 transition-colors"
        >
          <Trash2 size={14} />
          Delete Transaction
        </button>
      )}
    </form>

    {isEdit && (
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete transaction?"
        message={
          initial?.isSplit
            ? "This can't be undone. The split expense and every participant's share will be permanently removed."
            : "This can't be undone. The transaction will be permanently removed."
        }
        loading={deleting}
      />
    )}
    </>
  );
}
