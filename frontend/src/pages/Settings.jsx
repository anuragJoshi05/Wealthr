import { Sun, Moon, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Branding from '../components/common/Branding';

export default function Settings() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="space-y-4 max-w-md">
      <Card className="flex items-center gap-4 !rounded-3xl">
        {user?.photoURL ? (
          <img src={user.photoURL} alt="" className="w-14 h-14 rounded-full ring-4 ring-brand-50 dark:ring-brand-500/10" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
            {user?.displayName?.[0] || user?.email?.[0] || '?'}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-bold text-ink-900 dark:text-ink-50 truncate">{user?.displayName}</p>
          <p className="text-sm text-ink-400 truncate">{user?.email}</p>
        </div>
      </Card>

      <Card className="!p-0 divide-y divide-ink-100 dark:divide-ink-800">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-medium text-ink-900 dark:text-ink-50"
        >
          <span className="flex items-center gap-3">
            {theme === 'dark' ? <Moon size={17} /> : <Sun size={17} />}
            Appearance
          </span>
          <span className="text-ink-400 capitalize">{theme}</span>
        </button>
        <div className="w-full flex items-center gap-3 px-4 py-3.5 text-sm font-medium text-ink-500 dark:text-ink-400">
          <Shield size={17} />
          Your data is private and isolated to your account
        </div>
      </Card>

      <Button variant="outline" fullWidth onClick={signOut}>
        <LogOut size={16} /> Sign Out
      </Button>

      <p className="text-center text-xs text-ink-400 pt-2">Wealthr · v1.0.0</p>
      <Branding className="justify-center" />
    </div>
  );
}
