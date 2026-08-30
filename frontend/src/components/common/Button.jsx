import { motion } from 'framer-motion';

const variants = {
  primary:
    'bg-gradient-to-r from-brand-600 to-indigo-600 text-white hover:brightness-110 active:brightness-95 disabled:opacity-50 disabled:grayscale shadow-lg shadow-brand-600/25',
  secondary:
    'bg-ink-100 dark:bg-ink-800 text-ink-900 dark:text-ink-50 hover:bg-ink-200 dark:hover:bg-ink-700',
  danger: 'bg-gradient-to-r from-rose-600 to-expense text-white hover:brightness-110 active:brightness-95 disabled:opacity-50 shadow-lg shadow-rose-600/20',
  ghost: 'bg-transparent text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800',
  outline:
    'bg-transparent border border-ink-200 dark:border-ink-700 text-ink-900 dark:text-ink-50 hover:bg-ink-50 dark:hover:bg-ink-800',
};

const sizes = {
  sm: 'text-sm px-3 py-1.5 rounded-lg',
  md: 'text-sm px-4 py-2.5 rounded-xl',
  lg: 'text-base px-6 py-3.5 rounded-2xl',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  fullWidth = false,
}) {
  return (
    <motion.button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      whileTap={disabled || loading ? {} : { scale: 0.97 }}
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-all disabled:cursor-not-allowed ${
        variants[variant]
      } ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading && (
        <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      )}
      {children}
    </motion.button>
  );
}
