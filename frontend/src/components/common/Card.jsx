export default function Card({ children, className = '', padded = true, onClick, glow = false }) {
  return (
    <div
      onClick={onClick}
      className={`relative bg-white dark:bg-ink-900 rounded-2xl border border-ink-100 dark:border-ink-800/80 transition-all duration-200 ${
        glow ? 'shadow-glow' : 'shadow-card'
      } ${padded ? 'p-4 sm:p-5' : ''} ${
        onClick ? 'cursor-pointer hover:shadow-card-hover hover:-translate-y-0.5 active:translate-y-0' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
