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

function isIsoDate(v: unknown): v is string {
  return typeof v === "string" && !Number.isNaN(Date.parse(v));
}

async function invokeSendPush(params: {
  supabaseUrl: string;
  serviceRoleKey: string;
  userId: string;
  caseId: string;
  type: "case_update" | "new_message" | "booked_time";
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
        type: params.type,
        caseId: params.caseId,
        url: `/portal?caseId=${params.caseId}`,
      }),
    });
  } catch (err) {
    console.error("send-push invoke failed", err);
  }
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

const ALLOWED_STATUSES = new Set(["pending", "in_progress", "completed", "cancelled"]);

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
  const customerId = payload?.customer_id;
  const title = typeof payload?.title === "string" ? payload.title.trim() : "";
  const description = payload?.description == null ? null : String(payload.description);
  const status = payload?.status;
  const createdAt = payload?.created_at;
  const scheduledDate = payload?.scheduled_date;

  if (!isUuid(customerId)) return json(400, { error: "Invalid customer_id" });
  if (caseId != null && !isUuid(caseId)) return json(400, { error: "Invalid case_id" });
  if (!title) return json(400, { error: "Missing title" });
  if (title.length > 200) return json(400, { error: "Title too long" });
  if (description != null && String(description).length > 2000) return json(400, { error: "Description too long" });
  if (status != null && !ALLOWED_STATUSES.has(String(status))) return json(400, { error: "Invalid status" });
  if (createdAt != null && !isIsoDate(createdAt)) return json(400, { error: "Invalid created_at" });
  if (scheduledDate != null && !isIsoDate(scheduledDate)) return json(400, { error: "Invalid scheduled_date" });

  // Verify caller identity via JWT
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

  const nowIso = new Date().toISOString();

  if (caseId) {
    const updatePayload: Record<string, any> = {
      customer_id: customerId,
      title,
      description: description ? String(description) : null,
      updated_at: nowIso,
    };
    if (status != null) updatePayload.status = String(status);
    if (createdAt != null) updatePayload.created_at = String(createdAt);
    if (scheduledDate != null) updatePayload.scheduled_date = String(scheduledDate);

    const { error: updErr } = await service.from("cases").update(updatePayload).eq("id", caseId);
    if (updErr) return json(500, { error: "Internal server error" });

    // Notis: statusändring i ärende — arkivera tidigare olästa statusnotiser först
    if (updatePayload.status != null && customerId && customerId !== user.id) {
      await service
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", customerId)
        .eq("ref_id", caseId)
        .eq("type", "case_status")
        .is("read_at", null);
      await service.from("notifications").insert({
        user_id: customerId,
        type: "case_status",
        ref_id: caseId,
        ref_type: "case",
        actor_id: user.id,
        payload: { status: updatePayload.status },
      });
    }

    return json(200, { ok: true, case_id: caseId });
  }

  const insertPayload: Record<string, any> = {
    customer_id: customerId,
    title,
    description: description ? String(description) : null,
    status: status != null ? String(status) : "pending",
  };
  if (createdAt != null) insertPayload.created_at = String(createdAt);
  if (scheduledDate != null) insertPayload.scheduled_date = String(scheduledDate);

  const { data: created, error: insErr } = await service.from("cases").insert(insertPayload).select("id").single();
  if (insErr) return json(500, { error: "Internal server error" });

  // Notis: nytt ärende
  if (customerId && customerId !== user.id) {
    try {
      await service.from("notifications").insert({
        user_id: customerId,
        type: "case_status",
        ref_id: (created as any)?.id,
        ref_type: "case",
        actor_id: user.id,
        payload: { status: insertPayload.status },
      });
    } catch (e) {
      console.error("Notification error", e);
    }
  }

  await invokeSendPush({
    supabaseUrl,
    serviceRoleKey,
    userId: customerId,
    caseId: (created as any)?.id,
    type: "case_update",
  });

  return json(200, { ok: true, case_id: (created as any)?.id });
});
