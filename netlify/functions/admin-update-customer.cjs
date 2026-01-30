const { createClient } = require("@supabase/supabase-js");

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

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  let payload;
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const { customer_id, name, email, phone, personal_number } = payload || {};
  if (!customer_id) return json(400, { error: "Missing customer_id" });

  // Only update allowed fields
  const updateFields = {};
  if (typeof name === "string") updateFields.name = name;
  if (typeof email === "string") updateFields.email = email;
  if (typeof phone === "string") updateFields.phone = phone;
  if (typeof personal_number === "string") updateFields.personal_number = personal_number;

  if (Object.keys(updateFields).length === 0) {
    return json(400, { error: "No valid fields to update" });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await supabase
      .from("customers")
      .update(updateFields)
      .eq("id", customer_id);
    if (error) {
      return json(500, { error: error.message || "Failed to update customer" });
    }
    return json(200, { success: true });
  } catch (err) {
    return json(500, { error: err.message || "Unknown error" });
  }
};
