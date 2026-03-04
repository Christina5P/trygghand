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

function isAllowedCaseDocumentPath(path: string, ownerId: string, caseId: string): boolean {
  return path.startsWith(`customers/${ownerId}/cases/${caseId}/`) || path.startsWith(`cases/${caseId}/`);
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
  const rawName = typeof payload?.display_name === "string" ? payload.display_name : "Dokument";
  const mimeType = typeof payload?.mime_type === "string" ? payload.mime_type.slice(0, 120) : null;
  const fileSize = typeof payload?.file_size === "number" ? payload.file_size : null;

  if (!isUuid(caseId)) return json(400, { error: "Invalid case_id" });

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

  const ownerId = (row as any).customer_id as string;
  if (!admin && ownerId !== user.id) return json(403, { error: "Forbidden" });

  if (!path || !isAllowedCaseDocumentPath(path, ownerId, caseId)) {
    return json(400, { error: "Invalid path" });
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

  const nowIso = new Date().toISOString();

  const { error: updErr } = await service
    .from("cases")
    .update({ documents: next, updated_at: nowIso })
    .eq("id", caseId);

  if (updErr) return json(500, { error: "Internal server error" });

  const { error: indexErr } = await service.from("customer_files").insert({
    customer_id: ownerId,
    bucket: "case-documents",
    path,
    file_type: mimeType,
    size: fileSize,
  });
  if (indexErr) return json(500, { error: "Internal server error" });

  return json(200, { ok: true });
});
