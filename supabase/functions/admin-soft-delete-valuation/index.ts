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

function isNumericId(v: unknown): v is string {
  // Allow bigint IDs safely (digits only). Avoid accepting floats/hex/etc.
  return typeof v === "string" && /^[0-9]{1,20}$/.test(v);
}

function isSafeValuationId(v: unknown): v is string {
  return isUuid(v) || isNumericId(v);
}

function isMissingColumnError(err: any, column: string): boolean {
  const msg = String(err?.message ?? "").toLowerCase();
  const code = String(err?.code ?? "");
  return code === "42703" || msg.includes(`column "${column}"`) && msg.includes("does not exist");
}

function isMissingRelationError(err: any): boolean {
  const code = String(err?.code ?? "");
  const msg = String(err?.message ?? "").toLowerCase();
  return code === "42P01" || msg.includes("does not exist") && msg.includes("relation");
}

async function selectValuation(service: any, valuationId: string) {
  const primary = await service
    .from("valuations")
    .select("id, deleted_at")
    .eq("id", valuationId)
    .maybeSingle();

  if (!primary.error) return primary;

  // If deleted_at doesn't exist yet, still allow existence check.
  if (isMissingColumnError(primary.error, "deleted_at")) {
    const narrow = await service
      .from("valuations")
      .select("id")
      .eq("id", valuationId)
      .maybeSingle();
    if (!narrow.error) return narrow;
  }

  return primary;
}

async function softDeleteValuation(service: any, valuationId: string, userId: string) {
  const payload = { deleted_at: new Date().toISOString(), deleted_by: userId };

  const primary = await service
    .from("valuations")
    .update(payload)
    .eq("id", valuationId)
    .is("deleted_at", null);

  if (!primary.error) return primary;

  // Setup problem: columns missing.
  if (isMissingColumnError(primary.error, "deleted_at") || isMissingColumnError(primary.error, "deleted_by")) {
    return primary;
  }

  const msg = String(primary.error?.message || "").toLowerCase();
  // Common for VIEWs: "cannot update view" / "not updatable"
  if (msg.includes("view") || msg.includes("updatable") || msg.includes("not") || msg.includes("relation")) {
    return primary;
  }

  return primary;
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

  const valuationId = payload?.valuation_id;
  const confirm = payload?.confirm === true;

  if (!confirm) return json(400, { error: "Missing confirm" });
  if (!isSafeValuationId(valuationId)) return json(400, { error: "Invalid valuation_id" });

  // 1) Verify caller identity
  const authHeader = req.headers.get("authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return json(401, { error: "Unauthorized" });

  // 2) Role check via profiles.role (fallback to user_roles for compatibility)
  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let role: string | null = null;
  {
    const { data, error } = await service.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (!error) role = (data as any)?.role ?? null;
  }
  if (!role) {
    const { data } = await service
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    role = data ? "admin" : null;
  }

  if (role !== "admin") return json(403, { error: "Forbidden" });

  // 3) Soft delete with restore capability
  const { data: existing, error: fetchErr } = await selectValuation(service, valuationId);

  if (fetchErr) {
    if (isMissingRelationError(fetchErr)) {
      return json(500, {
        error: "valuations_table_missing",
        message: "Hittar ingen valuations-tabell (public.valuations).",
        hint: "Kontrollera att tabellen public.valuations finns i databasen.",
        code: (fetchErr as any)?.code ?? null,
      });
    }
    if (isMissingColumnError(fetchErr, "deleted_at")) {
      return json(400, {
        error: "soft_delete_not_configured",
        message: "Soft delete är inte aktiverat för valuations (deleted_at saknas).",
        hint: "Kör supabase/scripts/add_valuations_soft_delete_columns.sql i Supabase.",
        code: (fetchErr as any)?.code ?? null,
      });
    }
    return json(500, {
      error: "db_select_failed",
      message: (fetchErr as any)?.message ?? "Internal server error",
      code: (fetchErr as any)?.code ?? null,
      hint: (fetchErr as any)?.hint ?? null,
    });
  }
  if (!existing) return json(404, { error: "Not found" });
  if ((existing as any).deleted_at) {
    return json(409, { error: "Already deleted" });
  }

  const { error: updErr } = await softDeleteValuation(service, valuationId, user.id);

  if (updErr) {
    if (isMissingColumnError(updErr, "deleted_at") || isMissingColumnError(updErr, "deleted_by")) {
      return json(400, {
        error: "soft_delete_not_configured",
        message: "Soft delete är inte aktiverat för valuations (deleted_at/deleted_by saknas).",
        hint: "Kör supabase/scripts/add_valuations_soft_delete_columns.sql i Supabase.",
        code: (updErr as any)?.code ?? null,
      });
    }
    return json(500, {
      error: "db_update_failed",
      message: (updErr as any)?.message ?? "Internal server error",
      code: (updErr as any)?.code ?? null,
      hint: (updErr as any)?.hint ?? null,
    });
  }

  // 4) Audit log (no PII)
  const { error: auditErr } = await service.from("admin_audit_log").insert({
    admin_id: user.id,
    action: "soft_delete",
    target_table: "valuations",
    target_id: String(valuationId),
  });

  if (auditErr) return json(500, { error: "Internal server error" });

  return json(200, {
    ok: true,
    action: "soft_delete",
    target_table: "valuations",
    target_id: String(valuationId),
  });
});
