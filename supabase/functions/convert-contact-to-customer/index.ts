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

function generatePassword(length = 14) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
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
    const match = users.find((u) => typeof u?.email === "string" && u.email.toLowerCase() === target);
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
    const match = users.find((u) => typeof u?.phone === "string" && u.phone === target);
    if (match?.id) return String(match.id);
    if (users.length < perPage) break;
  }

  return null;
}

type EmailResult = { sent: boolean; error?: string; skipped?: boolean };

async function sendBrevoEmail(opts: {
  brevoApiKey?: string;
  emailFrom: string;
  emailFromName: string;
  appLoginUrl: string;
  toEmail: string;
  password: string;
  name?: string;
}): Promise<EmailResult> {
  if (!opts.brevoApiKey) {
    return { sent: false, skipped: true };
  }

  try {
    const subject = "Ditt konto hos Trygghand";
    const body = `Hej ${opts.name || ""}\n\nDitt konto har skapats hos Trygghand.\n\nE-post: ${opts.toEmail}\nLösenord: ${opts.password}\n\nLogga in här: ${opts.appLoginUrl}\n\nByt lösenord efter första inloggningen.\n\nHälsningar,\nTrygghand`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": opts.brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: opts.emailFrom, name: opts.emailFromName },
        to: [{ email: opts.toEmail, name: opts.name || "" }],
        subject,
        textContent: body,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      return { sent: false, error: String(resp.status) };
    }

    return { sent: true };
  } catch {
    return { sent: false, error: "network" };
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, 405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  const appLoginUrl = Deno.env.get("APP_LOGIN_URL") || "";
  const emailFrom = Deno.env.get("BREVO_SENDER_EMAIL") || "kontakt@trygghand.com";
  const emailFromName = Deno.env.get("BREVO_SENDER_NAME") || "Trygghand";

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(req, 500, { error: "Server configuration missing" });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json(req, 400, { error: "Invalid JSON" });
  }

  const contactRequestId = payload?.contact_request_id;
  const confirm = payload?.confirm === true;

  if (!confirm) return json(req, 400, { error: "Missing confirm" });
  if (!isUuid(contactRequestId)) return json(req, 400, { error: "Invalid contact_request_id" });

  // 1) Verify caller identity via JWT
  const authHeader = req.headers.get("authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return json(req, 401, { error: "Unauthorized" });

  // 2) Admin role check + server-side conversion
  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ok = await requireAdmin(service, user.id);
  if (!ok) return json(req, 403, { error: "Forbidden" });

  const { data: contact, error: contactErr } = await service
    .from("contact_requests")
    .select("id, name, firstname, lastname, email, phone, status")
    .eq("id", contactRequestId)
    .maybeSingle();

  if (contactErr) {
    console.error("convert-contact-to-customer: contact fetch failed", {
      code: (contactErr as any)?.code,
      message: (contactErr as any)?.message,
    });
    return json(req, 500, { error: "Internal server error" });
  }
  if (!contact) return json(req, 404, { error: "Not found" });

  const fullName =
    (contact as any).name ||
    `${(contact as any).firstname || ""} ${(contact as any).lastname || ""}`.trim();
  const phone = normalizePhone((contact as any).phone);
  const email = ((contact as any).email || "").trim() || null;

  if (!fullName) return json(req, 409, { error: "Contact request missing name" });
  // Phone is required only when email is missing (SMS OTP login).
  if (!email && !phone) return json(req, 409, { error: "Contact request missing phone" });
  // NOTE: email is optional.

  // 3) If customer already exists for this email, just link & mark converted.
  let createdCustomerId: string | null = null;
  if (email) {
    const { data: existingCustomer, error: existingErr } = await service
      .from("customers")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (existingErr) {
      // Ignore lookup errors; we'll attempt creation path.
      console.error("convert-contact-to-customer: existing customer lookup failed", {
        code: (existingErr as any)?.code,
        message: (existingErr as any)?.message,
      });
    } else if ((existingCustomer as any)?.id) {
      createdCustomerId = String((existingCustomer as any).id);
    }
  }

  let passwordForBrevo: string | null = null;
  let authCreatedViaPhone = false;

  if (!createdCustomerId) {
    // If we don't have an email, create/link a phone-auth user so customer can log in via SMS OTP.
    if (!email) {
      let authUserId: string | null = null;

      const { data: createdUser, error: createUserErr } = await service.auth.admin.createUser({
        phone: phone!,
        phone_confirm: false,
        user_metadata: { full_name: fullName },
      });

      if (!createUserErr && createdUser?.user?.id) {
        authUserId = createdUser.user.id;
        authCreatedViaPhone = true;
      } else {
        // Most common: phone already exists. Locate the user id and reuse it.
        try {
          authUserId = await findAuthUserIdByPhone(service, phone!);
        } catch {
          // ignore
        }

        if (!authUserId) {
          console.error("convert-contact-to-customer: phone auth user create failed", {
            code: (createUserErr as any)?.code,
            message: (createUserErr as any)?.message,
          });
          return json(req, 409, { error: "Phone already in use or user creation failed" });
        }
      }

      const nowIso = new Date().toISOString();
      const { error: customerErr } = await service
        .from("customers")
        .upsert(
          [
            {
              id: authUserId,
              email: null,
              name: fullName,
              phone,
              is_admin: false,
              is_customer: true,
              updated_at: nowIso,
            },
          ],
          { onConflict: "id" },
        );

      if (customerErr) {
        console.error("convert-contact-to-customer: customer upsert (phone) failed", {
          code: (customerErr as any)?.code,
          message: (customerErr as any)?.message,
        });
        return json(req, 500, { error: "Internal server error" });
      }

      createdCustomerId = authUserId;
    } else {
    // Create auth user + customer (customers.id == auth.users.id)
    const password = generatePassword();
    passwordForBrevo = password;

    const { data: createdUser, error: createUserErr } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, phone: phone ?? null },
    });

    if (createUserErr || !createdUser?.user?.id) {
      console.error("convert-contact-to-customer: auth user create failed", {
        code: (createUserErr as any)?.code,
        message: (createUserErr as any)?.message,
      });
      // Most common: user already exists. Try to locate the customer by email again (it might have been created earlier).
      const { data: existingCustomer, error: existingErr } = await service
        .from("customers")
        .select("id")
        .ilike("email", email)
        .maybeSingle();

      if (!existingErr && (existingCustomer as any)?.id) {
        createdCustomerId = String((existingCustomer as any).id);
        passwordForBrevo = null;
      } else {
        // If the auth user exists but the customers row doesn't, try to find the auth user id and upsert the customer.
        try {
          const userId = await findAuthUserIdByEmail(service, email);
          if (userId) {
            const nowIso = new Date().toISOString();
            const { data: customerRow, error: customerErr } = await service
              .from("customers")
              .upsert(
                [
                  {
                    id: userId,
                    email,
                    name: fullName,
                    phone,
                    is_admin: false,
                    is_customer: true,
                    updated_at: nowIso,
                  },
                ],
                { onConflict: "id" },
              )
              .select("id")
              .single();

            if (!customerErr) {
              createdCustomerId = (customerRow as any)?.id ?? null;
              passwordForBrevo = null;
            } else {
              console.error("convert-contact-to-customer: customer upsert after email lookup failed", {
                code: (customerErr as any)?.code,
                message: (customerErr as any)?.message,
              });
            }
          }
        } catch {
          // ignore
        }

        if (!createdCustomerId) {
          return json(req, 409, { error: "Email already in use or user creation failed" });
        }
      }
    } else {
      const userId = createdUser.user.id;
      const nowIso = new Date().toISOString();
      const { data: customerRow, error: customerErr } = await service
        .from("customers")
        .upsert(
          [
            {
              id: userId,
              email,
              name: fullName,
              phone,
              is_admin: false,
              is_customer: true,
              updated_at: nowIso,
            },
          ],
          { onConflict: "id" },
        )
        .select("id")
        .single();

      if (customerErr) {
        console.error("convert-contact-to-customer: customer upsert failed", {
          code: (customerErr as any)?.code,
          message: (customerErr as any)?.message,
        });
        // Best-effort cleanup: remove auth user if customer creation failed.
        try {
          await service.auth.admin.deleteUser(userId);
        } catch {
          // ignore
        }
        return json(req, 500, { error: "Internal server error" });
      }

      createdCustomerId = (customerRow as any)?.id ?? null;

      // Send Brevo mail best-effort; no PII in logs.
      if (createdCustomerId) {
        await sendBrevoEmail({
          brevoApiKey,
          emailFrom,
          emailFromName,
          appLoginUrl: appLoginUrl || "",
          toEmail: email,
          password,
          name: fullName,
        });
      }
    }
    }
  }

  if (!createdCustomerId) return json(req, 500, { error: "Internal server error" });

  // 4) Mark contact request as converted (no hard delete)
  // 4) Mark contact request as converted (schema may vary)
  let updContactErr = (await service
    .from("contact_requests")
    .update({ status: "converted", customer_id: createdCustomerId })
    .eq("id", contactRequestId)).error;

  if (updContactErr) {
    const msg = String((updContactErr as any)?.message || "").toLowerCase();
    // Older schema: no customer_id
    if (msg.includes("customer_id") || msg.includes("column")) {
      updContactErr = (await service
        .from("contact_requests")
        .update({ status: "converted" })
        .eq("id", contactRequestId)).error;
    }
  }

  if (updContactErr) {
    console.error("convert-contact-to-customer: contact update failed", {
      code: (updContactErr as any)?.code,
      message: (updContactErr as any)?.message,
    });
    return json(req, 500, { error: "Internal server error" });
  }

  // 5) Audit log (no PII)
  // 5) Audit log best-effort (avoid blocking conversion if audit table is missing)
  {
    const { error: auditErr } = await service.from("admin_audit_log").insert({
      admin_id: user.id,
      action: "convert",
      target_table: "contact_requests",
      target_id: contactRequestId,
    });
    if (auditErr) {
      console.error("convert-contact-to-customer: audit insert failed", {
        code: (auditErr as any)?.code,
        message: (auditErr as any)?.message,
      });
    }
  }

  return json(req, 200, {
    ok: true,
    customer_id: createdCustomerId,
    // If email existed and we created a new auth user, we may have sent a password via Brevo.
    password_sent: !!passwordForBrevo,
    auth_created: (!!email && !!passwordForBrevo) || authCreatedViaPhone,
  });
});
