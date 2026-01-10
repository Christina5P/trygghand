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
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

function isNumericId(v: unknown): v is string {
  return typeof v === "string" && /^[0-9]{1,20}$/.test(v);
}

function isSafeValuationId(v: unknown): v is string {
  return isUuid(v) || isNumericId(v);
}

async function selectValuation(service: any, valuationId: string) {
  const primary = await service
    .from("valuations")
    .select("id, customer_id, deleted_at")
    .eq("id", valuationId)
    .maybeSingle();

  if (!primary.error) return primary;

  return await service
    .schema("valuations")
    .from("valuations")
    .select("id, customer_id, deleted_at")
    .eq("id", valuationId)
    .maybeSingle();
}

async function softDeleteValuation(service: any, valuationId: string, userId: string) {
  const payload = { deleted_at: new Date().toISOString(), deleted_by: userId };

  const primary = await service
    .from("valuations")
    .update(payload)
    .eq("id", valuationId)
    .eq("customer_id", userId)
    .is("deleted_at", null);

  if (!primary.error) return primary;

  const msg = String(primary.error?.message || "").toLowerCase();
  if (msg.includes("view") || msg.includes("updatable") || msg.includes("relation")) {
    return await service
      .schema("valuations")
      .from("valuations")
      .update(payload)
      .eq("id", valuationId)
      .eq("customer_id", userId)
      .is("deleted_at", null);
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

  // 1) Verify caller identity via JWT
  const authHeader = req.headers.get("authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return json(401, { error: "Unauthorized" });

  // 2) Use service role for soft delete (bypass RLS), but enforce ownership
  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: existing, error: fetchErr } = await selectValuation(service, valuationId);

  if (fetchErr) return json(500, { error: "Internal server error" });
  if (!existing) return json(404, { error: "Not found" });
  if ((existing as any).customer_id !== user.id) return json(403, { error: "Forbidden" });
  if ((existing as any).deleted_at) return json(409, { error: "Already deleted" });

  const { error: updErr } = await softDeleteValuation(service, valuationId, user.id);

  if (updErr) return json(500, { error: "Internal server error" });

  return json(200, {
    ok: true,
    action: "soft_delete",
    target_table: "valuations",
    target_id: String(valuationId),
  });
});
