// @ts-ignore - Remote supabase-js for Deno resolved at deploy/runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// Minimal Deno typing to satisfy workspace TypeScript checks
declare const Deno: { env: { get: (key: string) => string | undefined } };

export default async function handler(req: Request): Promise<Response> {
  // This function must run with the Service Role key (set as env SUPABASE_SERVICE_ROLE_KEY)
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const brevoApiKey = Deno.env.get("BREVO_API_KEY");
  const appLoginUrl = Deno.env.get("APP_LOGIN_URL") || "https://legendary-bassoon-jjrjrr4gqw7r2p95j-5173.app.github.dev/portal";
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

  type EmailResult = { sent: boolean; error?: any; skipped?: boolean };

  async function sendBrevoEmail(to: string, password: string, name?: string): Promise<EmailResult> {
    if (!brevoApiKey) {
      console.warn("BREVO_API_KEY missing; skipping email send");
      return { sent: false, skipped: true };
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // DELETE fungerar endast om body skickas korrekt och rätt Content-Type används.
  // Kontrollera att du skickar: Content-Type: application/json och body: { "contactId": "<id>" }
  if (req.method === "DELETE") {
    try {
      // Deno kräver await req.json() även för DELETE
      let contactId: string | undefined;
      try {
        const body = await req.json() as any;
        contactId = body.contactId;
      } catch {
        return new Response(JSON.stringify({ error: "Ingen JSON-body eller ogiltig body" }), { status: 400, headers: corsHeaders });
      }
      if (!contactId) {
        return new Response(JSON.stringify({ error: "contactId krävs för radering" }), { status: 400, headers: corsHeaders });
      }
      const { error } = await supabase
        .from("contact_requests")
        .delete()
        .eq("id", contactId);

      if (error) {
        console.error("contact_requests delete failed", error);
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ ok: true, message: "Kontakt raderad" }), { status: 200, headers: corsHeaders });
    } catch (err: any) {
      console.error("contact_requests delete error", err);
      return new Response(JSON.stringify({ error: err.message || "Serverfel vid radering" }), {
        status: 500,
        headers: corsHeaders,
      });
    }
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

    const { contactRequestId, customerData } = await req.json() as any;
    console.log(`Processing convert for contactRequestId: ${contactRequestId}, customerData:`, customerData);

    const { email, fullName, phone } = customerData;
    const contactId = contactRequestId;

    // Tillåt konvertering, kräver minst namn och telefon
    console.log("Creating customer without auth user");
    // Skapa en "kund" utan auth-user (ingen inloggning, bara i customers-tabellen)
    if ((fullName && fullName.trim()) && (phone && phone.trim())) {
      // Skapa en "kund" utan auth-user (ingen inloggning, bara i customers-tabellen)
      const nowIso = new Date().toISOString();
      const customerPayload = {
        // id kommer att genereras av default
        email: email || null,
        name: fullName,
        phone: phone,
        status: 'active', // Use status instead of is_admin/is_customer
        created_at: nowIso,
        updated_at: nowIso,
      };

      const { data: customerRecord, error: customerError } = await supabase
        .from("customers")
        .insert(customerPayload)
        .select()
        .single();

      if (customerError) {
        console.error("customers insert failed", customerError);
        throw customerError;
      }

      // Uppdatera contact_requests status till "converted" om contactId finns
      if (contactId) {
        console.log(`Updating contact request ${contactId} to converted status`);
        const { error: contactUpdateError } = await supabase
          .from("contact_requests")
          .update({ status: "converted", customer_id: customerRecord?.id })
          .eq("id", contactId);

        if (contactUpdateError) {
          console.error("contact_requests update failed", contactUpdateError);
          throw contactUpdateError;
        }
      }

      const response = {
        ok: true,
        customer: customerRecord,
        message: "Kund skapad.",
      };

      return new Response(JSON.stringify(response), { status: 200, headers: corsHeaders });
    } else {
      // Saknar tillräcklig info för att skapa kund
      return new Response(JSON.stringify({ error: "Minst namn och telefon krävs för att skapa kund." }), { status: 400, headers: corsHeaders });
    }
  } catch (err: any) {
    console.error("convert-contact-to-customer error", err);
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
