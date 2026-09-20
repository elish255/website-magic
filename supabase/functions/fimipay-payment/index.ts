import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function required(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function replaceTemplate(value: unknown, vars: Record<string, string>): unknown {
  if (typeof value === "string") {
    return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => vars[key] ?? "");
  }
  if (Array.isArray(value)) return value.map((v) => replaceTemplate(v, vars));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, replaceTemplate(v, vars)]));
  }
  return value;
}

function apiHeaders() {
  const apiKey = required("FIMIPAY_API_KEY");
  const authHeader = Deno.env.get("FIMIPAY_AUTH_HEADER") || "Authorization";
  const authScheme = Deno.env.get("FIMIPAY_AUTH_SCHEME") || "Bearer";
  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "User-Agent": "FimiPay-SDK/1.0",
    [authHeader]: `${authScheme} ${apiKey}`,
  };
}

function parseJson(text: string) {
  try { return JSON.parse(text) as Record<string, unknown>; } catch { return { raw: text }; }
}

function firstString(...values: unknown[]) {
  return values.find((v) => typeof v === "string" && v.trim()) as string | undefined;
}

function unwrap(payload: Record<string, unknown>) {
  const data = (payload.data && typeof payload.data === "object" ? payload.data : {}) as Record<string, unknown>;
  const order = (payload.order && typeof payload.order === "object" ? payload.order : {}) as Record<string, unknown>;
  const payment = (payload.payment && typeof payload.payment === "object" ? payload.payment : {}) as Record<string, unknown>;
  return { data, order, payment };
}

function extractOrderId(payload: Record<string, unknown>) {
  const { data, order, payment } = unwrap(payload);
  return firstString(
    payload.order_id, payload.orderId, payload.reference, payload.transaction_id,
    data.order_id, data.orderId, data.reference, data.transaction_id,
    order.id, order.order_id, order.reference,
    payment.id, payment.order_id,
  );
}

function extractCheckoutUrl(payload: Record<string, unknown>) {
  const { data, order, payment } = unwrap(payload);
  return firstString(
    payload.checkout_url, payload.checkoutUrl, payload.payment_url, payload.paymentUrl, payload.url,
    data.checkout_url, data.checkoutUrl, data.payment_url, data.paymentUrl, data.url,
    order.checkout_url, order.checkoutUrl, order.url,
    payment.checkout_url, payment.checkoutUrl, payment.url,
  );
}

function extractStatus(payload: Record<string, unknown>) {
  // FimiPay wraps the actual payment state in data.payment_status.
  // Do not use the top-level `status: success` as the payment result;
  // that only means the API request itself was accepted.
  const { data, order, payment } = unwrap(payload);
  return firstString(
    data.payment_status,
    data.order_status,
    payment.payment_status,
    order.payment_status,
    data.status,
    payment.status,
    order.status,
    payload.payment_status,
    payload.order_status,
    payload.status,
  )?.toLowerCase();
}

function isPaid(status?: string) {
  return status === "success";
}

function isFailed(status?: string) {
  return !!status && [
    "cancelled",
    "usercancelled",
    "rejected",
    "failed",
    "failure",
    "expired",
  ].includes(status);
}

function normalizeTanzaniaPhone(input: string) {
  const raw = input.replace(/[^0-9+]/g, "").trim();
  if (raw.startsWith("+255")) return raw.slice(1);
  if (raw.startsWith("255")) return raw;
  if (raw.startsWith("0") && raw.length === 10) return `255${raw.slice(1)}`;
  throw new Error("Weka namba ya Tanzania kwa mfano 0712345678 au +255712345678");
}

async function providerRequest(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  const payload = parseJson(text);
  if (!response.ok) throw new Error(`FimiPay HTTP ${response.status}: ${text.slice(0, 500)}`);
  return payload;
}

async function getUser(request: Request) {
  const auth = request.headers.get("Authorization");
  if (!auth) throw new Error("Missing Authorization header");
  const supabase = createClient(
    required("SUPABASE_URL"),
    required("SUPABASE_ANON_KEY"),
    { global: { headers: { Authorization: auth } } },
  );
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return data.user;
}

