# Instant Financial Tracker

A plain, iOS-inspired personal finance PWA built with React, Vite and Supabase. Deploy on Vercel.

## Features

- Email/password sign in and registration; private per-user cloud data with row-level security.
- Cash, banks, mobile banking, credit cards, savings, loans payable and receivables.
- Add and edit accounts, income, expenses and atomic transfers.
- Net worth, monthly income/expense totals, category breakdowns, account and date filters.
- CSV export of the current transaction view; installable web app; explicit offline notice.
- `/ ?demo=1` without the space opens a temporary, in-memory preview. Demo data never syncs.

## Run

Use Node 22.12 or newer. Run `npm install`, `npm test`, then `npm run dev`.
Run `npm run build` for production; Vercel detects Vite automatically.

## Supabase

Run `schema.sql` in the project's SQL editor. This upgrades the original two-table schema without deleting financial records. A transfer stores one row with source and destination, so both balances change together. An existing transfer with no destination stops the migration rather than guessing where its money went.

To enable profile photos, run `avatar-storage.sql` once in the Supabase SQL Editor. It creates a private `ift-avatars` bucket and limits each user to their own photo folder.

`config.js` contains only the project's public browser URL and publishable key. Never add a secret/service-role key. Optional Vercel environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

Set Supabase Authentication → URL Configuration → Site URL to the deployed URL. Email confirmation remains enabled. Each user creates their own account and confirms their email.

Opening balances represent net value: assets and receivables are positive, debts are negative. Bank-to-card and bank-to-loan transfers reduce debt without creating a second expense. Lending money is a transfer from cash/bank to a receivable account; repayment is the reverse. Savings deposits are transfers.

The app reloads from the cloud on sign in, refresh, returning to the tab and reconnecting. An internet connection is required to view and save financial data. The service worker does not cache private financial records. No automatic bank import or financial payment execution is provided.


## Production deployment

Live app: https://instant-financial-tracker.vercel.app/

The Vercel project is connected to this GitHub repository. Commits pushed to `main` automatically build and update the production app. Check the Vercel Deployments page for build status. Database schema changes are applied separately in Supabase.
