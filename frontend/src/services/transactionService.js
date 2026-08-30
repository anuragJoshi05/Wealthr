import { supabase } from '../lib/supabaseClient';
import { getCurrentUserId } from './api';
import { compressImageFile } from '../utils/imageCompression';

const PAGE_SIZE = 25;

// Pulls in the account's own name via the FK relationship so list/detail
// views never need a second round-trip just to show "HDFC Bank" instead of
// a bare id. Postgres auto-names single-column FK constraints
// `<table>_<column>_fkey`, which is what disambiguates the two joins below
// since a transaction can reference `accounts` twice (account_id + the
// Self Transfer destination, to_account_id).
const SELECT_WITH_ACCOUNTS = `*,
  account:accounts!transactions_account_id_fkey(id,name),
  to_account:accounts!transactions_to_account_id_fkey(id,name)`;

function mapRow(row) {
  // Postgres columns are snake_case; the rest of the app expects camelCase
  // (matching the shape the old Firestore documents had), so translate once
  // here rather than scattering row.payment_mode everywhere.
  return {
    id: row.id,
    type: row.type,
    amount: Number(row.amount),
    date: row.date,
    category: row.category,
    subcategory: row.subcategory || '',
    description: row.description || '',
    paymentMode: row.payment_mode || null,
    person: row.person || '',
    tags: row.tags || [],
    receiptUrl: row.receipt_url || null,
    linkedLendingId: row.linked_lending_id || null,
    // Every transaction belongs to a real account; Self Transfers also
    // carry a destination account. Both are mandatory at the DB level
    // (see supabase/accounts.sql), so accountId is never null here.
    accountId: row.account_id,
    accountName: row.account?.name || null,
    toAccountId: row.to_account_id || null,
    toAccountName: row.to_account?.name || null,
    // Expense sharing — see sharedExpenseService for the dedicated flows.
    // `amount` above already reflects only the user's own share.
    isSplit: row.is_split || false,
    splitTotalAmount: row.split_total_amount != null ? Number(row.split_total_amount) : null,
    paidByPerson: row.paid_by_person || null,
    shareSettled: row.share_settled ?? true,
    shareSettledAt: row.share_settled_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPayload(payload) {
  const row = {};
  if (payload.type !== undefined) row.type = payload.type;
  if (payload.amount !== undefined) row.amount = payload.amount;
  if (payload.date !== undefined) row.date = payload.date;
  if (payload.category !== undefined) row.category = payload.category;
  if (payload.subcategory !== undefined) row.subcategory = payload.subcategory || null;
  if (payload.description !== undefined) row.description = payload.description || null;
  if (payload.paymentMode !== undefined) row.payment_mode = payload.paymentMode || null;
  if (payload.person !== undefined) row.person = payload.person || null;
  if (payload.tags !== undefined) row.tags = payload.tags;
  if (payload.receiptUrl !== undefined) row.receipt_url = payload.receiptUrl;
  if (payload.accountId !== undefined) row.account_id = payload.accountId;
  if (payload.toAccountId !== undefined) row.to_account_id = payload.toAccountId || null;
  // paidByPerson/shareSettled are only ever set at creation time for a
  // plain (non-split) expense — split expenses always go through
  // sharedExpenseService.createSplit() instead, so is_split/split_total
  // are intentionally never written here.
  if (payload.paidByPerson !== undefined) row.paid_by_person = payload.paidByPerson || null;
  if (payload.shareSettled !== undefined) row.share_settled = payload.shareSettled;
  return row;
}

export const transactionService = {
  // Fetches every matching transaction (up to 5000) without pagination —
  // used for statement export where the PDF needs the complete range, not
  // just one page.
  async listAllInRange(startDate, endDate) {
    const uid = await getCurrentUserId();
    const { data, error } = await supabase
      .from('transactions')
      .select(SELECT_WITH_ACCOUNTS)
      .eq('user_id', uid)
      .gte('date', new Date(startDate).toISOString())
      .lte('date', new Date(endDate).toISOString())
      .order('date', { ascending: true })
      .range(0, 4999);
    if (error) throw error;
    return data.map(mapRow);
  },

  // Every transaction, unpaginated — used for dashboard/analytics
  // aggregation where the whole history (or a whole year) needs summing
  // client-side. Kept separate from `list()` (which is paginated for the
  // Transactions page) to avoid accidentally paginating an analytics query.
  async listAll(params = {}) {
    const uid = await getCurrentUserId();
    let q = supabase.from('transactions').select(SELECT_WITH_ACCOUNTS).eq('user_id', uid);
    if (params.accountId) q = q.or(`account_id.eq.${params.accountId},to_account_id.eq.${params.accountId}`);
    if (params.startDate) q = q.gte('date', new Date(params.startDate).toISOString());
    if (params.endDate) q = q.lt('date', new Date(params.endDate).toISOString());
    const { data, error } = await q.order('date', { ascending: false }).range(0, 9999);
    if (error) throw error;
    return data.map(mapRow);
  },

  // Compresses (images only; PDFs pass through) then uploads a receipt.
  // Storage-efficiency note: this is the primary defense against oversized
  // Supabase storage usage — see utils/imageCompression.js.
  async uploadReceipt(file, uid) {
    const compressed = await compressImageFile(file);
    const ext = compressed.name.split('.').pop();
    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('receipts').upload(path, compressed, {
      cacheControl: '3600',
      upsert: false,
      contentType: compressed.type || file.type,
    });
    if (error) throw error;
    return path;
  },

  async getReceiptUrl(path) {
    if (!path) return null;
    const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  },

  async deleteReceipt(path) {
    if (!path) return;
    await supabase.storage.from('receipts').remove([path]);
  },

  async list(params = {}) {
    const uid = await getCurrentUserId();
    const page = params.page || 0;
    const pageSize = params.pageSize || PAGE_SIZE;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    let q = supabase.from('transactions').select(SELECT_WITH_ACCOUNTS, { count: 'exact' }).eq('user_id', uid);

    if (params.type) q = q.eq('type', params.type);
    if (params.category) q = q.eq('category', params.category);
    if (params.paymentMode) q = q.eq('payment_mode', params.paymentMode);
    if (params.person) q = q.eq('person', params.person);
    if (params.accountId) q = q.or(`account_id.eq.${params.accountId},to_account_id.eq.${params.accountId}`);
    if (params.startDate) q = q.gte('date', new Date(params.startDate).toISOString());
    if (params.endDate) q = q.lte('date', new Date(params.endDate).toISOString());
    if (params.search) {
      const s = params.search.replace(/[%_]/g, '');
      q = q.or(`description.ilike.%${s}%,category.ilike.%${s}%,person.ilike.%${s}%`);
    }

    q = q.order('date', { ascending: false }).order('id', { ascending: false }).range(from, to);

    const { data, error, count } = await q;
    if (error) throw error;

    const items = data.map(mapRow);
    const hasMore = count !== null ? to + 1 < count : items.length === pageSize;
    return { items, hasMore, nextPage: page + 1 };
  },

  async get(id) {
    const { data, error } = await supabase.from('transactions').select(SELECT_WITH_ACCOUNTS).eq('id', id).single();
    if (error) throw error;
    return mapRow(data);
  },

  async create(payload) {
    const uid = await getCurrentUserId();
    const row = { ...mapPayload(payload), user_id: uid };
    const { data, error } = await supabase.from('transactions').insert(row).select(SELECT_WITH_ACCOUNTS).single();
    if (error) throw error;
    return mapRow(data);
  },

  // Self Transfer goes through its own RPC (create_self_transfer, see
  // supabase/accounts.sql) rather than a plain insert, so both accounts are
  // validated as belonging to the user and as genuinely different in one
  // atomic round-trip.
  async createSelfTransfer({ fromAccountId, toAccountId, amount, date, description }) {
    const { data, error } = await supabase.rpc('create_self_transfer', {
      p_from_account_id: fromAccountId,
      p_to_account_id: toAccountId,
      p_amount: amount,
      p_date: date,
      p_description: description || null,
    });
    if (error) throw error;
    return mapRow(data);
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('transactions')
      .update(mapPayload(payload))
      .eq('id', id)
      .select(SELECT_WITH_ACCOUNTS)
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async remove(id) {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) throw error;
  },
};
