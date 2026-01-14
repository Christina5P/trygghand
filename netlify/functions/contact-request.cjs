const { createClient } = require("@supabase/supabase-js");

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

  if (!firstname || !phone) {
    return json(400, { error: "firstname and phone are required" });
  }

  if (!gdpr_consent) {
    return json(400, { error: "GDPR consent is required" });
  }

  const email = typeof emailRaw === "string" && emailRaw.trim() ? emailRaw.trim() : null;

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = {
      firstname,
      lastname: lastname || "",
      email,
      phone,
      message,
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

    return json(200, { ok: true, data });
  } catch (err) {
    console.error("[contact-request] Unexpected error", err);
    return json(500, { error: "Internal server error" });
  }
};
