// src/lib/valuations.ts

import { supabase } from "@/lib/supabase";
/**
 * Sparar AI-analysen och bild-URL:er i 'valuations' tabellen.
 * @param customerId Kund-ID (kan vara null).
 * @param analysis Den rena JSON-strängen från AI-analysen.
 * @param imageUrls Array med publika URL:er till de uppladdade bilderna.
 */
export async function saveValuation(
  analysis: unknown,
  imageUrls?: unknown
) {
  const safeAnalysis =
    typeof analysis === "string"
      ? analysis
      : JSON.stringify(analysis);

  const safeImages =
    Array.isArray(imageUrls)
      ? imageUrls.map(String)
      : [];

  console.log("DEBUG image_urls BEFORE RPC", imageUrls);
  console.log(
    "DEBUG image_urls types",
    Array.isArray(imageUrls)
      ? imageUrls.map(v => ({ value: v, type: typeof v }))
      : imageUrls
  );

  const payload = {
    p_analysis: safeAnalysis,
    p_image_urls: safeImages,
  };

  console.log("RPC FINAL PAYLOAD", payload);

  const { error } = await supabase.rpc(
    "customer_create_valuation",
    payload
  );

  if (error) {
    console.error("ERROR saving valuation:", error);
    throw error;
  }
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
export async function uploadAndSaveValuation(analysis: unknown, files: File[]) {
  const imageUrls = files && files.length ? await uploadImages(files, `valuations/anon`) : [];
  await saveValuation(analysis, imageUrls);
}

// Sanera filnamn så att Supabase Storage får en giltig key
const sanitizeFilename = (name: string) =>
  name
    .normalize("NFKD") // dela upp diakritiska tecken
    .replace(/[\u0300-\u036f]/g, "") // ta bort diakritiska tecken
    .replace(/[^a-zA-Z0-9._-]/g, "-") // ersätt ogiltiga tecken med '-'
    .replace(/-+/g, "-") // sammanfoga upprepade '-'
    .replace(/(^-+|-+$)/g, "") // ta bort ledande/efterföljande '-'
    .toLowerCase();