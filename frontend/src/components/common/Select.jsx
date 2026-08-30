export default function Select({ label, error, children, className = '', ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="block text-sm font-medium text-ink-600 dark:text-ink-300 mb-1.5">{label}</span>
      )}
      <select
        {...props}
        className={`w-full rounded-xl border bg-ink-50/60 dark:bg-ink-800/60 px-3.5 py-2.5 text-sm text-ink-900 dark:text-ink-50 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500/70 focus:border-transparent focus:bg-white dark:focus:bg-ink-800 transition-all ${
          error ? 'border-expense' : 'border-ink-200 dark:border-ink-700'
        } ${className}`}
      >
        {children}
      </select>
      {error && <span className="block text-xs text-expense mt-1">{error}</span>}
    </label>
  );
}
