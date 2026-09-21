import type { IncomingMessage, ServerResponse } from "node:http";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

type Req = IncomingMessage & { body?: unknown };
type Res = ServerResponse & { statusCode: number; json?: (body: unknown) => void };

function send(res: Res, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

async function body(req: Req) {
  if (req.body && typeof req.body === "object") return req.body as Record<string, unknown>;
  if (typeof req.body === "string") return JSON.parse(req.body) as Record<string, unknown>;
  let raw = "";
  return await new Promise<Record<string, unknown>>((resolve, reject) => {
    req.setEncoding("utf8");
    req.on("data", (c: string) => { raw += c; if (raw.length > 100000) reject(new Error("Request too large")); });
    req.on("end", () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error("Invalid JSON")); } });
    req.on("error", reject);
  });
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });
  try {
    if (!url || !publishable || !secret) throw new Error("Server Supabase environment variables are missing");
    const auth = req.headers.authorization;
    if (!auth?.startsWith("Bearer ")) throw new Error("Login session is required");
    const token = auth.slice(7).trim();
    const client = createClient(url, publishable);
    const { data: authData, error: authError } = await client.auth.getUser(token);
    if (authError || !authData.user) throw new Error("Invalid or expired login session");

    const admin = createClient(url, secret);
    const { data: adminRow } = await admin.from("admin_users").select("user_id").eq("user_id", authData.user.id).maybeSingle();
    if (!adminRow) return send(res, 403, { error: "Not authorized" });

    const input = await body(req);
    const targetUserId = String(input.targetUserId || "");
    const newPassword = String(input.newPassword || "");
    if (!targetUserId || newPassword.length < 6) return send(res, 400, { error: "User ID and a password of at least 6 characters are required" });

    const { data, error } = await admin.auth.admin.updateUserById(targetUserId, { password: newPassword });
    if (error) throw error;
    return send(res, 200, { ok: true, userId: data.user?.id });
  } catch (error) {
    console.error("admin-user error", error);
    return send(res, 400, { error: error instanceof Error ? error.message : "Unable to reset password" });
  }
}
