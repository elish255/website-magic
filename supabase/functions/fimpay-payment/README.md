# FimiPay automatic payment

This Edge Function keeps the FimiPay secret key on the server and never exposes it to the browser.

Set these Supabase Edge Function secrets before deploying:

- `FIMIPAY_API_KEY` — your production secret key (do not put it in Vite/public env vars).
- `FIMIPAY_CREATE_PAYMENT_URL` — optional; defaults to `https://fimipay.com/api/v1/payment/create_order`.
- `FIMIPAY_ORDER_STATUS_URL` — optional; defaults to `https://fimipay.com/api/v1/payment/order_status`. The function sends `POST` with `{ "order_id": "..." }`.
- The Create Payment body is implemented from the current FimiPay Tanzania mobile Push documentation: `buyer_email`, `buyer_name`, `buyer_phone`, `amount`, `currency`, and `payment_method: "mobile"`. No client-side API key is used.
- `SITE_URL` — e.g. `https://betashineorg.online`
- Optional: `FIMIPAY_AUTH_HEADER` (default `Authorization`)
- Optional: `FIMIPAY_AUTH_SCHEME` (default `Bearer`)
- Optional: `FIMIPAY_CALLBACK_URL`
- Optional: `FIMIPAY_RETURN_URL`
- Optional: `FIMIPAY_AMOUNT` (default `14500`)
- Optional: `FIMIPAY_CURRENCY` (default `TZS`)

The integration uses FimiPay's documented Tanzania Push USSD endpoint by default.

## Confirmed FimiPay Create Payment integration

- `POST https://fimipay.com/api/v1/payment/create_order`
- `Authorization: Bearer <FIMIPAY_API_KEY>`
- `Content-Type: application/json`
- `Accept: application/json`
- `User-Agent: FimiPay-SDK/1.0`
- JSON body contains `buyer_phone` in international format (`255...`), `amount` in major TZS units, `currency: "TZS"`, and `payment_method: "mobile"`.

The function normalizes common Tanzanian formats such as `0712345678` and `+255712345678` to `255712345678`.

## Confirmed FimiPay Order Status integration

The status check follows the FimiPay documentation exactly:

- `POST https://fimipay.com/api/v1/payment/order_status`
- `Authorization: Bearer <FIMIPAY_API_KEY>`
- `Content-Type: application/json`
- `Accept: application/json`
- `User-Agent: FimiPay-SDK/1.0`
- JSON body: `{ "order_id": "fp_..." }`

A provider `payment_status` of `SUCCESS` activates the user's account and returns `/dashboard`. `PENDING` and `INPROGRESS` keep the payment waiting; `CANCELLED`, `USERCANCELLED`, and `REJECTED` are treated as failed.
