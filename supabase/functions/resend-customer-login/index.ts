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

function generatePassword(length = 14) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
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
        subject: "Nya inloggningsuppgifter till Trygg Hand",
        textContent: `Hej ${opts.name || ""}\n\nDu har fått nya inloggningsuppgifter till Trygg Hand.\n\nE-post: ${opts.toEmail}\nNytt tillfälligt lösenord: ${opts.password}\n\nLogga in här: ${opts.appLoginUrl}\n\nNär du har loggat in väljer du Inställningar → Byt lösenord.\n\nVänliga hälsningar\nTrygg Hand`,
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
  const appLoginUrl = Deno.env.get("APP_LOGIN_URL") || "https://app.trygghand.se/login";

  const emailFrom = Deno.env.get("BREVO_SENDER_EMAIL") || "kontakt@trygghand.com";
  const emailFromName = Deno.env.get("BREVO_SENDER_NAME") || "Trygg Hand";

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
  const callingUser = userData?.user;
  if (userErr || !callingUser) return json(req, 401, { error: "Unauthorized" });

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ok = await requireAdmin(supabase, callingUser.id);
  if (!ok) return json(req, 403, { error: "Forbidden" });

  try {
    const { customerId, email } = await req.json();

    const safeCustomerId = typeof customerId === "string" ? customerId.trim() : "";
    const safeEmail = typeof email === "string" ? email.trim() : "";

    if (!safeCustomerId && !safeEmail) {
      return json(req, 400, { error: "customerId or email is required" });
    }

    // 1️⃣+2️⃣ Hitta befintlig customer via id eller e-post.
    const customerQuery = safeCustomerId
      ? supabase.from("customers").select("id, email, name").eq("id", safeCustomerId).maybeSingle()
      : supabase.from("customers").select("id, email, name").ilike("email", safeEmail).maybeSingle();

    const { data: customerRow, error: customerErr } = await customerQuery;

    if (customerErr) {
      console.error("resend-customer-login: customer lookup failed", {
        code: (customerErr as any)?.code,
        message: (customerErr as any)?.message,
      });
      return json(req, 500, { error: "Internal server error" });
    }

    if (!customerRow?.id) {
      return json(req, 404, { error: "customer_not_found", message: "Ingen kund hittades." });
    }

    if (!customerRow.email) {
      return json(req, 400, {
        error: "customer_missing_email",
        message: "Kunden saknar e-postadress och kan inte få nya inloggningsuppgifter via e-post.",
      });
    }

    // 3️⃣ Hitta motsvarande auth user. Skapar aldrig en ny – customer.id ändras aldrig.
    const { data: existingAuthUser, error: getAuthErr } = await supabase.auth.admin.getUserById(
      String(customerRow.id),
    );

    if (getAuthErr || !existingAuthUser?.user?.id) {
      console.error("resend-customer-login: auth user missing for customer", {
        customer_id: customerRow.id,
      });
      return json(req, 409, {
        error: "auth_user_missing",
        customer_id: String(customerRow.id),
        message:
          "Kunden finns men saknar en matchande Auth-användare. Kräver manuell admin-åtgärd (samma scenario som invite-customer kan rapportera).",
      });
    }

    // 4️⃣ Generera nytt lösenord.
    const newPassword = generatePassword();

    // 5️⃣+6️⃣ Uppdatera samma auth-user (samma id) med nytt lösenord.
    const { error: updateErr } = await supabase.auth.admin.updateUserById(String(customerRow.id), {
      password: newPassword,
    });

    if (updateErr) {
      console.error("resend-customer-login: failed to update auth user password", {
        customer_id: customerRow.id,
        message: (updateErr as any)?.message,
      });
      return json(req, 500, { error: "Internal server error" });
    }

    // 7️⃣+8️⃣ Skicka nya inloggningsuppgifter via Brevo.
    const brevoResult = await sendBrevoEmail({
      brevoApiKey,
      emailFrom,
      emailFromName,
      appLoginUrl,
      toEmail: customerRow.email,
      password: newPassword,
      name: customerRow.name,
    });

    // 9️⃣+🔟 Kontrollera Brevos svar, logga och rapportera tydligt vid fel.
    // Lösenordet är redan uppdaterat oavsett – vi rullar inte tillbaka det om mejlet misslyckas.
    if (!brevoResult.ok) {
      console.error("resend-customer-login: Brevo email failed", {
        customer_id: customerRow.id,
        reason: brevoResult.reason,
      });
    }

    return json(req, 200, {
      ok: true,
      customer_id: String(customerRow.id),
      password_sent: brevoResult.ok,
      email_error: brevoResult.ok ? null : brevoResult.reason ?? "Okänt fel vid mejlutskick",
      message: brevoResult.ok
        ? "Nya inloggningsuppgifter skickade."
        : "Nytt lösenord sattes, men mejlet kunde inte skickas.",
    });
  } catch (err: any) {
    console.error("resend-customer-login error:", err);
    return json(req, 500, { error: err.message || "Server error" });
  }
});
