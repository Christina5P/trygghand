import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Remote supabase-js for Deno resolved at deploy/runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

declare const Deno: { env: { get: (key: string) => string | undefined } };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const cleaned = trimmed.replace(/[\s\-()\.]/g, "");
  if (!cleaned) return null;

  if (cleaned.startsWith("00")) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return `+46${cleaned.slice(1)}`;
  if (cleaned.startsWith("46")) return `+${cleaned}`;
  return cleaned;
}

async function findAuthUserIdByEmail(service: any, email: string): Promise<string | null> {
  const target = email.trim().toLowerCase();
  if (!target) return null;

  const perPage = 1000;
  for (let page = 1; page <= 25; page++) {
    const { data: listData, error: listErr } = await service.auth.admin.listUsers({ page, perPage });
    if (listErr) break;
    const users = Array.isArray((listData as any)?.users) ? ((listData as any).users as any[]) : [];
    const match = users.find((entry) => typeof entry?.email === "string" && entry.email.toLowerCase() === target);
    if (match?.id) return String(match.id);
    if (users.length < perPage) break;
  }

  return null;
}

async function findAuthUserIdByPhone(service: any, phoneE164: string): Promise<string | null> {
  const target = phoneE164.trim();
  if (!target) return null;

  const perPage = 1000;
  for (let page = 1; page <= 25; page++) {
    const { data: listData, error: listErr } = await service.auth.admin.listUsers({ page, perPage });
    if (listErr) break;
    const users = Array.isArray((listData as any)?.users) ? ((listData as any).users as any[]) : [];
    const match = users.find((entry) => typeof entry?.phone === "string" && entry.phone === target);
    if (match?.id) return String(match.id);
    if (users.length < perPage) break;
  }

  return null;
}

async function resolveCustomerAuthUserId(service: any, customerId: string): Promise<string | null> {
  const { data: customerRow, error } = await service
    .from("customers")
    .select("user_id, email, phone")
    .eq("id", customerId)
    .maybeSingle();

  if (error || !customerRow) return null;

  const directUserId = typeof (customerRow as any).user_id === "string" ? String((customerRow as any).user_id) : null;
  if (directUserId) return directUserId;

  const email = typeof (customerRow as any).email === "string" ? String((customerRow as any).email) : "";
  if (email) {
    const byEmail = await findAuthUserIdByEmail(service, email);
    if (byEmail) return byEmail;
  }

  const phone = normalizePhone((customerRow as any).phone);
  if (phone) {
    const byPhone = await findAuthUserIdByPhone(service, phone);
    if (byPhone) return byPhone;
  }

  return null;
}

async function requireAdmin(service: any, userId: string): Promise<boolean> {
  const { data: roles, error: rolesErr } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");

  if (!rolesErr && Array.isArray(roles) && roles.length > 0) return true;

  const { data: profile, error: profileErr } = await service
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (!profileErr && (profile as any)?.is_admin === true) return true;

  return false;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, { error: "Server configuration missing" });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const cancellationId = payload?.cancellation_id;
  const message = typeof payload?.message === "string" ? payload.message.trim() : "";
  const isInternal = payload?.is_internal === true;

  if (!isUuid(cancellationId)) return json(400, { error: "Invalid cancellation_id" });
  if (!message) return json(400, { error: "Missing message" });
  if (message.length > 2000) return json(400, { error: "Message too long" });

  const authHeader = req.headers.get("authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return json(401, { error: "Unauthorized" });

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ok = await requireAdmin(service, user.id);
  if (!ok) return json(403, { error: "Forbidden" });

  const { error: insErr } = await service.from("cancellation_comments").insert({
    cancellation_id: cancellationId,
    user_id: user.id,
    message,
    is_internal: isInternal,
  });

  if (insErr) return json(500, { error: "Internal server error" });

  // Notify customer of admin message (skip for internal notes)
  if (!isInternal) {
    try {
      const { data: cancellation } = await service
        .from("subscription_cancellations")
        .select("customer_id")
        .eq("id", cancellationId)
        .maybeSingle();
      const customerId = (cancellation as any)?.customer_id;
      if (customerId && customerId !== user.id) {
        const notifUserId = await resolveCustomerAuthUserId(service, String(customerId));
        if (notifUserId) {
          await service.from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("user_id", notifUserId)
            .eq("ref_id", cancellationId)
            .eq("type", "cancellation_message")
            .is("read_at", null);
          await service.from("notifications").insert({
            user_id: notifUserId,
            type: "cancellation_message",
            ref_id: cancellationId,
            ref_type: "cancellation",
            actor_id: user.id,
          });
        }
      }
    } catch (e) {
      console.error("Notification error", e);
    }
  }

  // Do not echo free-text back
  return json(200, { ok: true });
});
