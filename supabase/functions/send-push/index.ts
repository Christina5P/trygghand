import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Remote supabase-js for Deno resolved at deploy/runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
// @ts-ignore - web-push is imported through esm for Deno runtime
import webpush from "https://esm.sh/web-push@3.6.7";

declare const Deno: { env: { get: (key: string) => string | undefined } };

type SendPushPayload = {
  userId?: string;
  type?: "case_update" | "new_message" | "booked_time" | string;
  caseId?: string;
  messageId?: string;
  url?: string;
};

type PushPreference = {
  user_id: string;
  push_enabled: boolean;
  case_updates_enabled: boolean;
  new_messages_enabled: boolean;
  contact_requests_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PUSH_RATE_LIMIT_SECONDS = 20;
const PUSH_SEND_TIMEOUT_MS = 10_000;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

function parseTimeToMinutes(value: string): number {
  const [h, m] = value.split(":").map((part) => Number.parseInt(part, 10));
  const hours = Number.isFinite(h) ? h : 0;
  const minutes = Number.isFinite(m) ? m : 0;
  return Math.max(0, Math.min(23, hours)) * 60 + Math.max(0, Math.min(59, minutes));
}

function nowMinutesInTimezone(timezone: string): number {
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  });

  const parts = formatter.formatToParts(new Date());
  const hour = Number.parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = Number.parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return (Number.isFinite(hour) ? hour : 0) * 60 + (Number.isFinite(minute) ? minute : 0);
}

function isWithinQuietHours(pref: PushPreference): boolean {
  if (!pref.quiet_hours_enabled) return false;

  const now = nowMinutesInTimezone(pref.timezone || "Europe/Stockholm");
  const start = parseTimeToMinutes(pref.quiet_hours_start || "22:00");
  const end = parseTimeToMinutes(pref.quiet_hours_end || "07:00");

  if (start === end) return true;
  if (start < end) return now >= start && now < end;
  return now >= start || now < end;
}

function getSafePushCopy(type: string, batchedCount: number) {
  if (batchedCount > 1) {
    return {
      title: "Du har nya uppdateringar",
      body: "Det finns flera nya uppdateringar i kundportalen.",
    };
  }

  if (type === "new_message") {
    return {
      title: "Nytt meddelande",
      body: "Nytt meddelande i ditt ärende.",
    };
  }

  if (type === "contact_request") {
    return {
      title: "Ny kontaktförfrågan",
      body: "En ny kontaktförfrågan har inkommit till Trygg Hand.",
    };
  }

  return {
    title: "Ny uppdatering",
    body: "Du har en uppdatering i kundportalen.",
  };
}

function categoryEnabled(pref: PushPreference, type: string): boolean {
  if (!pref.push_enabled) return false;
  if (type === "new_message") return pref.new_messages_enabled;
  if (type === "contact_request") return pref.contact_requests_enabled;
  return pref.case_updates_enabled;
}

function maskEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    const tail = url.pathname.split("/").filter(Boolean).pop() || "endpoint";
    return `${url.origin}/.../${tail.slice(0, 6)}***`;
  } catch {
    return "masked-endpoint";
  }
}

function normalizePortalUrl(rawUrl: string | undefined): string {
  if (!rawUrl || typeof rawUrl !== "string") return "/portal";
  if (!rawUrl.startsWith("/portal") && !rawUrl.startsWith("/adminportal")) return "/portal";
  return rawUrl;
}

function getPushProvider(endpoint: string): string {
  try {
    const hostname = new URL(endpoint).hostname;
    if (hostname === "fcm.googleapis.com" || hostname.endsWith(".fcm.googleapis.com")) {
      return "Google FCM";
    }
    if (hostname === "web.push.apple.com") return "Apple";
  } catch {
    return "Unknown";
  }
  return "Unknown";
}

