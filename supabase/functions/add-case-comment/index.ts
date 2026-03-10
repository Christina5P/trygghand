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
    .eq("user_id", userId)
    .maybeSingle();

  if (!profileErr && (profile as any)?.role === "admin") return true;
  return false;
}

async function findPrimaryAdminUserId(service: any): Promise<string | null> {
  const { data: roleRow, error: roleErr } = await service
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (!roleErr && (roleRow as any)?.user_id) {
    return String((roleRow as any).user_id);
  }

  const { data: profileRow, error: profileErr } = await service
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .limit(1)
    .maybeSingle();

  if (!profileErr && (profileRow as any)?.id) {
    return String((profileRow as any).id);
  }

  return null;
}

async function resolveCustomerIdForUser(service: any, user: any): Promise<string | null> {
  const userId = user?.id as string | undefined;
  const userEmail = user?.email as string | undefined;
  const userPhone = user?.phone as string | undefined;

  if (userId) {
    const { data, error } = await service
      .from("customers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!error && data?.id) return String(data.id);
  }

  if (userEmail) {
    const { data, error } = await service
      .from("customers")
      .select("id")
      .eq("email", userEmail)
      .maybeSingle();
    if (!error && data?.id) return String(data.id);
  }

  if (userPhone) {
    const { data, error } = await service
      .from("customers")
      .select("id")
      .eq("phone", userPhone)
      .maybeSingle();
    if (!error && data?.id) return String(data.id);
  }

  return null;
}

async function invokeSendPush(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  userId: string;
  type: "new_message" | "case_update" | "booked_time";
  caseId: string;
  messageId?: string;
  url: string;
}) 

{
  try {
    const res = await fetch(`${params.supabaseUrl}/functions/v1/send-push`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.serviceRoleKey}`,
      },
      body: JSON.stringify({
        userId: params.userId,
        type: params.type,
        caseId: params.caseId,
        messageId: params.messageId,
        url: params.url,
      }),
    });

    const text = await res.text();
    console.log("send-push response", {
      status: res.status,
      ok: res.ok,
      body: text,
      userId: params.userId,
      type: params.type,
      caseId: params.caseId,
      messageId: params.messageId,
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

  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json(500, { error: "Server configuration missing" });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const caseId = payload?.case_id;
  const message = typeof payload?.message === "string" ? payload.message.trim() : "";

  if (!isUuid(caseId)) return json(400, { error: "Invalid case_id" });
  if (!message) return json(400, { error: "Missing message" });
  if (message.length > 2000) return json(400, { error: "Message too long" });

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

  // Load case to find owner (and validate access)
  const { data: caseRow, error: caseErr } = await service
    .from("cases")
    .select("id, customer_id")
    .eq("id", caseId)
    .maybeSingle();

  if (caseErr) return json(500, { error: "Internal server error" });
  if (!caseRow) return json(404, { error: "Not found" });

  const ownerId = (caseRow as any).customer_id as string;
  const resolvedCustomerId = await resolveCustomerIdForUser(service, user);
  const isOwnerCustomer = !!resolvedCustomerId && ownerId === resolvedCustomerId;

  // Access: admin can access all. Non-admin must own the case.
  if (!admin && !isOwnerCustomer) return json(403, { error: "Forbidden" });

  // Role precedence: if the user owns this case as customer, write customer comment
  // even if the same auth user also has admin role.
  const authorType = isOwnerCustomer ? "customer" : "admin";

  const { data: insertedComment, error: insErr } = await service.from("case_comments").insert({
    case_id: caseId,
    author_id: user.id,
    customer_id: ownerId,
    author_type: authorType,
    content: message,
  }).select("id").single();

  if (insErr) return json(500, { error: "Internal server error" });

  const recipientId = authorType === "admin" ? ownerId : await findPrimaryAdminUserId(service);

  if (recipientId && recipientId !== user.id) {
    await invokeSendPush({
      supabaseUrl,
      serviceRoleKey,
      userId: recipientId,
      type: "new_message",
      caseId,
      messageId: (insertedComment as any)?.id,
      url: `/portal?caseId=${caseId}`,
    });
  }

  // Write in-app notification (archive existing unread first to avoid stacking)
  if (recipientId) {
    try {
      await service.from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", recipientId)
        .eq("ref_id", caseId)
        .eq("type", "case_message")
        .is("read_at", null);
      await service.from("notifications").insert({
        user_id: recipientId,
        type: "case_message",
        ref_id: caseId,
        ref_type: "case",
        actor_id: user.id,
        payload: { message_id: (insertedComment as any)?.id },
      });
    } catch (e) {
      console.error("Notification error", e);
    }
  }

  // Do not echo free-text back
  return json(200, { ok: true });
});
