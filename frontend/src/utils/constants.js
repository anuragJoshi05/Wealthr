// Full set, used for display (badges, filters). Lend/borrow/repayment types
// are created only as a side-effect of the Lending section, never directly,
// so their amounts stay in sync with a trackable lending record.
//
// `refund` is deliberately its own type, never `income` — it's money coming
// back from a PREVIOUS expense, not money earned (see analyticsEngine.js).
// `self_transfer` replaces the old free-form "transfer": it moves money
// between two of the user's own real Accounts and is never income/expense.
export const TRANSACTION_TYPES = [
  { value: 'income', label: 'Income', color: 'income' },
  { value: 'expense', label: 'Expense', color: 'expense' },
  { value: 'refund', label: 'Refund', color: 'refund' },
  { value: 'self_transfer', label: 'Self Transfer', color: 'brand' },
  { value: 'lend', label: 'Money Lent', color: 'lend' },
  { value: 'borrow', label: 'Money Borrowed', color: 'borrow' },
  { value: 'repayment_received', label: 'Repayment Received', color: 'income' },
  { value: 'repayment_made', label: 'Repayment Made', color: 'expense' },
];

// Subset the quick-add form offers. Use the Lending page for lend/borrow/
// repayments so they stay linked to a trackable record with a due date.
export const QUICK_ADD_TYPES = TRANSACTION_TYPES.filter((t) =>
  ['income', 'expense', 'refund', 'self_transfer'].includes(t.value)
);

export const PAYMENT_MODES = [
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Debit/Credit Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'online', label: 'Online' },
  { value: 'other', label: 'Other' },
];

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transport',
  'Rent',
  'Utilities',
  'Shopping',
  'Entertainment',
  'Health & Fitness',
  'Education',
  'Travel',
  'Subscriptions',
  'Bills',
  'Personal Care',
  'Gifts & Donations',
  'Other',
];

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Investment Returns',
  'Interest',
  'Gift',
  'Other',
];

// A refund reverses a previous expense, so it shares the expense category
// list (a refund almost always maps back to what it was refunding) plus a
// dedicated catch-all.
export const REFUND_CATEGORIES = [...EXPENSE_CATEGORIES];

// Expense sharing — deliberately separate from lending. "mine" = a normal,
// unsplit expense. "i_paid" = Flow A (user paid the full bill, others owe
// their share). "they_paid" = Flow B (someone else fronted the user's share).
export const SHARE_MODES = [
  { value: 'mine', label: 'Just me' },
  { value: 'i_paid', label: 'I paid for others' },
  { value: 'they_paid', label: 'Someone paid my share' },
];

export const SPLIT_STRATEGIES = [
  { value: 'equal', label: 'Split equally' },
  { value: 'custom', label: 'Custom amounts' },
];

export const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

export function categoriesForType(type) {
  if (type === 'income' || type === 'repayment_received') return INCOME_CATEGORIES;
  if (type === 'refund') return REFUND_CATEGORIES;
  return EXPENSE_CATEGORIES;
}

export function typeMeta(type) {
  return TRANSACTION_TYPES.find((t) => t.value === type) || TRANSACTION_TYPES[1];
}
