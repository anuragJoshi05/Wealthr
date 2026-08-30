import { motion } from 'framer-motion';
import { Star, Wallet } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const GRADIENTS = [
  'from-brand-600 to-indigo-700',
  'from-emerald-600 to-teal-700',
  'from-amber-600 to-orange-700',
  'from-rose-600 to-pink-700',
  'from-cyan-600 to-blue-700',
  'from-violet-600 to-purple-700',
];

// A row of swipeable, wallet-style cards — one per account plus a leading
// "All Accounts" total card — instead of only a static total banner. This
// is the horizontal card-row pattern Flipkart/Amazon/Blinkit all use up top
// (promo carousel, category row); here it doubles as a fast way to glance
// at or jump into any single account without scrolling the list below.
export default function AccountCarousel({ accounts, total, onSelect }) {
  return (
    <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory no-scrollbar">
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="relative overflow-hidden shrink-0 w-[78%] max-w-[300px] snap-start rounded-3xl bg-gradient-to-br from-brand-600 to-indigo-700 text-white p-5 shadow-glow-lg text-left"
        >
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 blur-2xl" />
          <p className="relative text-xs font-semibold uppercase tracking-wide text-white/70">All Accounts</p>
          <p className="relative text-3xl font-extrabold mt-1 truncate">{formatCurrency(total)}</p>
          <p className="relative text-xs text-white/70 mt-1.5">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
        </motion.div>

        {accounts.map((a, i) => (
          <motion.button
            key={a.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: (i + 1) * 0.04 }}
            onClick={() => onSelect(a.id)}
            className={`relative overflow-hidden shrink-0 w-[78%] max-w-[300px] snap-start rounded-3xl bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} text-white p-5 shadow-elevated text-left active:scale-[0.98] transition-transform`}
          >
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center gap-1.5">
              <Wallet size={14} className="text-white/70 shrink-0" />
              <p className="text-xs font-semibold text-white/70 truncate">{a.name}</p>
            </div>
            {a.isDefault && (
              <span className="relative inline-flex items-center gap-0.5 text-[9px] font-bold bg-white/20 rounded-full px-1.5 py-0.5 mt-1.5 w-fit">
                <Star size={8} fill="currentColor" /> DEFAULT
              </span>
            )}
            <p className="relative text-2xl font-extrabold mt-2 truncate">{formatCurrency(a.balance)}</p>
            <p className="relative text-xs text-white/70 mt-1.5">
              {a.transactionCount} transaction{a.transactionCount !== 1 ? 's' : ''}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
