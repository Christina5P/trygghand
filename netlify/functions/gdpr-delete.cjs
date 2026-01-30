const { createClient } = require("@supabase/supabase-js");

exports.handler = async (event) => {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Supabase service role is not configured on backend",
        }),
      };
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = JSON.parse(event.body || "{}");
    const customerId = body.customerId;

    if (!customerId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing customerId" }),
      };
    }

    // 1. Radera appdata
    await supabase.rpc("delete_user_data", { uid: customerId });

    // 2. Radera auth-user
    await supabase.auth.admin.deleteUser(customerId);

    // 3. Radera arkivpost
    await supabase.from("archived_customers").delete().eq("id", customerId);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message || "GDPR delete failed",
      }),
    };
  }
};
