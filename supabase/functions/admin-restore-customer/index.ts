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

  // 1) If the customer row exists, restore it (idempotent)
  const { data: existing, error: fetchErr } = await service
    .from("customers")
    .select("id, deleted_at")
    .eq("id", customerId)
    .maybeSingle();

  if (fetchErr) return json(500, { error: "Internal server error" });

  if (existing) {
    // Already active -> treat as success and clean up archive record if present
    if (!(existing as any).deleted_at) {
      await service.from("archived_customers").delete().eq("id", customerId);
      return json(200, { ok: true, action: "restore", already_active: true, target_table: "customers", target_id: customerId });
    }

    const { error: updErr } = await service
      .from("customers")
      .update({
        deleted_at: null,
        deleted_by: null,
        is_customer: true,
      })
      .eq("id", customerId)
      .not("deleted_at", "is", null);

    if (updErr) return json(500, { error: "Internal server error" });

    await service.from("archived_customers").delete().eq("id", customerId);
  } else {
    // 2) If customer row is missing, recreate it from archived_customers snapshot
    const { data: archived, error: archErr } = await service
      .from("archived_customers")
      .select("id, email, name, phone, address, original_created_at")
      .eq("id", customerId)
      .maybeSingle();

    if (archErr) return json(500, { error: "Internal server error" });
    if (!archived) return json(404, { error: "Not found" });

    const nowIso = new Date().toISOString();
    const createdAt = (archived as any).original_created_at || nowIso;

    const { error: insErr } = await service
      .from("customers")
      .insert({
        id: (archived as any).id,
        email: (archived as any).email,
        name: (archived as any).name,
        phone: (archived as any).phone ?? null,
        address: (archived as any).address ?? null,
        is_admin: false,
        is_customer: true,
        deleted_at: null,
        deleted_by: null,
        created_at: createdAt,
        updated_at: nowIso,
      });

    if (insErr) return json(500, { error: "Internal server error" });

    await service.from("archived_customers").delete().eq("id", customerId);
  }

  // Audit best-effort
  {
    const { error: auditErr } = await service.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "restore",
      target_table: "customers",
      target_id: customerId,
    });
    if (auditErr) {
      // Don't block restore on audit errors
      console.error("admin-restore-customer: audit insert failed", {
        code: (auditErr as any)?.code,
        message: (auditErr as any)?.message,
      });
    }
  }

  return json(200, { ok: true, action: "restore", target_table: "customers", target_id: customerId });
});
