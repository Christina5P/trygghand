import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore – Supabase-js via esm för Deno
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

function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Remove common formatting characters
  const cleaned = trimmed.replace(/[\s\-()\.]/g, "");
  if (!cleaned) return null;

  // 00-prefix to +
  if (cleaned.startsWith("00")) return `+${cleaned.slice(2)}`;
  // Already E.164-ish
  if (cleaned.startsWith("+")) return cleaned;
  // Sweden fallback: 07... -> +46 7...
  if (cleaned.startsWith("0")) return `+46${cleaned.slice(1)}`;
  // 46... -> +46...
  if (cleaned.startsWith("46")) return `+${cleaned}`;

  // Unknown country: keep as-is (but without spaces/hyphens)
  return cleaned;
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

function generatePassword(length = 14) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function sendBrevoEmail(opts: {
  brevoApiKey?: string;
  emailFrom: string;
  emailFromName: string;
  appLoginUrl: string;
  toEmail: string;
  password: string;
  name?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  if (!opts.brevoApiKey) return { ok: false, reason: "BREVO_API_KEY saknas" };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": opts.brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: opts.emailFrom, name: opts.emailFromName },
        to: [{ email: opts.toEmail, name: opts.name || "" }],
        subject: "Ditt konto hos Trygg Hand",
        textContent: `Hej ${opts.name || ""}\n\nDu har blivit inlagd som kund hos Trygg Hand.\n\nE-post: ${opts.toEmail}\nLösenord: ${opts.password}\n\nLogga in här: ${opts.appLoginUrl}\n\nByt gärna lösenord efter första inloggningen.\n\nVänliga hälsningar\nTrygg Hand`,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      return { ok: false, reason: `Brevo svarade ${response.status}: ${bodyText.slice(0, 300)}` };
    }

    return { ok: true };
  } catch (err: any) {
    return { ok: false, reason: err?.message || "Okänt fel vid mejlutskick" };
  }
}

