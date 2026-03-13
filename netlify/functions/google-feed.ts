import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async () => {

  const { data } = await supabase
    .from("handplockat_listings_public")
    .select("id,title,description,image_cutout,price_sek")
    .eq("status", "available");

  const items = data?.map(item => `
  <item>
    <g:id>${item.id}</g:id>
    <title><![CDATA[${item.title}]]></title>
    <description><![CDATA[${item.description}]]></description>
    <link>https://www.trygghand.com/handplockat/${item.id}</link>
    <g:image_link>${item.image_cutout}</g:image_link>
    <g:availability>in stock</g:availability>
    <g:price>${item.price_sek} SEK</g:price>
    <g:condition>used</g:condition>
  </item>
  `).join("") ?? "";

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
<title>Handplockat – Trygg Hand</title>
<link>https://www.trygghand.com/handplockat</link>
${items}
</channel>
</rss>`;

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/xml"
    },
    body: xml
  };
};