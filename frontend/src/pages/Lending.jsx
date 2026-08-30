import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { HandCoins, Plus, Users, ListFilter, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import LendingItem from '../components/lending/LendingItem';
import LendingForm from '../components/lending/LendingForm';
import LendingDetail from '../components/lending/LendingDetail';
import PersonCard from '../components/lending/PersonCard';
import PersonDetail from '../components/lending/PersonDetail';
import Modal from '../components/common/Modal';
import Input from '../components/common/Input';
import EmptyState from '../components/common/EmptyState';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import { Skeleton } from '../components/common/SkeletonLoader';
import { lendingService } from '../services/lendingService';
import { peopleService } from '../services/peopleService';
import { sharedExpenseService } from '../services/sharedExpenseService';
import { getApiErrorMessage } from '../services/api';
import { notify } from '../utils/toast';
import { useDataChangedListener } from '../utils/events';
import { formatCurrency } from '../utils/formatters';

const TABS = [
  { value: 'all', label: 'All', icon: ListFilter },
  { value: 'lent', label: 'Lent', icon: ArrowDownRight },
  { value: 'borrowed', label: 'Borrowed', icon: ArrowUpRight },
  { value: 'people', label: 'People', icon: Users },
];

export default function Lending() {
  const [items, setItems] = useState([]);
  const [people, setPeople] = useState([]);
  const [balances, setBalances] = useState([]);
  const [sharingBalances, setSharingBalances] = useState([]);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [loadingPeople, setLoadingPeople] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showAddPerson, setShowAddPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [addingPerson, setAddingPerson] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await lendingService.list();
      setItems(res.items);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPeople = useCallback(async () => {
    setLoadingPeople(true);
    try {
      const [peopleList, balanceList, sharingList] = await Promise.all([
        peopleService.list(),
        peopleService.balances(),
        sharedExpenseService.balances(),
      ]);
      setPeople(peopleList);
      setBalances(balanceList);
      setSharingBalances(sharingList);
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setLoadingPeople(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadPeople();
  }, [load, loadPeople]);

  useDataChangedListener(load, ['all']);
  useDataChangedListener(loadPeople, ['all']);

  const filtered = useMemo(() => {
    if (tab === 'all' || tab === 'people') return items;
    return items.filter((i) => i.direction === tab);
  }, [items, tab]);

  const totals = useMemo(() => {
    const lent = items.filter((i) => i.direction === 'lent' && i.status !== 'completed').reduce((s, i) => s + i.remainingAmount, 0);
    const borrowed = items.filter((i) => i.direction === 'borrowed' && i.status !== 'completed').reduce((s, i) => s + i.remainingAmount, 0);
    return { lent, borrowed };
  }, [items]);

  // People who have a saved contact but no lending records yet still show
  // up with a zero balance, so "adding a person" is meaningful on its own.
  const peopleWithBalances = useMemo(() => {
    const seen = new Set();
    const rows = [];
    const sharingByPerson = Object.fromEntries(sharingBalances.map((s) => [s.person, s]));

    function withSharing(row) {
      const s = sharingByPerson[row.person];
      return {
        ...row,
        sharesOwedToYou: s?.sharesOwedToYou || 0,
        sharesYouOwe: s?.sharesYouOwe || 0,
      };
    }

    balances.forEach((b) => {
      seen.add(b.person);
      const match = people.find((p) => p.name === b.person);
      rows.push(withSharing({ ...b, personId: match?.id }));
    });

    people.forEach((p) => {
      if (!seen.has(p.name)) {
        seen.add(p.name);
        rows.push(
          withSharing({
            person: p.name,
            totalLent: 0,
            totalBorrowed: 0,
            outstandingReceivable: 0,
            outstandingPayable: 0,
            netBalance: 0,
            openRecords: 0,
            lastActivity: null,
            personId: p.id,
          })
        );
      }
    });

    // Someone can appear only via a shared expense (never lent/borrowed,
    // never saved as a contact) — still surface them so their split
    // balance is visible and settleable from the People tab.
    sharingBalances.forEach((s) => {
      if (!seen.has(s.person)) {
        seen.add(s.person);
        rows.push(
          withSharing({
            person: s.person,
            totalLent: 0,
            totalBorrowed: 0,
            outstandingReceivable: 0,
            outstandingPayable: 0,
            netBalance: 0,
            openRecords: 0,
            lastActivity: s.lastActivity,
            personId: undefined,
          })
        );
      }
    });

    return rows.sort((a, b) => {
      const magA = Math.abs(a.netBalance) + Math.abs(a.sharesOwedToYou - a.sharesYouOwe);
      const magB = Math.abs(b.netBalance) + Math.abs(b.sharesOwedToYou - b.sharesYouOwe);
      return magB - magA;
    });
  }, [balances, people, sharingBalances]);

  async function handleAddPerson(e) {
    e.preventDefault();
    if (!newPersonName.trim()) return;
    setAddingPerson(true);
    try {
      await peopleService.getOrCreate(newPersonName.trim());
      notify.success('Contact added');
      setNewPersonName('');
      setShowAddPerson(false);
      loadPeople();
    } catch (err) {
      notify.error(getApiErrorMessage(err));
    } finally {
      setAddingPerson(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Card className="!p-4 !rounded-2xl">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mb-2.5">
            <HandCoins size={16} className="text-lend" />
          </div>
          <p className="text-xs text-ink-400 mb-1">You'll receive</p>
          <p className="text-lg font-extrabold text-lend">{formatCurrency(totals.lent)}</p>
        </Card>
        <Card className="!p-4 !rounded-2xl">
          <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center mb-2.5">
            <HandCoins size={16} className="text-borrow" />
          </div>
          <p className="text-xs text-ink-400 mb-1">You owe</p>
          <p className="text-lg font-extrabold text-borrow">{formatCurrency(totals.borrowed)}</p>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink-700 dark:text-ink-200">Records</h2>
        {tab === 'people' ? (
          <Button size="sm" onClick={() => setShowAddPerson(true)}>
            <Users size={15} /> Add
          </Button>
        ) : (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={15} /> New
          </Button>
        )}
      </div>

      {/* Tabs get the FULL row width now — squeezed next to the action
          button, the last tab ("People") was pushed entirely out of the
          scrollable viewport with no visual hint it existed at all. */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`relative flex items-center gap-1.5 shrink-0 text-xs font-semibold px-3.5 py-2 rounded-xl border transition-colors ${
              tab === t.value
                ? 'border-brand-500 text-brand-700 dark:text-brand-300'
                : 'border-ink-200 dark:border-ink-700 text-ink-500 dark:text-ink-400 hover:border-ink-300'
            }`}
          >
            {tab === t.value && (
              <motion.span
                layoutId="lending-tab-active"
                className="absolute inset-0 rounded-xl bg-brand-50 dark:bg-brand-500/10 -z-10"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'people' ? (
        loadingPeople ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-2xl" />
            ))}
          </div>
        ) : peopleWithBalances.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No people saved yet"
            description="Add a payee to track a running balance across every loan or repayment with them."
            action={<Button onClick={() => setShowAddPerson(true)}>Add Person</Button>}
          />
        ) : (
          <div className="space-y-2.5">
            {peopleWithBalances.map((b) => (
              <PersonCard
                key={b.person}
                balance={b}
                onClick={() => setSelectedPerson({ name: b.person, id: b.personId })}
              />
            ))}
          </div>
        )
      ) : loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load records" description={error} action={<Button onClick={load}>Retry</Button>} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="Nothing tracked yet"
          description="Record money you've lent or borrowed to keep tabs on repayments."
          action={<Button onClick={() => setShowForm(true)}>Add Record</Button>}
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => (
            <LendingItem key={item.id} item={item} onClick={() => setSelectedId(item.id)} />
          ))}
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Record Lending / Borrowing" size="md">
        <LendingForm onDone={() => setShowForm(false)} onCancel={() => setShowForm(false)} />
      </Modal>

      <Modal open={showAddPerson} onClose={() => setShowAddPerson(false)} title="Add Person" size="sm">
        <form onSubmit={handleAddPerson} className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g. Rahul Sharma"
            value={newPersonName}
            onChange={(e) => setNewPersonName(e.target.value)}
            autoFocus
          />
          <div className="flex gap-3">
            <Button type="button" variant="outline" fullWidth onClick={() => setShowAddPerson(false)}>
              Cancel
            </Button>
            <Button type="submit" fullWidth loading={addingPerson}>
              Add
            </Button>
          </div>
        </form>
      </Modal>

      <LendingDetail id={selectedId} open={Boolean(selectedId)} onClose={() => setSelectedId(null)} />

      <PersonDetail
        person={selectedPerson?.name}
        personId={selectedPerson?.id}
        open={Boolean(selectedPerson)}
        onClose={() => setSelectedPerson(null)}
      />
    </div>
  );
}
