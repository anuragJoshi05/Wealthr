import { useState, useEffect, useMemo } from 'react';
import { Plus, X, Users } from 'lucide-react';
import { peopleService } from '../../services/peopleService';
import { formatCurrency } from '../../utils/formatters';
import { SPLIT_STRATEGIES } from '../../utils/constants';

// participants = [{ person, amount }] — the OTHER people only. "You" are
// always implied as an extra, non-removable row so the split visibly
// accounts for 100% of the bill.
export default function SplitBuilder({ total, participants, onChange, strategy, onStrategyChange }) {
  const [knownPeople, setKnownPeople] = useState([]);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    peopleService.list().then(setKnownPeople).catch(() => {});
  }, []);

  const totalNum = Number(total) || 0;
  const headCount = participants.length + 1; // + you

  const equalShare = headCount > 0 ? totalNum / headCount : 0;
  const otherEqualTotal = equalShare * participants.length;
  const yourShare =
    strategy === 'equal'
      ? Math.max(0, totalNum - otherEqualTotal)
      : Math.max(0, totalNum - participants.reduce((s, p) => s + (Number(p.amount) || 0), 0));

  const customSum = participants.reduce((s, p) => s + (Number(p.amount) || 0), 0) + yourShare;
  const diff = Math.round((totalNum - customSum) * 100) / 100;

  function addParticipant(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (participants.some((p) => p.person.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...participants, { person: trimmed, amount: 0 }]);
    setNewName('');
  }

  function removeParticipant(idx) {
    onChange(participants.filter((_, i) => i !== idx));
  }

  function updateAmount(idx, amount) {
    onChange(participants.map((p, i) => (i === idx ? { ...p, amount } : p)));
  }

  return (
    <div className="rounded-2xl border border-brand-200 dark:border-brand-500/30 bg-brand-50/50 dark:bg-brand-500/5 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-brand-700 dark:text-brand-300">
          <Users size={16} />
          Split with {participants.length} other{participants.length === 1 ? '' : 's'}
        </div>
        <div className="flex gap-1 bg-white dark:bg-ink-900 rounded-lg p-1 border border-brand-200 dark:border-brand-500/30">
          {SPLIT_STRATEGIES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onStrategyChange(s.value)}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-md transition-colors ${
                strategy === s.value
                  ? 'bg-brand-600 text-white'
                  : 'text-ink-500 dark:text-ink-400 hover:text-brand-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {/* You — always present, not removable */}
        <div className="flex items-center gap-2.5 bg-white dark:bg-ink-900 rounded-xl px-3 py-2.5 border border-ink-100 dark:border-ink-800">
          <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
            You
          </div>
          <span className="flex-1 text-sm font-semibold text-ink-900 dark:text-ink-50">Your share</span>
          <span className="text-sm font-extrabold text-brand-700 dark:text-brand-300 tabular-nums">
            {formatCurrency(yourShare)}
          </span>
        </div>

        {participants.map((p, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2.5 bg-white dark:bg-ink-900 rounded-xl px-3 py-2 border border-ink-100 dark:border-ink-800"
          >
            <div className="w-8 h-8 rounded-full bg-ink-200 dark:bg-ink-700 text-ink-600 dark:text-ink-200 flex items-center justify-center text-xs font-bold shrink-0">
              {p.person[0]?.toUpperCase()}
            </div>
            <span className="flex-1 text-sm font-medium text-ink-800 dark:text-ink-100 truncate">{p.person}</span>
            {strategy === 'equal' ? (
              <span className="text-sm font-bold text-ink-700 dark:text-ink-200 tabular-nums">
                {formatCurrency(equalShare)}
              </span>
            ) : (
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={p.amount === 0 ? '' : p.amount}
                placeholder="0.00"
                onChange={(e) => updateAmount(idx, e.target.value === '' ? 0 : Number(e.target.value))}
                className="w-24 text-right text-sm font-bold bg-ink-50 dark:bg-ink-800 rounded-lg px-2 py-1 border border-ink-200 dark:border-ink-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            )}
            <button
              type="button"
              onClick={() => removeParticipant(idx)}
              className="text-ink-300 hover:text-expense transition-colors"
              aria-label={`Remove ${p.person}`}
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          list="split-known-people"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addParticipant(newName);
            }
          }}
          placeholder="Add a person from People, or type a name"
          className="flex-1 text-sm rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <datalist id="split-known-people">
          {knownPeople.map((p) => (
            <option key={p.id} value={p.name} />
          ))}
        </datalist>
        <button
          type="button"
          onClick={() => addParticipant(newName)}
          className="shrink-0 w-9 h-9 rounded-xl bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center transition-colors"
          aria-label="Add person"
        >
          <Plus size={17} />
        </button>
      </div>

      {strategy === 'custom' && Math.abs(diff) > 0.01 && (
        <p className="text-xs font-semibold text-expense">
          {diff > 0
            ? `${formatCurrency(diff)} left to assign so shares add up to the total bill.`
            : `Shares are ${formatCurrency(Math.abs(diff))} over the total bill.`}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-brand-200 dark:border-brand-500/20 text-sm">
        <span className="text-ink-500 dark:text-ink-400">Total bill</span>
        <span className="font-extrabold text-ink-900 dark:text-ink-50">{formatCurrency(totalNum)}</span>
      </div>
    </div>
  );
}

export function computeEqualShares(total, participantCount) {
  const totalNum = Number(total) || 0;
  const heads = participantCount + 1;
  return heads > 0 ? totalNum / heads : 0;
}
