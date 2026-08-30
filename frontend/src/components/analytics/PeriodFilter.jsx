import { PERIODS } from '../../utils/constants';

export default function PeriodFilter({ period, onChange, customRange, onCustomRangeChange }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            className={`shrink-0 text-xs font-semibold px-3.5 py-2 rounded-xl border transition-colors ${
              period === p.value
                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300'
                : 'border-ink-200 dark:border-ink-700 text-ink-500 dark:text-ink-400'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {period === 'custom' && (
        <div className="grid grid-cols-2 gap-3">
          <input
            type="date"
            value={customRange.start}
            onChange={(e) => onCustomRangeChange({ ...customRange, start: e.target.value })}
            className="rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 px-3 py-2 text-sm text-ink-900 dark:text-ink-50"
          />
          <input
            type="date"
            value={customRange.end}
            onChange={(e) => onCustomRangeChange({ ...customRange, end: e.target.value })}
            className="rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-800 px-3 py-2 text-sm text-ink-900 dark:text-ink-50"
          />
        </div>
      )}
    </div>
  );
}
