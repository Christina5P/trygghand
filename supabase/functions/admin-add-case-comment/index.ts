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

async function invokeSendPush(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  userId: string;
  caseId: string;
  messageId?: string;
}) {
  try {
    await fetch(`${params.supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.serviceRoleKey}`,
      },
      body: JSON.stringify({
        userId: params.userId,
        type: "new_message",
        caseId: params.caseId,
        messageId: params.messageId,
        url: `/portal?caseId=${params.caseId}`,
      }),
    });
  } catch (err) {
    console.error("send-push invoke failed", err);
  }
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

  const caseId = payload?.case_id;
  const comment = typeof payload?.comment === "string" ? payload.comment.trim() : "";

  if (!isUuid(caseId)) return json(400, { error: "Invalid case_id" });
  if (!comment) return json(400, { error: "Missing comment" });
  if (comment.length > 2000) return json(400, { error: "Comment too long" });

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

  // Fetch case to obtain customer_id (avoid trusting client input)
  const { data: caseRow, error: caseErr } = await service.from("cases").select("id, customer_id").eq("id", caseId).maybeSingle();
  if (caseErr) return json(500, { error: "Internal server error" });
  if (!caseRow) return json(404, { error: "Not found" });

  const { data: insertedComment, error: insErr } = await service.from("case_comments").insert({
    case_id: caseId,
    author_id: user.id,
    customer_id: (caseRow as any).customer_id,
    author_type: "admin",
    content: comment,
  }).select("id").single();

  if (insErr) return json(500, { error: "Internal server error" });

  const customerId = String((caseRow as any).customer_id || "");
  if (customerId && customerId !== user.id) {
    await invokeSendPush({
      supabaseUrl,
      serviceRoleKey,
      userId: customerId,
      caseId,
      messageId: (insertedComment as any)?.id,
    });
  }

  // Do not echo comment back in response
  return json(200, { ok: true });
});
