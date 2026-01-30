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
    return json(500, { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  let payload;
  try { payload = event.body ? JSON.parse(event.body) : {}; } catch { return json(400, { error: "Invalid JSON" }); }
  const { email, name, phone, personal_number } = payload || {};
  if (!email) return json(400, { error: "Missing email" });

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Hitta eller skapa auth-user
    let authUser;
    const { data: foundUser, error: getUserErr } = await supabase.auth.admin.getUserByEmail(email);
    if (getUserErr && !getUserErr.message.includes('User not found')) return json(500, { error: getUserErr.message });
    if (foundUser && foundUser.user && foundUser.user.id) {
      authUser = foundUser.user;
    } else {
      const { data: created, error: createErr } = await supabase.auth.admin.createUser({ email, email_confirm: true });
      if (createErr) return json(500, { error: createErr.message });
      authUser = created.user;
    }
    if (!authUser) return json(500, { error: "Failed to get or create auth user" });

    // 2. Bygg update-payload dynamiskt (skriv inte över känsliga fält om de saknas)
    const updateFields = { auth_user_id: authUser.id };
    if (typeof name === "string") updateFields.name = name;
    if (typeof phone === "string") updateFields.phone = phone;
    if (typeof personal_number === "string") updateFields.personal_number = personal_number;
    // Email är alltid unik och kopplad till auth_user_id
    updateFields.email = email;

    // 3. Upsert med unik koppling på auth_user_id
    const { error: upsertErr } = await supabase
      .from("customers")
      .upsert([updateFields], { onConflict: "auth_user_id" });
    if (upsertErr) return json(500, { error: upsertErr.message });

    return json(200, { success: true, auth_user_id: authUser.id });
  } catch (err) {
    return json(500, { error: err.message || "Unknown error" });
  }
};
