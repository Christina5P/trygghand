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

function safeDisplayName(name: string): string {
  const base = name.replace(/\.[^/.]+$/, "");
  const scrubbed = base
    .replace(/[0-9]/g, "")
    .replace(/[^a-zA-ZåäöÅÄÖ\- _]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);

  return scrubbed.length >= 3 ? scrubbed : "Dokument";
}

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
  const path = typeof payload?.path === "string" ? payload.path : "";
  const rawName = typeof payload?.display_name === "string" ? payload.display_name : "Dokument";
  const mimeType = typeof payload?.mime_type === "string" ? payload.mime_type.slice(0, 120) : null;
  const fileSize = typeof payload?.file_size === "number" ? payload.file_size : null;

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

  const admin = await isAdmin(service, user.id);

  const { data: row, error: rowErr } = await service
    .from("subscription_cancellations")
    .select("id, customer_id, documents")
    .eq("id", cancellationId)
    .maybeSingle();

  if (rowErr || !row) return json(req, 404, { error: "Not found" });

  const ownerId = (row as any).customer_id as string;
  if (!admin && ownerId !== user.id) return json(req, 403, { error: "Forbidden" });

  if (!path || !path.startsWith(`customers/${ownerId}/subscription_cancellations/${cancellationId}/`)) {
    return json(req, 400, { error: "Invalid path" });
  }

  const ext = (path.split(".").pop() || "").toLowerCase();
  const displayName = `${safeDisplayName(rawName)}${ext ? "." + ext : ""}`;

  const doc = {
    path,
    display_name: displayName,
    mime_type: mimeType,
    uploaded_at: new Date().toISOString(),
    uploaded_by: user.id,
    uploaded_by_role: admin ? "admin" : "customer",
    deleted_at: null,
    deleted_by: null,
  };

  const existing = (row as any).documents;
  const docs: any[] = Array.isArray(existing) ? existing : [];
  const next = [...docs, doc];

  const { error: updErr } = await service
    .from("subscription_cancellations")
    .update({ documents: next, updated_at: new Date().toISOString() })
    .eq("id", cancellationId);

  if (updErr) return json(req, 500, { error: "Internal server error" });

  const { error: indexErr } = await service.from("customer_files").insert({
    customer_id: ownerId,
    bucket: "abonnemang",
    path,
    file_type: mimeType,
    size: fileSize,
  });
  if (indexErr) return json(req, 500, { error: "Internal server error" });

  return json(req, 200, { ok: true });
});
