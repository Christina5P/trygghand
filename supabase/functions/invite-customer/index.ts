// @ts-ignore – Supabase-js via esm för Deno
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

declare const Deno: { env: { get: (key: string) => string | undefined } };

export default async function handler(req: Request): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const brevoApiKey = Deno.env.get("BREVO_API_KEY"); // valfri
  const appLoginUrl =
    Deno.env.get("APP_LOGIN_URL") || "https://app.trygghand.se/login";

  const emailFrom =
    Deno.env.get("BREVO_SENDER_EMAIL") || "kontakt@trygghand.com";
  const emailFromName =
    Deno.env.get("BREVO_SENDER_NAME") || "Trygg Hand";

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration missing" }),
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { email, fullName, phone } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "email is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    /**
     * 1️⃣ Bjud in användaren via Supabase (INGET lösenord)
     */
    const { data: inviteData, error: inviteError } =
      await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: appLoginUrl,
      });

    if (inviteError) {
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    const userId = inviteData.user?.id;
    if (!userId) {
      throw new Error("No user id returned from Supabase invite");
    }

    /**
     * 2️⃣ Upsert kundprofil (ofarligt, korrekt)
     */
    const { error: customerError } = await supabase
      .from("customers")
      .upsert(
        [
          {
            id: userId,
            email,
            name: fullName ?? email.split("@")[0],
            phone: phone ?? null,
            is_customer: true,
            is_admin: false,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "id" }
      );

    if (customerError) {
      console.error("Customer upsert error:", customerError);
      throw customerError;
    }

    /**
     * 3️⃣ (Valfritt) Skicka mjukt välkomstmail via Brevo
     * – INGEN hemlig info
     */
    if (brevoApiKey) {
      await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { email: emailFrom, name: emailFromName },
          to: [{ email, name: fullName || "" }],
          subject: "Välkommen till Trygg Hand",
          textContent: `
Hej ${fullName || ""}

Du har nu blivit inlagd som kund hos Trygg Hand.

För att komma igång:
• Öppna mailet du fått från oss
• Klicka på länken och skapa ditt lösenord
• Logga in i tjänsten

Har du frågor eller behöver stöd är du alltid välkommen att kontakta oss.

Vänliga hälsningar
Trygg Hand
Från beslut till nytt kapitel
          `,
        }),
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message:
          "Inbjudan skickad. Användaren sätter själv sitt lösenord via Supabase.",
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("invite-customer error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Server error" }),
      { status: 500, headers: corsHeaders }
    );
  }
}