function getPushErrorHeader(headers: unknown, name: string): string | null {
  if (!headers || typeof headers !== "object") return null;
  const headerMap = headers as Record<string, unknown>;
  const value = headerMap[name] ?? headerMap[name.toLowerCase()] ?? headerMap[name.toUpperCase()];
  return typeof value === "string" ? value : value == null ? null : String(value);
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const requestStartedAt = Date.now();
  console.log("send-push request started");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const vapidPublicKey = Deno.env.get("PUSH_VAPID_PUBLIC_KEY") || Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("PUSH_VAPID_PRIVATE_KEY") || Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("PUSH_VAPID_SUBJECT") || "mailto:kontakt@trygghand.com";

  if (!supabaseUrl || !serviceRoleKey) return json(500, { error: "Server configuration missing" });
  if (!vapidPublicKey || !vapidPrivateKey) return json(500, { error: "Push configuration missing" });

  let payload: SendPushPayload;
  try {
    payload = (await req.json()) as SendPushPayload;
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  if (!isUuid(payload?.userId)) return json(400, { error: "Invalid userId" });

  const normalizedType = typeof payload.type === "string" ? payload.type : "case_update";
  const safeUrl = normalizePortalUrl(payload.url);

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const preferencesStartedAt = Date.now();
  console.log("send-push preferences query starting");
  const { data: prefRow, error: prefErr } = await service
    .from("push_notification_preferences")
    .select("*")
    .eq("user_id", payload.userId)
    .maybeSingle();

  console.log("send-push preferences query finished", {
    durationMs: Date.now() - preferencesStartedAt,
    hasError: Boolean(prefErr),
  });

  const preferences: PushPreference =
    (prefRow as PushPreference | null) ?? {
      user_id: payload.userId,
      push_enabled: false,
      case_updates_enabled: false,
      new_messages_enabled: false,
      contact_requests_enabled: false,
      quiet_hours_enabled: false,
      quiet_hours_start: "22:00",
      quiet_hours_end: "07:00",
      timezone: "Europe/Stockholm",
    };

  if (!categoryEnabled(preferences, normalizedType)) {
    return json(200, { ok: true, skipped: "category_disabled" });
  }

  if (isWithinQuietHours(preferences)) {
    return json(200, { ok: true, skipped: "quiet_hours" });
  }

  const { data: stateRow } = await service
    .from("push_delivery_state")
    .select("last_sent_at, pending_count")
    .eq("user_id", payload.userId)
    .maybeSingle();

  const lastSentAt = (stateRow as any)?.last_sent_at ? new Date((stateRow as any).last_sent_at).getTime() : 0;
  const pendingCount = Number((stateRow as any)?.pending_count ?? 0);
  const now = Date.now();

  if (lastSentAt > 0 && now - lastSentAt < PUSH_RATE_LIMIT_SECONDS * 1000) {
    await service
      .from("push_delivery_state")
      .upsert({
        user_id: payload.userId,
        last_sent_at: (stateRow as any)?.last_sent_at ?? null,
        pending_count: pendingCount + 1,
      });

    return json(200, { ok: true, queued: true });
  }

  const batchedCount = Math.max(1, pendingCount + 1);
  const copy = getSafePushCopy(normalizedType, batchedCount);

  const subscriptionsStartedAt = Date.now();
  const { data: subscriptions, error: subErr } = await service
    .from("push_subscriptions")
    .select("id, endpoint, subscription")
    .eq("user_id", payload.userId);
  console.log("send-push subscriptions fetched", {
    durationMs: Date.now() - subscriptionsStartedAt,
    subscriptionsFound: subscriptions?.length ?? 0,
  });

  if (subErr) return json(500, { error: "Could not load subscriptions" });
  if (!subscriptions || subscriptions.length === 0) {
    await service
      .from("push_delivery_state")
      .upsert({ user_id: payload.userId, last_sent_at: new Date().toISOString(), pending_count: 0 });
    return json(200, { ok: true, delivered: 0 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const pushPayload = JSON.stringify({
    title: copy.title,
    body: copy.body,
    icon: "/favicon-192x192.png",
    badge: "/favicon-96x96.png",
    url: safeUrl,
    type: normalizedType,
    caseId: payload.caseId,
    messageId: payload.messageId,
  });

  let delivered = 0;
  let deleted = 0;
  const sendStartedAt = Date.now();
  const sendResults = await Promise.allSettled(
    (subscriptions as Array<{ id: string; endpoint: string; subscription: Record<string, unknown> }>).map(async (row) => {
      const startedAt = Date.now();
      try {
        await webpush.sendNotification(row.subscription as any, pushPayload, {
          timeout: PUSH_SEND_TIMEOUT_MS,
        });
        const durationMs = Date.now() - startedAt;
        console.log("send-push send succeeded", { durationMs });
        delivered += 1;
        return { row, statusCode: 0 };
      } catch (err: any) {
        const durationMs = Date.now() - startedAt;
        const statusCode = Number(err?.statusCode || err?.status || 0);
        console.error("send-push send failed", {
          durationMs,
          statusCode,
          provider: getPushProvider(row.endpoint),
          subscriptionId: row.id,
          body: typeof err?.body === "string" ? err.body : err?.body ? JSON.stringify(err.body) : err?.message || "",
          contentType: getPushErrorHeader(err?.headers, "content-type"),
        });
        return { row, statusCode };
      }
    }),
  );
  console.log("send-push sends completed", {
    durationMs: Date.now() - sendStartedAt,
    sendsAttempted: sendResults.length,
  });

  const cleanupStartedAt = Date.now();
  const staleRows = sendResults
    .filter(
      (
        result,
      ): result is PromiseFulfilledResult<{
        row: { id: string; endpoint: string; subscription: Record<string, unknown> };
        statusCode: number;
      }> =>
        result.status === "fulfilled" && [404, 410].includes(result.value.statusCode),
    )
    .map((result) => result.value.row);
  await Promise.all(staleRows.map(async (row) => {
    await service.from("push_subscriptions").delete().eq("id", row.id);
    deleted += 1;
  }));
  console.log("send-push cleanup completed", {
    durationMs: Date.now() - cleanupStartedAt,
    staleSubscriptions: staleRows.length,
  });

  await service
    .from("push_delivery_state")
    .upsert({ user_id: payload.userId, last_sent_at: new Date().toISOString(), pending_count: 0 });

  console.log("send-push completed", { totalDurationMs: Date.now() - requestStartedAt });

  return json(200, {
    ok: true,
    delivered,
    deleted,
    batchedCount,
  });
});