serve(async (req: Request): Promise<Response> => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const brevoApiKey = Deno.env.get("BREVO_API_KEY"); // valfri
  const appLoginUrl =
    Deno.env.get("APP_LOGIN_URL") || "https://app.trygghand.se/login";

  const emailFrom =
    Deno.env.get("BREVO_SENDER_EMAIL") || "kontakt@trygghand.com";
  const emailFromName =
    Deno.env.get("BREVO_SENDER_NAME") || "Trygg Hand";

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(req, 500, { error: "Server configuration missing" });
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders(req) });
  }

  if (req.method !== "POST") {
    return json(req, 405, { error: "Method not allowed" });
  }

  // Verify caller identity + admin role
  const authHeader = req.headers.get("authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return json(req, 401, { error: "Unauthorized" });

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ok = await requireAdmin(supabase, user.id);
  if (!ok) return json(req, 403, { error: "Forbidden" });

  try {
    const { email, fullName, phone } = await req.json();

    const safeEmail = typeof email === "string" ? email.trim() : "";
    const safeName = typeof fullName === "string" ? fullName.trim() : "";
    const safePhone = normalizePhone(phone);

    if (!safeName) {
      return json(req, 400, { error: "name is required" });
    }

    /**
     * 1️⃣ Kolla först om kunden redan finns (via email) INNAN vi skapar en auth-user.
     *    customers.email har en unique-not-null constraint, så vi vill aldrig hinna
     *    skapa en auth-user och sedan misslyckas på upsert-konflikten.
     */
    if (safeEmail) {
      const { data: existingCustomerRow, error: existingCustomerErr } = await supabase
        .from("customers")
        .select("id, email")
        .ilike("email", safeEmail)
        .maybeSingle();

      if (existingCustomerErr) {
        console.error("invite-customer: lookup existing customer failed", {
          code: (existingCustomerErr as any)?.code,
          message: (existingCustomerErr as any)?.message,
        });
        return json(req, 500, { error: "Internal server error" });
      }

      if (existingCustomerRow?.id) {
        // 2️⃣ Kunden finns redan. Verifiera att den kopplade auth-usern verkligen finns
        //    innan vi säger att allt är klart – annars kan customers.id peka på en
        //    raderad/obefintlig auth-user.
        const { data: existingAuthUser, error: getAuthErr } = await supabase.auth.admin.getUserById(
          String(existingCustomerRow.id),
        );

        if (!getAuthErr && existingAuthUser?.user?.id) {
          return json(req, 200, {
            ok: true,
            invited: false,
            password_sent: false,
            customer_id: String(existingCustomerRow.id),
            message: "Kund finns redan för denna e-postadress.",
          });
        }

        // 3️⃣ customers-raden finns men saknar en matchande auth.users-rad.
        //    Vi kan inte skapa en ny auth-user med samma id (Supabase Admin API tillåter
        //    inte att man väljer id), och att skriva om customers.id här skulle kräva att
        //    varje FK (cases, valuations, push_subscriptions, ...) uppdateras samtidigt.
        //    Det är en admin-åtgärd, inte något den här funktionen ska göra automatiskt.
        console.error("invite-customer: customer exists without matching auth user", {
          customer_id: existingCustomerRow.id,
          email: safeEmail,
        });
        return json(req, 409, {
          ok: false,
          error: "customer_without_auth_user",
          customer_id: String(existingCustomerRow.id),
          message:
            "Kunden finns redan i customers men saknar en matchande Auth-användare. Kräver manuell admin-åtgärd innan inbjudan kan skickas.",
        });
      }

      // 4️⃣ Ingen customer-rad för denna e-post -> skapa ny auth-user med genererat lösenord.
      let userId: string | null = null;
      let passwordForBrevo: string | null = null;
      let authUserCreated = false;

      const password = generatePassword();
      const { data: createdUser, error: createUserErr } = await supabase.auth.admin.createUser({
        email: safeEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: safeName },
      });

      if (!createUserErr && createdUser?.user?.id) {
        userId = createdUser.user.id;
        passwordForBrevo = password;
        authUserCreated = true;
      } else {
        // Auth-user finns redan för denna e-post (men saknade en customers-rad) -> koppla ihop, skapa inte en ny.
        const existingUserId = await findAuthUserIdByEmail(supabase, safeEmail);
        if (!existingUserId) {
          return json(req, 400, { error: createUserErr?.message || "User creation failed" });
        }
        userId = existingUserId;
      }

      const { error: customerError } = await supabase
        .from("customers")
        .upsert(
          [
            {
              id: userId,
              email: safeEmail,
              name: safeName,
              phone: safePhone,
              is_customer: true,
              is_admin: false,
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: "id" },
        );

      if (customerError) {
        console.error("invite-customer: customer upsert error", {
          code: (customerError as any)?.code,
          message: (customerError as any)?.message,
        });
        throw customerError;
      }

      // 5️⃣ Brevo ska bara skickas när vi faktiskt skapade en ny auth-user + nytt lösenord.
      let emailSent = false;
      let emailError: string | null = null;
      if (authUserCreated && passwordForBrevo) {
        const brevoResult = await sendBrevoEmail({
          brevoApiKey,
          emailFrom,
          emailFromName,
          appLoginUrl,
          toEmail: safeEmail,
          password: passwordForBrevo,
          name: safeName,
        });
        emailSent = brevoResult.ok;
        emailError = brevoResult.ok ? null : brevoResult.reason ?? "Okänt fel vid mejlutskick";
        if (!brevoResult.ok) {
          console.error("invite-customer: Brevo email failed", { reason: brevoResult.reason });
        }
      }

      // 6️⃣+7️⃣ Kunden skapas oavsett, men vi rapporterar tydligt om mejlet inte gick fram.
      return json(req, 200, {
        ok: true,
        invited: authUserCreated,
        password_sent: emailSent,
        email_error: emailError,
        message: !authUserCreated
          ? "Kund kopplad till befintligt konto."
          : emailSent
            ? "Kund skapad. Lösenord skickat via e-post."
            : "Kund skapad, men lösenordsmejlet kunde inte skickas.",
      });
    }

    // No email -> if phone exists, create phone-auth user so customer can log in via SMS OTP.
    if (safePhone && typeof safePhone === "string" && safePhone.trim().length > 0) {
      const phoneE164 = safePhone.trim();

      // Create (or find) auth user by phone
      let authUserId: string | null = null;
      const { data: createdUser, error: createUserErr } = await supabase.auth.admin.createUser({
        phone: phoneE164,
        phone_confirm: false,
        user_metadata: { full_name: safeName },
      });

      if (!createUserErr && createdUser?.user?.id) {
        authUserId = createdUser.user.id;
      } else {
        // Most common: phone already exists. Try to locate existing user id.
        try {
          authUserId = await findAuthUserIdByPhone(supabase, phoneE164);
        } catch {
          // ignore
        }

        if (!authUserId) {
          return json(req, 409, { error: "Phone already in use or user creation failed" });
        }
      }

      const nowIso = new Date().toISOString();
      const { error: customerErr } = await supabase
        .from("customers")
        .upsert(
          [
            {
              id: authUserId,
              email: null,
              name: safeName,
              phone: phoneE164,
              is_customer: true,
              is_admin: false,
              updated_at: nowIso,
            },
          ],
          { onConflict: "id" },
        );

      if (customerErr) {
        console.error("invite-customer: customer upsert (phone) error", {
          code: (customerErr as any)?.code,
          message: (customerErr as any)?.message,
        });
        return json(req, 500, { error: "Internal server error" });
      }

      return json(req, 200, {
        ok: true,
        invited: false,
        auth_created: true,
        customer_id: authUserId,
        message: "Kund skapad utan e-post. Inloggning sker via SMS-kod.",
      });
    }

    // No email + no phone -> create customer only (no invite/login possible)
    const nowIso = new Date().toISOString();
    let ins = await supabase
      .from("customers")
      .insert({
        email: null,
        name: safeName,
        phone: safePhone,
        is_customer: true,
        is_admin: false,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .select("id")
      .single();

    if (ins.error) {
      const fallbackId = crypto.randomUUID();
      ins = await supabase
        .from("customers")
        .insert({
          id: fallbackId,
          email: null,
          name: safeName,
          phone: safePhone,
          is_customer: true,
          is_admin: false,
          created_at: nowIso,
          updated_at: nowIso,
        })
        .select("id")
        .single();
    }

    if (ins.error) {
      console.error("invite-customer: customer insert (no email) failed", {
        code: (ins.error as any)?.code,
        message: (ins.error as any)?.message,
      });
      return json(req, 500, { error: "Internal server error" });
    }

    return json(req, 200, {
      ok: true,
      invited: false,
      customer_id: (ins.data as any)?.id ?? null,
      message: "Kund skapad utan e-post. Ingen inbjudan skickades.",
    });
  } catch (err: any) {
    console.error("invite-customer error:", err);
    return json(req, 500, { error: err.message || "Server error" });
  }
});
