import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

async function sendAdminNotification(contactData) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL || "no-reply@trygghand.se";
  const brevoSenderName = process.env.BREVO_SENDER_NAME || "Trygghand";
  const adminEmail = "kontakt@trygghand.com";

  if (!brevoApiKey) {
    console.warn("[contactRequests] BREVO_API_KEY not configured, skipping email notification");
    return;
  }

  const { firstname, lastname, email, phone, message } = contactData;
  const displayName = `${firstname}${lastname ? " " + lastname : ""}`;
  
  const emailBody = `
Ny kontaktförfrågan från Trygghand-webbplatsen

Namn: ${displayName}
Telefon: ${phone}
Email: ${email || "(inte angiven)"}

Meddelande:
${message}

---
Logga in i adminpanelen för att hantera denna förfrågan:
${process.env.APP_LOGIN_URL || "https://trygghand.se"}
  `.trim();

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: brevoSenderName,
          email: brevoSenderEmail,
        },
        to: [
          {
            email: adminEmail,
            name: "Trygghand Admin",
          },
        ],
        subject: `Ny kontaktförfrågan: ${displayName}`,
        htmlContent: `
          <p><strong>Ny kontaktförfrågan från Trygghand-webbplatsen</strong></p>
          <p><strong>Namn:</strong> ${displayName}</p>
          <p><strong>Telefon:</strong> ${phone}</p>
          <p><strong>Email:</strong> ${email || "(inte angiven)"}</p>
          <p><strong>Meddelande:</strong></p>
          <p>${message.replace(/\n/g, "<br />")}</p>
          <hr />
          <p><a href="${process.env.APP_LOGIN_URL || "https://trygghand.se"}">Logga in i adminpanelen</a></p>
        `,
        textContent: emailBody,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[contactRequests] Failed to send admin notification:", {
        status: response.status,
        error: errorData,
      });
    } else {
      console.log("[contactRequests] Admin notification sent successfully");
    }
  } catch (err) {
    console.error("[contactRequests] Error sending admin notification:", err);
  }
}

function getJwtRole(jwt) {
  try {
    if (typeof jwt !== "string") return null;
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    const parsed = JSON.parse(json);
    return typeof parsed?.role === "string" ? parsed.role : null;
  } catch {
    return null;
  }
}

function getServiceClient() {
  // Create a Supabase client using the service role for server-side inserts
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  const serviceRoleKeyParts = typeof serviceRoleKey === "string" ? serviceRoleKey.split(".").length : 0;
  const serviceRoleKeyRole = getJwtRole(serviceRoleKey);

  const diagnostics = {
    hasSUPABASE_URL: !!process.env.SUPABASE_URL,
    hasVITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
    hasSUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasVITE_SUPABASE_SERVICE_ROLE_KEY: !!process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
    serviceRoleKeyParts,
    serviceRoleKeyRole,
  };

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKeyParts !== 3) {
    return { client: null, diagnostics };
  }

  if (serviceRoleKeyRole && serviceRoleKeyRole !== "service_role") {
    return { client: null, diagnostics };
  }

  return {
    client: createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    diagnostics,
  };
}

async function invokeContactRequestPush(supabase, supabaseUrl, serviceRoleKey) {
  console.log("[contactRequests] contact request push invocation starting");

  try {
    const { data: adminRows, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminError) {
      console.error("[contactRequests] contact request push invocation failed", {
        error: adminError.message,
      });
      return;
    }

    const adminUserIds = [...new Set((adminRows || []).map((row) => row?.user_id).filter(Boolean))];

    for (const userId of adminUserIds) {
      try {
        const response = await fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            userId,
            type: "contact_request",
            url: "/portal",
          }),
        });

        const responseText = await response.text().catch(() => "");

        if (!response.ok) {
          console.error("[contactRequests] contact request push invocation failed", {
            status: response.status,
            body: responseText.slice(0, 500),
          });
          continue;
        }

        console.log("[contactRequests] contact request push invocation succeeded");
      } catch (err) {
        console.error("[contactRequests] contact request push invocation failed", {
          error: err && (err.message || String(err)),
        });
      }
    }

    console.log("[contactRequests] contact request push invocation succeeded");
  } catch (err) {
    console.error("[contactRequests] contact request push invocation failed", {
      error: err && (err.message || String(err)),
    });
  }
}

router.post("/contact-request", async (req, res) => {
  try {
    const { client: supabase, diagnostics } = getServiceClient();
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

    if (!supabase) {
      console.error("[contactRequests] Missing env vars for service client", diagnostics);
      return res.status(500).json({
        error: "Server not configured for database access",
        diagnostics,
        required: ["SUPABASE_URL (or VITE_SUPABASE_URL)", "SUPABASE_SERVICE_ROLE_KEY"],
      });
    }

    const { firstname, lastname, email, phone, message, gdpr_consent, consent_timestamp } = req.body || {};

    if (!firstname || !phone) {
      return res.status(400).json({ error: "firstname and phone are required" });
    }

    if (!gdpr_consent) {
      return res.status(400).json({ error: "GDPR consent is required" });
    }

    const payload = {
      firstname,
      lastname: lastname || "",
      email: email || null,
      phone,
      message: message || "",
      gdpr_consent: gdpr_consent || false,
      source: "trygghand",
      consent_at: new Date().toISOString(),
      privacy_notice_version: "contact-v1",
    };

    const { data, error } = await supabase
      .from("contact_requests")
      .insert([payload])
      .select()
      .single();

    if (error) {
      const msg = (error && error.message) || "";
      if (/no suitable key|wrong key type/i.test(msg)) {
        console.error("[contactRequests] Supabase key/url mismatch", { msg, diagnostics });
        return res.status(500).json({
          error: "Server misconfigured (Supabase URL/key mismatch)",
          diagnostics,
        });
      }
      return res.status(500).json({ error: error.message });
    }

    console.log("[contactRequests] contact request saved");

    // Send admin notification email
    await sendAdminNotification(payload);

    void invokeContactRequestPush(supabase, supabaseUrl, serviceRoleKey);

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error("[contactRequests] Unexpected error:", err && (err.message || err));
    return res.status(500).json({ error: "Unexpected server error" });
  }
});

export default router;
