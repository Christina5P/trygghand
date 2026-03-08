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

async function isAdmin(service: any, userId: string): Promise<boolean> {
  const { data: roles, error: rolesErr } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");

  if (!rolesErr && Array.isArray(roles) && roles.length > 0) return true;

  const { data: profile, error: profileErr } = await service
    .from("profiles")
    .select("role, is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (!profileErr && (((profile as any)?.role === "admin") || ((profile as any)?.is_admin === true))) return true;
  return false;
}

async function resolveCustomerIdForUser(service: any, user: any): Promise<string | null> {
  const userId = user?.id as string | undefined;
  const userEmail = user?.email as string | undefined;
  const userPhone = user?.phone as string | undefined;

  if (userId) {
    const { data, error } = await service
      .from("customers")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (!error && data?.id) return String(data.id);
  }

  if (userEmail) {
    const { data, error } = await service
      .from("customers")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();
    if (!error && data?.id) return String(data.id);
  }

  if (userPhone) {
    const { data, error } = await service
      .from("customers")
      .select("id")
      .eq("phone", userPhone)
      .maybeSingle();
    if (!error && data?.id) return String(data.id);
  }

  return null;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const hasAuthHeader = !!req.headers.get("authorization");
  console.log(`[mark-cancellation-as-read] request received. hasAuthHeader=${hasAuthHeader}`);

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

  if (!isUuid(cancellationId)) return json(400, { error: "Invalid cancellation_id" });

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

  const admin = await isAdmin(service, user.id);
  console.log(`[mark-cancellation-as-read] user.id=${user.id}, user.email=${user.email}, isAdmin=${admin}, cancellationId=${cancellationId}`);

  // Verify cancellation exists and user has access
  const { data: cancellationRow, error: cancellationErr } = await service
    .from("subscription_cancellations")
    .select("id, customer_id")
    .eq("id", cancellationId)
    .maybeSingle();

  if (cancellationErr) return json(500, { error: "Internal server error" });
  if (!cancellationRow) return json(404, { error: "Not found" });

  const customerId = (cancellationRow as any).customer_id as string;
  const resolvedCustomerId = await resolveCustomerIdForUser(service, user);
  const isOwnerCustomer = !!resolvedCustomerId && customerId === resolvedCustomerId;

  // Access: admin can access all. Non-admin must own the cancellation.
  if (!admin && !isOwnerCustomer) {
    console.log(`[mark-cancellation-as-read] Access denied`);
    return json(403, { error: "Forbidden" });
  }

  // If the user owns this cancellation, treat read as customer read even if user has admin role.
  const now = new Date().toISOString();
  const updateField = isOwnerCustomer ? "customer_last_read_at" : (admin ? "admin_last_read_at" : "customer_last_read_at");
  console.log(`[mark-cancellation-as-read] customerId=${customerId}, resolvedCustomerId=${resolvedCustomerId}, isOwnerCustomer=${isOwnerCustomer}, updating ${updateField} for cancellationId=${cancellationId}`);

  const { error: updateErr } = await service
    .from("subscription_cancellations")
    .update({ [updateField]: now })
    .eq("id", cancellationId);

  if (updateErr) {
    console.error(`[mark-cancellation-as-read] Update failed:`, updateErr);
    return json(500, { error: "Internal server error" });
  }
  console.log(`[mark-cancellation-as-read] Successfully updated`);

  return json(200, { ok: true });
});
