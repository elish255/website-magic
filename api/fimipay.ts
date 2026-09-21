import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const FIMIPAY_API_KEY = process.env.FIMIPAY_API_KEY;
const FIMIPAY_AMOUNT = Number(process.env.FIMIPAY_AMOUNT || "16000");
const FIMIPAY_CURRENCY = process.env.FIMIPAY_CURRENCY || "TZS";
const CREATE_URL = process.env.FIMIPAY_CREATE_PAYMENT_URL || "https://fimipay.com/api/v1/payment/create_order";
const STATUS_URL = process.env.FIMIPAY_ORDER_STATUS_URL || "https://fimipay.com/api/v1/payment/order_status";

type JsonObject = Record<string, unknown>;
type VercelRequest = IncomingMessage & { body?: unknown };
type VercelResponse = ServerResponse & {
  statusCode: number;
  json: (body: unknown) => void;
};

function sendJson(res: VercelResponse, body: unknown, status = 200) {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(payload);
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

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" ? value as JsonObject : {};
}

function extractOrderId(payload: JsonObject) {
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

function extractStatus(payload: JsonObject) {
  const data = asObject(payload.data);
  return firstString(
    data.payment_status,
    data.order_status,
    payload.payment_status,
    payload.order_status,
  )?.toLowerCase();
}

function extractCheckoutUrl(payload: JsonObject) {
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

async function fimipay(url: string, body: unknown, timeoutMs: number) {
  const apiKey = required("FIMIPAY_API_KEY", FIMIPAY_API_KEY);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();

  try {
    console.log("FimiPay request started", {
      endpoint: url,
      timeoutMs,
      action: url === CREATE_URL ? "create_order" : "order_status",
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "FimiPay-SDK/1.0",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: JsonObject;
    try {
      payload = JSON.parse(text) as JsonObject;
    } catch {
      payload = { raw: text };
    }

    if (!response.ok) {
      console.error("FimiPay HTTP error", {
        status: response.status,
        durationMs: Date.now() - startedAt,
        message: typeof payload.message === "string" ? payload.message : undefined,
      });
      throw new Error(`FimiPay HTTP ${response.status}: ${text.slice(0, 500)}`);
    }

    console.log("FimiPay response received", {
      httpStatus: response.status,
      durationMs: Date.now() - startedAt,
      status: typeof payload.status === "string" ? payload.status : undefined,
      message: typeof payload.message === "string" ? payload.message : undefined,
      orderId: extractOrderId(payload),
      paymentStatus: extractStatus(payload),
    });

    return payload;
  } catch (error) {
    if (error && typeof error === "object" && "name" in error && error.name === "AbortError") {
      console.error("FimiPay request timed out", {
        endpoint: url,
        timeoutMs,
        durationMs: Date.now() - startedAt,
      });
      throw new Error(`FimiPay haijajibu ndani ya sekunde ${Math.ceil(timeoutMs / 1000)}. Jaribu tena.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function getRequestBody(req: VercelRequest): Promise<JsonObject> {
  if (req.body && typeof req.body === "object") return req.body as JsonObject;
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body) as JsonObject; } catch { return {}; }
  }

  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error("Request body too large"));
    });
    req.on("end", () => {
      if (!raw.trim()) return resolve({});
      try { resolve(JSON.parse(raw) as JsonObject); } catch { reject(new Error("Invalid JSON body")); }
    });
    req.on("error", reject);
  });
}

function getAuthorization(req: VercelRequest) {
  const value = req.headers.authorization || req.headers.Authorization;
  return Array.isArray(value) ? value[0] : value;
}

async function getAuthenticatedUser(req: VercelRequest) {
  const auth = getAuthorization(req);
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

async function main(req: VercelRequest) {
  const user = await getAuthenticatedUser(req);
  const body = await getRequestBody(req);
  const action = typeof body.action === "string" ? body.action : "create";
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
    }, 15000);

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

    const provider = await fimipay(STATUS_URL, { order_id: payment.order_id }, 10000);
    const providerStatus = extractStatus(provider) || "pending";

    if (isPaid(providerStatus)) {
      const { data: activated, error: activationError } = await admin.rpc("activate_user_from_auto_payment", {
        target_user_id: user.id,
        auto_payment_id: payment.id,
      });
      if (activationError) throw activationError;
      await admin.from("automatic_payments").update({
        status: activated ? "paid" : "processing",
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    return res.end();
  }

  if (req.method !== "POST") return sendJson(res, { ok: false, error: "Method not allowed" }, 405);

  try {
    const result = await main(req);
    return sendJson(res, result, 200);
  } catch (error) {
    console.error("FimiPay API error:", error);
    return sendJson(res, {
      ok: false,
      error: error instanceof Error ? error.message : "Internal server error",
    }, 400);
  }
}
