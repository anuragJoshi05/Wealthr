import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, Plus, Wallet, Star, Trash2, Pencil, ArrowDownCircle, ArrowUpCircle, RotateCcw, ArrowLeftRight } from 'lucide-react';
import AccountCard from '../components/accounts/AccountCard';
import AccountCarousel from '../components/accounts/AccountCarousel';
import AccountForm from '../components/accounts/AccountForm';
import TransactionList from '../components/transactions/TransactionList';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';
import { CardSkeleton } from '../components/common/SkeletonLoader';
import { accountService } from '../services/accountService';
import { transactionService } from '../services/transactionService';
import { summarize } from '../utils/analyticsEngine';
import { formatCurrency } from '../utils/formatters';
import { getApiErrorMessage } from '../services/api';
import { notify } from '../utils/toast';
import { useDataChangedListener, emitDataChanged } from '../utils/events';

function StatPill({ icon: Icon, label, value, tone }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-ink-50 dark:bg-ink-800/60 px-3.5 py-3">
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
        <Icon size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-ink-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-bold text-ink-900 dark:text-ink-50 truncate">{formatCurrency(value)}</p>
      </div>
    </div>
  );
}

function AccountDetail({ account, onBack, onEditTransaction }) {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await transactionService.listAll({ accountId: account.id });
      setTxs(data);
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [account.id]);

  useEffect(() => {
    load();
  }, [load]);
  useDataChangedListener(load, ['all']);

  // Account-wise income / expense / refund / transfer analytics. Self
  // transfers are split into "in" vs "out" legs relative to THIS account
  // (a transfer can be the source for one account and destination for
  // another), and are always kept out of income/expense — see
  // analyticsEngine.summarize().
  const stats = useMemo(() => {
    const ownFlows = txs.filter((t) => t.type !== 'self_transfer' || t.accountId === account.id);
    const s = summarize(ownFlows.filter((t) => t.type !== 'self_transfer'));
    const transferOut = txs
      .filter((t) => t.type === 'self_transfer' && t.accountId === account.id)
      .reduce((sum, t) => sum + t.amount, 0);
    const transferIn = txs
      .filter((t) => t.type === 'self_transfer' && t.toAccountId === account.id)
      .reduce((sum, t) => sum + t.amount, 0);
    return { ...s, transferOut, transferIn };
  }, [txs, account.id]);

  return (
    <div className="space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-ink-900 dark:hover:text-ink-100 transition-colors"
      >
        <ChevronLeft size={16} /> All Accounts
      </button>

      <div className="rounded-2xl bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 p-5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-extrabold text-ink-900 dark:text-ink-50">{account.name}</h2>
          {account.isDefault && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10 rounded-full px-1.5 py-0.5">
              <Star size={9} fill="currentColor" /> DEFAULT
            </span>
          )}
        </div>
        <p className="text-3xl font-extrabold text-ink-900 dark:text-ink-50 mt-1">{formatCurrency(account.balance)}</p>

        {loading ? (
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <StatPill icon={ArrowUpCircle} label="Income" value={stats.income} tone="bg-emerald-100 dark:bg-emerald-500/20 text-income" />
            <StatPill icon={ArrowDownCircle} label="Expense" value={stats.expense} tone="bg-rose-100 dark:bg-rose-500/20 text-expense" />
            <StatPill icon={RotateCcw} label="Refunds" value={stats.refund} tone="bg-cyan-100 dark:bg-cyan-500/20 text-refund" />
            <StatPill icon={ArrowLeftRight} label="Transferred (net)" value={stats.transferIn - stats.transferOut} tone="bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-300" />
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-bold text-ink-700 dark:text-ink-200 mb-2 px-1">Transaction History</h3>
        <TransactionList accountId={account.id} onEdit={onEditTransaction} hideFilters hideExport />
      </div>
    </div>
  );
}

export default function Accounts({ onEditTransaction }) {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formState, setFormState] = useState({ open: false, account: null });
  const [selectedId, setSelectedId] = useState(null);
  const [menuAccount, setMenuAccount] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await accountService.balances();
      setAccounts(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useDataChangedListener(load, ['all']);

  const total = accounts.reduce((sum, a) => sum + a.balance, 0);
  const selected = accounts.find((a) => a.id === selectedId);

  async function handleDelete() {
    setDeleting(true);
    try {
      await accountService.remove(confirmDeleteId);
      notify.success('Account deleted');
      setConfirmDeleteId(null);
      emitDataChanged('all');
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  if (selected) {
    return (
      <>
        <AccountDetail account={selected} onBack={() => setSelectedId(null)} onEditTransaction={onEditTransaction} />
        <Modal open={formState.open} onClose={() => setFormState({ open: false, account: null })} title="Edit Account">
          <AccountForm
            initial={formState.account}
            hasAccounts={accounts.length > 0}
            onDone={() => setFormState({ open: false, account: null })}
            onCancel={() => setFormState({ open: false, account: null })}
          />
        </Modal>
      </>
    );
  }

  return (
    <div className="space-y-5">
      {loading ? (
        <CardSkeleton className="h-40 rounded-3xl" />
      ) : (
        !error && accounts.length > 0 && <AccountCarousel accounts={accounts} total={total} onSelect={setSelectedId} />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink-700 dark:text-ink-200">Your Accounts</h2>
        <Button size="sm" onClick={() => setFormState({ open: true, account: null })}>
          <Plus size={15} /> Add Account
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load accounts" description={error} action={<Button onClick={load}>Retry</Button>} />
      ) : accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No accounts yet"
          description="Add a bank account, wallet, or cash account to start tracking your money."
          action={<Button onClick={() => setFormState({ open: true, account: null })}><Plus size={15} /> Add Account</Button>}
        />
      ) : (
        <div className="space-y-2.5">
          {accounts.map((a) => (
            <AccountCard key={a.id} account={a} onClick={() => setSelectedId(a.id)} onMore={() => setMenuAccount(a)} />
          ))}
        </div>
      )}

      {/* Action sheet — replaces the old hover-only edit/delete icons, which
          were unreachable on touch devices. */}
      <Modal open={Boolean(menuAccount)} onClose={() => setMenuAccount(null)} title={menuAccount?.name} size="sm">
        <div className="space-y-2">
          <button
            onClick={() => {
              setFormState({ open: true, account: menuAccount });
              setMenuAccount(null);
            }}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-ink-50 dark:hover:bg-ink-800 transition-colors text-sm font-semibold text-ink-700 dark:text-ink-200"
          >
            <Pencil size={17} /> Edit account
          </button>
          <button
            onClick={() => {
              setConfirmDeleteId(menuAccount.id);
              setMenuAccount(null);
            }}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-sm font-semibold text-expense"
          >
            <Trash2 size={17} /> Delete account
          </button>
        </div>
      </Modal>

      <Modal open={formState.open} onClose={() => setFormState({ open: false, account: null })} title={formState.account ? 'Edit Account' : 'Add Account'}>
        <AccountForm
          initial={formState.account}
          hasAccounts={accounts.length > 0}
          onDone={() => setFormState({ open: false, account: null })}
          onCancel={() => setFormState({ open: false, account: null })}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete account?"
        message="This can't be undone. You can only delete an account once it has no transactions on it."
        loading={deleting}
      />
    </div>
  );
}
