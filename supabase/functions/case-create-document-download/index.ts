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

function isAllowedCaseDocumentPath(path: string, ownerId: string, caseId: string): boolean {
  return path.startsWith(`customers/${ownerId}/cases/${caseId}/`) || path.startsWith(`cases/${caseId}/`);
}

function candidateCaseDocumentPaths(path: string, ownerId: string, caseId: string): string[] {
  const candidates = new Set<string>([path]);

  const legacyPrefix = `cases/${caseId}/`;
  const customerPrefix = `customers/${ownerId}/cases/${caseId}/`;

  if (path.startsWith(legacyPrefix)) {
    const suffix = path.slice(legacyPrefix.length);
    candidates.add(`${customerPrefix}${suffix}`);
  }

  if (path.startsWith(customerPrefix)) {
    const suffix = path.slice(customerPrefix.length);
    candidates.add(`${legacyPrefix}${suffix}`);
  }

  return Array.from(candidates);
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

  const caseId = payload?.case_id;
  const path = typeof payload?.path === "string" ? payload.path : "";

  if (!isUuid(caseId)) return json(req, 400, { error: "Invalid case_id" });

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
    .from("cases")
    .select("id, customer_id")
    .eq("id", caseId)
    .maybeSingle();

  if (rowErr) return json(req, 500, { error: "Internal server error" });
  if (!row) return json(req, 404, { error: "Not found" });

  const ownerId = (row as any).customer_id as string;
  if (!admin && ownerId !== user.id) return json(req, 403, { error: "Forbidden" });

  if (!path || !isAllowedCaseDocumentPath(path, ownerId, caseId)) {
    return json(req, 400, { error: "Invalid path" });
  }

  const candidates = candidateCaseDocumentPaths(path, ownerId, caseId);

  let signedUrl: string | null = null;
  for (const candidatePath of candidates) {
    const { data, error } = await service.storage.from("case-documents").createSignedUrl(candidatePath, 3600);
    if (!error && typeof (data as any)?.signedUrl === "string" && (data as any).signedUrl.length > 0) {
      signedUrl = (data as any).signedUrl;
      break;
    }
  }

  if (!signedUrl) return json(req, 404, { error: "File not found" });

  return json(req, 200, { ok: true, signedUrl });
});
