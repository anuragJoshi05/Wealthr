import { Sun, Moon, Search, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import Logo from '../common/Logo';

export default function Header({ title, onSearch, showSearch = false, searchValue = '', searchPlaceholder = 'Search transactions...' }) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 glass border-b border-ink-100/80 dark:border-ink-800/60">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* The app's own mark, shown on mobile where the Sidebar (which
              already carries it) is hidden — without this, the mobile app
              had no brand identity anywhere on screen. */}
          <span className="lg:hidden shrink-0">
            <Logo size={30} />
          </span>
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-ink-900 dark:text-ink-50 truncate">{title}</h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {showSearch && (
            <div className="hidden sm:flex items-center gap-2 bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 rounded-xl px-3 py-1.5 w-56 focus-within:ring-2 focus-within:ring-brand-500/60 transition-shadow">
              <Search size={15} className="text-ink-400" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearch?.(e.target.value)}
                className="bg-transparent text-sm outline-none w-full text-ink-900 dark:text-ink-50 placeholder:text-ink-400"
              />
            </div>
          )}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-xl text-ink-500 dark:text-ink-400 hover:bg-white dark:hover:bg-ink-800 transition-colors"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {/*
            Visible at every breakpoint (not just desktop) — this is a person's
            only way to see which account they're signed in with, and to reach
            Sign Out, on mobile: neither the Sidebar (desktop-only) nor the
            BottomNav (no Settings slot) surface that on small screens.
          */}
          <NavLink
            to="/settings"
            aria-label="Account settings"
            className={({ isActive }) =>
              `shrink-0 rounded-full transition-all ${isActive ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-ink-50 dark:ring-offset-ink-950' : ''}`
            }
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full ring-2 ring-white dark:ring-ink-900" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-xs">
                {user?.displayName?.[0] || user?.email?.[0] || '?'}
              </div>
            )}
          </NavLink>
        </div>
      </div>

      {/* Full-width search on mobile, styled like the search-first headers
          in Flipkart/Blinkit/Amazon rather than being hidden below sm — a
          finance app search box shouldn't be a desktop-only affordance. */}
      {showSearch && (
        <div className="sm:hidden px-4 pb-3">
          <div className="flex items-center gap-2 bg-white dark:bg-ink-900 border border-ink-200 dark:border-ink-700 rounded-2xl px-3.5 py-2.5 focus-within:ring-2 focus-within:ring-brand-500/60 transition-shadow">
            <Search size={16} className="text-ink-400 shrink-0" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearch?.(e.target.value)}
              className="bg-transparent text-sm outline-none w-full text-ink-900 dark:text-ink-50 placeholder:text-ink-400"
            />
            {searchValue && (
              <button onClick={() => onSearch?.('')} aria-label="Clear search" className="text-ink-400 shrink-0">
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
