const { createClient } = require("@supabase/supabase-js");
const PUBLIC_RETENTION_DAYS = 90;

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

function parseField(message, label) {
  const prefix = `${label}:`;
  const line = String(message || "")
    .split("\n")
    .map((v) => v.trim())
    .find((v) => v.startsWith(prefix));

  if (!line) return null;
  const value = line.slice(prefix.length).trim();
  return value || null;
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "GET") return json(405, { error: "Method not allowed" });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "Server not configured" });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("contact_requests")
      .select("id, message, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[handplockat-interest-list] query error", error);
      return json(500, { error: "Failed to fetch interests" });
    }

    const cutoff = new Date(Date.now() - PUBLIC_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const filtered = (data || []).filter((row) => {
      const isHandplockatInterest = String(row?.message || "").includes("[Köpintresse Handplockat]");
      const createdAt = row?.created_at ? new Date(row.created_at) : null;
      const withinRetention = createdAt ? createdAt >= cutoff : false;
      return isHandplockatInterest && withinRetention;
    });

    const interests = [];

    for (const row of filtered) {
      const message = String(row?.message || "");
      const imagePath = parseField(message, "Bild (intern path)");

      let imageUrl = null;
      if (imagePath) {
        const { data: signedData, error: signedError } = await supabase.storage
          .from("handplockat-private")
          .createSignedUrl(imagePath, 3600);

        if (!signedError && signedData?.signedUrl) {
          imageUrl = signedData.signedUrl;
        }
      }

      interests.push({
        id: String(row.id),
        category: parseField(message, "Kategori"),
        budgetSek: parseField(message, "Budget (SEK)"),
        area: parseField(message, "Område"),
        wish: parseField(message, "Önskemål"),
        imageUrl,
        createdAt: row.created_at || null,
      });
    }

    return json(200, { ok: true, interests });
  } catch (err) {
    console.error("[handplockat-interest-list] unexpected error", err);
    return json(500, { error: "Internal server error" });
  }
};
