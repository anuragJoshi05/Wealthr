// Supabase Edge Function: send-statement-email
//
// Emails a generated Wealthr statement PDF to the signed-in user's own
// registered email address. The PDF itself is generated client-side (so it
// reuses the exact same rendering code as the "Download PDF" button) and
// passed in as base64; this function only handles delivery.
//
// Security notes:
//   - The recipient is ALWAYS the authenticated user's own email, read from
//     their verified Supabase session — never a client-supplied address.
//     This prevents the endpoint being used to spam arbitrary inboxes.
//   - This function relies on Supabase's default JWT verification (do not
//     deploy with --no-verify-jwt), so only a signed-in user can call it.
//
// Setup required before this works (see README.md):
//   1. Create a free Resend account at https://resend.com
//   2. Verify a sending domain in Resend (or use their onboarding domain for
//      testing — it can only send to the Resend account's own address).
//   3. Set two secrets on this Supabase project:
//        supabase secrets set RESEND_API_KEY=re_xxx
//        supabase secrets set RESEND_FROM="Wealthr <statements@yourdomain.com>"
//   4. Deploy: supabase functions deploy send-statement-email
//
// Without a configured RESEND_API_KEY, this function returns a clear 500
// error explaining what's missing rather than silently failing.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM = Deno.env.get('RESEND_FROM') || 'Wealthr Statements <onboarding@resend.dev>';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(str: string) {
  return str.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function formatDateLabel(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

// Wealthr-branded HTML email. Table-based layout for broad email client
// compatibility (Gmail/Outlook strip <style> tags in some contexts).
function buildEmailHtml({ name, email, startDate, endDate }: { name: string; email: string; startDate: string; endDate: string }) {
  const safeName = escapeHtml(name || 'there');
  const safeEmail = escapeHtml(email);
  const period = `${formatDateLabel(startDate)} – ${formatDateLabel(endDate)}`;

  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #E2E8F0;">
          <tr>
            <td style="padding:32px 32px 24px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#6366F1,#7C3AED);text-align:center;vertical-align:middle;">
                    <span style="color:#EEF2FF;font-size:18px;font-weight:800;line-height:40px;">W</span>
                  </td>
                  <td style="padding-left:12px;">
                    <span style="font-size:19px;font-weight:800;color:#0F172A;">Wealthr</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              <hr style="border:none;border-top:1px solid #E2E8F0;margin:0;" />
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px 32px;">
              <p style="margin:0 0 4px 0;font-size:12px;font-weight:700;letter-spacing:0.06em;color:#4F46E5;text-transform:uppercase;">Account Statement</p>
              <h1 style="margin:0 0 16px 0;font-size:22px;font-weight:800;color:#0F172A;">Hi ${safeName}, your statement is ready</h1>
              <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:#334155;">
                Attached is your Wealthr account statement for <strong>${period}</strong>. It covers every
                income, expense, transfer, and lending entry recorded in your account during that period.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 8px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F8FAFC;border:1px solid #E2E8F0;border-radius:14px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 10px 0;font-size:13px;font-weight:700;color:#0F172A;">🔒 This PDF is password protected</p>
                    <p style="margin:0;font-size:13px;line-height:1.6;color:#475569;">
                      To open it, enter your Wealthr account email address as the password:<br />
                      <strong style="color:#0F172A;">${safeEmail}</strong>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 4px 32px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#475569;">
                This keeps your statement safe even if it ends up in the wrong inbox — only someone who
                knows the email address on this account can open it.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 32px 32px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#475569;">
                Thanks for using Wealthr to keep your finances organized.
              </p>
              <p style="margin:16px 0 0 0;font-size:13px;color:#0F172A;font-weight:700;">— The Wealthr Team</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background-color:#F8FAFC;border-top:1px solid #E2E8F0;">
              <p style="margin:0;font-size:11px;color:#94A3B8;">
                This is an automated statement email sent because you requested it from the Wealthr app.
                If you didn't request this, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!RESEND_API_KEY) {
    return jsonResponse(
      { error: 'Email delivery is not configured yet. Set the RESEND_API_KEY secret on this Supabase project.' },
      500
    );
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return jsonResponse({ error: 'Server misconfiguration: missing Supabase environment variables.' }, 500);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing Authorization header.' }, 401);
  }

  // Verify the caller and resolve their OWN email — this is the only email
  // this function will ever send to, regardless of what the client sends.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user || !user.email) {
    return jsonResponse({ error: 'Not authenticated.' }, 401);
  }

  let payload: { pdfBase64?: string; filename?: string; startDate?: string; endDate?: string };
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body.' }, 400);
  }

  const { pdfBase64, filename, startDate, endDate } = payload;
  if (!pdfBase64 || !startDate || !endDate) {
    return jsonResponse({ error: 'Missing required fields: pdfBase64, startDate, endDate.' }, 400);
  }
  // Guard against absurdly large attachments (Resend caps attachments at 40MB;
  // a personal-finance statement should never come close to this).
  if (pdfBase64.length > 15_000_000) {
    return jsonResponse({ error: 'Statement is too large to email — try a shorter date range.' }, 413);
  }

  const displayName = (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || user.email.split('@')[0];

  const resendPayload = {
    from: RESEND_FROM,
    to: [user.email],
    subject: `Your Wealthr statement · ${formatDateLabel(startDate)} – ${formatDateLabel(endDate)}`,
    html: buildEmailHtml({ name: displayName, email: user.email, startDate, endDate }),
    attachments: [
      {
        filename: filename || 'Wealthr-Statement.pdf',
        content: pdfBase64,
      },
    ],
  };

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(resendPayload),
  });

  if (!resendResponse.ok) {
    const errBody = await resendResponse.text();
    console.error('Resend error:', resendResponse.status, errBody);
    return jsonResponse({ error: 'Failed to send email. Please try again shortly.' }, 502);
  }

  return jsonResponse({ ok: true, sentTo: user.email });
});
