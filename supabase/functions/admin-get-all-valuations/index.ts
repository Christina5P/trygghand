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

async function selectValuations(service: any) {
  // Try to be resilient to schema drift:
  // - analysis_result may not exist
  // - updated_at may not exist
  // - deleted_at may not exist yet (migration not applied)
  const selectAttempts = [
    "id, customer_id, analysis, analysis_result, image_urls, created_at, updated_at, disposition_code, shared_with_admin",
    "id, customer_id, analysis, analysis_result, image_urls, created_at, disposition_code, shared_with_admin",
    "id, customer_id, analysis, image_urls, created_at, disposition_code, shared_with_admin",
    "id, customer_id, analysis, created_at, disposition_code, shared_with_admin",
    "id, customer_id, created_at, disposition_code, shared_with_admin",
    "id, created_at, disposition_code, shared_with_admin",
    "id, disposition_code, shared_with_admin",
    "id",
    "*",
  ];

  const schemas = [null, "valuations"] as Array<null | string>;
  let lastError: any = null;

  for (const schema of schemas) {
    for (const cols of selectAttempts) {
      // 1) Prefer excluding soft-deleted rows
        const withDeleted = schema
        ? await service
            .schema(schema)
            .from("valuations")
            .select(cols === "*" ? "*" : `${cols}, deleted_at`)
            .is("deleted_at", null)
          .eq("shared_with_admin", true)
            .order("created_at", { ascending: false })
        : await service
            .from("valuations")
            .select(cols === "*" ? "*" : `${cols}, deleted_at`)
            .is("deleted_at", null)
          .eq("shared_with_admin", true)
            .order("created_at", { ascending: false });

      if (!withDeleted.error) return withDeleted;
      lastError = withDeleted.error;

      // 2) If deleted_at isn't present yet, fall back to a plain select so the UI doesn't hard-fail.
        const withoutDeleted = schema
        ? await service
            .schema(schema)
            .from("valuations")
            .select(cols)
          .eq("shared_with_admin", true)
            .order("created_at", { ascending: false })
        : await service
            .from("valuations")
            .select(cols)
          .eq("shared_with_admin", true)
            .order("created_at", { ascending: false });

      if (!withoutDeleted.error) return withoutDeleted;
      lastError = withoutDeleted.error;

      // 3) Last fallback: try without ordering (created_at might not exist)
      const withoutOrder = schema
        ? await service.schema(schema).from("valuations").select(cols).eq("shared_with_admin", true)
        : await service.from("valuations").select(cols).eq("shared_with_admin", true);

      if (!withoutOrder.error) return withoutOrder;
      lastError = withoutOrder.error;
    }
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

  // Verify caller identity via JWT
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

  const { data, error } = await selectValuations(service);
  if (error) {
    console.error("admin-get-all-valuations: DB select failed", {
      message: (error as any)?.message,
      code: (error as any)?.code,
      details: (error as any)?.details,
      hint: (error as any)?.hint,
    });
    return json(200, {
      ok: false,
      error: "db_select_failed",
      code: (error as any)?.code ?? null,
      message: (error as any)?.message ?? null,
      hint: (error as any)?.hint ?? null,
      details: (error as any)?.details ?? null,
    });
  }

  const valuations = (data ?? []).map((v: any) => ({
    ...v,
    id: String(v.id),
    customer_id: v.customer_id != null ? String(v.customer_id) : v.customer_id,
  }));

  return json(200, { ok: true, valuations });
});
