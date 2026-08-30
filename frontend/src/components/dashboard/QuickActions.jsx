import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ArrowLeftRight, RotateCcw, HandCoins, PiggyBank } from 'lucide-react';

// A horizontal row of colorful icon tiles — the same "category row" pattern
// Flipkart/Blinkit/Amazon use up top for their most common actions. For
// Wealthr that's the handful of things people open the app to do most:
// log money in/out, move it between accounts, or check lending & budgets.
const ACTIONS = [
  { key: 'income', label: 'Add Income', icon: TrendingUp, tone: 'bg-emerald-50 text-income dark:bg-emerald-500/10' },
  { key: 'expense', label: 'Add Expense', icon: TrendingDown, tone: 'bg-rose-50 text-expense dark:bg-rose-500/10' },
  { key: 'self_transfer', label: 'Transfer', icon: ArrowLeftRight, tone: 'bg-indigo-50 text-brand-600 dark:bg-indigo-500/10 dark:text-brand-300' },
  { key: 'refund', label: 'Refund', icon: RotateCcw, tone: 'bg-cyan-50 text-refund dark:bg-cyan-500/10' },
];

export default function QuickActions({ onAddTransaction }) {
  return (
    <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
        {ACTIONS.map((a, i) => (
          <motion.button
            key={a.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => onAddTransaction(a.key)}
            className="flex flex-col items-center gap-1.5 shrink-0 w-[72px]"
          >
            <span className={`w-14 h-14 rounded-2xl flex items-center justify-center ${a.tone}`}>
              <a.icon size={22} />
            </span>
            <span className="text-[11px] font-semibold text-ink-600 dark:text-ink-300 text-center leading-tight">{a.label}</span>
          </motion.button>
        ))}

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.16 }}>
          <Link to="/lending" className="flex flex-col items-center gap-1.5 shrink-0 w-[72px]">
            <span className="w-14 h-14 rounded-2xl flex items-center justify-center bg-amber-50 text-lend dark:bg-amber-500/10">
              <HandCoins size={22} />
            </span>
            <span className="text-[11px] font-semibold text-ink-600 dark:text-ink-300 text-center leading-tight">Lending</span>
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.2 }}>
          <Link to="/budgets" className="flex flex-col items-center gap-1.5 shrink-0 w-[72px]">
            <span className="w-14 h-14 rounded-2xl flex items-center justify-center bg-violet-50 text-borrow dark:bg-violet-500/10">
              <PiggyBank size={22} />
            </span>
            <span className="text-[11px] font-semibold text-ink-600 dark:text-ink-300 text-center leading-tight">Budgets</span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
