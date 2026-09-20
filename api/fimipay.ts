import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const FIMIPAY_API_KEY = process.env.FIMIPAY_API_KEY;
const FIMIPAY_AMOUNT = Number(process.env.FIMIPAY_AMOUNT || "14500");
const FIMIPAY_CURRENCY = process.env.FIMIPAY_CURRENCY || "TZS";
const CREATE_URL = process.env.FIMIPAY_CREATE_PAYMENT_URL || "https://fimipay.com/api/v1/payment/create_order";
const STATUS_URL = process.env.FIMIPAY_ORDER_STATUS_URL || "https://fimipay.com/api/v1/payment/order_status";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

function normalizePhone(input: string) {
  const raw = input.replace(/[^0-9+]/g, "").trim();
  if (raw.startsWith("+255") && raw.length === 13) return raw.slice(1);
  if (raw.startsWith("255") && raw.length === 12) return raw;
  if (raw.startsWith("0") && raw.length === 10) return `255${raw.slice(1)}`;
  throw new Error("Weka namba ya Tanzania kwa mfano 0712345678 au +255712345678");
}

function firstString(...values: unknown[]) {
  return values.find((v) => typeof v === "string" && v.trim()) as string | undefined;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function extractOrderId(payload: Record<string, unknown>) {
  const data = asObject(payload.data);
  return firstString(
    payload.order_id,
    payload.orderId,
    data.order_id,
    data.orderId,
    data.reference,
    data.transaction_id,
  );
}

function extractStatus(payload: Record<string, unknown>) {
  const data = asObject(payload.data);
  return firstString(
    data.payment_status,
    data.order_status,
    payload.payment_status,
    payload.order_status,
  )?.toLowerCase();
}

function extractCheckoutUrl(payload: Record<string, unknown>) {
  const data = asObject(payload.data);
  return firstString(
    payload.checkout_url,
    payload.checkoutUrl,
    payload.payment_url,
    payload.paymentUrl,
    payload.url,
    data.checkout_url,
    data.checkoutUrl,
    data.payment_url,
    data.paymentUrl,
    data.url,
  ) || null;
}

function isPaid(status?: string) {
  return status === "success";
}

function isFailed(status?: string) {
  return !!status && ["cancelled", "usercancelled", "rejected", "failed", "failure", "expired"].includes(status);
}

async function fimipay(url: string, body: unknown) {
  const apiKey = required("FIMIPAY_API_KEY", FIMIPAY_API_KEY);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "FimiPay-SDK/1.0",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(text) as Record<string, unknown>;
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    throw new Error(`FimiPay HTTP ${response.status}: ${text.slice(0, 500)}`);
  }
  return payload;
}

async function getAuthenticatedUser(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) throw new Error("Login session is required");
  const token = auth.slice(7).trim();

  const url = required("SUPABASE_URL", SUPABASE_URL);
  const publishable = required("SUPABASE_PUBLISHABLE_KEY", SUPABASE_PUBLISHABLE_KEY);
  const client = createClient(url, publishable);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("Invalid or expired login session");
  return data.user;
}

function adminClient() {
  return createClient(
    required("SUPABASE_URL", SUPABASE_URL),
    required("SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)", SUPABASE_SECRET_KEY),
  );
}

async function main(request: Request) {
  const user = await getAuthenticatedUser(request);
  const body = await request.json().catch(() => ({})) as { action?: string; phone?: string; paymentId?: string };
  const action = body.action || "create";
  const admin = adminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id,email,full_name,phone,is_active")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) throw new Error("Profile not found");
  if (profile.is_active) return { ok: true, alreadyActive: true, redirect: "/dashboard" };

  if (action === "create") {
    const phone = normalizePhone(String(body.phone || profile.phone || ""));
    if (!Number.isFinite(FIMIPAY_AMOUNT) || FIMIPAY_AMOUNT <= 0) throw new Error("Invalid FIMIPAY_AMOUNT");

    const provider = await fimipay(CREATE_URL, {
      buyer_email: profile.email || user.email || "",
      buyer_name: profile.full_name || "BETASHINE Customer",
      buyer_phone: phone,
      amount: FIMIPAY_AMOUNT,
      currency: FIMIPAY_CURRENCY,
      payment_method: "mobile",
    });

    if (String(provider.status || "").toLowerCase() !== "success") {
      throw new Error(String(provider.message || "FimiPay imeshindwa kuanzisha malipo."));
    }

    const orderId = extractOrderId(provider);
    if (!orderId) throw new Error("FimiPay response did not contain an order ID");

    const providerStatus = extractStatus(provider) || "pending";
    const checkoutUrl = extractCheckoutUrl(provider);

    const { data: row, error } = await admin
      .from("automatic_payments")
      .insert({
        user_id: user.id,
        order_id: orderId,
        amount: FIMIPAY_AMOUNT,
        currency: FIMIPAY_CURRENCY,
        phone,
        status: isPaid(providerStatus) ? "paid" : "pending",
        checkout_url: checkoutUrl,
        provider_status: providerStatus,
        provider_response: provider,
      })
      .select("id,order_id,status,checkout_url")
      .single();

    if (error) throw error;

    if (isPaid(providerStatus)) {
      const { data: activated, error: activationError } = await admin.rpc("activate_user_from_auto_payment", {
        target_user_id: user.id,
        auto_payment_id: row.id,
      });
      if (activationError) throw activationError;
      return { ok: true, paid: !!activated, paymentId: row.id, redirect: activated ? "/dashboard" : "/payment" };
    }

    return { ok: true, paid: false, paymentId: row.id, orderId, checkoutUrl, status: providerStatus };
  }

  if (action === "status") {
    const paymentId = String(body.paymentId || "");
    if (!paymentId) throw new Error("paymentId is required");

    const { data: payment, error } = await admin
      .from("automatic_payments")
      .select("id,user_id,order_id,status")
      .eq("id", paymentId)
      .eq("user_id", user.id)
      .single();

    if (error || !payment) throw new Error("Payment not found");
    if (payment.status === "paid") return { ok: true, paid: true, status: "paid", redirect: "/dashboard" };

    const provider = await fimipay(STATUS_URL, { order_id: payment.order_id });
    const providerStatus = extractStatus(provider) || "pending";

    if (isPaid(providerStatus)) {
      const { data: activated, error: activationError } = await admin.rpc("activate_user_from_auto_payment", {
        target_user_id: user.id,
        auto_payment_id: payment.id,
      });
      if (activationError) throw activationError;
      await admin.from("automatic_payments").update({
        provider_status: providerStatus,
        provider_response: provider,
        updated_at: new Date().toISOString(),
      }).eq("id", payment.id);
      return { ok: true, paid: !!activated, status: "paid", redirect: activated ? "/dashboard" : "/payment" };
    }

    const nextStatus = isFailed(providerStatus) ? "failed" : "processing";
    await admin.from("automatic_payments").update({
      status: nextStatus,
      provider_status: providerStatus,
      provider_response: provider,
      updated_at: new Date().toISOString(),
    }).eq("id", payment.id);

    return { ok: true, paid: false, status: providerStatus, paymentStatus: nextStatus };
  }

  throw new Error("Unknown action");
}

export default async function handler(request: Request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204 });
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  try {
    return json(await main(request));
  } catch (error) {
    console.error("FimiPay API error:", error);
    return json({
      ok: false,
      error: error instanceof Error ? error.message : "Internal server error",
    }, 400);
  }
}
