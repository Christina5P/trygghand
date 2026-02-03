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

  const baseSelect =
    "id, customer_id, subscription_id, provider, service_type, custom_service_name, notice_period, last_due_date, provider_contact, notes, status, documents, admin_notes, created_at, updated_at";

  // Prefer excluding soft-deleted rows. If deleted_at doesn't exist yet, fall back.
  let result = await service
    .from("subscription_cancellations")
    .select(`${baseSelect}, deleted_at`)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (result.error) {
    result = await service
      .from("subscription_cancellations")
      .select(baseSelect)
      .order("created_at", { ascending: false });
  }

  if (result.error) return json(500, { error: "Internal server error" });

  const cancellations = ((result.data as any[]) ?? []).map((c: any) => ({
    ...c,
    id: String(c.id),
    customer_id: c.customer_id != null ? String(c.customer_id) : c.customer_id,
    subscription_id: c.subscription_id != null ? String(c.subscription_id) : null,
  }));

  return json(200, { ok: true, cancellations });
});
