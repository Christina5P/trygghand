import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Remote supabase-js for Deno resolved at deploy/runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

declare const Deno: { env: { get: (key: string) => string | undefined } };

function corsHeaders(req?: Request) {
  const requested = req?.headers.get("access-control-request-headers");
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": requested || "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
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
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!profileErr && (profile as any)?.role === "admin") return true;

  return false;
}

function maxLen(value: unknown, limit: number): boolean {
  if (value == null) return true;
  return String(value).length <= limit;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, 405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(req, 500, { error: "Server configuration missing" });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json(req, 400, { error: "Invalid JSON" });
  }

  const cancellationId = payload?.cancellation_id;
  if (!isUuid(cancellationId)) return json(req, 400, { error: "Invalid cancellation_id" });

  if (payload?.customer_id != null && !isUuid(payload.customer_id)) {
    return json(req, 400, { error: "Invalid customer_id" });
  }

  // Validate lengths (free text allowed with caps)
  if (!maxLen(payload?.provider, 120)) return json(req, 400, { error: "provider too long" });
  if (!maxLen(payload?.service_type, 120)) return json(req, 400, { error: "service_type too long" });
  if (!maxLen(payload?.custom_service_name, 200)) return json(req, 400, { error: "custom_service_name too long" });
  if (!maxLen(payload?.notice_period, 120)) return json(req, 400, { error: "notice_period too long" });
  if (!maxLen(payload?.last_due_date, 40)) return json(req, 400, { error: "last_due_date too long" });
  if (!maxLen(payload?.provider_contact, 2000)) return json(req, 400, { error: "provider_contact too long" });
  if (!maxLen(payload?.notes, 2000)) return json(req, 400, { error: "notes too long" });

  const authHeader = req.headers.get("authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return json(req, 401, { error: "Unauthorized" });

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ok = await requireAdmin(service, user.id);
  if (!ok) return json(req, 403, { error: "Forbidden" });

  const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const key of [
    "customer_id",
    "provider",
    "service_type",
    "custom_service_name",
    "notice_period",
    "last_due_date",
    "provider_contact",
    "notes",
    "status",
  ]) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      updatePayload[key] = payload[key];
    }
  }

  const { error: updErr } = await service
    .from("subscription_cancellations")
    .update(updatePayload)
    .eq("id", cancellationId);

  if (updErr) return json(req, 500, { error: "Internal server error" });

  // Notis: statusändring i uppsägning
  try {
    await fetch("https://trygghand.netlify.app/.netlify/functions/create-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "cancellation_status",
        ref_id: cancellationId,
        ref_type: "cancellation",
        actor_id: user.id,
        recipient_id: payload.customer_id ?? null,
        payload: { status: updatePayload.status }
      })
    });
  } catch (e) {
    // logga men stoppa ej flödet
    console.error("Notification error", e);
  }

  return json(req, 200, { ok: true });
});
