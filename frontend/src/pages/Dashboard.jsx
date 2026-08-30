import { useState, useEffect, useCallback, useRef } from 'react';
import SummaryCards from '../components/dashboard/SummaryCards';
import QuickActions from '../components/dashboard/QuickActions';
import InsightsCard from '../components/dashboard/InsightsCard';
import RecentTransactions from '../components/dashboard/RecentTransactions';
import { DashboardSkeleton } from '../components/common/SkeletonLoader';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';
import { analyticsService } from '../services/analyticsService';
import { getApiErrorMessage } from '../services/api';
import { useDataChangedListener } from '../utils/events';

// Small helper: waits ms, resolving with undefined — used only for the
// one silent auto-retry below.
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function Dashboard({ onEditTransaction, onAddTransaction }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Tracks whether the in-flight load() call is still the most recent one,
  // so a slow first attempt can't overwrite a newer result if the person
  // has already navigated away and back.
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsService.dashboard();
      if (requestIdRef.current === requestId) setData(res);
    } catch (err) {
      // A transient hiccup right after sign-in or a background token
      // refresh (rather than a real, persistent failure) is the only
      // scenario this guards against — one quiet retry, no spinner change,
      // no error flash. If it fails again, the normal error state below
      // takes over and offers a manual retry.
      await wait(700);
      if (requestIdRef.current !== requestId) return;
      try {
        const res = await analyticsService.dashboard();
        if (requestIdRef.current === requestId) setData(res);
      } catch (err2) {
        if (requestIdRef.current === requestId) setError(getApiErrorMessage(err2));
      }
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useDataChangedListener(load, ['all']);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return <EmptyState title="Couldn't load dashboard" description={error} action={<Button onClick={load}>Retry</Button>} />;
  }

  return (
    <div className="space-y-4">
      <SummaryCards data={data} />
      <QuickActions onAddTransaction={onAddTransaction} />
      <InsightsCard byCategory={data.spendingByCategory} byPaymentMode={data.spendingByPaymentMode} />
      <RecentTransactions items={data.recentTransactions} onEdit={onEditTransaction} />
    </div>
  );
}
