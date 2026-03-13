import { Handler } from "@netlify/functions";

export const handler: Handler = async () => {

  const xml = `<?xml version="1.0"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
<title>Handplockat – Trygg Hand</title>
<link>https://www.trygghand.com/handplockat</link>
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