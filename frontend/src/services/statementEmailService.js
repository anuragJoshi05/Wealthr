import { supabase } from '../lib/supabaseClient';

// Invokes the send-statement-email Supabase Edge Function. supabase-js
// automatically attaches the signed-in user's auth token, which the
// function uses server-side to resolve the (only) recipient address — no
// email address is ever sent from the client.
export async function emailStatement({ pdfBase64, filename, startDate, endDate }) {
  const { data, error } = await supabase.functions.invoke('send-statement-email', {
    body: { pdfBase64, filename, startDate, endDate },
  });

  if (error) {
    // Edge Function errors (4xx/5xx) surface here without the JSON body by
    // default in some supabase-js versions — try to recover the message the
    // function actually sent before falling back to a generic one.
    const context = error.context;
    if (context && typeof context.json === 'function') {
      try {
        const body = await context.json();
        if (body?.error) throw new Error(body.error);
      } catch (_) {
        // fall through to generic message below
      }
    }
    throw new Error(error.message || 'Failed to send statement email.');
  }

  if (data?.error) throw new Error(data.error);
  return data;
}
