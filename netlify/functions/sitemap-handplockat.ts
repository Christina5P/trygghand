import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SITE = "https://www.trygghand.com";

export const handler: Handler = async () => {
  try {
    const { data, error } = await supabase
      .from("handplockat_listings_public")
      .select("id, updated_at");

    if (error) throw error;

    const urls =
      data
        ?.map(
          (item) => `
  <url>
    <loc>${SITE}/handplockat/${item.id}</loc>
    <lastmod>${new Date(item.updated_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
        )
        .join("") ?? "";

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">

  <url>
    <loc>${SITE}/handplockat</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>

${urls}

</urlset>`;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/xml",
      },
      body: xml,
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: "Failed to generate sitemap",
    };
  }
};