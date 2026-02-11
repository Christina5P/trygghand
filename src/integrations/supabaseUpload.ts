import { supabase } from "@/lib/supabase";
import { buildCustomerPath, insertCustomerFile } from "@/lib/customerFiles";

/**
 * Kontrollerar att Supabase-klienten är korrekt konfigurerad.
 * Kastar ett fel om nycklarna saknas.
 */
function checkSupabaseIsConfigured(): void {
  if (!supabase) {
    throw new Error("Supabase is not configured. Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.");
  }
}

// --- 2. Uppladdningsfunktion (Effektiv och Parallell) ---

/**
 * Laddar upp flera bildfiler till 'images' storage bucket parallellt.
 * Den här funktionen är asynkron (Promise.all) för optimal prestanda.
 * @param files Arrayen av File-objekt att ladda upp.
 * @returns Ett Promise som löser till en array av publika bild-URL:er.
 */
export async function uploadImages(
  files: File[],
  folder = "valuations",
  options?: { customerId?: string; returnType?: "path" | "signedUrl" }
): Promise<string[]> {
  checkSupabaseIsConfigured();
  
  const uploadBucket = "images"; // Använder bucket-namnet från din aktiva kod
  const customerId = options?.customerId;
  const returnType = options?.returnType ?? "path";

  if (!customerId) throw new Error("Missing customer_id for upload");

  const uploadTasks = files.map(async (file) => {
    const ext = (file.name.split(".").pop() || "bin").toLowerCase();
    const fileId = crypto.randomUUID();
    const filename = `${fileId}.${ext}`;
    const path = buildCustomerPath(customerId, [folder], filename);

    const result = await supabase.storage.from(uploadBucket).upload(path, file, { upsert: false });
    if (result.error) {
      console.error("Error uploading image:", result.error.message);
      throw new Error(`Kunde inte ladda upp en bild: ${result.error.message}`);
    }

    await insertCustomerFile({
      customerId,
      bucket: uploadBucket,
      path,
      fileType: file.type || null,
      size: file.size,
    });

    if (returnType === "signedUrl") {
      const { data, error } = await supabase.storage.from(uploadBucket).createSignedUrl(path, 600);
      if (error || !data?.signedUrl) {
        throw new Error("Kunde inte skapa signerad URL");
      }
      return data.signedUrl;
    }

    return path;
  });

  return Promise.all(uploadTasks);
}

/**
 * Minimal/safe implementation for the upload integration.
 * Replace the body with real Supabase client calls when ready.
 */

export type UploadResult = {
  url: string;
  key?: string;
};

export async function uploadToSupabase(file: File, options?: { bucket?: string }): Promise<UploadResult> {
  // TODO: replace with real supabase client code
  // This is a safe stub so TypeScript can resolve the import and types.
  if (!file) throw new Error('No file provided');
  // Return a fake URL for local dev/testing
  return Promise.resolve({
    url: `https://example.invalid/uploads/${encodeURIComponent(file.name)}`,
    key: file.name,
  });
}

// Exporterar klienten för andra funktioner om nödvändigt
// supabase-klienten kommer från '@/lib/supabase'