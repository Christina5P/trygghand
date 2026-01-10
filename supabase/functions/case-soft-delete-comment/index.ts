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

  const commentId = payload?.comment_id;
  if (!isUuid(commentId)) return json(400, { error: "Invalid comment_id" });

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

  const { data: comment, error: commentErr } = await service
    .from("case_comments")
    .select("id, case_id, author_id, deleted_at")
    .eq("id", commentId)
    .maybeSingle();

  if (commentErr) return json(500, { error: "Internal server error" });
  if (!comment) return json(404, { error: "Not found" });

  if (!admin && (comment as any).author_id !== user.id) return json(403, { error: "Forbidden" });

  if (!admin) {
    const caseId = (comment as any).case_id as string;
    const { data: row, error: rowErr } = await service
      .from("cases")
      .select("id, customer_id")
      .eq("id", caseId)
      .maybeSingle();

    if (rowErr || !row) return json(404, { error: "Not found" });
    if ((row as any).customer_id !== user.id) return json(403, { error: "Forbidden" });
  }

  const nowIso = new Date().toISOString();

  // Redact content; do not keep free text in logs or responses.
  const fullPayload = {
    deleted_at: nowIso,
    deleted_by: user.id,
    content: "Borttagen",
  };

  let upd = await service.from("case_comments").update(fullPayload).eq("id", commentId);

  if (upd.error) {
    const msg = String((upd.error as any)?.message || "").toLowerCase();
    if (msg.includes("deleted_at") || msg.includes("deleted_by") || msg.includes("column")) {
      upd = await service.from("case_comments").update({ content: "Borttagen" }).eq("id", commentId);
    }
  }

  if (upd.error) return json(500, { error: "Internal server error" });

  return json(200, { ok: true });
});
