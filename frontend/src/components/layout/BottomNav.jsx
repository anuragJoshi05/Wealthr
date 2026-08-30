import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, ArrowLeftRight, HandCoins, BarChart3, Wallet } from 'lucide-react';

const items = [
  { to: '/', label: 'Home', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'History', icon: ArrowLeftRight },
  { to: '/accounts', label: 'Accounts', icon: Wallet },
  { to: '/lending', label: 'Lending', icon: HandCoins },
  { to: '/analytics', label: 'Insights', icon: BarChart3 },
];

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative flex flex-1 basis-0 flex-col items-center justify-center gap-0.5 h-full text-[11px] font-medium ${
          isActive ? 'text-brand-600 dark:text-brand-400' : 'text-ink-400 dark:text-ink-500'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId="bottomnav-active-dot"
              className="absolute top-1.5 w-1 h-1 rounded-full bg-brand-500"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
          <Icon size={20} strokeWidth={2.2} />
          {label}
        </>
      )}
    </NavLink>
  );
}

// Plain, evenly-spaced 5-item bar. No reserved center notch and no FAB here —
// the add button is a true floating action button (see FabButton.jsx) that
// floats independently above this bar, so it can never overlap a tab no
// matter how the item count changes.
export default function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-ink-100/80 dark:border-ink-800/60 shadow-nav safe-bottom">
      <div className="flex items-stretch h-16 px-1">
        {items.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>
    </nav>
  );
}
