const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatCurrency(amount) {
  return currencyFormatter.format(Number(amount) || 0);
}

// Hand-rolled instead of Intl.NumberFormat's `notation: 'compact'` — for the
// en-IN locale, Chromium's CLDR data abbreviates thousands as "T" (e.g.
// ₹7,085 → "₹7.1T"), which every user reads as trillions, not thousands.
// This uses the actual Indian numbering scale everyone expects: K / L / Cr.
export function formatCompactCurrency(amount) {
  const n = Number(amount) || 0;
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);

  let value;
  if (abs >= 1_00_00_000) {
    value = `${trimDecimal(abs / 1_00_00_000)}Cr`;
  } else if (abs >= 1_00_000) {
    value = `${trimDecimal(abs / 1_00_000)}L`;
  } else if (abs >= 1_000) {
    value = `${trimDecimal(abs / 1_000)}K`;
  } else {
    value = String(Math.round(abs));
  }
  return `${sign}₹${value}`;
}

// "7.00" -> "7", "7.10" -> "7.1", "12.34" -> "12.3" (one decimal place, no
// trailing zero).
function trimDecimal(num) {
  return parseFloat(num.toFixed(1)).toString();
}

export function formatDate(isoString, opts = {}) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: opts.withYear === false ? undefined : 'numeric',
  });
}

export function formatDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatRelativeDate(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now.setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays === -1) return 'Tomorrow';
  return formatDate(isoString);
}

export function formatPercent(value) {
  const n = Number(value) || 0;
  return `${n > 0 ? '+' : ''}${n}%`;
}

export function toInputDateTime(isoString) {
  const d = isoString ? new Date(isoString) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export function toInputDate(isoString) {
  const d = isoString ? new Date(isoString) : new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
