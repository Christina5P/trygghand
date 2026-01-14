import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

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

router.post("/contact-request", async (req, res) => {
  try {
    const { client: supabase, diagnostics } = getServiceClient();
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

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error("[contactRequests] Unexpected error:", err && (err.message || err));
    return res.status(500).json({ error: "Unexpected server error" });
  }
});

export default router;
