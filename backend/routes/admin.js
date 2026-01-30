// backend/routes/admin.js
/**
 * Admin routes for Supabase operations
 * Uses service_role for server-side admin functions
 */

import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

// Initialize Supabase admin client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.warn("[admin] SUPABASE_URL or SERVICE_ROLE_KEY not set. Admin API will return 500.");
}

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

// Middleware to check admin status
async function requireAdmin(req, res, next) {
  try {
    if (!supabaseAdmin) {
      return res.status(500).json({ error: "Server not configured for admin operations" });
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Check if user is admin
    const { data: roles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (roleError || !roles || roles.length === 0) {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.adminId = user.id;
    next();
  } catch (err) {
    console.error("[admin] Auth error:", err);
    res.status(500).json({ error: "Authentication error" });
  }
}

// POST /api/admin/convert-contact-to-customer
router.post("/convert-contact-to-customer", requireAdmin, async (req, res) => {
  try {
    const { contactId, sendInvite = false } = req.body;

    if (!contactId) {
      return res.status(400).json({ error: "contactId is required" });
    }

    // First, get contact details
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contact_requests')
      .select('*')
      .eq('id', contactId)
      .single();

    if (contactError || !contact) {
      return res.status(404).json({ error: "Contact request not found" });
    }

    if (contact.converted_to_customer) {
      return res.status(400).json({ error: "Contact already converted to customer" });
    }

    // Check if customer already exists
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('email', contact.email)
      .single();

    if (existingCustomer) {
      // Just mark as converted
      const { error: updateError } = await supabaseAdmin
        .from('contact_requests')
        .update({
          converted_to_customer: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', contactId);

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }

      return res.json({
        success: true,
        message: "Contact marked as converted (customer already exists)",
        customer_id: existingCustomer.id
      });
    }

    // Create auth user
    const tempPassword = Math.random().toString(36).slice(-12) + 'Temp123!'; // Generate temp password
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: contact.email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: `${contact.firstname} ${contact.lastname || ''}`.trim(),
        phone: contact.phone
      }
    });

    if (authError) {
      console.error("[convert-contact] Auth creation error:", authError);
      return res.status(500).json({ error: `Failed to create user: ${authError.message}` });
    }

    // Create customer record
    const { error: customerError } = await supabaseAdmin
      .from('customers')
      .insert({
        id: authUser.user.id,
        email: contact.email,
        name: `${contact.firstname} ${contact.lastname || ''}`.trim(),
        phone: contact.phone,
        is_customer: true
      });

    if (customerError) {
      console.error("[convert-contact] Customer creation error:", customerError);
      // Try to delete the auth user we just created
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return res.status(500).json({ error: `Failed to create customer: ${customerError.message}` });
    }

    // Mark contact as converted
    const { error: updateError } = await supabaseAdmin
      .from('contact_requests')
      .update({
        converted_to_customer: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', contactId);

    if (updateError) {
      console.error("[convert-contact] Update contact error:", updateError);
      // Don't fail the whole operation for this
    }

    // Send invite email if requested
    if (sendInvite) {
      // Note: In production, you'd want to send a proper invite email
      // For now, we'll just return the temp password (not recommended for production)
      console.log(`[convert-contact] Temp password for ${contact.email}: ${tempPassword}`);
    }

    res.json({
      success: true,
      message: "Contact converted to customer successfully",
      customer_id: authUser.user.id,
      temp_password: sendInvite ? tempPassword : undefined
    });
  } catch (err) {
    console.error("[convert-contact] Unexpected error:", err);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

// POST /api/admin/archive-customer
router.post("/archive-customer", requireAdmin, async (req, res) => {
  try {
    const { customerId, reason } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: "customerId is required" });
    }

    // Call the database function
    const { data, error } = await supabaseAdmin.rpc(
      'archive_customer',
      {
        p_customer_id: customerId,
        p_reason: reason || "Administrative archive",
        p_admin_id: req.adminId
      }
    );

    if (error) {
      console.error("[archive-customer] Error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error("[archive-customer] Unexpected error:", err);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

// POST /api/admin/unarchive-customer
router.post("/unarchive-customer", requireAdmin, async (req, res) => {
  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: "customerId is required" });
    }

    // Call the database function
    const { data, error } = await supabaseAdmin.rpc(
      'unarchive_customer',
      {
        p_customer_id: customerId,
        p_admin_id: req.adminId
      }
    );

    if (error) {
      console.error("[unarchive-customer] Error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error("[unarchive-customer] Unexpected error:", err);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

// POST /api/admin/cleanup-old-data
router.post("/cleanup-old-data", requireAdmin, async (req, res) => {
  try {
    const { retentionYears } = req.body;
    const years = retentionYears && retentionYears > 0 ? retentionYears : 7;

    // Call the database function
    const { data, error } = await supabaseAdmin.rpc(
      'cleanup_old_data',
      {
        p_retention_years: years,
        p_admin_id: req.adminId
      }
    );

    if (error) {
      console.error("[cleanup-old-data] Error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error("[cleanup-old-data] Unexpected error:", err);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

// GET /api/admin/contacts - List all contact requests
router.get("/contacts", requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('contact_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("[admin-contacts] Error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error("[admin-contacts] Unexpected error:", err);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

// GET /api/admin/customers - List all customers
router.get("/customers", requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("[admin-customers] Error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error("[admin-customers] Unexpected error:", err);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

// GET /api/admin/archived-customers - List archived customers
router.get("/archived-customers", requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('archived_customers')
      .select('*')
      .order('archived_at', { ascending: false });

    if (error) {
      console.error("[admin-archived-customers] Error:", error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error("[admin-archived-customers] Unexpected error:", err);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

export default router;