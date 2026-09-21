# Dashboard HTTP 400 fix

The dashboard previously requested the new `is_banned`, `expenses`, and `bonus` columns in the same Supabase request as the core profile fields. If the new migration had not yet been applied to the deployed Supabase project, PostgREST returned HTTP 400 and the dashboard remained on `Inapakia dashboard...`.

This version:
- Loads core profile fields first.
- Treats the new admin columns as optional until the migration is applied.
- Treats notifications as optional so a missing notification table/column cannot block the dashboard.
- Keeps the new admin features available once `supabase/migrations/20260921110000_dashboard_admin_features.sql` is applied.

For the complete admin/notification functionality, apply that migration in the production Supabase project, then redeploy Vercel.
