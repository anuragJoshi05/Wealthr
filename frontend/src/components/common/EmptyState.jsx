export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {Icon && (
        <div className="relative w-16 h-16 rounded-3xl bg-grad-brand-soft dark:bg-ink-800 flex items-center justify-center mb-4 overflow-hidden">
          <div className="absolute inset-0 bg-grad-brand opacity-[0.06] dark:opacity-10" />
          <Icon size={28} className="text-brand-500 relative" strokeWidth={1.8} />
        </div>
      )}
      <h3 className="text-base font-bold text-ink-900 dark:text-ink-50">{title}</h3>
      {description && (
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-1.5 max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
