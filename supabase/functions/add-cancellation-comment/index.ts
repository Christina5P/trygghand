import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Remote supabase-js for Deno resolved at deploy/runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

declare const Deno: { env: { get: (key: string) => string | undefined } };

const defaultCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function corsHeadersFor(req: Request, extra?: Record<string, string>): Record<string, string> {
  const origin = req.headers.get("Origin");
  return {
    ...defaultCorsHeaders,
    ...(origin ? { "Access-Control-Allow-Origin": origin } : null),
    "Vary": "Origin, Access-Control-Request-Headers, Access-Control-Request-Method",
    ...(extra ?? {}),
  };
}

function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), "Content-Type": "application/json" },
  });
}

type JsonObject = Record<string, unknown>;

function isRecord(v: unknown): v is JsonObject {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

type PostgrestResult<T> = { data: T; error: unknown };

// In supabase-js v2, the query builder is "thenable", so `await builder` yields `{ data, error }`.
type SupabaseQueryLike<T = unknown> = PromiseLike<PostgrestResult<T>> & {
  select: (columns: string) => SupabaseQueryLike<T>;
  eq: (column: string, value: unknown) => SupabaseQueryLike<T>;
  maybeSingle: () => Promise<PostgrestResult<T>>;
  insert: (values: Record<string, unknown>) => Promise<{ error: unknown }>;
};

type SupabaseClientLike = {
  from: (table: string) => SupabaseQueryLike;
  auth: {
    getUser: () => Promise<{ data: unknown; error: unknown }>;
  };
};

function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const cleaned = trimmed.replace(/[\s\-()\.]/g, "");
  if (!cleaned) return null;

  if (cleaned.startsWith("00")) return `+${cleaned.slice(2)}`;
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return `+46${cleaned.slice(1)}`;
  if (cleaned.startsWith("46")) return `+${cleaned}`;
  return cleaned;
}

async function findAuthUserIdByEmail(service: any, email: string): Promise<string | null> {
  const target = email.trim().toLowerCase();
  if (!target) return null;

  const perPage = 1000;
  for (let page = 1; page <= 25; page++) {
    const { data: listData, error: listErr } = await service.auth.admin.listUsers({ page, perPage });
    if (listErr) break;
    const users = Array.isArray((listData as any)?.users) ? ((listData as any).users as any[]) : [];
    const match = users.find((entry) => typeof entry?.email === "string" && entry.email.toLowerCase() === target);
    if (match?.id) return String(match.id);
    if (users.length < perPage) break;
  }

  return null;
}

async function findAuthUserIdByPhone(service: any, phoneE164: string): Promise<string | null> {
  const target = phoneE164.trim();
  if (!target) return null;

  const perPage = 1000;
  for (let page = 1; page <= 25; page++) {
    const { data: listData, error: listErr } = await service.auth.admin.listUsers({ page, perPage });
    if (listErr) break;
    const users = Array.isArray((listData as any)?.users) ? ((listData as any).users as any[]) : [];
    const match = users.find((entry) => typeof entry?.phone === "string" && entry.phone === target);
    if (match?.id) return String(match.id);
    if (users.length < perPage) break;
  }

  return null;
}

async function resolveCustomerAuthUserId(service: any, customerId: string): Promise<string | null> {
  const { data: customerRow, error } = await service
    .from("customers")
    .select("user_id, email, phone")
    .eq("id", customerId)
    .maybeSingle();

  if (error || !customerRow) return null;

  const directUserId = typeof (customerRow as any).user_id === "string" ? String((customerRow as any).user_id) : null;
  if (directUserId) return directUserId;

  const email = typeof (customerRow as any).email === "string" ? String((customerRow as any).email) : "";
  if (email) {
    const byEmail = await findAuthUserIdByEmail(service, email);
    if (byEmail) return byEmail;
  }

  const phone = normalizePhone((customerRow as any).phone);
  if (phone) {
    const byPhone = await findAuthUserIdByPhone(service, phone);
    if (byPhone) return byPhone;
  }

  return null;
}

async function isAdmin(service: SupabaseClientLike, userId: string): Promise<boolean> {
  const { data: roles, error: rolesErr } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");

  if (!rolesErr && Array.isArray(roles) && roles.length > 0) return true;

  const { data: profile, error: profileErr } = await service
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  const isAdminFlag = isRecord(profile) ? profile.is_admin : undefined;
  if (!profileErr && isAdminFlag === true) return true;
  return false;
}

