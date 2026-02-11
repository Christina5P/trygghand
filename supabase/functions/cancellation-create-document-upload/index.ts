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
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, 405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json(req, 500, { error: "Server configuration missing" });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json(req, 400, { error: "Invalid JSON" });
  }

  const cancellationId = payload?.cancellation_id;
  const fileExt = typeof payload?.file_ext === "string" ? payload.file_ext.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const mimeType = typeof payload?.mime_type === "string" ? payload.mime_type.slice(0, 120) : null;

  if (!isUuid(cancellationId)) return json(req, 400, { error: "Invalid cancellation_id" });
  if (!fileExt || !ALLOWED_EXT.has(fileExt)) return json(req, 400, { error: "Unsupported file type" });

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

  const { data: row, error: rowErr } = await service
    .from("subscription_cancellations")
    .select("id, customer_id")
    .eq("id", cancellationId)
    .maybeSingle();

  if (rowErr || !row) return json(req, 404, { error: "Not found" });
  if (!admin && (row as any).customer_id !== user.id) return json(req, 403, { error: "Forbidden" });

  const ownerId = (row as any).customer_id as string;
  const path = `customers/${ownerId}/subscription_cancellations/${cancellationId}/${crypto.randomUUID()}.${fileExt}`;

  // Use service role to generate a signed upload token.
  const { data, error } = await service.storage.from("abonnemang").createSignedUploadUrl(path);
  if (error) return json(req, 500, { error: "Internal server error" });

  const token = (data as any)?.token;
  const outPath = (data as any)?.path || path;
  if (!token) return json(req, 500, { error: "Internal server error" });

  return json(req, 200, { ok: true, path: outPath, token, mime_type: mimeType });
});
