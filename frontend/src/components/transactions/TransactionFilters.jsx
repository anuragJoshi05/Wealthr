import { useState, useEffect } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import Modal from '../common/Modal';
import Select from '../common/Select';
import Input from '../common/Input';
import Button from '../common/Button';
import { TRANSACTION_TYPES, PAYMENT_MODES } from '../../utils/constants';
import { accountService } from '../../services/accountService';

const ALL_CATEGORIES = [
  'Food & Dining', 'Groceries', 'Transport', 'Rent', 'Utilities', 'Shopping',
  'Entertainment', 'Health & Fitness', 'Education', 'Travel', 'Subscriptions',
  'Bills', 'Personal Care', 'Gifts & Donations', 'Salary', 'Freelance',
  'Business', 'Investment Returns', 'Interest', 'Gift', 'Other',
];

export default function TransactionFilters({ filters, onChange }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    accountService.list().then(setAccounts).catch(() => {});
  }, []);

  const activeCount = Object.values(filters).filter(Boolean).length;

  function openModal() {
    setDraft(filters);
    setOpen(true);
  }

  function apply() {
    onChange(draft);
    setOpen(false);
  }

  function clear() {
    const cleared = { type: '', category: '', paymentMode: '', person: '', accountId: '', startDate: '', endDate: '' };
    setDraft(cleared);
    onChange(cleared);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 text-sm font-medium text-ink-600 dark:text-ink-300 hover:border-brand-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors shadow-card"
      >
        <SlidersHorizontal size={15} />
        Filters
        {activeCount > 0 && (
          <span className="w-[18px] h-[18px] flex items-center justify-center rounded-full bg-brand-600 text-white text-[10px] font-bold px-1">
            {activeCount}
          </span>
        )}
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Filter Transactions" size="md"
        footer={
          <>
            <Button variant="outline" fullWidth onClick={clear}>Clear All</Button>
            <Button fullWidth onClick={apply}>Apply Filters</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Type" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
            <option value="">All types</option>
            {TRANSACTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </Select>

          <Select label="Category" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
            <option value="">All categories</option>
            {ALL_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>

          <Select label="Payment Mode" value={draft.paymentMode} onChange={(e) => setDraft({ ...draft, paymentMode: e.target.value })}>
            <option value="">All modes</option>
            {PAYMENT_MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </Select>

          <Select label="Account" value={draft.accountId} onChange={(e) => setDraft({ ...draft, accountId: e.target.value })}>
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </Select>

          <Input label="Person" placeholder="Filter by person" value={draft.person} onChange={(e) => setDraft({ ...draft, person: e.target.value })} />

          <div className="grid grid-cols-2 gap-3">
            <Input label="From" type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
            <Input label="To" type="date" value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
          </div>
        </div>
      </Modal>
    </>
  );
}
