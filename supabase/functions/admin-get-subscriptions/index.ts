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

async function selectSubscriptions(service: any) {
  // Avoid assuming optional columns exist (schema drift in prod has happened).
  const selectAttempts = [
    // Preferred schema
    "id, customer_id, provider, category, name, plan, created_at, updated_at",
    "id, customer_id, provider, category, name, plan, created_at",
    // Common variants
    "id, customer_id, provider, service_type, name, plan, created_at, updated_at",
    "id, customer_id, provider, subscription_type, name, plan, created_at, updated_at",
    // Minimal fallbacks
    "id, customer_id, provider, category, created_at, updated_at",
    "id, customer_id, provider, category, created_at",
    "id, customer_id, provider, created_at",
    "id, customer_id, created_at",
    "id, created_at",
    "id",
  ];

  let lastError: any = null;
  for (const cols of selectAttempts) {
    const withOrder = await service.from("subscriptions").select(cols).order("created_at", { ascending: false });
    if (!withOrder.error) return withOrder;
    lastError = withOrder.error;

    const withoutOrder = await service.from("subscriptions").select(cols);
    if (!withoutOrder.error) return withoutOrder;
    lastError = withoutOrder.error;
  }

  return { data: null, error: lastError };
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

  // Important: don't assume columns like 'status'/'updated_at' exist.
  const { data, error } = await selectSubscriptions(service);
  if (error) {
    // No PII in this message; useful for diagnosing schema mismatches.
    return json(200, {
      ok: false,
      error: "db_select_failed",
      code: (error as any).code ?? null,
      message: (error as any).message ?? null,
      hint: (error as any).hint ?? null,
      details: (error as any).details ?? null,
    });
  }

  const subscriptions = ((data ?? []) as any[]).map((s: any) => ({
    id: String(s.id),
    customer_id: s.customer_id != null ? String(s.customer_id) : null,
    provider: s.provider ?? s.provider_name ?? s.leverantor ?? null,
    category: s.category ?? s.service_type ?? s.subscription_type ?? s.typ ?? s.kategori ?? null,
    name: s.name ?? s.subscription_name ?? s.namn ?? null,
    plan: s.plan ?? s.plan_name ?? null,
    created_at: s.created_at ?? null,
    updated_at: s.updated_at ?? null,
  }));

  return json(200, { ok: true, subscriptions });
});
