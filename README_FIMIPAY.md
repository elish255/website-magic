# BETASHINE — FimiPay Automatic Push

The automatic payment flow is configured for FimiPay Tanzania mobile Push USSD.

## FimiPay endpoints

Create Payment:

`POST https://fimipay.com/api/v1/payment/create_order`

Order Status:

`POST https://fimipay.com/api/v1/payment/order_status`

Both requests are sent from the Supabase Edge Function with:

- `Authorization: Bearer <FIMIPAY_API_KEY>`
- `Content-Type: application/json`
- `Accept: application/json`
- `User-Agent: FimiPay-SDK/1.0`

## Supabase Edge Function secrets

Set these in Supabase Edge Functions → Secrets:

```text
FIMIPAY_API_KEY=YOUR_NEW_LIVE_SECRET_KEY
FIMIPAY_AMOUNT=16000
FIMIPAY_CURRENCY=TZS
SITE_URL=https://betashineorg.online
```

Optional URLs default to the official FimiPay endpoints, so they do not need to be set:

```text
FIMIPAY_CREATE_PAYMENT_URL=https://fimipay.com/api/v1/payment/create_order
FIMIPAY_ORDER_STATUS_URL=https://fimipay.com/api/v1/payment/order_status
```

Do NOT put `FIMIPAY_API_KEY` in `.env`, `VITE_*`, React code, or any browser-visible file.

## Create Payment payload

The Edge Function sends:

```json
{
  "buyer_email": "customer@example.com",
  "buyer_name": "John Doe",
  "buyer_phone": "255682812345",
  "amount": 16000,
  "currency": "TZS",
  "payment_method": "mobile"
}
```

The user's phone is normalized from common Tanzanian formats such as `0712345678`, `255712345678`, or `+255712345678` to the international `255...` format.

## Payment activation

The browser polls the Edge Function. The Edge Function polls FimiPay's Order Status endpoint using the stored `order_id`.

Only `data.payment_status = SUCCESS` activates the profile and redirects the user to `/dashboard`.

`PENDING` and `INPROGRESS` remain waiting states. `CANCELLED`, `USERCANCELLED`, and `REJECTED` are treated as failed.
