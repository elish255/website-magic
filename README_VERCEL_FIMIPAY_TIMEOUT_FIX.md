# BETASHINE – FimiPay Vercel Timeout Fix

This build fixes the payment button hanging forever on **"Inaanzisha malipo..."** when the FimiPay server does not respond.

## What was fixed
- Server-side FimiPay `create_order` request now has a 15-second timeout.
- Server-side FimiPay `order_status` request now has a 10-second timeout.
- Browser request to `/api/fimipay` now has a 22-second timeout.
- Vercel logs now show safe request/response timing and FimiPay status/order ID, without logging the API key.
- API key remains server-side in Vercel Environment Variables.

## Vercel Environment Variables
Set these in the Vercel project:

- `FIMIPAY_API_KEY` = your live FimiPay secret key
- `FIMIPAY_AMOUNT` = `16000`
- `FIMIPAY_CURRENCY` = `TZS`
- `SUPABASE_URL` = your Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` = your Supabase publishable/anon key
- `SUPABASE_SECRET_KEY` = your Supabase secret/service-role key

Optional:
- `FIMIPAY_CREATE_PAYMENT_URL` = `https://fimipay.com/api/v1/payment/create_order`
- `FIMIPAY_ORDER_STATUS_URL` = `https://fimipay.com/api/v1/payment/order_status`

Do NOT put `FIMIPAY_API_KEY` in any `VITE_*` variable or frontend code.

## Deploy
1. Upload this ZIP to the Vercel project / deploy it.
2. Confirm the Environment Variables above are present for the environment you are deploying (Production if using the live site).
3. Redeploy after changing Environment Variables.
4. Open the payment page and press **LIPA TZS 14,500 KWA PUSH**.
5. If FimiPay still does not respond, the page will now show a timeout message instead of staying on "Inaanzisha malipo...".
6. In Vercel, open **Deployments → latest deployment → Functions/Logs** and look for `FimiPay request started`, `FimiPay response received`, or `FimiPay request timed out`.
