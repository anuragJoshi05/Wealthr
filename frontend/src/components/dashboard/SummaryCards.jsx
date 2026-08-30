import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, HandCoins, Wallet, RotateCcw, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '../common/Card';
import { formatCurrency, formatCompactCurrency } from '../../utils/formatters';

function StatCard({ icon: Icon, label, value, tone, delay = 0, className = '' }) {
  const toneClasses = {
    income: 'text-income bg-emerald-50 dark:bg-emerald-500/10',
    expense: 'text-expense bg-rose-50 dark:bg-rose-500/10',
    refund: 'text-refund bg-cyan-50 dark:bg-cyan-500/10',
  };
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay }} className={className}>
      <Card className="!p-3.5 !rounded-2xl h-full hover:!-translate-y-0.5 hover:!shadow-card-hover transition-all">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 ${toneClasses[tone]}`}>
          <Icon size={16} />
        </div>
        <p className="text-[11px] text-ink-400 mb-0.5 leading-tight">{label}</p>
        <p className="text-base font-extrabold text-ink-900 dark:text-ink-50 truncate">{value}</p>
      </Card>
    </motion.div>
  );
}

// Lending is shown as one merged card with two halves rather than two
// separate stat tiles — grouping "you'll receive" / "you owe" together is
// more meaningful, and it guarantees an even-numbered grid (no orphan tile
// left alone on the last row when refunds happen to be zero this month).
function LendingCard({ lent, borrowed, className = '' }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.15 }} className={className}>
      <Link to="/lending" className="block h-full">
        <Card className="!p-3.5 !rounded-2xl h-full hover:!-translate-y-0.5 hover:!shadow-card-hover transition-all">
          <div className="flex items-center gap-1.5 mb-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-lend flex items-center justify-center">
              <HandCoins size={16} />
            </div>
            <p className="text-[11px] text-ink-400">Lending</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-ink-100 dark:divide-ink-800">
            <div className="pr-3">
              <p className="flex items-center gap-1 text-[10px] text-ink-400 mb-0.5">
                <ArrowDownRight size={11} className="text-lend" /> You'll get
              </p>
              <p className="text-base font-extrabold text-lend truncate">{formatCompactCurrency(lent)}</p>
            </div>
            <div className="pl-3">
              <p className="flex items-center gap-1 text-[10px] text-ink-400 mb-0.5">
                <ArrowUpRight size={11} className="text-borrow" /> You owe
              </p>
              <p className="text-base font-extrabold text-borrow truncate">{formatCompactCurrency(borrowed)}</p>
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  );
}

export default function SummaryCards({ data }) {
  const savingsPositive = data.netSavings >= 0;
  const hasRefund = data.totalRefund > 0;

  return (
    <div className="space-y-3">
      {/* Hero balance card — the one vibrant gradient moment on the page */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-600 to-indigo-700 p-5 text-white shadow-glow-lg"
      >
        <div className="absolute inset-0 bg-grid opacity-[0.06]" />
        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-4 -bottom-10 w-32 h-32 rounded-full bg-white/10 blur-2xl" />

        <div className="relative flex items-center gap-2 text-white/75 text-xs font-medium">
          <Wallet size={14} />
          Cash Balance
        </div>
        <p className="relative text-[11px] text-white/50 mt-0.5">Income − net expenses</p>
        <p className="relative text-4xl font-extrabold tracking-tight mt-2">{formatCurrency(data.balance)}</p>

        <div className="relative grid grid-cols-2 gap-2 mt-4">
          <div className={`rounded-xl px-3 py-2 text-center ${savingsPositive ? 'bg-white/15' : 'bg-rose-900/25'}`}>
            <p className="text-[10px] text-white/60 leading-none mb-1">Net this month</p>
            <p className="text-sm font-bold leading-none truncate">
              {savingsPositive ? '+' : ''}
              {formatCompactCurrency(data.netSavings)}
            </p>
          </div>
          <div className="rounded-xl px-3 py-2 text-center bg-white/15">
            <p className="text-[10px] text-white/60 leading-none mb-1">Savings rate</p>
            <p className="text-sm font-bold leading-none">{data.savingsRate}%</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-2.5">
        <StatCard icon={TrendingUp} label="Income (Month)" value={formatCurrency(data.totalIncome)} tone="income" delay={0.05} />
        <StatCard icon={TrendingDown} label="Expenses (Month)" value={formatCurrency(data.totalExpense)} tone="expense" delay={0.1} />
        {hasRefund && <StatCard icon={RotateCcw} label="Refunds (Month)" value={formatCurrency(data.totalRefund)} tone="refund" delay={0.12} />}
        <LendingCard lent={data.moneyLent} borrowed={data.moneyBorrowed} className={hasRefund ? '' : 'col-span-2'} />
      </div>
    </div>
  );
}
