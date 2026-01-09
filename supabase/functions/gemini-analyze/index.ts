import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * 🔐 Deno-säker base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(i, i + chunkSize)
    );
  }
  return btoa(binary);
}

async function fetchImageAsBase64(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Kunde inte hämta bild: ${url}`);

  const mimeType = res.headers.get("content-type") ?? "image/jpeg";
  const buffer = await res.arrayBuffer();

  return {
    data: arrayBufferToBase64(buffer),
    mimeType,
  };
}

/**
 * 🧠 Extrahera JSON ur Gemini-text
 */
function extractJson(text: string) {
  // Försök hitta första {...} som är giltig JSON
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Ingen JSON hittades i Gemini-svaret");
  }

  return JSON.parse(match[0]);
}

serve(async (req: Request): Promise<Response> => {
  // ===== CORS =====
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const { imageUrls, comments } = await req.json();

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: "imageUrls saknas" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY saknas");

    const { GoogleGenerativeAI } = await import(
      "npm:@google/generative-ai"
    );

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    // ===== Bilder → inlineData =====
    const imageParts = [];
    for (const url of imageUrls) {
      const img = await fetchImageAsBase64(url);
      imageParts.push({
        inlineData: {
          data: img.data,
          mimeType: img.mimeType,
        },
      });
    }

    const prompt = `
Du är en professionell värderare.

Analysera föremålet/föremålen i bilderna.
Returnera ENDAST ett JSON-objekt.
Ingen markdown. Ingen text före eller efter.

Struktur:
{
  "foremal_beskrivning": string,
  "skick": string,
  "varde_min_sek": number,
  "varde_max_sek": number,
  "motivering": string
}

Kommentarer från användaren:
${comments || "Inga"}
`;

    const result = await model.generateContent([
      ...imageParts,
      { text: prompt },
    ]);

    const rawText = result.response.text();

    // 🔑 ROBUST PARSING
    const parsed = extractJson(rawText);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("Edge error:", err);

    return new Response(
      JSON.stringify({
        error:
          err instanceof Error ? err.message : "Internal server error",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
