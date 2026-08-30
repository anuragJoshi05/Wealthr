# Wealthr — Personal Finance Management App

A premium, mobile-first personal finance app: track income, expenses, transfers,
savings, and money lent/borrowed, with budgets, analytics, receipt photos, dark
mode, and an installable mobile app — all on **completely free infrastructure**.

---

## What's in the box

| Layer | Tech | Why |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind CSS | Fast, modern, mobile-first |
| Backend | **Supabase** (Postgres + Auth + Storage) | Free forever, no card required, no server to host |
| Auth | Supabase Auth (Google Sign-In) | One click, persistent session |
| Hosting (website) | Vercel (free) | Auto-deploys from GitHub, zero config |
| Mobile app | Capacitor → Android APK | Same code, installs as a real app on your phone |
| Motion/UI | Framer Motion, Recharts, Lucide icons | Smooth transitions, charts, icons |

There is **no separate backend server** to deploy. Supabase *is* the backend —
your database, authentication, and file storage all live there, secured by
row-level security policies so each person can only ever see their own data.
This also sidesteps the reliability problem a free Express host has (spins
down when idle, causing slow/failed first requests) — Supabase's free tier
stays warm.

---

## Part 1 — Set up Supabase (5 minutes, no credit card)

1. Go to **[supabase.com](https://supabase.com)** → Sign up (free) → **New Project**.
   - Pick any name/region, set a database password (save it somewhere, you
     won't need it day-to-day but keep it safe).
2. Wait ~2 minutes for the project to provision.
3. **Enable Google Sign-In**: Left sidebar → **Authentication** → **Providers** → **Google** → toggle on.
   - You need a Google OAuth Client ID/Secret. Supabase's own guide walks
     through creating one in the Google Cloud Console (also free):
     Authentication → Providers → Google → click **"Google OAuth setup guide"** link right there in the dashboard. It takes about 3 minutes.
   - Under **Authentication → URL Configuration**, add your site URLs (see
     Part 4 for the redirect URL once you know your Vercel domain — for now,
     `http://localhost:5173` works for local dev).
4. **Run the database schema**: Left sidebar → **SQL Editor** → **New query**.
   Open each file below from this project, paste the whole thing in, click
   **Run** — **in this exact order**:
   1. `supabase/schema.sql` — core tables (transactions, lending, repayments, budgets) + row-level security
   2. `supabase/storage.sql` — private storage bucket for receipt photos (compressed, size-capped)
   3. `supabase/accounts.sql` — **Accounts** table + Self Transfer + refund support. Every
      transaction now belongs to a real account instead of a loose "payment mode". This
      file also migrates any existing data automatically (see below).
   4. `supabase/rpc.sql` — atomic functions for lending + repayment writes (account-aware)
   5. `supabase/people.sql` — the People/payee ledger table + balance function
   6. `supabase/sharing.sql` — expense sharing (split bills): `expense_shares` table +
      RPCs. Deliberately separate from lending — see the comment block at the
      top of that file for the two flows it supports.

   **Upgrading an existing Wealthr database?** Run `storage.sql`, `accounts.sql`,
   `rpc.sql`, and `sharing.sql` (in that order) against your existing database
   — all four are written as idempotent, `ALTER TABLE`-safe migrations.
   - `storage.sql` adds an 8 MB file-size cap and restricts uploads to
     images/PDFs on the existing `receipts` bucket — this plus the
     client-side compression (see the Storage Efficiency section below) is
     what brings storage usage down; re-running it is required to pick up
     the new cap on a bucket created by an older version of this file.
   - `accounts.sql` will:
     - Create a real account per user for every distinct payment mode
       (`UPI`, `Cash`, `Card`, …) already present in your transaction history.
     - Backfill every existing transaction to point at the right account(s),
       including turning old `transfer` rows into `self_transfer` rows with a
       real source and destination account.
     - Add the new `refund` transaction type.

   No historical data is deleted or overwritten — this only adds columns/rows
   and backfills them from what's already there.
5. **Get your API keys**: Left sidebar → **Project Settings** → **API**.
   Copy the **Project URL** and the **anon/public key**. You'll paste these
   into `frontend/.env` next.

That's it — no billing page, no plan selection. Supabase's free tier gives
you 500MB database, 1GB file storage, and 50,000 monthly active users, which
is enormous headroom for a personal finance app.

---

## Part 1.5 — Set up statement emailing (optional, 5 minutes, free)

The **Download PDF** button works with zero extra setup. **Email me a copy**
needs a Supabase Edge Function deployed and a free email-sending account,
because sending real email requires a server-side API key that can never
live in the frontend.

1. **Create a free [Resend](https://resend.com) account.** Resend's free
   tier covers 3,000 emails/month, comfortably more than a personal app
   needs.
   - For real use, verify your own domain under **Domains** in the Resend
     dashboard (a few DNS records, takes a few minutes to a few hours to
     verify) so statements arrive as "Wealthr Statements
     `<statements@yourdomain.com>`".
   - To test immediately without owning a domain, skip domain verification
     — Resend's shared `onboarding@resend.dev` sender works out of the box,
     but can only deliver to the email address on your Resend account, which
     is fine for trying the feature yourself first.
2. **Get an API key**: Resend dashboard → **API Keys** → **Create API Key**.
3. **Install the Supabase CLI** (if you don't already have it):
   ```bash
   npm install -g supabase
   ```
4. **Link and deploy the function**, from the project root:
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>   # found in Project Settings → General
   supabase secrets set RESEND_API_KEY=re_your_key_here
   supabase secrets set RESEND_FROM="Wealthr Statements <statements@yourdomain.com>"
   supabase functions deploy send-statement-email
   ```
   (Skip the `RESEND_FROM` line if you're using the `onboarding@resend.dev`
   testing sender — the function falls back to it automatically.)

That's the whole setup — the frontend already calls this function, and it
always sends to the signed-in user's own verified email address (never a
client-supplied one), so there's no way to use it to email anyone else.

If you don't want to set this up right now, the app works fine without
it — the "Email me a copy" button will just show a clear error explaining
what's missing instead of failing silently.

---

## Part 2 — Run it locally in VS Code

```bash
# 1. Unzip the project and open it in VS Code
cd wealthr/frontend

# 2. Copy the env template and fill in your Supabase values
cp .env.example .env
# Open .env and paste in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Install dependencies
npm install

# 4. Run it
npm run dev
```

Open **http://localhost:5173** — you'll land on the Google Sign-In screen.
Sign in, and you're in the app.

---

## Part 3 — Using the app (every feature, where to find it)

### Bottom nav (mobile) / Sidebar (desktop)
Six sections: **Dashboard**, **Transactions**, **Accounts**,
**Lending & Borrowing**, **Analytics**, **Budgets**, plus **Settings**.

### Accounts
Add a bank account, wallet, or cash account with just a **name** and an
optional **current balance** — never an account number, IFSC code, or any
other sensitive banking detail. Pick one as your **default**; it's
pre-selected whenever you add a transaction, but you can always change it.
Tap into an account to see its live balance, full transaction history, and
its own income/expense/refund/transfer breakdown. The **Total Across All
Accounts** card up top sums every account's live balance.

If you haven't added an account yet, every "add transaction" flow (quick-add,
Lending, split expenses) shows an **Add an account first** prompt with a
one-tap button straight to this page — you can't create a transaction with
no account to put it on.

### Adding a transaction
Tap the **+** button (center of the bottom nav on mobile, top of the sidebar
on desktop). Choose Income / Expense / Refund / Self Transfer, fill in
amount, date, category, account, payment mode, and optionally a person,
notes, tags, and a **receipt photo**. Tap any existing transaction to edit or
delete it.

- **Refund** is its own type, not Income — it's money coming back from a
  previous expense. It's never counted toward income anywhere in the app; it
  reduces *effective* expense instead (Dashboard's Cash Balance, Analytics,
  and Budget category spend are all net of refunds).
- **Self Transfer** replaces the old free-form "Transfer": pick a **From
  Account** and a **To Account** (both required, must be different) and an
  amount. It decreases the source account's balance and increases the
  destination's by the same amount — total money across all your accounts
  never changes, and it's excluded from every income/expense figure.

> Lending, borrowing, and repayments are **not** created from this quick-add
> form on purpose — they live in the Lending & Borrowing tab so they stay
> linked to a trackable record with a due date and repayment history, instead
> of becoming a floating, un-trackable entry.

### Lending & Borrowing
Tap **New** → choose "I lent money" or "I borrowed money" → enter person,
amount, date, **account** (which account the money left from or landed in),
optional due date and note. Tap any record to see full repayment history.
Two ways to close it out:
- **Record Partial** — logs a specific repayment amount through an account
  you choose; status moves to "Partially Paid" automatically once anything
  is repaid.
- **Mark Fully Settled** — one tap to close the record out completely when
  it's fully paid back, no need to type the exact remaining amount.

### People (payees)
A fourth tab inside Lending & Borrowing. This is the answer to "I paid for
Rahul, then later he paid for me, and I've lost track of the net total" —
add a person once (or just start using their name in a lending record and
they're saved automatically), and Wealthr shows a running **net balance**
with them: how much they owe you minus how much you owe them, combined
across every lend/borrow/repayment on record. Tap a person to see the full
history behind that number. This is entirely separate from split-expense
sharing (below) — lending is a loan, sharing is one bill split at the moment
it happened.

### Dashboard
**Cash Balance** (gradient card up top) reflects income minus *net* expense
(expense net of refunds) only — lending, borrowing, and self transfers
don't change it, since handing someone cash converts it into a receivable
rather than spending it, and moving your own money between your own
accounts was never income or expense to begin with. Money lent/borrowed
outstanding are shown as their own separate stats below, exactly so they're
never confused with real income or spending. Also shows this month's
income/expenses/refunds, spending-by-category and spending-by-payment-mode
charts, and your 10 most recent transactions.

### Analytics
Switch between Today / This Week / This Month / This Year / Custom Range.
Shows income vs. expense trend (6 months), savings rate, comparison vs. the
previous equivalent period, refund and self-transfer totals (when you have
any), top spending categories, and daily/weekly/monthly average spend.

### Budgets
Set a monthly limit per category. Progress bar turns amber at 80% and red at
100%+, with a warning banner. Refunds against a category reduce its spend
for the month, same as everywhere else. Use the arrows to browse past/future
months.

### Exporting a statement
On the Transactions page, tap **Export** → pick a date range → **Download
PDF** or **Email me a copy**. Generates a formal, letterhead-style statement
(summary totals, color-coded income/expense table with each transaction's
account, page numbers, the actual Wealthr logo in the header). Every
statement is **password protected** — the password is always your own
account email address, so a stray copy sitting in Downloads or an inbox
can't be opened by anyone else. Emailing sends the same protected PDF as a
proper Wealthr-branded email, always to your own signed-in address (see
Part 1.5 below for the one-time setup this needs).

### Settings
Profile info, dark/light mode toggle, sign out.

---

## Part 4 — Deploy the website (free, ~5 minutes)

**Vercel** (recommended):

1. Push this project to a GitHub repo.
2. Go to **[vercel.com](https://vercel.com)** → sign in with GitHub → **New Project** → import your repo.
3. Set **Root Directory** to `frontend`.
4. Add environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   (same values as your local `.env`).
5. Deploy. You'll get a URL like `wealthr-yourname.vercel.app`.
6. **Important**: go back to Supabase → Authentication → URL Configuration →
   add `https://wealthr-yourname.vercel.app` to both **Site URL** and
   **Redirect URLs**, or Google Sign-In will fail on the live site.

*(Netlify works identically if you prefer it. Firebase Hosting is also free
and works fine too — Hosting alone never needed the Blaze plan, only Cloud
Functions and Storage did, which this app no longer uses.)*

---

## Part 5 — Get it as a downloadable mobile app

You have two options, and you can do both:

### Option A — Install as a PWA (zero setup, works today)

Once deployed (or even on `localhost` in Chrome), open the site on your
phone:
- **Android (Chrome)**: menu (⋮) → **"Install app"**. It installs like a
  native app with its own icon, opens full-screen, works offline for cached
  data.
- **iPhone (Safari)**: Share button → **"Add to Home Screen"**.

This is genuinely a "downloadable app" — no app store, no review process,
completely free, and it's already wired up (the manifest and icons are in
`frontend/public/`).

### Option B — Real Android APK via Capacitor (installable .apk file)

For an actual APK file you can share or sideload:

1. Install **[Android Studio](https://developer.android.com/studio)** (free).
2. In VS Code terminal, inside `frontend/`:
   ```bash
   npm run build
   npx cap add android      # one-time — creates the android/ folder
   npx cap sync android
   npx cap open android     # opens the project in Android Studio
   ```
3. In Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**.
4. Find the generated `.apk` under `android/app/build/outputs/apk/debug/` —
   copy it to your phone and install it directly (enable "Install from
   unknown sources" if prompted).

For future rebuilds after code changes, just run:
```bash
npm run cap:android
```
(this is a shortcut already set up in `package.json` — it rebuilds and
re-opens Android Studio for you).

> iOS requires a Mac with Xcode to build — Capacitor supports it
> (`npx cap add ios`), but I can't give you that step without a Mac. The PWA
> route (Option A) covers iPhone with zero extra setup either way.

---

## Project structure

```
wealthr/
  frontend/                 React + Vite + Tailwind PWA (this is the whole app)
    src/
      lib/supabaseClient.js       Supabase client init
      contexts/                   Auth + Theme
      services/                   All data access (Supabase queries)
        statementEmailService.js  Calls the send-statement-email Edge Function
      components/                 UI, grouped by feature
      pages/                      One file per route
      utils/                      Formatters, constants, analytics math
        pdfExport.js               Statement PDF (password protected, Wealthr-branded)
    capacitor.config.json         Mobile app wrapper config
  supabase/
    schema.sql                    Tables + row-level security — run 1st
    storage.sql                   Receipt photo storage bucket — run 2nd
    accounts.sql                  Accounts, Self Transfer, refunds — run 3rd
    rpc.sql                       Atomic multi-table functions — run 4th
    people.sql                    People/payee ledger + balance function — run 5th
    sharing.sql                   Split-expense sharing — run 6th
    functions/
      send-statement-email/       Edge Function: emails the password-protected
                                   statement PDF to the signed-in user's own
                                   email via Resend (see Part 1.5)
```

---

---

## Storage efficiency

Supabase's free tier caps combined database + storage at 500 MB. A raw
phone-camera receipt photo is routinely 3-8 MB — a handful of those
uploaded as-is is enough to burn through a large fraction of that on their
own, which is exactly what was happening before this pass (~26 MB for 22
transactions, almost entirely receipt images).

What changed:

- **Every receipt image is compressed client-side before upload**
  (`frontend/src/utils/imageCompression.js`): resized to a 1600px max
  dimension and re-encoded as JPEG at ~72% quality using the browser's own
  Canvas API — no new dependency, works offline. A typical 4 MB phone photo
  comes out around 150-300 KB, roughly a **15-25× reduction** per receipt,
  comfortably clearing the 10× target. As a side effect, re-encoding onto a
  fresh canvas also strips EXIF metadata.
- **PDF receipts pass through untouched** (compressing arbitrary PDFs
  client-side reliably needs a heavy library this project doesn't depend
  on), but the storage bucket now hard-caps every upload at 8 MB and only
  accepts images or PDFs (`supabase/storage.sql`), so nothing oversized or
  off-type can land in storage regardless of client behavior.
- **Orphaned receipt files are cleaned up.** Replacing or removing a
  transaction's receipt now deletes the old file from storage instead of
  leaving it there forever (`TransactionForm.jsx`); deleting a transaction
  already deleted its receipt.
- **No duplicate transaction concepts.** The old `transfer` type and its
  `payment_mode` → `to_payment_mode` pair are fully retired in favor of
  Self Transfer's `account_id` → `to_account_id`, so there's no redundant
  field pair sitting unused on every row (see `supabase/accounts.sql`).
- **Account balances are computed, not stored.** Rather than adding a
  running-balance column to `accounts` that could drift and would need its
  own write on every transaction, `get_account_balances()` derives the
  balance live from the transactions ledger — one less mutable field per
  account, and no possibility of desync.

None of this removes functionality — receipts are still fully viewable
(signed URLs, `transactionService.getReceiptUrl`), still attach to any
transaction, and image quality is visually near-lossless for reading a
receipt's line items.

---

## How your data stays private

Every table has a row-level security policy (`supabase/schema.sql`) that
only allows a row to be read or written when `auth.uid() = user_id` — i.e.
your Postgres user ID must match the row's owner. This is enforced **inside
the database itself**, not just in the app's code, so even a bug in the
frontend can never leak one person's data to another. The Postgres functions
that create linked records (a lending entry + its transaction, a repayment +
its balance update) run with your own permissions (`security invoker`), so
they're bound by the exact same policies.

---

## What's intentionally not included

- **Multi-currency** — everything formats as INR. Change the locale/currency
  in `frontend/src/utils/formatters.js` if you need something else.
- **iOS App Store build** — needs a Mac; the PWA install (Part 5, Option A)
  covers iPhone in the meantime.
