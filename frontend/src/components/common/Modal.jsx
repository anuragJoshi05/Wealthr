import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const maxWidth = { sm: 'sm:max-w-sm', md: 'sm:max-w-md', lg: 'sm:max-w-lg' }[size];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className={`relative w-full ${maxWidth} bg-white dark:bg-ink-900 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col`}
          >
            <div className="flex justify-center pt-2.5 pb-0 sm:hidden">
              <span className="w-9 h-1.5 rounded-full bg-ink-200 dark:bg-ink-700" />
            </div>
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink-100 dark:border-ink-800">
              <h2 className="text-base font-bold text-ink-900 dark:text-ink-50">{title}</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 dark:hover:text-ink-200 hover:bg-ink-100 dark:hover:bg-ink-800 transition-colors"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
            {footer && (
              <div className="px-5 py-4 border-t border-ink-100 dark:border-ink-800 flex gap-3">{footer}</div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
