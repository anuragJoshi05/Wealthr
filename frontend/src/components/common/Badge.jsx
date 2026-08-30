const colorMap = {
  income: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/10 dark:ring-emerald-400/20',
  expense: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 ring-1 ring-inset ring-rose-600/10 dark:ring-rose-400/20',
  refund: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400 ring-1 ring-inset ring-cyan-600/10 dark:ring-cyan-400/20',
  lend: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 ring-1 ring-inset ring-amber-600/10 dark:ring-amber-400/20',
  borrow: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400 ring-1 ring-inset ring-violet-600/10 dark:ring-violet-400/20',
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 ring-1 ring-inset ring-brand-600/10 dark:ring-brand-400/20',
  neutral: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300 ring-1 ring-inset ring-ink-900/5 dark:ring-white/5',
};

export default function Badge({ children, color = 'neutral', className = '' }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorMap[color]} ${className}`}
    >
      {children}
    </span>
  );
}
