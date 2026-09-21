# FimiPay via Vercel API

The browser now calls `/api/fimipay`. The FimiPay secret key stays server-side in Vercel Environment Variables.

## Vercel Environment Variables
Set these for the Production environment:

- `FIMIPAY_API_KEY` = your new LIVE FimiPay secret key
- `FIMIPAY_AMOUNT` = `16000`
- `FIMIPAY_CURRENCY` = `TZS`
- `SUPABASE_URL` = your Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` = your Supabase publishable key
- `SUPABASE_SECRET_KEY` = your Supabase secret key

`SUPABASE_SERVICE_ROLE_KEY` can be used instead of `SUPABASE_SECRET_KEY` if that is what your project already uses.

Optional:
- `FIMIPAY_CREATE_PAYMENT_URL`
- `FIMIPAY_ORDER_STATUS_URL`

Do NOT use `VITE_FIMIPAY_API_KEY` or put the FimiPay secret in frontend code.

After adding/changing Environment Variables, redeploy the Vercel project.
