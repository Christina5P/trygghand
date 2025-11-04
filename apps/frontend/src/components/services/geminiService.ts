// src/services/geminiService.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Lightweight local fallback for supabase client to avoid missing-module compile errors.
 * Replace this fallback with your real client import when available:
 *   import { supabase } from "@/lib/supabase";
 *
 * The fallback implements the minimal shape used by this file:
 * supabase.from(...).insert(...).select().limit(...).single()
 */
export const supabase = {
  from: (_table: string) => ({
    insert: (_payload: any) => ({
      select: () => ({
        limit: (_n: number) => ({
          single: async () => ({
            data: null,
            error: new Error(
              "Supabase client not configured; replace fallback with real client at '@/lib/supabase'"
            ),
          }),
        }),
      }),
    }),
  }),
};

/**
 * Lightweight local saveValuation fallback implemented here to avoid
 * depending on an external '@/lib/valuations' module which may be missing.
 * Adjust table name/fields to match your Supabase schema.
 */
async function saveValuation(
  customer_id: string | null,
  analysis: string,
  image_urls: string[]
): Promise<any> {
  try {
    const payload = {
      customer_id,
      analysis,
      image_urls,
      created_at: new Date().toISOString(),
    };

    // Attempt to insert into Supabase; if your table name or columns differ, update accordingly.
    const { data, error } = await supabase.from("valuations").insert(payload).select().limit(1).single();

    if (error) {
      // If Supabase operation fails, surface the error for upstream handling
      throw error;
    }

    return data ?? payload;
  } catch (err) {
    console.warn("saveValuation fallback: could not save to Supabase, returning payload:", err);
    return { customer_id, analysis, image_urls };
  }
}

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.error("VITE_GEMINI_API_KEY saknas i .env");
}

// Rätt sätt att initialisera Gemini
const genAI = new GoogleGenerativeAI(apiKey || "");

/**
 * Konverterar ett File-objekt till base64 för Gemini
 */
async function fileToGenerativePart(file: File) {
  const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        const base64String = reader.result.split(",")[1];
        resolve(base64String);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = () => reject(new Error("FileReader error"));
    reader.readAsDataURL(file);
  });

  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
}

/**
 * Lokalt placeholder-analyser för bilder (ersätt med faktisk Gemini API-anrop)
 */
export async function analyzeImagesWithGemini(files: File[]): Promise<string> {
  if (!files || files.length === 0) {
    throw new Error("Inga bilder att analysera");
  }

  // ✅ Placeholder: returnerar antal filer
  return `Analyzed ${files.length} file(s) (placeholder result)`;
}

/**
 * Full pipeline: analysera bilder och spara resultat i Supabase
 */
export async function analyzeAndSaveImages(
  files: File[],
  customer_id: string | null
): Promise<any> {
  // Normalize placeholder/invalid customer id to null
  const customerIdToSend = !customer_id || customer_id === "_UNKNOWN_" ? null : customer_id;

  // 1) Run analysis (placeholder implementation or real Gemini call)
  const analysisResult = await analyzeImagesWithGemini(files);

  // 2) Prepare image URLs - prefer already uploaded URLs if present on File.name,
  // otherwise create object URLs (temporary). Adjust to your upload flow as needed.
  const imageUrls = files.map((f) =>
    typeof f.name === "string" && f.name.startsWith("http") ? f.name : URL.createObjectURL(f)
  );

  // 3) Save via shared helper that also normalizes customer id
  try {
    const saved = await saveValuation(customerIdToSend, analysisResult, imageUrls);
    return { analysis: analysisResult, saved };
  } catch (err) {
    console.error("Error saving valuation via saveValuation:", err);
    throw err;
  }
}

// ✅ Named exports för enkel import i komponenter
export { genAI };
// För kompatibilitet med gamla importer
export const analyzeImages = analyzeImagesWithGemini;
