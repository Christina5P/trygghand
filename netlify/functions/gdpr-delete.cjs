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
    payload = JSON.parse(event.body);
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const userId = payload?.userId;
  const adminId = payload?.adminId;
  const reason = payload?.reason || "GDPR deletion request";
  if (!userId || !adminId) return json(400, { error: "Missing userId or adminId" });

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1) Hämta användarens email för loggning
    let userEmail = "unknown";
    const { data: customer } = await supabase
      .from("customers")
      .select("email")
      .eq("id", userId)
      .single();
    if (customer?.email) userEmail = customer.email;

    // 2) Radera all appdata via SQL-funktion (måste finnas i din databas)
    const { error: deleteDataError } = await supabase.rpc(
      "delete_user_data",
      { user_uuid: userId }
    );
    if (deleteDataError) {
      return json(500, { error: `Failed to delete user data: ${deleteDataError.message}` });
    }

    // 3) Radera från auth.users (kräver service role)
    try {
      await supabase.auth.admin.deleteUser(userId);
    } catch (err) {
      // Om användaren inte finns, fortsätt ändå
    }

    // 4) Radera från archived_customers
    const { error: archivedDeleteError } = await supabase
      .from("archived_customers")
      .delete()
      .eq("id", userId);
    if (archivedDeleteError) {
      // Fortsätt ändå, men logga felet
      console.error("Error deleting from archived_customers:", archivedDeleteError);
    }

    // 5) Logga borttagningen
    await supabase.from("deleted_users_log").insert({
      user_id: userId,
      user_email: userEmail,
      deleted_by: adminId,
      deletion_reason: reason,
      deleted_at: new Date().toISOString(),
    });

    return json(200, {
      success: true,
      message: `User ${userEmail} and all associated data deleted successfully`,
      deletedAt: new Date().toISOString(),
      userEmail,
    });
  } catch (error) {
    return json(500, {
      success: false,
      error: error.message || "Unknown error occurred",
    });
  }
};
