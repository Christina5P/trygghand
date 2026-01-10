const { createClient } = require("@supabase/supabase-js");

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const path = event.queryStringParameters?.path;
  if (!path) return json(400, { error: "Path parameter required" });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase.storage
      .from("fullmakts-filer")
      .createSignedUrl(path, 3600);

    if (error) {
      return json(404, { error: "Template not found" });
    }

    const signedUrl = data?.signedUrl || data?.signed_url;
    if (!signedUrl) return json(500, { error: "Could not generate signed URL" });

    return json(200, { signedUrl });
  } catch (err) {
    console.error("templates-download error", err);
    return json(500, { error: "Internal server error" });
  }
};
