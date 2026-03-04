const { createClient } = require("@supabase/supabase-js");

const BASE_URL = "https://www.trygghand.com";

const STATIC_URLS = [
  { path: "/", changefreq: "daily", priority: "1.0", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/about", changefreq: "daily", priority: "0.6", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/services", changefreq: "daily", priority: "0.6", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/services/dodsbohantering-sundsvall", changefreq: "daily", priority: "0.8", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/services/seniorforandring-sundsvall", changefreq: "daily", priority: "0.8", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/services/forsaljning", changefreq: "daily", priority: "0.7", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/services/flyttstad", changefreq: "daily", priority: "0.6", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/services/flytt", changefreq: "daily", priority: "0.6", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/services/tomning-bohag", changefreq: "daily", priority: "0.6", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/services/vardering", changefreq: "daily", priority: "0.7", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/services/magasinering", changefreq: "daily", priority: "0.6", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/services/radgivning-planering", changefreq: "daily", priority: "0.6", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/services/Juridikguide", changefreq: "daily", priority: "0.6", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/dodsbohantering-sundsvall", changefreq: "daily", priority: "0.6", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/seniorforandring-sundsvall", changefreq: "daily", priority: "0.6", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/tomning-av-bohag-sundsvall", changefreq: "daily", priority: "0.6", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/forsaljning-av-bohag-sundsvall", changefreq: "daily", priority: "0.6", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/checklista-vid-dodsfall-sundsvall", changefreq: "daily", priority: "0.6", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/vad-ingar-i-dodsbohantering", changefreq: "daily", priority: "0.6", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/fragor-tips", changefreq: "daily", priority: "0.6", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/privacy", changefreq: "daily", priority: "0.6", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/terms", changefreq: "daily", priority: "0.6", lastmod: "2026-02-08T00:00:00.000Z" },
  { path: "/handplockat", changefreq: "daily", priority: "0.8", lastmod: "2026-03-03" },
];

function xmlResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
    body,
  };
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function renderUrlTag({ loc, lastmod, changefreq, priority }) {
  return [
    "<url>",
    `<loc>${escapeXml(loc)}</loc>`,
    lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : "",
    changefreq ? `<changefreq>${escapeXml(changefreq)}</changefreq>` : "",
    priority ? `<priority>${escapeXml(priority)}</priority>` : "",
    "</url>",
  ]
    .filter(Boolean)
    .join("");
}

async function fetchHandplockatUrls() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return [];
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await supabase
    .from("handplockat_listings_public")
    .select("id, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("[sitemap] failed to fetch handplockat listings", error);
    return [];
  }

  return (data || [])
    .filter((row) => !!row?.id)
    .map((row) => ({
      loc: `${BASE_URL}/handplockat/${row.id}`,
      lastmod: row.created_at || undefined,
      changefreq: "daily",
      priority: "0.7",
    }));
}

exports.handler = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers: {
        Allow: "GET",
      },
      body: "Method not allowed",
    };
  }

  try {
    const staticEntries = STATIC_URLS.map((entry) => ({
      loc: `${BASE_URL}${entry.path}`,
      lastmod: entry.lastmod,
      changefreq: entry.changefreq,
      priority: entry.priority,
    }));

    const handplockatEntries = await fetchHandplockatUrls();

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...staticEntries.map(renderUrlTag),
      ...handplockatEntries.map(renderUrlTag),
      "</urlset>",
    ].join("");

    return xmlResponse(200, xml);
  } catch (error) {
    console.error("[sitemap] unexpected error", error);
    return xmlResponse(500, '<?xml version="1.0" encoding="UTF-8"?><error>internal_server_error</error>');
  }
};
