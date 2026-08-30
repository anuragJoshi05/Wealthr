import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fails loudly at startup rather than a confusing runtime error deep in a query.
  console.error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy frontend/.env.example to frontend/.env and fill them in.'
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // Persists the session in localStorage and silently refreshes the
    // access token in the background, so the person stays signed in
    // across restarts without re-authenticating.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
