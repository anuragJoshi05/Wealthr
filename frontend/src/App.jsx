import { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './contexts/AuthContext';
import Logo from './components/common/Logo';
import Sidebar from './components/layout/Sidebar';
import BottomNav from './components/layout/BottomNav';
import FabButton from './components/layout/FabButton';
import Header from './components/layout/Header';
import Modal from './components/common/Modal';
import TransactionForm from './components/transactions/TransactionForm';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Accounts from './pages/Accounts';
import Lending from './pages/Lending';
import Analytics from './pages/Analytics';
import Budgets from './pages/Budgets';
import Settings from './pages/Settings';

const TITLES = {
  '/': 'Dashboard',
  '/transactions': 'Transactions',
  '/accounts': 'Accounts',
  '/lending': 'Lending & Borrowing',
  '/analytics': 'Analytics',
  '/budgets': 'Budgets',
  '/settings': 'Settings',
};

function AppShell() {
  const { user } = useAuth();
  const location = useLocation();
  const [txModal, setTxModal] = useState({ open: false, transaction: null });
  const [search, setSearch] = useState('');

  const openAdd = (presetType) => setTxModal({ open: true, transaction: presetType ? { type: presetType } : null });
  const openEdit = (tx) => setTxModal({ open: true, transaction: tx });
  const closeModal = () => setTxModal({ open: false, transaction: null });

  const title = TITLES[location.pathname] || 'Wealthr';

  return (
    <div className="flex min-h-screen bg-ink-50 dark:bg-ink-950">
      <Sidebar onAdd={openAdd} user={user} />

      <div className="flex-1 min-w-0">
        <Header
          title={title}
          showSearch={location.pathname === '/transactions'}
          searchValue={search}
          onSearch={setSearch}
        />

        <main className="px-4 sm:px-6 py-5 pb-24 lg:pb-8 max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <Routes location={location}>
                <Route path="/" element={<Dashboard onEditTransaction={openEdit} onAddTransaction={openAdd} />} />
                <Route path="/transactions" element={<Transactions onEditTransaction={openEdit} search={search} />} />
                <Route path="/accounts" element={<Accounts onEditTransaction={openEdit} />} />
                <Route path="/lending" element={<Lending />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/budgets" element={<Budgets />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <BottomNav />
      <FabButton onAdd={openAdd} />

      <Modal
        open={txModal.open}
        onClose={closeModal}
        title={txModal.transaction?.id ? 'Edit Transaction' : 'Add Transaction'}
        size="md"
      >
        <TransactionForm initial={txModal.transaction} onDone={closeModal} onCancel={closeModal} />
      </Modal>
    </div>
  );
}

export default function App() {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 dark:bg-ink-950">
        <motion.div
          animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Logo size={44} />
        </motion.div>
      </div>
    );
  }

  if (!user) return <Login />;

  return <AppShell />;
}
