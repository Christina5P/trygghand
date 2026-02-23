import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * ============================
 * CORS
 * ============================
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * ============================
 * Deno-safe Base64 helpers
 * ============================
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
  if (!res.ok) {
    throw new Error(`Kunde inte hämta bild: ${url}`);
  }

  const mimeType = res.headers.get("content-type") ?? "image/jpeg";
  const buffer = await res.arrayBuffer();

  return {
    data: arrayBufferToBase64(buffer),
    mimeType,
  };
}

/**
 * ============================
 * Robust JSON extraction
 * ============================
 */
function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Ingen JSON hittades i Gemini-svaret");
  }
  return JSON.parse(match[0]);
}

/**
 * ============================
 * Edge Function
 * ============================
 */
serve(async (req: Request): Promise<Response> => {
  // ---- CORS preflight ----
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
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
        JSON.stringify({ error: "imageUrls saknas eller är tom" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY saknas i environment variables");
    }

    // Dynamisk import (Edge-safe)
    const { GoogleGenerativeAI } = await import(
      "npm:@google/generative-ai"
    );

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    // ---- Images -> inlineData ----
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

    /**
     * ============================
     * FINAL PROMPT – Trygg Hand
     * ============================
     */
    const prompt = `
  Du är en professionell värderare specialiserad på den svenska andrahandsmarknaden, med särskild fokus på lokala marknader i Sundsvall och Västernorrland.

Uppgift:
Analysera föremålet/föremålen i bilderna och uppskatta ett realistiskt andrahandsvärde i SEK för försäljning via lokal direktförsäljning (t.ex. Handplockat | Sundsvall).

Värderingen ska baseras på följande prioriteringsordning:

Faktiska genomförda försäljningar i Sundsvall/Västernorrland (om tillgängligt)

Faktiska genomförda försäljningar i liknande svenska regioner

Nationella försäljningsdata (Tradera, Blocket, Marketplace)

Auktionsresultat för jämförbara objekt

Annonser utan såld-markering ska inte användas som primär värdegrund.

Marknadsantaganden:

Försäljning ska ske inom 1–3 månader

Lokal upphämtning (ingen frakt)

Privatperson till privatperson

Normalt begagnat skick för ålder

Köpare är prismedveten men inte fyndjägare

Om lokal data saknas:

Justera nationellt värde nedåt med 5–15 % för att spegla mindre marknad.

Värdeintervall:

varde_min_sek = realistiskt pris för snabb lokal försäljning (2–4 veckor)

varde_max_sek = rimligt högsta pris vid rätt lokal köpare

Skillnaden mellan min och max ska normalt vara 20–35 %

Prissättningslogik:

Undvik överoptimistiska toppnoteringar

Undvik extrema auktionsresultat

Värdet ska spegla vad ett dödsbo eller äldreflytt rimligen får betalt i praktiken

Nypris:

Ange endast om rimligt uppskattningsbart

Nypris är informativt, ej styrande

Ange i parentes i beskrivningen, exempel: "(nypris ca 4 000 kr)"

Om irrelevant: utelämna

Osäkerhet:

Om identifiering är osäker: ange detta i motiveringen

Var hellre något konservativ än optimistisk

Svara ENDAST med giltig JSON.
Ingen markdown. Ingen text före eller efter.

JSON-struktur:
{
"foremal_beskrivning": "Kort, tydlig identifiering (ev. med nypris)",
"skick": "Kort bedömning",
"varde_min_sek": number,
"varde_max_sek": number,
"lokal_marknadsjustering_procent": number,
"efterfragan_lokalt": "låg | medel | hög",
"saljbarhet_1_3_manader": "låg | medel | hög",
"motivering": "Kort motivering kopplad till lokal andrahandsmarknad"
}

Användarens kompletterande information:
${comments || "Ingen extra information"}
`;

    const result = await model.generateContent([
      ...imageParts,
      { text: prompt },
    ]);

    const rawText = result.response.text();

    const parsed = extractJson(rawText);

    // ---- Basic structure validation (safety) ----
    if (
      typeof parsed.foremal_beskrivning !== "string" ||
      typeof parsed.skick !== "string" ||
      typeof parsed.varde_min_sek !== "number" ||
      typeof parsed.varde_max_sek !== "number" ||
      typeof parsed.motivering !== "string"
    ) {
      throw new Error("Ogiltig struktur i Gemini-svar");
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("Edge function error:", err);

    return new Response(
      JSON.stringify({
        error:
          err instanceof Error ? err.message : "Internal server error",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
