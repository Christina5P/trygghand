const { createClient } = require("@supabase/supabase-js");

async function sendAdminNotification(contactData) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL || "no-reply@trygghand.se";
  const brevoSenderName = process.env.BREVO_SENDER_NAME || "Trygghand";
  const adminEmail = "kontakt@trygghand.com";

  if (!brevoApiKey) {
    console.warn("[contact-request] BREVO_API_KEY not configured, skipping email notification");
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
      console.error("[contact-request] Failed to send admin notification:", {
        status: response.status,
        error: errorData,
      });
    } else {
      console.log("[contact-request] Admin notification sent successfully");
    }
  } catch (err) {
    console.error("[contact-request] Error sending admin notification:", err);
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

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const serviceRoleKeyParts = typeof serviceRoleKey === "string" ? serviceRoleKey.split(".").length : 0;
  const serviceRoleKeyRole = getJwtRole(serviceRoleKey);

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKeyParts !== 3) {
    console.error("[contact-request] Missing env vars", {
      hasSUPABASE_URL: !!process.env.SUPABASE_URL,
      hasVITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
      hasSUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceRoleKeyParts,
      serviceRoleKeyRole,
    });
    return json(500, {
      error: "Server not configured (missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)",
    });
  }

  if (serviceRoleKeyRole && serviceRoleKeyRole !== "service_role") {
    console.error("[contact-request] Misconfigured SUPABASE_SERVICE_ROLE_KEY role", {
      serviceRoleKeyRole,
    });
    return json(500, { error: "Server misconfigured (SUPABASE_SERVICE_ROLE_KEY is not service_role)" });
  }

  let body;
  try {
    body = event.body ? JSON.parse(event.body) : {};
  } catch (err) {
    console.error("[contact-request] Invalid JSON body", err);
    return json(400, { error: "Invalid JSON body" });
  }

  const firstname = ((body?.firstname ?? "") + "").trim();
  const lastname = ((body?.lastname ?? "") + "").trim();
  const emailRaw = body?.email;
  const phone = ((body?.phone ?? "") + "").trim();
  const message = ((body?.message ?? "") + "").trim();
  const gdpr_consent = !!body?.gdpr_consent;
  const interestImageBase64 = typeof body?.interest_image_base64 === "string" ? body.interest_image_base64.trim() : "";
  const interestImageName = typeof body?.interest_image_name === "string" ? body.interest_image_name.trim() : "";
  const interestImageType = typeof body?.interest_image_type === "string" ? body.interest_image_type.trim() : "";

  if (!firstname || !phone) {
    return json(400, { error: "firstname and phone are required" });
  }

  if (!gdpr_consent) {
    return json(400, { error: "GDPR consent is required" });
  }

  const email = typeof emailRaw === "string" && emailRaw.trim() ? emailRaw.trim() : null;

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let interestImagePath = null;
    if (interestImageBase64) {
      if (!interestImageType.startsWith("image/")) {
        return json(400, { error: "Invalid image type" });
      }

      let fileBuffer;
      try {
        fileBuffer = Buffer.from(interestImageBase64, "base64");
      } catch {
        return json(400, { error: "Invalid image payload" });
      }

      if (!fileBuffer || fileBuffer.length === 0) {
        return json(400, { error: "Invalid image payload" });
      }

      const maxBytes = 5 * 1024 * 1024;
      if (fileBuffer.length > maxBytes) {
        return json(400, { error: "Image too large (max 5 MB)" });
      }

      const extFromType = (interestImageType.split("/")[1] || "jpg").toLowerCase();
      const sanitizedExt = extFromType.replace(/[^a-z0-9]/g, "") || "jpg";
      const random = Math.random().toString(36).slice(2, 8);
      const filename = `${Date.now()}-${random}.${sanitizedExt}`;
      const storagePath = `handplockat-interest/${filename}`;

      const { error: uploadError } = await supabase.storage
        .from("handplockat-private")
        .upload(storagePath, fileBuffer, {
          contentType: interestImageType,
          upsert: false,
        });

      if (uploadError) {
        console.error("[contact-request] image upload error", uploadError);
        return json(500, { error: "Failed to upload image" });
      }

      interestImagePath = storagePath;
    }

    const payload = {
      firstname,
      lastname: lastname || "",
      email,
      phone,
      message: [
        message,
        interestImagePath ? `Bild (intern path): ${interestImagePath}` : "",
        interestImageName ? `Bildefil: ${interestImageName}` : "",
      ].filter(Boolean).join("\n"),
      gdpr_consent,
    };

    const { data, error } = await supabase
      .from("contact_requests")
      .insert([payload])
      .select()
      .single();

    if (error) {
      const msg = (error && error.message) || "";
      if (/no suitable key|wrong key type/i.test(msg)) {
        console.error("[contact-request] Supabase key/url mismatch", { msg, serviceRoleKeyParts });
        return json(500, { error: "Server misconfigured (Supabase URL/key mismatch)" });
      }
      console.error("[contact-request] Supabase insert error", error);
      return json(500, { error: "Failed to save contact request" });
    }

    // Send admin notification email
    await sendAdminNotification(payload);

    return json(200, { ok: true, data });
  } catch (err) {
    console.error("[contact-request] Unexpected error", err);
    return json(500, { error: "Internal server error" });
  }
};
