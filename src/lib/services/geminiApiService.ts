import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import { saveValuation } from "@/lib/valuations";
import { uploadImages } from "@/integrations/supabaseUpload";

// --- 1. Initialisering och API-nyckel ---
const apiKey = import.meta.env.VITE_GEMINI_API_KEY; 
if (!apiKey) {
  console.error("VITE_GEMINI_API_KEY saknas i .env. Kom ihåg att starta om servern vid ändringar.");
}
const genAI = new GoogleGenerativeAI(apiKey || "");

// --- 2. Filkonvertering (För Gemini, skickar Base64) ---
async function fileToGenerativePart(file: File): Promise<Part> {
  return new Promise<Part>( (resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Unable to read file as DataURL"));
        return;
      }
      const base64String = result.split(",")[1];
      if (!base64String) {
        reject(new Error("Invalid DataURL format (missing base64 part)"));
        return;
      }
      resolve({ 
        inlineData: { 
          data: base64String, 
          mimeType: file.type 
        } 
      });
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read error"));
    reader.readAsDataURL(file);
  });
}

// --- 3. Gemini API Anrop med JSON ---
/** * Exporteras för att tillåta anrop av endast analysen (utan uppladdning och spara i DB).
 */
export async function analyzeImageViaApi(imageFiles: File[], extraPrompt?: string): Promise<string> {
  if (imageFiles.length === 0) {
    throw new Error("No image files provided for analysis.");
  }

  const MAX_FILE_SIZE_MB = 4;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
  for (const file of imageFiles) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`Bildfilen "${file.name}" är för stor (${(file.size / 1024 / 1024).toFixed(2)} MB). Max tillåten storlek är ${MAX_FILE_SIZE_MB} MB per fil.`);
    }
  }
  
  try {
    const imageParts = await Promise.all(
      imageFiles.map(file => fileToGenerativePart(file))
    );

    // Om extraPrompt finns, bifoga det som kompletterande information till modellen
    const extraInfoText = extraPrompt && extraPrompt.trim() ? `\n\nYtterligare information från användaren: ${extraPrompt.trim()}` : "";
    const prompt = `Fyll i följande JSON-schema baserat på bilderna. Alltid svara exakt i detta format, inga extra kommentarer eller text utanför JSON-objektet:${extraInfoText}
 {
     "foremal_beskrivning": "Detaljerad beskrivning av föremålet/föremålen.",
     "skick": "Uppskattat skick (t.ex. 'Bra skick med normalt slitage').",
     "varde_min_sek": 0,
     "varde_max_sek": 0,
     "motivering": "Kortfattad motivering för prisintervallet baserat på märke, ålder och marknadstrender."
 }
 `;
    const systemInstruction = "Du är en expert på andrahandsvärdering av lösöre. Ditt enda uppdrag är att returnera värderingen i det strikta JSON-format som specificeras i användarprompten.";

    const parts: Part[] = [
      { text: prompt }, 
      ...imageParts
    ];
    
    // DEBUG LOGG: Kontrollera input data
    console.log("DEBUG: Parts prepared for Gemini:", parts.length, "parts total.");
    if (imageParts.length > 0) {
        console.log("DEBUG: First image MIME type:", imageParts[0].inlineData?.mimeType);
        console.log("DEBUG: First image Base64 length:", imageParts[0].inlineData?.data?.length || 0);
    }
    // ------------------------------------

    const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        systemInstruction: systemInstruction 
    });

    const response = await model.generateContent({ 
      contents: [{ role: "user", parts: parts }],
      generationConfig: {
        temperature: 0.1, 
        responseMimeType: "application/json", 
      }
    } as any); 

    // Freeze response to avoid proxies/getters
    const frozen = JSON.parse(JSON.stringify(response));
    console.log("DEBUG: frozen response snapshot length:", JSON.stringify(frozen).length);

    // 1) Try common SDK paths
    const commonPaths = [
      () => frozen?.candidates?.[0]?.content?.parts?.[0]?.text,
      () => frozen?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text,
      () => frozen?.output?.[0]?.content?.[0]?.text,
      () => frozen?.output_text,
      () => frozen?.text,
    ];
    let candidateString: string | null = null;
    for (const fn of commonPaths) {
      try {
        const v = fn();
        if (typeof v === "string" && v.trim().length > 0) {
          candidateString = v.trim();
          break;
        }
      } catch {}
    }

    // 2) If not found, recurse object to find a string that contains our key
    function findStringWithKey(obj: any, key: string): string | null {
      if (!obj) return null;
      if (typeof obj === "string") {
        if (obj.includes(key)) return obj;
        return null;
      }
      if (Array.isArray(obj)) {
        for (const el of obj) {
          const found = findStringWithKey(el, key);
          if (found) return found;
        }
      } else if (typeof obj === "object") {
        for (const k of Object.keys(obj)) {
          const found = findStringWithKey(obj[k], key);
          if (found) return found;
        }
      }
      return null;
    }
    if (!candidateString) {
      candidateString = findStringWithKey(frozen, "foremal_beskrivning");
    }

    if (!candidateString) {
      console.error("DEBUG: Could not locate analysis string in frozen response:", frozen);
      const finishReason = (frozen?.candidates?.[0]?.finishReason) ?? (frozen?.output?.[0]?.finishReason);
      const errMsg = finishReason ? `AI-anropet misslyckades tyst. Orsak: ${finishReason}.` : "AI returnerade inget användbart innehåll.";
      throw new Error(errMsg);
    }

    // 3) Robust parse: try several strategies (handles double-encoded / escaped strings)
    function robustParseJsonString(s: string): any {
      const trimmed = s.trim();

      // If it already looks like JSON object, try direct parse
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          return JSON.parse(trimmed);
        } catch (e) {
          // fallthrough to next strategies
        }
      }

      // If it's quoted (double-encoded), unquote once and try parse again
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        try {
          const unq = JSON.parse(trimmed);
          if (typeof unq === "string") {
            return robustParseJsonString(unq);
          }
          return unq;
        } catch (e) {
          // fallthrough
        }
      }

      // Try to unescape common escape sequences and parse
      try {
        const unescaped = trimmed.replace(/\\"/g, '"').replace(/\\n/g, "\\n").replace(/\\r/g, "\\r");
        if (unescaped.startsWith("{") || unescaped.startsWith("[")) {
          return JSON.parse(unescaped);
        }
      } catch (e) {
        // ignore
      }

      // Last resort: attempt to locate JSON substring (first { ... } containing our key)
      try {
        const first = trimmed.indexOf("{");
        const last = trimmed.lastIndexOf("}");
        if (first !== -1 && last !== -1 && last > first) {
          const sub = trimmed.slice(first, last + 1);
          return JSON.parse(sub);
        }
      } catch (e) {
        // ignore
      }

      throw new Error("Kunde inte tolka AI-svaret som JSON.");
    }

    let parsed: any;
    try {
      parsed = robustParseJsonString(candidateString);
    } catch (e) {
      console.error("Failed to parse JSON response (candidateString):", candidateString);
      console.error("Frozen response for debugging:", frozen);
      throw new Error("AI returnerade ogiltigt JSON-format eller dubbelt-enkodat text.");
    }

    // Return canonical JSON string (stored format used elsewhere)
    try {
      return JSON.stringify(parsed);
    } catch {
      return String(parsed);
    }
   } catch (error) {
     console.error("Error analyzing image with Gemini:", error);
     
     const errorMessage = error instanceof Error ? error.message : "An unknown API error occurred.";
     throw new Error(`Kunde inte utföra AI-värderingen. Detalj: ${errorMessage}`);
   }
 }