async function main(request: Request) {
  const user = await getUser(request);
  const body = await request.json() as { action?: string; phone?: string; paymentId?: string };
  const action = body.action || "create";

  const admin = createClient(required("SUPABASE_URL"), required("SUPABASE_SERVICE_ROLE_KEY"));
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,email,full_name,phone,is_active")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) throw new Error("Profile not found");
  if (profile.is_active) return { ok: true, alreadyActive: true, redirect: "/dashboard" };

  if (action === "create") {
    const rawPhone = String(body.phone || profile.phone || "").trim();
    if (!rawPhone) throw new Error("Phone number is required");
    const phone = normalizeTanzaniaPhone(rawPhone);

    const amount = Number(Deno.env.get("FIMIPAY_AMOUNT") || "14500");
    const currency = Deno.env.get("FIMIPAY_CURRENCY") || "TZS";
    const createUrl = Deno.env.get("FIMIPAY_CREATE_PAYMENT_URL") || "https://fimipay.com/api/v1/payment/create_order";

    // FimiPay Tanzania mobile-money Push USSD request.
    // Amount is in major TZS units and buyer_phone must be international format.
    const createBody = {
      buyer_email: profile.email || user.email || "",
      buyer_name: profile.full_name || "BETASHINE Customer",
      buyer_phone: phone,
      amount,
      currency,
      payment_method: "mobile",
    };
    const provider = await providerRequest(createUrl, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify(createBody),
    });
    const orderId = extractOrderId(provider);
    if (!orderId) throw new Error("FimiPay response did not contain an order/reference id");
    const checkoutUrl = extractCheckoutUrl(provider) || null;
    const providerStatus = extractStatus(provider) || "pending";

    const { data: row, error } = await admin.from("automatic_payments").insert({
      user_id: user.id, order_id: orderId, amount: Number(amount), currency, phone,
      status: isPaid(providerStatus) ? "paid" : "pending",
      checkout_url: checkoutUrl, provider_status: providerStatus, provider_response: provider,
    }).select("id,order_id,status,checkout_url").single();
    if (error) throw error;

    if (isPaid(providerStatus)) {
      await admin.rpc("activate_user_from_auto_payment", { target_user_id: user.id, auto_payment_id: row.id });
      return { ok: true, paid: true, paymentId: row.id, redirect: "/dashboard", provider };
    }

    return { ok: true, paid: false, paymentId: row.id, orderId, checkoutUrl, status: providerStatus };
  }

  if (action === "status") {
    const paymentId = String(body.paymentId || "");
    if (!paymentId) throw new Error("paymentId is required");
    const { data: payment, error } = await admin
      .from("automatic_payments")
      .select("id,user_id,order_id,status")
      .eq("id", paymentId).eq("user_id", user.id).single();
    if (error || !payment) throw new Error("Payment not found");
    if (payment.status === "paid") return { ok: true, paid: true, status: "paid", redirect: "/dashboard" };

    const url = Deno.env.get("FIMIPAY_ORDER_STATUS_URL") || "https://fimipay.com/api/v1/payment/order_status";
    const provider = await providerRequest(url, {
      method: "POST",
      headers: apiHeaders(),
      body: JSON.stringify({ order_id: payment.order_id }),
    });
    const providerStatus = extractStatus(provider) || "pending";

    if (isPaid(providerStatus)) {
      const { data: activated } = await admin.rpc("activate_user_from_auto_payment", { target_user_id: user.id, auto_payment_id: payment.id });
      await admin.from("automatic_payments").update({ provider_status: providerStatus, provider_response: provider, updated_at: new Date().toISOString() }).eq("id", payment.id);
      return { ok: true, paid: !!activated, status: "paid", redirect: activated ? "/dashboard" : "/payment" };
    }

    const nextStatus = isFailed(providerStatus) ? "failed" : "processing";
    await admin.from("automatic_payments").update({ status: nextStatus, provider_status: providerStatus, provider_response: provider, updated_at: new Date().toISOString() }).eq("id", payment.id);
    return { ok: true, paid: false, status: providerStatus, paymentStatus: nextStatus };
  }

  throw new Error("Unknown action");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  try {
    return json(await main(request));
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
