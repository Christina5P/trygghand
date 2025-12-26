// backend/routes/valuations-save.js
import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.warn("[valuations-save] SUPABASE_URL is not set. Valuations save API will return 500.");
}
if (!SERVICE_ROLE_KEY) {
  console.warn("[valuations-save] SUPABASE_SERVICE_ROLE_KEY is not set. Valuations save API will return 500.");
}

// Service role client for bypassing RLS
const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  : null;

/**
 * Middleware: Verifiera JWT och extrahera användare
 */
async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");
    
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Auth service not configured" });
    }

    // Verifiera JWT med service role (admin) för att undvika klient-nyckelberoende
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      console.warn("[valuations-save] JWT verification failed:", error?.message);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Hämta customer-info för behörighetskontroll
    const { data: customer, error: customerError } = await supabaseAdmin
      .from("customers")
      .select("id, is_admin")
      .eq("id", user.id)
      .single();

    if (customerError) {
      console.error("[valuations-save] Failed to fetch customer:", customerError);
      return res.status(500).json({ error: "Failed to verify user" });
    }

    // Bifoga user och customer till request
    req.user = user;
    req.customer = customer;
    next();
  } catch (err) {
    console.error("[valuations-save] Auth error:", err);
    return res.status(500).json({ error: "Authentication failed" });
  }
}

// POST /api/valuations/save
router.post("/valuations/save", authenticateUser, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Server not configured for database access" });
    }

    const { customer_id, analysis, image_urls } = req.body;

    // Validera data
    if (!analysis || typeof analysis !== "string" || analysis.trim() === "") {
      return res.status(400).json({ error: "Missing analysis text" });
    }

    // Säkerhetskontroll 1: Verifiera customer_id (rad 90-98)
    if (customer_id) {
      const isAdmin = req.customer?.is_admin === true;
      const isOwnCustomer = customer_id === req.user.id;

      if (!isOwnCustomer && !isAdmin) {
        console.warn(`[valuations-save] User ${req.user.id} attempted to save valuation for ${customer_id}`);
        return res.status(403).json({ 
          error: "Forbidden: You can only save valuations for yourself" 
        });
      }
    }
    
    // Säkerhetskontroll 2: Input-sanitering
    const sanitizedAnalysis = analysis.trim().slice(0, 50000); // Max 50KB text

    const payload = {
      customer_id: customer_id || null,
      analysis: sanitizedAnalysis,
      image_urls: image_urls || [],
      created_at: new Date().toISOString(),
    };

    // Använd service role för att kringgå RLS
    const { data, error } = await supabaseAdmin
      .from("valuations")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("[valuations-save] Insert error:", error);
      return res.status(500).json({ error: error.message || error.details || "Insert failed" });
    }

    // Audit log (GDPR compliance)
    console.log(`[valuations-save] ✓ User ${req.user.id} saved valuation ${data.id} for customer ${customer_id || 'anonymous'}`);

    return res.status(200).json({ data });
  } catch (err) {
    console.error("[valuations-save] Unexpected error:", err && (err.message || err));
    return res.status(500).json({ error: err?.message || "Unexpected server error" });
  }
});

export default router;
