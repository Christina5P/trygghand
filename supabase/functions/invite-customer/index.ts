// @ts-ignore - Remote Deno std import resolved at deploy/runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore - Remote supabase-js for Deno resolved at deploy/runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import "https://deno.land/std@0.177.0/dotenv/load.ts";

// Minimal Deno typing to satisfy workspace TypeScript checks
declare const Deno: { env: { get: (key: string) => string | undefined } };

// This function must run with the Service Role key (set as env SUPABASE_SERVICE_ROLE_KEY)
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const brevoApiKey = Deno.env.get("BREVO_API_KEY");
const appLoginUrl = Deno.env.get("APP_LOGIN_URL") || "https://app.trygghand.se/login";
const emailFrom = Deno.env.get("BREVO_SENDER_EMAIL") || "kontakt@trygghand.com";
const emailFromName = Deno.env.get("BREVO_SENDER_NAME") || "Trygghand";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

function generatePassword(length = 14) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789!@#$%";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function sendBrevoEmail(to: string, password: string, name?: string) {
  if (!brevoApiKey) {
    console.warn("BREVO_API_KEY missing; skipping email send");
    return { skipped: true };
  }

  try {
    const subject = "Ditt konto hos Trygghand";
    const body = `Hej ${name || ""}\n\nDitt konto har skapats hos Trygghand.\n\nE-post: ${to}\nLösenord: ${password}\n\nLogga in här: ${appLoginUrl}\n\nByt lösenord efter första inloggningen.\n\nHälsningar,\nTrygghand`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: emailFrom, name: emailFromName },
        to: [{ email: to, name: name || "" }],
        subject,
        textContent: body,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!resp.ok) {
      let errorText = "Unknown error";
      try {
        errorText = (await Promise.race([
          resp.text(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Text read timeout")), 2000))
        ])) as string;
      } catch (e) {
        errorText = "Could not read error response";
      }
      console.warn(`Brevo returned ${resp.status}: ${errorText}`);
      return { sent: false, error: `${resp.status}` };
    }

    console.log("Brevo email sent successfully");
    return { sent: true };
  } catch (err: any) {
    console.error("sendBrevoEmail exception:", err.message || err);
    return { sent: false, error: err.message || "Network error" };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing server configuration" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const { email, fullName, phone } = await req.json();
    console.log(`Processing invite for: ${email}`);

    if (!email) {
      return new Response(JSON.stringify({ error: "email required" }), { status: 400, headers: corsHeaders });
    }
    
    // 1) Försök hämta befintlig user först
    console.log("Step 1: Checking if user already exists");
    let userId: string | undefined;
    let authData;
    
    // Lista alla users för att hitta e-posten
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    const existingUser = existingUsers?.users?.find((u: any) => u.email === email);
    
    // ALLTID generera nytt lösenord för invite-customer (admin vill skicka ny inbjudan)
    const password = generatePassword();
    
    if (existingUser) {
      console.log(`Step 1: User already exists with ID: ${existingUser.id}, updating password`);
      userId = existingUser.id;
      
      // Uppdatera lösenord för befintlig användare
      const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        { password, email_confirm: true }
      );
      
      if (updateError) {
        console.error("updateUserById failed", updateError);
        return new Response(JSON.stringify({ error: updateError.message }), { status: 400, headers: corsHeaders });
      }
      
      authData = { user: updateData.user };
    } else {
      // 2) Skapa ny auth user med genererat lösenord
      console.log("Step 1: Creating new auth user");
      const { data: newAuthData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName ?? "", phone: phone ?? "" },
      });

      if (authError) {
        console.error("createUser failed", authError);
        return new Response(JSON.stringify({ error: authError.message }), { status: 400, headers: corsHeaders });
      }

      userId = newAuthData.user?.id;
      authData = newAuthData;
    }

    if (!userId) throw new Error("No user id from auth");
    console.log(`Step 1: Auth user ready with ID: ${userId}`);

    // 2) Upsert customer (avoid duplicates)
    console.log("Step 2: Upserting customer");
    const { error: customerError } = await supabase.from("customers").upsert(
      [
        {
          id: userId,
          email,
          name: fullName ?? email.split("@")[0],
          phone: phone ?? null,
          is_admin: false,
          is_customer: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      { onConflict: "id" }
    );

    // Ignore duplicate key errors (email already exists on this id/email)
    if (customerError && !customerError.message?.includes("duplicate")) {
      console.error("customers insert failed", customerError);
      throw customerError;
    }
    console.log("Step 2: Customer upserted successfully");

    // 3) Send welcome email with password via Brevo
    console.log("Step 3: Sending email via Brevo");
    const emailResult = await sendBrevoEmail(email, password, fullName ?? undefined);
    console.log(`Step 3: Email result: ${JSON.stringify(emailResult)}`);
    
    const response = {
      ok: true,
      message: emailResult.sent
        ? "Kund skapad och mail med lösenord skickat."
        : "Kund skapad, men mail kunde inte skickas. Kontrollera Brevo-konfiguration.",
    };
    
    console.log(`Returning success response: ${JSON.stringify(response)}`);
    return new Response(JSON.stringify(response), { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error("invite-customer error", err);
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
