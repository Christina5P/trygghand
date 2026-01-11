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
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!profileErr && (profile as any)?.role === "admin") return true;
  return false;
}

function isMissingDocumentsColumn(err: unknown): boolean {
  const e = err as any;
  const message = typeof e?.message === "string" ? e.message : "";
  const code = typeof e?.code === "string" ? e.code : "";
  return code === "42703" || message.toLowerCase().includes('column "documents"');
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json(500, { error: "Server configuration missing" });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const caseId = payload?.case_id;
  const path = typeof payload?.path === "string" ? payload.path : "";

  if (!isUuid(caseId)) return json(400, { error: "Invalid case_id" });
  if (!path || !path.startsWith(`cases/${caseId}/`)) return json(400, { error: "Invalid path" });

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

  const { data: row, error: rowErr } = await service
    .from("cases")
    .select("id, customer_id, documents")
    .eq("id", caseId)
    .maybeSingle();

  if (rowErr) {
    if (isMissingDocumentsColumn(rowErr)) {
      return json(500, {
        error: "Database schema missing public.cases.documents. Run supabase/scripts/add_cases_documents_jsonb.sql in Supabase SQL Editor.",
      });
    }
    return json(500, { error: "Internal server error" });
  }
  if (!row) return json(404, { error: "Not found" });

  const docs = Array.isArray((row as any).documents) ? ((row as any).documents as any[]) : [];

  let allowed = admin;
  if (!allowed) {
    // Customer: must own case and can delete only their own uploaded docs (if metadata exists)
    if ((row as any).customer_id !== user.id) return json(403, { error: "Forbidden" });

    for (const d of docs) {
      if (d && typeof d === "object" && d.path === path && d.uploaded_by === user.id) {
        allowed = true;
        break;
      }
    }
  }

  if (!allowed) return json(403, { error: "Forbidden" });

  const nowIso = new Date().toISOString();

  const next = docs.map((d) => {
    if (typeof d === "string") {
      if (d !== path) return d;
      // Legacy string doc: only admin can delete, and we convert it to object metadata
      return {
        path: d,
        deleted_at: nowIso,
        deleted_by: user.id,
        uploaded_by: null,
        uploaded_at: null,
        display_name: null,
        mime_type: null,
        uploaded_by_role: null,
      };
    }

    if (!d || typeof d !== "object") return d;
    if (d.path !== path) return d;
    return { ...d, deleted_at: nowIso, deleted_by: user.id };
  });

  const { error: updErr } = await service.from("cases").update({ documents: next, updated_at: nowIso }).eq("id", caseId);
  if (updErr) return json(500, { error: "Internal server error" });

  return json(200, { ok: true });
});
