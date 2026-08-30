import { Plus } from 'lucide-react';

// A true floating action button, Google-Keep-style: it lives entirely
// outside the bottom nav bar's layout (own fixed-position element, own
// stacking context) so it can never overlap a tab or leave a dead gap in
// the bar. It floats bottom-right, clear above the bar by a fixed margin.
//
// Positioning math: the bar is h-16 (64px) plus the device's safe-area
// inset at the bottom (notch/gesture-bar padding), so the FAB sits at
// 64px + safe-area + 16px breathing room above the very top edge of the bar.
export default function FabButton({ onAdd }) {
  return (
    <button
      onClick={onAdd}
      aria-label="Add transaction"
      className="lg:hidden fixed right-5 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 active:scale-95 text-white shadow-glow-lg flex items-center justify-center transition-transform"
      style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom) + 16px)' }}
    >
      <Plus size={26} strokeWidth={2.5} />
    </button>
  );
}
