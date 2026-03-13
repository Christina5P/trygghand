import { Handler } from "@netlify/functions";

export const handler: Handler = async (event) => {

  const { url } = JSON.parse(event.body || "{}");

  if (!url) {
    return { statusCode: 400, body: "Missing url" };
  }

  const payload = {
    host: "www.trygghand.com",
    key: "trygghand-index-key",
    urlList: [url]
  };

  await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true })
  };
};