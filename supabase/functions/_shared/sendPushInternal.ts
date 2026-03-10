// @ts-ignore - Remote supabase-js for Deno resolved at deploy/runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
// @ts-ignore - web-push is imported through esm for Deno runtime
import webpush from "https://esm.sh/web-push@3.6.7";

declare const Deno: { env: { get: (key: string) => string | undefined } };

type PushPreference = {
  user_id: string;
  push_enabled: boolean;
  case_updates_enabled: boolean;
  new_messages_enabled: boolean;
  booked_times_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
};

export type SendPushInternalParams = {
  userId: string;
  type?: "case_update" | "new_message" | "booked_time" | string;
  caseId?: string;
  messageId?: string;
  url?: string;
};

export type SendPushInternalResult = {
  ok: true;
  skipped?: "category_disabled" | "quiet_hours";
  queued?: true;
  delivered?: number;
  deleted?: number;
  batchedCount?: number;
} | {
  ok: false;
  error: string;
};

const PUSH_RATE_LIMIT_SECONDS = 20;

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

  if (type === "booked_time") {
    return {
      title: "Ny bokad tid",
      body: "Du har en uppdatering om bokad tid i kundportalen.",
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
  if (type === "booked_time") return pref.booked_times_enabled;
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
  if (!rawUrl.startsWith("/portal")) return "/portal";
  return rawUrl;
}

export async function sendPushInternal(params: SendPushInternalParams): Promise<SendPushInternalResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const vapidPublicKey = Deno.env.get("PUSH_VAPID_PUBLIC_KEY") || Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("PUSH_VAPID_PRIVATE_KEY") || Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("PUSH_VAPID_SUBJECT") || "https://www.trygghand.com";

  if (!supabaseUrl || !serviceRoleKey) return { ok: false, error: "Server configuration missing" };
  if (!vapidPublicKey || !vapidPrivateKey) return { ok: false, error: "Push configuration missing" };
  if (!isUuid(params.userId)) return { ok: false, error: "Invalid userId" };

  const normalizedType = typeof params.type === "string" ? params.type : "case_update";
  const safeUrl = normalizePortalUrl(params.url);

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: prefRow } = await service
    .from("push_notification_preferences")
    .select("*")
    .eq("user_id", params.userId)
    .maybeSingle();

  const preferences: PushPreference =
    (prefRow as PushPreference | null) ?? {
      user_id: params.userId,
      push_enabled: false,
      case_updates_enabled: false,
      new_messages_enabled: false,
      booked_times_enabled: false,
      quiet_hours_enabled: false,
      quiet_hours_start: "22:00",
      quiet_hours_end: "07:00",
      timezone: "Europe/Stockholm",
    };

  if (!categoryEnabled(preferences, normalizedType)) {
    return { ok: true, skipped: "category_disabled" };
  }

  if (isWithinQuietHours(preferences)) {
    return { ok: true, skipped: "quiet_hours" };
  }

  const { data: stateRow } = await service
    .from("push_delivery_state")
    .select("last_sent_at, pending_count")
    .eq("user_id", params.userId)
    .maybeSingle();

  const lastSentAt = (stateRow as any)?.last_sent_at ? new Date((stateRow as any).last_sent_at).getTime() : 0;
  const pendingCount = Number((stateRow as any)?.pending_count ?? 0);
  const now = Date.now();

  if (lastSentAt > 0 && now - lastSentAt < PUSH_RATE_LIMIT_SECONDS * 1000) {
    await service
      .from("push_delivery_state")
      .upsert({
        user_id: params.userId,
        last_sent_at: (stateRow as any)?.last_sent_at ?? null,
        pending_count: pendingCount + 1,
      });

    return { ok: true, queued: true };
  }

  const batchedCount = Math.max(1, pendingCount + 1);
  const copy = getSafePushCopy(normalizedType, batchedCount);

  const { data: subscriptions, error: subErr } = await service
    .from("push_subscriptions")
    .select("id, endpoint, subscription")
    .eq("user_id", params.userId);

  if (subErr) return { ok: false, error: "Could not load subscriptions" };
  if (!subscriptions || subscriptions.length === 0) {
    await service
      .from("push_delivery_state")
      .upsert({ user_id: params.userId, last_sent_at: new Date().toISOString(), pending_count: 0 });
    return { ok: true, delivered: 0 };
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const pushPayload = JSON.stringify({
    title: copy.title,
    body: copy.body,
    icon: "/favicon-192x192.png",
    badge: "/favicon-96x96.png",
    url: safeUrl,
    type: normalizedType,
    caseId: params.caseId,
    messageId: params.messageId,
  });

  let delivered = 0;
  let deleted = 0;

  for (const row of subscriptions as Array<{ id: string; endpoint: string; subscription: Record<string, unknown> }>) {
    try {
      await webpush.sendNotification(row.subscription as any, pushPayload);
      delivered += 1;
    } catch (err: any) {
      const statusCode = Number(err?.statusCode || err?.status || 0);
      if (statusCode === 404 || statusCode === 410) {
        deleted += 1;
        await service.from("push_subscriptions").delete().eq("id", row.id);
      }
      console.error("Push send failed", {
        statusCode,
        endpoint: maskEndpoint(row.endpoint),
      });
    }
  }

  await service
    .from("push_delivery_state")
    .upsert({ user_id: params.userId, last_sent_at: new Date().toISOString(), pending_count: 0 });

  return {
    ok: true,
    delivered,
    deleted,
    batchedCount,
  };
}