function isAdminSafe(service: unknown, userId: string): Promise<boolean> {
  return isRecord(service) && typeof service.from === "function" ? isAdmin(service as SupabaseClientLike, userId) : Promise.resolve(false);
}

function getUserId(userData: unknown): string | null {
  if (!isRecord(userData)) return null;
  const user = userData.user;
  if (!isRecord(user)) return null;
  return typeof user.id === "string" ? user.id : null;
}

async function findAdminUserIds(service: SupabaseClientLike): Promise<string[]> {
  const adminIds = new Set<string>();

  const { data: roleRows, error: roleErr } = await (service as any)
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin");
  if (!roleErr && Array.isArray(roleRows)) {
    for (const row of roleRows) {
      if (typeof row?.user_id === "string") adminIds.add(String(row.user_id));
    }
  }

  const { data: isAdminRows, error: isAdminErr } = await (service as any)
    .from("profiles")
    .select("id")
    .eq("is_admin", true);
  if (!isAdminErr && Array.isArray(isAdminRows)) {
    for (const row of isAdminRows) {
      if (typeof row?.id === "string") adminIds.add(String(row.id));
    }
  }

  return Array.from(adminIds);
}

serve(async (req: Request): Promise<Response> => {
  try {
    if (req.method === "OPTIONS") {
      const requestedHeaders = req.headers.get("Access-Control-Request-Headers") ?? defaultCorsHeaders["Access-Control-Allow-Headers"];
      return new Response(null, {
        status: 204,
        headers: corsHeadersFor(req, { "Access-Control-Allow-Headers": requestedHeaders }),
      });
    }
    if (req.method !== "POST") return json(req, 405, { error: "Method not allowed" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) return json(req, 500, { error: "Server configuration missing" });

    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return json(req, 400, { error: "Invalid JSON" });
    }

    if (!isRecord(payload)) return json(req, 400, { error: "Invalid JSON" });

    const cancellationId = payload.cancellation_id;
    const message = typeof payload.message === "string" ? payload.message.trim() : "";

    if (!isUuid(cancellationId)) return json(req, 400, { error: "Invalid cancellation_id" });
    if (!message) return json(req, 400, { error: "Missing message" });
    if (message.length > 2000) return json(req, 400, { error: "Message too long" });

    const authHeader = req.headers.get("authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    }) as unknown as SupabaseClientLike;

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    const userId = getUserId(userData);
    if (userErr || !userId) return json(req, 401, { error: "Unauthorized" });

    const service = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }) as unknown as SupabaseClientLike;

    const admin = await isAdminSafe(service, userId);

    if (!admin) {
      // Customer must own the cancellation.
      // subscription_cancellations.customer_id = customers.id (PK, may be gen_random_uuid).
      // userId = auth.uid(). We must resolve ownership via customers.user_id, not direct id match.
      const { data: row, error: rowErr } = await service
        .from("subscription_cancellations")
        .select("id, customer_id")
        .eq("id", cancellationId)
        .maybeSingle();

      if (rowErr || !row) return json(req, 404, { error: "Not found" });
      const customersRowId = isRecord(row) ? row.customer_id : undefined;
      if (!customersRowId) return json(req, 403, { error: "Forbidden" });

      // Resolve auth.uid() for the customer record
      const customerAuthUid = await resolveCustomerAuthUserId(service, String(customersRowId));

      if (!customerAuthUid || customerAuthUid !== userId) return json(req, 403, { error: "Forbidden" });
    }

    const { error: insErr } = await service.from("cancellation_comments").insert({
      cancellation_id: cancellationId,
      user_id: userId,
      message,
      is_internal: false,
    });

    if (insErr) return json(req, 500, { error: "Internal server error" });

    // Notify admin of new customer message
    if (!admin) {
      try {
        const adminIds = await findAdminUserIds(service as unknown as SupabaseClientLike);
        for (const adminId of adminIds) {
          if (!adminId || adminId === userId) continue;
          await (service as any).from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("user_id", adminId)
            .eq("ref_id", cancellationId)
            .eq("type", "cancellation_message")
            .is("read_at", null);
          await (service as any).from("notifications").insert({
            user_id: adminId,
            type: "cancellation_message",
            ref_id: cancellationId,
            ref_type: "cancellation",
            actor_id: userId,
          });
        }
      } catch (e) {
        console.error("Notification error", e);
      }
    }

    // Do not echo free-text back
    return json(req, 200, { ok: true });
  } catch {
    // Ensure unexpected failures still return CORS headers (otherwise browsers surface it as a CORS error).
    return json(req, 500, { error: "Internal server error" });
  }
});
