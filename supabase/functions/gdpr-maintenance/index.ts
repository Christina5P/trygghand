import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Remote supabase-js for Deno resolved at deploy/runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

declare const Deno: { env: { get: (key: string) => string | undefined } };

type CleanupRow = {
  id: string;
  export_bucket: string | null;
  export_path: string | null;
  expires_at: string | null;
  created_at: string | null;
  notes: string | null;
  status: string | null;
};

type CleanupFailure = { id: string; error: string };

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
  const { data, error } = await service
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) return false;
  return (data as any)?.is_admin === true;
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

  const action = typeof payload?.action === "string" ? payload.action : "cleanup";
  if (action !== "cleanup") return json(req, 400, { error: "Invalid action" });

  const olderThanDays = Number.isFinite(Number(payload?.older_than_days))
    ? Math.max(1, Math.floor(Number(payload.older_than_days)))
    : 7;
  const requestId = payload?.request_id;
  if (requestId && !isUuid(requestId)) return json(req, 400, { error: "Invalid request_id" });

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
  if (!admin) return json(req, 403, { error: "Forbidden" });

  const nowIso = new Date().toISOString();
  const cutoffIso = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();

  let query = service
    .from("gdpr_requests")
    .select("id, export_bucket, export_path, expires_at, created_at, notes, status");

  if (requestId) {
    query = query.eq("id", requestId);
  } else {
    query = query
      .in("status", ["ready", "delivered", "expired"])
      .not("export_bucket", "is", null)
      .not("export_path", "is", null)
      .or(`expires_at.lt.${nowIso},and(expires_at.is.null,created_at.lt.${cutoffIso})`);
  }

  const { data, error } = await query;

  if (error) return json(req, 500, { error: "Failed to load requests" });

  const rows = (data ?? []) as CleanupRow[];
  const failures: CleanupFailure[] = [];
  let cleaned = 0;

  for (const row of rows) {
    if (!row.export_bucket || !row.export_path) continue;
    if (requestId && row.expires_at) {
      const expiresAt = new Date(row.expires_at).getTime();
      if (Number.isFinite(expiresAt) && Date.now() < expiresAt) {
        failures.push({ id: row.id, error: "Not expired" });
        continue;
      }
    }

    const { error: removeErr } = await service.storage
      .from(row.export_bucket)
      .remove([row.export_path]);

    if (removeErr) {
      failures.push({ id: row.id, error: removeErr.message || "remove failed" });
      continue;
    }

    const note = `Cleaned up at ${nowIso}`;
    const nextNotes = row.notes ? `${row.notes}\n${note}` : note;

    const { error: updateErr } = await service
      .from("gdpr_requests")
      .update({
        export_bucket: null,
        export_path: null,
        status: "expired",
        notes: nextNotes,
      })
      .eq("id", row.id);

    if (updateErr) {
      failures.push({ id: row.id, error: updateErr.message || "update failed" });
      continue;
    }

    cleaned += 1;
  }

  return json(req, 200, {
    ok: true,
    scanned: rows.length,
    cleaned,
    failed: failures.length,
    failures,
  });
});
