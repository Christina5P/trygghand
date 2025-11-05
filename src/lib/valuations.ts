// src/lib/valuations.ts

import { supabase } from "./supabase";

/**
 * Sparar AI-analysen och bild-URL:er i 'valuations' tabellen.
 * @param customerId Kund-ID (kan vara null).
 * @param analysis Den rena JSON-strängen från AI-analysen.
 * @param imageUrls Array med publika URL:er till de uppladdade bilderna.
 */
export async function saveValuation(customerId: string | null, analysis: string, imageUrls: string[]) {
  if (!analysis || typeof analysis !== "string" || analysis.trim() === "") {
    throw new Error("Missing analysis text when saving valuation");
  }

  const payload = {
    customer_id: customerId,
    analysis: analysis,      // skriv till 'analysis' om DB-kolumnen heter så
    image_urls: imageUrls,
  };

  const { data, error } = await supabase
    .from("valuations")      // eller public.valuations beroende på vy/tabell
    .insert(payload)
    .select(); // Se till att du faktiskt väljer data du vill ha tillbaka

  if (error) {
    console.error("ERROR saving valuation:", error, { payload });
    throw new Error(error.message ?? JSON.stringify(error));
  }

  // Returnera insatta raden så anropare kan bekrefta och trigga reload
  return data?.[0] ?? null;
}

/**
 * Ladda upp filer till storage-bucket 'images' och returnera URL:er.
 * Om bucket är privat, växla till createSignedUrl för att få åtkomliga länkar.
 */
export async function uploadImages(files: File[], folder = "valuations"): Promise<string[]> {
  const urls: string[] = [];

  for (const file of files) {
    const filename = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const filePath = folder ? `${folder}/${filename}` : filename;

    const { data: uploadData, error: uploadError } = await supabase
       .storage
       .from("images")
       .upload(filePath, file, { upsert: false });

     if (uploadError) {
       console.error("Upload error:", uploadError);
       throw uploadError;
     }

    const { data: publicData } = supabase
       .storage
       .from("images")
       .getPublicUrl(filePath);

    // push publicUrl om den finns, annars fallback till uploadData.path eller filePath
    if (publicData?.publicUrl) {
      urls.push(publicData.publicUrl);
    } else {
      console.warn("Could not get public url for", filePath, "falling back to path:", uploadData?.path ?? filePath);
      urls.push(uploadData?.path ?? filePath);
    }
  }

  return urls;
}

/**
 * Wrapper: ladda upp filer först, spara sedan valuation med de resulterande URL:erna.
 */
export async function uploadAndSaveValuation(customerId: string | null, analysis: string, files: File[]) {
  const imageUrls = files && files.length ? await uploadImages(files, `valuations/${customerId ?? "anon"}`) : [];
  const saved = await saveValuation(customerId, analysis, imageUrls);
  return saved;
}