# BetaShine / BetashineOrg update

Implemented requested dashboard and admin upgrades:

- Payment amount changed to **TZS 16,000** for Automatic Push and Lipa Namba/manual payment.
- Dashboard now greets the logged-in user using their **username** and follows the supplied dashboard layout: Net Income, Expenses, Bonus, Balance, Expenses, Share, Pay Client and Cash Out.
- System notifications are stored in Supabase and shown on the dashboard with a **Dismiss (×)** action that persists.
- Admin dashboard now manages users, account activation/deactivation, ban/unban, balance adjustments, manual deposit approval/rejection, withdrawal approval/rejection, and notifications to one user or all users.
- Admin can reset a user's password through a server-side `/api/admin-user` endpoint using the Supabase service key (never exposed to the browser).
- Withdrawal requests are stored and approved/rejected by admin; approved requests deduct the requested amount from the user's balance atomically.
- Banned users cannot earn through chat and are blocked at login/dashboard.
- Supabase migration added: `supabase/migrations/20260921110000_dashboard_admin_features.sql`.

## Deployment

1. Apply the new migration in Supabase.
2. Ensure the server environment contains `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and either `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` for the admin password-reset API.
3. Keep `FIMIPAY_AMOUNT=16000` if it is configured as an environment variable.
4. Deploy/rebuild the project.

The source folder has been kept intact; only the requested features/configuration were added or updated.
