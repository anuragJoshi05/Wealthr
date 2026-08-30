import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, ArrowLeftRight, HandCoins, BarChart3, PiggyBank, Settings, Plus, Wallet } from 'lucide-react';
import Logo from '../common/Logo';
import Branding from '../common/Branding';

const items = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/lending', label: 'Lending & Borrowing', icon: HandCoins },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ onAdd, user }) {
  return (
    <aside className="hidden lg:flex flex-col w-72 shrink-0 h-screen sticky top-0 border-r border-ink-100 dark:border-ink-800/80 bg-white dark:bg-ink-900 px-4 py-6">
      <div className="flex items-center gap-2.5 px-2 mb-7">
        <Logo size={38} />
        <span className="text-xl font-extrabold tracking-tight text-ink-900 dark:text-ink-50">Wealthr</span>
      </div>

      <motion.button
        onClick={onAdd}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2 justify-center bg-gradient-to-r from-brand-600 to-indigo-600 hover:brightness-110 text-white font-semibold text-sm rounded-2xl px-4 py-3 mb-7 transition-all shadow-lg shadow-brand-600/25"
      >
        <Plus size={17} strokeWidth={2.5} />
        Add Transaction
      </motion.button>

      <nav className="flex-1 space-y-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'text-brand-700 dark:text-brand-300'
                  : 'text-ink-500 dark:text-ink-400 hover:bg-ink-50 dark:hover:bg-ink-800/70 hover:text-ink-900 dark:hover:text-ink-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active-pill"
                    className="absolute inset-0 rounded-xl bg-brand-50 dark:bg-brand-500/10"
                    transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                  />
                )}
                <Icon size={18} className="relative" />
                <span className="relative">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {user && (
        <NavLink
          to="/settings"
          className="flex items-center gap-3 px-2.5 py-2.5 mt-2 rounded-xl hover:bg-ink-50 dark:hover:bg-ink-800/70 transition-colors border-t border-ink-100 dark:border-ink-800 pt-4"
        >
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="w-9 h-9 rounded-full ring-2 ring-white dark:ring-ink-900" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
              {user.displayName?.[0] || user.email?.[0] || '?'}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-900 dark:text-ink-50 truncate">
              {user.displayName || 'You'}
            </p>
            <p className="text-xs text-ink-400 truncate">{user.email}</p>
          </div>
        </NavLink>
      )}

      <Branding className="justify-center pt-4" />
    </aside>
  );
}
