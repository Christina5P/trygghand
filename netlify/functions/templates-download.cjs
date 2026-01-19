const { createClient } = require("@supabase/supabase-js");

function response(statusCode, headers, body, isBase64Encoded = false) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      ...headers,
    },
    body,
    isBase64Encoded,
  };
}

function json(statusCode, body) {
  return response(statusCode, { "Content-Type": "application/json" }, JSON.stringify(body), false);
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const path = event.queryStringParameters?.path;
  if (!path) return json(400, { error: "Path parameter required" });

  const bucketParam = (event.queryStringParameters?.bucket || "fullmakts-filer") + "";
  const bucket = bucketParam.trim();
  if (!["fullmakts-filer", "abonnemang", "case-documents"].includes(bucket)) {
    return json(400, { error: "Invalid bucket" });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error) {
      return json(404, { error: "Template not found" });
    }

    const blob = data;
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const filename = (path.split("/").pop() || "file").replace(/[\r\n\"]/g, "");
    const contentType = blob.type || (filename.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream");

    return response(
      200,
      {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
      buffer.toString("base64"),
      true
    );
  } catch (err) {
    console.error("templates-download error", err);
    return json(500, { error: "Internal server error" });
  }
};
