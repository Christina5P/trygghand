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

function isMissingColumnError(err: any, column: string): boolean {
  const msg = String(err?.message ?? "").toLowerCase();
  const code = String(err?.code ?? "");
  if (code === "42703") return true;
  if (code === "PGRST204" && msg.includes("could not find") && msg.includes(column.toLowerCase())) return true;
  return msg.includes(`column \"${column}\"`) && msg.includes("does not exist");
}

function formatDbError(err: any) {
  return {
    message: err?.message ?? "Database error",
    code: err?.code ?? null,
    hint: err?.hint ?? null,
    details: err?.details ?? null,
  };
}

async function requireAdmin(service: any, userId: string): Promise<boolean> {
  const { data: profile, error: profileErr } = await service
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (!profileErr && (profile as any)?.is_admin === true) return true;

  const { data: roles, error: rolesErr } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");

  if (!rolesErr && Array.isArray(roles) && roles.length > 0) return true;

  return false;
}

async function softDelete(service: any, cancellationId: string, userId: string) {
  const deletedAt = new Date().toISOString();

  const primary = await service
    .from("subscription_cancellations")
    .update({ deleted_at: deletedAt, deleted_by: userId })
    .eq("id", cancellationId)
    .is("deleted_at", null);

  if (!primary.error) return { ok: true, mode: "soft" as const };

  if (isMissingColumnError(primary.error, "deleted_by")) {
    const fallback = await service
      .from("subscription_cancellations")
      .update({ deleted_at: deletedAt })
      .eq("id", cancellationId)
      .is("deleted_at", null);

    if (!fallback.error) return { ok: true, mode: "soft" as const };
    return { ok: false, error: fallback.error };
  }

  if (isMissingColumnError(primary.error, "deleted_at")) {
    const hard = await service
      .from("subscription_cancellations")
      .delete()
      .eq("id", cancellationId);

    if (!hard.error) return { ok: true, mode: "hard" as const };
    return { ok: false, error: hard.error };
  }

  return { ok: false, error: primary.error };
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
  const confirm = payload?.confirm === true;

  if (!confirm) return json(req, 400, { error: "Missing confirm" });
  if (!isUuid(cancellationId)) return json(req, 400, { error: "Invalid cancellation_id" });

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

  const result = await softDelete(service, cancellationId, user.id);
  if (!result.ok) {
    return json(req, 500, {
      error: "Internal server error",
      db_error: formatDbError((result as any).error),
    });
  }

  return json(req, 200, { ok: true, mode: result.mode });
});
