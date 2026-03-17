import { Handler, HandlerResponse } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const SITE = "https://www.trygghand.com";
// Din specifika butikskod från Google Business Profile
const STORE_CODE = "04579428471105795723";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function clean(text?: string) {
  if (!text) return "";
  return text
    .replace(/\r?\n|\r/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const handler: Handler = async (): Promise<HandlerResponse> => {
  const { data, error } = await supabase
    .from("handplockat_listings_public")
    .select("id,title,description,image_cutout,price_sek")
    .eq("status", "available");

  const responseHeaders = {
    "Content-Type": "application/xml; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "X-Content-Type-Options": "nosniff"
  };

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
      <g:availability>in_stock</g:availability>
      <g:quantity>1</g:quantity> <g:price>${price} SEK</g:price>
      <g:condition>used</g:condition>
      <g:brand>Handplockat</g:brand>
      <g:identifier_exists>false</g:identifier_exists>
      <g:store_code>${STORE_CODE}</g:store_code>
      <g:pickup_method>buy</g:pickup_method>
      <g:pickup_sla>same day</g:pickup_sla>
          
      <g:inventory_link>${SITE}/handplockat/${item.id}</g:inventory_link>
    </item>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Handplockat – Trygg Hand</title>
    <link>${SITE}/handplockat</link>
    <description>Handplockade second hand-fynd i Sundsvall förmedlade av Trygg Hand</description>
${items}
  </channel>
</rss>`;

  return {
    statusCode: 200,
    headers: responseHeaders,
    body: xml
  };
};