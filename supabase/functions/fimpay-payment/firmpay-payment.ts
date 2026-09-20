import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://betashineorg.online",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FIMIPAY_API_KEY = Deno.env.get("FIMIPAY_API_KEY");

const supabaseAuth = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    if (!FIMIPAY_API_KEY) {
      return json({
        error: "FIMIPAY_API_KEY secret is not configured",
      }, 500);
    }

    // Get logged-in user
    const authHeader = req.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return json({
        error: "Authorization token is required",
      }, 401);
    }

    const token = authHeader.replace("Bearer ", "").trim();

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return json({
        error: "Invalid or expired login session",
      }, 401);
    }

    const body = await req.json();

    const phone = String(body.phone || "").trim();
    const name = String(
      body.name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      "BETASHINE User"
    ).trim();

    const amount = Number(body.amount || 14500);

    if (!phone) {
      return json({
        error: "Phone number is required",
      }, 400);
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return json({
        error: "Invalid payment amount",
      }, 400);
    }

    // Normalize Tanzania phone number
    let normalizedPhone = phone.replace(/\s+/g, "");

    if (normalizedPhone.startsWith("+255")) {
      normalizedPhone = normalizedPhone.substring(1);
    }

    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = "255" + normalizedPhone.substring(1);
    }

    if (!/^255\d{9}$/.test(normalizedPhone)) {
      return json({
        error: "Invalid Tanzania phone number",
      }, 400);
    }

    // Create FimiPay payment
    const paymentResponse = await fetch(
      "https://fimipay.com/api/v1/payment/create_order",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "FimiPay-SDK/1.0",
          "Authorization": `Bearer ${FIMIPAY_API_KEY}`,
        },
        body: JSON.stringify({
          buyer_email: user.email || "",
          buyer_name: name,
          buyer_phone: normalizedPhone,
          amount,
          currency: "TZS",
          payment_method: "mobile",
        }),
      },
    );

    const paymentResult = await paymentResponse.json();

    if (!paymentResponse.ok || paymentResult.status !== "success") {
      return json({
        success: false,
        error:
          paymentResult.message ||
          "FimiPay failed to create payment request",
        details: paymentResult,
      }, 400);
    }

    const orderId = paymentResult?.data?.order_id;

    if (!orderId) {
      return json({
        success: false,
        error: "FimiPay did not return an order ID",
      }, 500);
    }

    let paymentStatus =
      paymentResult?.data?.payment_status || "PENDING";

    // Check status several times.
    // This gives the mobile-money push some time to complete.
    for (let i = 0; i < 6; i++) {
      if (paymentStatus === "SUCCESS") {
        break;
      }

      if (
        ["CANCELLED", "USERCANCELLED", "REJECTED"].includes(
          paymentStatus
        )
      ) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));

      const statusResponse = await fetch(
        "https://fimipay.com/api/v1/payment/order_status",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "FimiPay-SDK/1.0",
            "Authorization": `Bearer ${FIMIPAY_API_KEY}`,
          },
          body: JSON.stringify({
            order_id: orderId,
          }),
        },
      );

      const statusResult = await statusResponse.json();

      if (statusResponse.ok && statusResult.status === "success") {
        paymentStatus =
          statusResult?.data?.payment_status || paymentStatus;
      }
    }

    // IMPORTANT:
    // Only SUCCESS activates the account.
    if (paymentStatus === "SUCCESS") {
      const { error: activateError } = await supabaseAdmin
        .from("profiles")
        .update({
          is_active: true,
        })
        .eq("id", user.id);

      if (activateError) {
        console.error(
          "Profile activation error:",
          activateError
        );

        return json({
          success: false,
          payment_status: "SUCCESS",
          order_id: orderId,
          error:
            "Payment succeeded but account activation failed. Contact admin.",
        }, 500);
      }

      return json({
        success: true,
        payment_status: "SUCCESS",
        activated: true,
        order_id: orderId,
        message: "Payment successful. Account activated.",
      });
    }

    return json({
      success: false,
      payment_status: paymentStatus,
      activated: false,
      order_id: orderId,
      message:
        paymentStatus === "PENDING" ||
        paymentStatus === "INPROGRESS"
          ? "Payment is still pending."
          : "Payment was not successful.",
    });

  } catch (error) {
    console.error("FimiPay function error:", error);

    return json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Internal server error",
    }, 500);
  }
}); 