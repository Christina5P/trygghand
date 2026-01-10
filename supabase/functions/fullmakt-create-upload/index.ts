import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Remote supabase-js for Deno resolved at deploy/runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

declare const Deno: { env: { get: (key: string) => string | undefined } };

function corsHeaders(req?: Request) {
  const requested = req?.headers.get("access-control-request-headers");
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      requested || "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
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
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!profileErr && (profile as any)?.role === "admin") return true;
  return false;
}

const ALLOWED_EXT = new Set(["pdf", "png", "jpg", "jpeg", "webp", "doc", "docx"]);

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders(req) });
  }
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

  const fileExt =
    typeof payload?.file_ext === "string"
      ? payload.file_ext.toLowerCase().replace(/[^a-z0-9]/g, "")
      : "";
  const mimeType = typeof payload?.mime_type === "string" ? payload.mime_type.slice(0, 120) : null;

  if (!fileExt || !ALLOWED_EXT.has(fileExt)) {
    return json(req, 400, { error: "Unsupported file type" });
  }

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

  const admin = await isAdmin(service, user.id);
  if (!admin) {
    // Customer must exist + be active
    const { data: cust, error: custErr } = await service
      .from("customers")
      .select("id, is_customer, deleted_at")
      .eq("id", user.id)
      .maybeSingle();

    if (custErr || !cust) return json(req, 403, { error: "Forbidden" });
    if ((cust as any)?.deleted_at) return json(req, 403, { error: "Forbidden" });
    if ((cust as any)?.is_customer !== true) return json(req, 403, { error: "Forbidden" });
  }

  const path = `fullmakter/${user.id}/${crypto.randomUUID()}.${fileExt}`;

  const { data, error } = await service.storage.from("fullmakts-filer").createSignedUploadUrl(path);
  if (error) return json(req, 500, { error: "Internal server error" });

  const token = (data as any)?.token;
  const outPath = (data as any)?.path || path;
  if (!token) return json(req, 500, { error: "Internal server error" });

  return json(req, 200, { ok: true, path: outPath, token, mime_type: mimeType });
});
