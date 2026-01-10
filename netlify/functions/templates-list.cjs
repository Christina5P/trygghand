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

  const prefixRaw = (event.queryStringParameters?.prefix || "fullmaktsmallar") + "";
  const prefix = prefixRaw.replace(/^\/+/, "").replace(/\/+$/, "");

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase.storage
      .from("fullmakts-filer")
      .list(prefix, { limit: 100 });

    if (error) {
      console.error("templates-list storage error", error);
      return json(500, { error: "Could not list templates" });
    }

    const templates = (data || [])
      .filter((f) => !!f?.name)
      .map((f) => ({
        name: f.name,
        storage_path: `${prefix}/${f.name}`,
      }));

    return json(200, { templates });
  } catch (err) {
    console.error("templates-list error", err);
    return json(500, { error: "Internal server error" });
  }
};
