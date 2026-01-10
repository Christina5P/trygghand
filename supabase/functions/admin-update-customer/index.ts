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

function isStringOrNull(v: unknown): v is string | null | undefined {
  return v === undefined || v === null || typeof v === "string";
}

function clampString(v: string, maxLen: number): string {
  const trimmed = v.trim();
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
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
  const name = payload?.name;
  const email = payload?.email;
  const phone = payload?.phone;
  const personalNumber = payload?.personal_number;
  const personalNumberChanged = payload?.personal_number_changed === true;

  if (!isUuid(customerId)) return json(400, { error: "Invalid customer_id" });
  if (typeof name !== "string" || name.trim().length < 1) return json(400, { error: "Invalid name" });
  if (!isStringOrNull(email) || !isStringOrNull(phone) || !isStringOrNull(personalNumber)) {
    return json(400, { error: "Invalid fields" });
  }

  const safeName = clampString(name, 200);
  const safeEmail = email ? clampString(email, 320) : null;
  const safePhone = phone ? clampString(phone, 50) : null;
  const safePersonalNumber = personalNumber ? clampString(personalNumber, 32) : null;

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

  // Update personal number via existing GDPR-safe RPC (no free-text input accepted from caller)
  if (personalNumberChanged && safePersonalNumber) {
    const { error: pnErr } = await service.rpc("safe_update_personal_number", {
      p_customer_id: customerId,
      p_personal_number: safePersonalNumber,
      p_reason: "admin-update-customer",
    });

    if (pnErr) return json(500, { error: "Internal server error" });
  }

  // Update other fields. If personal number was handled above, avoid re-sending it here.
  const { error: updErr } = await service.rpc("safe_update_customer", {
    p_customer_id: customerId,
    p_name: safeName,
    p_email: safeEmail,
    p_phone: safePhone,
    p_personal_number: personalNumberChanged ? null : safePersonalNumber,
  });

  if (updErr) return json(500, { error: "Internal server error" });

  return json(200, { ok: true });
});
