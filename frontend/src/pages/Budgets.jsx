import { useState, useEffect, useCallback } from 'react';
import { PiggyBank, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import BudgetCard from '../components/budget/BudgetCard';
import BudgetForm from '../components/budget/BudgetForm';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';
import { Skeleton } from '../components/common/SkeletonLoader';
import { budgetService } from '../services/budgetService';
import { getApiErrorMessage } from '../services/api';
import { notify } from '../utils/toast';
import { useDataChangedListener } from '../utils/events';
import { currentMonthKey } from '../utils/formatters';

function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

export default function Budgets() {
  const [month, setMonth] = useState(currentMonthKey());
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await budgetService.list(month);
      setItems(res.items);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  useDataChangedListener(load, ['all']);

  async function handleDelete() {
    setDeleting(true);
    try {
      await budgetService.remove(toDelete.id);
      notify.success('Budget deleted');
      setToDelete(null);
      load();
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-white dark:bg-ink-900 border border-ink-100 dark:border-ink-800 rounded-2xl p-1 shadow-card">
          <button onClick={() => setMonth((m) => shiftMonth(m, -1))} className="p-2 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-ink-900 dark:text-ink-50 w-32 text-center">{monthLabel(month)}</span>
          <button onClick={() => setMonth((m) => shiftMonth(m, 1))} className="p-2 rounded-xl hover:bg-ink-100 dark:hover:bg-ink-800 text-ink-500">
            <ChevronRight size={18} />
          </button>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Add
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load budgets" description={error} action={<Button onClick={load}>Retry</Button>} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="No budgets set for this month"
          description="Set spending limits per category to stay on track."
          action={<Button onClick={() => setShowForm(true)}>Create Budget</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((b) => (
            <BudgetCard key={b.id} budget={b} onDelete={setToDelete} />
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Budget" size="md">
        <BudgetForm month={month} onDone={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Delete this budget?"
        message={`This removes the budget for "${toDelete?.category}". Past spending data isn't affected.`}
        loading={deleting}
      />
    </div>
  );
}
