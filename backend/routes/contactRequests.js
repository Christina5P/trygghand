import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

// Create a Supabase client using the service role for server-side inserts
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.warn("[contactRequests] SUPABASE_URL is not set. Contact API will return 500.");
}
if (!SERVICE_ROLE_KEY) {
  console.warn("[contactRequests] SUPABASE_SERVICE_ROLE_KEY is not set. Contact API will return 500.");
}

const supabase = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  : null;

router.post("/contact-request", async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: "Server not configured for database access" });
    }

    const { firstname, lastname, email, phone, message } = req.body || {};

    if (!firstname || !email || !phone) {
      return res.status(400).json({ error: "firstname, email and phone are required" });
    }

    const payload = { firstname, lastname: lastname || "", email, phone, message: message || "" };

    const { data, error } = await supabase
      .from("contact_requests")
      .insert([payload])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true, data });
  } catch (err) {
    console.error("[contactRequests] Unexpected error:", err && (err.message || err));
    return res.status(500).json({ error: "Unexpected server error" });
  }
});

export default router;
