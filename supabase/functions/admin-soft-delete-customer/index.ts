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
  // Preferred: user_roles (used elsewhere in this repo)
  const { data: roles, error: rolesErr } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");

  if (!rolesErr && Array.isArray(roles) && roles.length > 0) return true;

  // Fallback: profiles.role
  const { data: profile, error: profileErr } = await service
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!profileErr && (profile as any)?.role === "admin") return true;

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

  const customerId = payload?.customer_id;
  const confirm = payload?.confirm === true;

  if (!confirm) return json(400, { error: "Missing confirm" });
  if (!isUuid(customerId)) return json(400, { error: "Invalid customer_id" });

  // 1) Verify caller identity via JWT
  const authHeader = req.headers.get("authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return json(401, { error: "Unauthorized" });

  // 2) Admin role check + service role for DB writes
  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ok = await requireAdmin(service, user.id);
  if (!ok) return json(403, { error: "Forbidden" });

  // 3) Soft delete (restoreable)
  const { data: existing, error: fetchErr } = await service
    .from("customers")
    .select("id, deleted_at")
    .eq("id", customerId)
    .maybeSingle();

  if (fetchErr) return json(500, { error: "Internal server error" });
  if (!existing) return json(404, { error: "Not found" });
  if ((existing as any).deleted_at) return json(409, { error: "Already deleted" });

  const { error: updErr } = await service
    .from("customers")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      active: false,
      is_customer: false,
    })
    .eq("id", customerId)
    .is("deleted_at", null);

  if (updErr) return json(500, { error: "Internal server error" });

  const { error: auditErr } = await service.from("admin_audit_log").insert({
    admin_id: user.id,
    action: "soft_delete",
    target_table: "customers",
    target_id: customerId,
  });

  if (auditErr) return json(500, { error: "Internal server error" });

  return json(200, { ok: true, action: "soft_delete", target_table: "customers", target_id: customerId });
});
