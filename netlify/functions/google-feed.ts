import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const SITE = "https://www.trygghand.com";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async () => {

  const { data, error } = await supabase
    .from("handplockat_listings_public")
    .select("id,title,description,image_cutout,price_sek")
    .eq("status", "available");

  if (error) {
    return {
      statusCode: 500,
      body: error.message
    };
  }

  const items = data?.map(item => `
  <item>

    <g:id>${item.id}</g:id>

    <title><![CDATA[${item.title}]]></title>

    <description><![CDATA[${item.description || item.title}]]></description>

    <link>${SITE}/handplockat/${item.id}</link>

    <g:image_link>${item.image_cutout}</g:image_link>

    <g:availability>in stock</g:availability>

    <g:price>${item.price_sek} SEK</g:price>

    <g:condition>used</g:condition>

    <g:brand>Handplockat</g:brand>

    <g:identifier_exists>false</g:identifier_exists>

    <g:adult>false</g:adult>

    <g:shipping>
      <g:country>SE</g:country>
      <g:service>Standard</g:service>
      <g:price>0 SEK</g:price>
    </g:shipping>

  </item>
  `).join("") ?? "";

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
      "Content-Type": "application/xml"
    },
    body: xml
  };
};