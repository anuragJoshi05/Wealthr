export default function Logo({ size = 36, rounded = true }) {
  const radius = rounded ? size * 0.28 : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wealthrGradShared" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx={rounded ? 18 : 0} fill="url(#wealthrGradShared)" />
      <path
        d="M15 24 L23 42 L32 28 L41 42 L49 24"
        stroke="#EEF2FF"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="32" cy="16" r="3.2" fill="#EEF2FF" />
    </svg>
  );
}
