import { useState } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { accountService } from '../../services/accountService';
import { getApiErrorMessage } from '../../services/api';
import { notify } from '../../utils/toast';
import { emitDataChanged } from '../../utils/events';

// Deliberately asks only for a name and an optional starting balance — no
// account number, IFSC code, or any other sensitive banking detail is ever
// requested or stored.
export default function AccountForm({ initial, hasAccounts, onDone, onCancel }) {
  const isEdit = Boolean(initial?.id);
  const [name, setName] = useState(initial?.name || '');
  const [balance, setBalance] = useState(initial?.openingBalance ?? '');
  const [makeDefault, setMakeDefault] = useState(initial?.isDefault ?? !hasAccounts);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Account name is required');
      return;
    }
    setSubmitting(true);
    try {
      if (isEdit) {
        await accountService.rename(initial.id, name.trim());
        if (makeDefault && !initial.isDefault) await accountService.setDefault(initial.id);
      } else {
        await accountService.create({
          name: name.trim(),
          openingBalance: balance === '' ? 0 : Number(balance),
          makeDefault,
        });
      }
      notify.success(isEdit ? 'Account updated' : 'Account added');
      emitDataChanged('all');
      onDone?.();
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Account Name"
        placeholder="e.g. HDFC Bank, Cash Wallet, Amazon Pay"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError('');
        }}
        error={error}
        autoFocus
      />

      {!isEdit && (
        <Input
          label="Current Balance (optional)"
          type="number"
          inputMode="decimal"
          step="0.01"
          placeholder="0.00"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
        />
      )}

      <p className="text-xs text-ink-400 leading-relaxed">
        We only ever ask for a name and balance — never an account number, IFSC code, or any other
        sensitive banking detail.
      </p>

      {(!initial?.isDefault) && (
        <button
          type="button"
          onClick={() => setMakeDefault((v) => !v)}
          disabled={!hasAccounts === false && !isEdit}
          className="w-full flex items-center gap-2.5 bg-ink-50 dark:bg-ink-800/60 rounded-xl px-3.5 py-2.5 text-left disabled:opacity-60"
        >
          <span
            className={`w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center shrink-0 ${
              makeDefault ? 'bg-brand-600 border-brand-600' : 'border-ink-300 dark:border-ink-600'
            }`}
            style={{ width: 18, height: 18 }}
          >
            {makeDefault && <span className="w-2 h-2 rounded-sm bg-white" />}
          </span>
          <span className="text-sm text-ink-700 dark:text-ink-200">
            {!hasAccounts && !isEdit
              ? "Set as default (your first account — it'll be selected automatically)"
              : 'Make this my default account'}
          </span>
        </button>
      )}

      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" fullWidth loading={submitting}>
          {isEdit ? 'Save Changes' : 'Add Account'}
        </Button>
      </div>
    </form>
  );
}
