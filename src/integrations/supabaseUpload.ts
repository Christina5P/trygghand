import { supabase } from '@/lib/supabase';

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
export async function uploadImages(files: File[], folder = "valuations"): Promise<string[]> {
  checkSupabaseIsConfigured();
  
  const uploadBucket = 'images'; // Använder bucket-namnet från din aktiva kod

  const uploadPromises = files.map(file => {
    // Skapa ett unikt filnamn och sökväg (t.ex. public/1678888888-image.jpg)
    const safeName = file.name.replace(/\s/g, '_');
    const fileName = folder ? `${folder}/${Date.now()}-${safeName}` : `${Date.now()}-${safeName}`;
    
    // Skicka uppladdningsbegäran
    return supabase!.storage.from(uploadBucket).upload(fileName, file);
  });

  // Utför alla uppladdningar samtidigt
  const uploadResults = await Promise.all(uploadPromises);

  const urls: string[] = [];
  for (const result of uploadResults) {
    if (result.error) {
      console.error('Error uploading image:', result.error.message);
      // Kastar det första felet som hittas
      throw new Error(`Kunde inte ladda upp en bild: ${result.error.message}`);
    }
    
    // Hämta den publika URL:en för den uppladdade filen
    const { data } = supabase.storage.from(uploadBucket).getPublicUrl(result.data.path);
    urls.push(data.publicUrl);
  }

  return urls;
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