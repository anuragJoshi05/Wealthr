import UELogo from './UELogo';

// Small, subtle secondary mark only — Wealthr is always the primary brand.
// No "Part of AJ/Works" text anywhere in the product (see product requirements).
export default function Branding({ className = '' }) {
  return (
    <div className={`flex items-center justify-center opacity-40 hover:opacity-70 transition-opacity ${className}`}>
      <UELogo size={11} />
    </div>
  );
}
