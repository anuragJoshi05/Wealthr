-- ============================================================================
-- Wealthr — Storage bucket for receipt images
-- Run this AFTER schema.sql, also in Supabase Dashboard → SQL Editor
-- ============================================================================

-- Create a private bucket. Files are scoped per-user via the
-- folder-name-as-uid convention enforced by the policies below.
--
-- STORAGE-EFFICIENCY GUARDRAIL: the app compresses/resizes every receipt
-- photo client-side before upload (see compressImageFile() in
-- frontend/src/utils/imageCompression.js, used by
-- transactionService.uploadReceipt), but this hard cap on the bucket itself
-- is a second line of defense against an oversized file ever landing in
-- storage — e.g. a multi-page PDF bill, or a client that skipped
-- compression for some reason. 8 MB comfortably fits a compressed
-- multi-page PDF while keeping storage usage predictable (500 MB free tier
-- / 8 MB ≈ 60k+ receipts).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts', 'receipts', false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Users can only upload into a folder matching their own uid, e.g.
-- receipts/{uid}/{filename}. This mirrors the same auth.uid() = owner
-- pattern used on every table above.
drop policy if exists "Users upload their own receipts" on storage.objects;
create policy "Users upload their own receipts"
  on storage.objects for insert
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users read their own receipts" on storage.objects;
create policy "Users read their own receipts"
  on storage.objects for select
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete their own receipts" on storage.objects;
create policy "Users delete their own receipts"
  on storage.objects for delete
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
