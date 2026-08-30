import { useState, useEffect, useCallback, useMemo } from 'react';
import { Receipt, FileDown } from 'lucide-react';
import TransactionItem from './TransactionItem';
import TransactionFilters from './TransactionFilters';
import ExportStatementModal from './ExportStatementModal';
import { TransactionListSkeleton } from '../common/SkeletonLoader';
import EmptyState from '../common/EmptyState';
import Button from '../common/Button';
import { transactionService } from '../../services/transactionService';
import { getApiErrorMessage } from '../../services/api';
import { notify } from '../../utils/toast';
import { useDataChangedListener } from '../../utils/events';
import { formatDate } from '../../utils/formatters';

const EMPTY_FILTERS = { type: '', category: '', paymentMode: '', person: '', accountId: '', startDate: '', endDate: '' };

export default function TransactionList({ search, onEdit, accountId, hideFilters, hideExport }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [showExport, setShowExport] = useState(false);

  const params = useMemo(() => {
    const p = {};
    if (filters.type) p.type = filters.type;
    if (filters.category) p.category = filters.category;
    if (filters.paymentMode) p.paymentMode = filters.paymentMode;
    if (filters.person) p.person = filters.person;
    if (filters.accountId) p.accountId = filters.accountId;
    if (filters.startDate) p.startDate = filters.startDate;
    if (filters.endDate) p.endDate = filters.endDate;
    if (accountId) p.accountId = accountId;
    if (search) p.search = search;
    return p;
  }, [filters, search, accountId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await transactionService.list({ ...params, page: 0 });
      setItems(res.items);
      setHasMore(res.hasMore);
      setPage(1);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  useDataChangedListener(load, ['all']);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const res = await transactionService.list({ ...params, page });
      setItems((prev) => [...prev, ...res.items]);
      setHasMore(res.hasMore);
      setPage((p) => p + 1);
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  }

  const grouped = useMemo(() => {
    const groups = {};
    items.forEach((tx) => {
      const key = formatDate(tx.date);
      if (!groups[key]) groups[key] = [];
      groups[key].push(tx);
    });
    return groups;
  }, [items]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {!hideFilters ? <TransactionFilters filters={filters} onChange={setFilters} /> : <div />}
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-ink-400">{items.length} transaction{items.length !== 1 ? 's' : ''}</span>
          {!hideExport && (
            <button
              onClick={() => setShowExport(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-sm font-medium text-ink-600 dark:text-ink-300 hover:border-brand-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors shadow-card"
            >
              <FileDown size={15} />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <TransactionListSkeleton />
      ) : error ? (
        <EmptyState
          title="Couldn't load transactions"
          description={error}
          action={<Button onClick={load}>Retry</Button>}
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No transactions yet"
          description="Tap the + button to add your first income, expense, or transfer."
        />
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([date, txs]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-2 px-1">{date}</p>
              <div className="space-y-2">
                {txs.map((tx) => (
                  <TransactionItem key={tx.id} tx={tx} onEdit={onEdit} />
                ))}
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="pt-2">
              <Button variant="outline" fullWidth loading={loadingMore} onClick={loadMore}>
                Load More
              </Button>
            </div>
          )}
        </div>
      )}

      <ExportStatementModal open={showExport} onClose={() => setShowExport(false)} />
    </div>
  );
}
