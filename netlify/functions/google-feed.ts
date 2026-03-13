import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const SITE = "https://www.trygghand.com";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function clean(text?: string) {
  if (!text) return "";
  // Vi behåller en enkel rensning men förlitar oss på CDATA för säkerhet
  return text
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const handler: Handler = async () => {
  const { data, error } = await supabase
    .from("handplockat_listings_public")
    .select("id,title,description,image_cutout,price_sek")
    .eq("status", "available");

  if (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/plain" },
      body: error.message
    };
  }

  const items = (data || []).map(item => {
    const title = clean(item.title);
    const description = clean(item.description || item.title);
    const image = item.image_cutout || `${SITE}/og.jpg`;
    const price = item.price_sek ?? 0;

    return `    <item>
      <g:id>handplockat-${item.id}</g:id>
      <title><![CDATA[${title}]]></title>
      <description><![CDATA[${description}]]></description>
      <link>${SITE}/handplockat/${item.id}</link>
      <g:image_link>${image}</g:image_link>
      <g:availability>in stock</g:availability>
      <g:price>${price} SEK</g:price>
      <g:condition>used</g:condition>
      <g:brand>Handplockat</g:brand>
      <g:identifier_exists>false</g:identifier_exists>
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Handplockat – Trygg Hand</title>
    <link>${SITE}/handplockat</link>
    <description>Handplockade second hand-fynd i Sundsvall</description>
${items}
  </channel>
</rss>`;

  return {
    statusCode: 200,
    headers: {
      // Viktigt: Se till att detta är exakt application/xml
      "Content-Type": "application/xml; charset=utf-8",
      "Access-Control-Allow-Origin": "*", // Underlättar för Googles sökrobotar
      "X-Content-Type-Options": "nosniff"
    },
    body: xml
  };
};