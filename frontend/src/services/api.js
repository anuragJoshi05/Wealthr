import { supabase } from '../lib/supabaseClient';

// Resolves the signed-in user's id from the already-established local
// session (supabase.auth.getSession()) instead of supabase.auth.getUser(),
// which makes a network round-trip to the Auth server on every call.
//
// That round-trip was the root cause of pages — most visibly the
// Dashboard — intermittently failing to load with a JWT/session error on
// first landing after sign-in, and again on navigating back to them: right
// after OAuth sign-in (and periodically in the background, via
// autoRefreshToken), the client's session can be mid-refresh, and a
// getUser() call racing that moment gets rejected. getSession() reads the
// current session synchronously from memory/local storage — no network
// call, so no race — and Postgres row-level security is the actual
// security boundary regardless (see supabase/schema.sql), so nothing here
// was ever relying on getUser()'s server-side verification anyway.
export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const uid = data.session?.user?.id;
  if (!uid) throw new Error('Your session has expired. Please sign in again.');
  return uid;
}

// Normalizes error messages across Supabase's Postgres/Auth/Storage errors
// so every component can call the same helper regardless of which client
// call failed. Kept as the same import path/name used throughout the app.
export function getApiErrorMessage(err) {
  if (!err) return 'Something went wrong. Please try again.';
  if (typeof err === 'string') return err;
  return err.message || err.error_description || err.msg || 'Something went wrong. Please try again.';
}
