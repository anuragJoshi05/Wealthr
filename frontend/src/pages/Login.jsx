import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, HandCoins, PiggyBank, BarChart3, ShieldCheck, ArrowRight, TrendingUp, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Logo from '../components/common/Logo';
import Branding from '../components/common/Branding';
import Button from '../components/common/Button';
import { getApiErrorMessage } from '../services/api';

const FEATURES = [
  {
    icon: Wallet,
    title: 'Track everything',
    description: 'Every way money moves — income, expenses, transfers — in one clean timeline.',
  },
  {
    icon: HandCoins,
    title: 'Never lose an IOU',
    description: 'Who owes you, who you owe, and the full repayment history — always up to date.',
  },
  {
    icon: PiggyBank,
    title: 'Budgets that warn you',
    description: 'A heads-up before you blow past a category limit, not an autopsy after.',
  },
  {
    icon: BarChart3,
    title: 'Analytics that matter',
    description: 'Savings rate, trends, and period comparisons — the numbers that change decisions.',
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

function GoogleG() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z"
      />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l6-6C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path
        fill="#4CAF50"
        d="M24 45c5.4 0 10.3-2.1 14-5.5l-6.5-5.5c-2 1.4-4.6 2.2-7.5 2.2-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 40.6 16.2 45 24 45z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4.1 5.7l6.5 5.5C41.6 36 44 30.4 44 24c0-1.4-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}

// A stylized, illustrative preview of the app's own dashboard — not a
// screenshot, just enough real-looking UI (balance card, mini bar chart,
// transaction rows) rendered with the app's actual design tokens to give
// the hero visual weight without depending on an external image asset.
function ProductPreview() {
  const bars = [38, 62, 44, 80, 55, 90, 68];
  const rows = [
    { label: 'Salary', sub: 'Income · Today', amt: '+₹85,000', tone: 'income' },
    { label: 'Swiggy', sub: 'Food · Today', amt: '-₹420', tone: 'expense' },
    { label: 'Rahul repaid', sub: 'Lending · Yesterday', amt: '+₹2,000', tone: 'income' },
  ];
  const toneClass = { income: 'text-income-DEFAULT dark:text-income-dark', expense: 'text-expense dark:text-expense-dark' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
      className="relative mx-auto w-full max-w-md"
      style={{ perspective: 1200 }}
    >
      <div className="absolute -inset-4 bg-gradient-to-tr from-brand-500/30 via-violet-500/20 to-accent-400/20 blur-2xl rounded-[3rem] -z-10" />
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="glass rounded-4xl shadow-elevated p-5 sm:p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Logo size={26} />
            <span className="font-bold text-sm text-ink-900 dark:text-ink-50">Wealthr</span>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            Live
          </span>
        </div>

        <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-indigo-600 p-5 text-white mb-4 relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
          <p className="text-[11px] font-semibold text-white/70 uppercase tracking-wide">Total Balance</p>
          <p className="text-3xl font-extrabold mt-1 tracking-tight">₹4,82,650</p>
          <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-emerald-300">
            <TrendingUp size={13} /> +12.4% this month
          </div>
        </div>

        <div className="flex items-end gap-1.5 h-16 mb-4 px-1">
          {bars.map((h, i) => (
            <motion.div
              key={i}
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ duration: 0.6, delay: 0.6 + i * 0.06, ease: 'easeOut' }}
              className={`flex-1 rounded-md ${i === bars.length - 2 ? 'bg-brand-500' : 'bg-brand-200 dark:bg-brand-500/25'}`}
            />
          ))}
        </div>

        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold text-ink-900 dark:text-ink-50">{r.label}</p>
                <p className="text-[11px] text-ink-400">{r.sub}</p>
              </div>
              <span className={`font-bold ${toneClass[r.tone]}`}>{r.amt}</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        className="hidden sm:flex absolute -left-10 bottom-10 glass rounded-2xl shadow-elevated px-4 py-3 items-center gap-2.5"
      >
        <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
          <HandCoins size={16} className="text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-[11px] text-ink-400 leading-none mb-0.5">Owed to you</p>
          <p className="text-sm font-bold text-ink-900 dark:text-ink-50 leading-none">₹6,400</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Login() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(getApiErrorMessage(err));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950 overflow-x-hidden">
      {/* Animated ambient gradient mesh */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-grid">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, 20, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-40 -left-40 w-[34rem] h-[34rem] rounded-full bg-brand-400/30 dark:bg-brand-600/20 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -30, 0], y: [0, 30, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-violet-400/25 dark:bg-violet-600/15 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, 20, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full bg-accent-300/20 dark:bg-accent-600/10 blur-3xl"
        />
      </div>

      {/* Sticky glass nav */}
      <header className="sticky top-0 z-20 glass border-b border-white/40 dark:border-white/5">
        <div className="flex items-center justify-between px-6 sm:px-10 py-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="text-lg font-extrabold tracking-tight text-ink-900 dark:text-ink-50">Wealthr</span>
          </div>
          <Button size="sm" onClick={handleSignIn} loading={loading}>
            Sign in <ArrowRight size={14} />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 sm:px-10 pt-14 sm:pt-20 pb-16 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-14 items-center">
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs font-semibold text-brand-700 dark:text-brand-300 mb-6"
            >
              <Sparkles size={12} />
              Free, private, and built for daily use
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="text-4xl sm:text-6xl font-extrabold tracking-tight text-ink-900 dark:text-ink-50 leading-[1.05]"
            >
              Master your money,
              <br />
              <span className="text-grad-brand bg-[length:200%_auto] animate-gradient-x">without the spreadsheet.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="mt-6 text-base sm:text-lg text-ink-500 dark:text-ink-400 max-w-lg mx-auto lg:mx-0"
            >
              One calm, fast app for everything you earn, spend, save, lend, and borrow.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="mt-9 flex flex-col items-center lg:items-start gap-3"
            >
              <Button size="lg" onClick={handleSignIn} loading={loading}>
                <GoogleG />
                Continue with Google
              </Button>
              {error && <p className="text-xs text-expense">{error}</p>}
              <p className="text-xs text-ink-400">No credit card. No ads. Your data stays yours.</p>
            </motion.div>
          </div>

          <ProductPreview />
        </div>
      </section>

      {/* Feature grid */}
      <section className="px-6 sm:px-10 pb-24 max-w-5xl mx-auto">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.4, delay: (i % 4) * 0.08 }}
              className="p-5 rounded-3xl bg-white/80 dark:bg-ink-900/80 border border-ink-100 dark:border-ink-800 backdrop-blur-sm hover:shadow-card-hover hover:-translate-y-1 transition-all"
            >
              <div className="w-11 h-11 rounded-2xl bg-grad-brand-soft dark:bg-brand-500/10 flex items-center justify-center mb-3.5">
                <f.icon size={20} className="text-brand-600 dark:text-brand-400" />
              </div>
              <h3 className="text-sm font-bold text-ink-900 dark:text-ink-50 mb-1.5">{f.title}</h3>
              <p className="text-sm text-ink-500 dark:text-ink-400 leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="mt-4 flex items-center gap-2.5 text-xs text-ink-400 justify-center lg:justify-start"
        >
          <ShieldCheck size={14} className="text-ink-400" />
          Private by design — row-level security isolates your data at the database level.
        </motion.div>
      </section>

      <footer className="px-6 sm:px-10 pb-10 flex flex-col items-center gap-3">
        <p className="text-xs text-ink-400">Wealthr · Built for people who actually want to look at their money</p>
        <Branding />
      </footer>
    </div>
  );
}
