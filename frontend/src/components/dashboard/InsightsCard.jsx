import { useState } from 'react';
import { motion } from 'framer-motion';
import Card from '../common/Card';
import { PieBreakdown } from './CategoryPieChart';

const TABS = [
  { key: 'category', label: 'By Category' },
  { key: 'payment', label: 'By Payment' },
];

// A single card with a segmented control instead of two full pie-chart
// cards stacked on top of each other — same information, roughly half the
// scroll depth on mobile, and it reads as one coherent "insights" moment
// instead of two disconnected charts.
export default function InsightsCard({ byCategory, byPaymentMode }) {
  const [tab, setTab] = useState('category');

  return (
    <Card>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
        <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50">Spending Breakdown</h3>
        <div className="relative flex gap-1 bg-ink-100 dark:bg-ink-800 rounded-xl p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                tab === t.key ? 'text-brand-700 dark:text-brand-300' : 'text-ink-400'
              }`}
            >
              {tab === t.key && (
                <motion.span
                  layoutId="insights-tab-active"
                  className="absolute inset-0 bg-white dark:bg-ink-700 rounded-lg shadow-sm -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 34 }}
                />
              )}
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <PieBreakdown data={tab === 'category' ? byCategory : byPaymentMode} />
    </Card>
  );
}
