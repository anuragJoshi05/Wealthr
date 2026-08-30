import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Wallet } from 'lucide-react';
import Input from '../common/Input';
import Select from '../common/Select';
import TextArea from '../common/TextArea';
import Button from '../common/Button';
import EmptyState from '../common/EmptyState';
import { toInputDate } from '../../utils/formatters';
import { lendingService } from '../../services/lendingService';
import { peopleService } from '../../services/peopleService';
import { accountService } from '../../services/accountService';
import { getApiErrorMessage } from '../../services/api';
import { notify } from '../../utils/toast';
import { emitDataChanged } from '../../utils/events';

export default function LendingForm({ defaultDirection = 'lent', defaultPerson = '', onDone, onCancel }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    direction: defaultDirection,
    person: defaultPerson,
    amount: '',
    date: toInputDate(),
    dueDate: '',
    note: '',
    accountId: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [knownPeople, setKnownPeople] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  useEffect(() => {
    peopleService.list().then(setKnownPeople).catch(() => {});
  }, []);

  useEffect(() => {
    accountService
      .list()
      .then((list) => {
        setAccounts(list);
        const def = list.find((a) => a.isDefault) || list[0];
        if (def) setForm((f) => ({ ...f, accountId: f.accountId || def.id }));
      })
      .catch(() => {})
      .finally(() => setLoadingAccounts(false));
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const errs = {};
    if (!form.person.trim()) errs.person = 'Person is required';
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Enter a valid amount';
    if (!form.date) errs.date = 'Date is required';
    if (!form.accountId) errs.accountId = 'Select an account';
    if (form.dueDate && new Date(form.dueDate) < new Date(form.date)) {
      errs.dueDate = 'Due date cannot be before the transaction date';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await lendingService.create({
        direction: form.direction,
        person: form.person.trim(),
        amount: Number(form.amount),
        date: new Date(form.date).toISOString(),
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        note: form.note || undefined,
        accountId: form.accountId,
      });
      // Registers the person as a known payee for future autocomplete +
      // the People ledger, if they're not already saved. Best-effort: a
      // failure here shouldn't block the lending record that already saved.
      peopleService.getOrCreate(form.person.trim()).catch(() => {});
      notify.success(form.direction === 'lent' ? 'Lending recorded' : 'Borrowing recorded');
      emitDataChanged('all');
      onDone?.();
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!loadingAccounts && accounts.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Add an account first"
        description="Lending or borrowing money moves it through one of your accounts — add one to get started."
        action={
          <Button
            onClick={() => {
              onCancel?.();
              navigate('/accounts');
            }}
          >
            <PlusCircle size={16} /> Add Account
          </Button>
        }
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => update('direction', 'lent')}
          className={`text-sm font-semibold px-3 py-2.5 rounded-xl border transition-colors ${
            form.direction === 'lent'
              ? 'border-lend bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400'
              : 'border-ink-200 dark:border-ink-700 text-ink-500 dark:text-ink-400'
          }`}
        >
          I lent money
        </button>
        <button
          type="button"
          onClick={() => update('direction', 'borrowed')}
          className={`text-sm font-semibold px-3 py-2.5 rounded-xl border transition-colors ${
            form.direction === 'borrowed'
              ? 'border-borrow bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400'
              : 'border-ink-200 dark:border-ink-700 text-ink-500 dark:text-ink-400'
          }`}
        >
          I borrowed money
        </button>
      </div>

      <Input
        label="Person"
        placeholder="Who's involved?"
        list="known-people"
        value={form.person}
        onChange={(e) => update('person', e.target.value)}
        error={errors.person}
      />
      <datalist id="known-people">
        {knownPeople.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>

      <Input
        label="Amount"
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        placeholder="0.00"
        value={form.amount}
        onChange={(e) => update('amount', e.target.value)}
        error={errors.amount}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Date" type="date" value={form.date} onChange={(e) => update('date', e.target.value)} error={errors.date} />
        <Input label="Due Date (optional)" type="date" value={form.dueDate} onChange={(e) => update('dueDate', e.target.value)} error={errors.dueDate} />
      </div>

      <Select label="Account" value={form.accountId} onChange={(e) => update('accountId', e.target.value)} error={errors.accountId}>
        <option value="">Select account</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>{a.name}{a.isDefault ? ' (Default)' : ''}</option>
        ))}
      </Select>
      <p className="text-xs text-ink-400 -mt-2">
        {form.direction === 'lent' ? 'The account this money is leaving from.' : 'The account this money is arriving in.'}
      </p>

      <TextArea
        label="Reason / Note (optional)"
        rows={2}
        placeholder="e.g. Emergency loan, splitting rent..."
        value={form.note}
        onChange={(e) => update('note', e.target.value)}
      />

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" fullWidth loading={submitting}>
          Save
        </Button>
      </div>
    </form>
  );
}