/**
 * Full pipeline: analysera bilder och spara resultat i Supabase
 * STEG 1: Ladda upp bilder permanent till Supabase Storage.
 * STEG 2: Anropa Gemini för värdering.
 * STEG 3: Spara värdering + permanenta URL:er i Supabase DB.
 * * Exporteras för att användas av huvudkomponenten (t.ex. ValueEstimator.tsx).
 */
export async function analyzeAndSaveImages(
  files: File[],
  customer_id: string | null,
  extraPrompt?: string
): Promise<any> {
  const customerIdToSend = !customer_id || customer_id === "_UNKNOWN_" ? null : customer_id;

  // NY LOGIK: Permanent uppladdning till Supabase Storage
  console.log("Uploading files to Supabase Storage permanently...");
  const permanentImageUrls = await uploadImages(files);
  console.log("Upload complete. Permanent URLs:", permanentImageUrls);

  // Analysera bilderna med Gemini (använder de ursprungliga File-objekten som innehåller Base64 data)
  const analysisResult = await analyzeImageViaApi(files, extraPrompt); 
  
  // Använd de permanenta URL:erna vid lagring i databasen
  try {
    const saved = await saveValuation(customerIdToSend, analysisResult, permanentImageUrls);
    return { analysis: analysisResult, saved };
  } catch (err) {
    console.error("Error saving valuation via saveValuation:", err);
    throw err;
  }
 }

// Exportera genAI och en gammal placeholder-funktion (för att inte bryta gammal kod)
export { genAI };
export const analyzeImages = async (images: string[]) => {
  // Detta är en placeholder för att inte bryta gammal kod som förväntar sig denna export.
};