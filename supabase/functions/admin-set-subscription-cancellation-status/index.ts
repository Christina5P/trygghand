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

const ALLOWED_STATUSES = new Set(["pending", "processing", "waiting_customer", "cancelled", "completed"]);

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
  const status = payload?.status;

  if (!isUuid(cancellationId)) return json(400, { error: "Invalid cancellation_id" });
  if (!ALLOWED_STATUSES.has(String(status))) return json(400, { error: "Invalid status" });

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

  const { error: updErr } = await service
    .from("subscription_cancellations")
    .update({ status: String(status), updated_at: new Date().toISOString() })
    .eq("id", cancellationId);

  if (updErr) return json(500, { error: "Internal server error" });

  return json(200, { ok: true });
});
