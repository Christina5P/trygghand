//src/lib/fullmakter.ts

import { supabase } from "./supabase"; // Antag att Supabase-klienten är korrekt konfigurerad
// import { v4 as uuidv4 } from "uuid"; // Denna import tas bort

export interface FullmaktRow {
  id: string;
  fullmaktsgivare: string;
  fullmakthavare: string;
  fullmaktstyp: string;
  status: string;
  kommentar?: string;
  dokument_url: string;
  created_at: string;
}

// ----------------- UPLOAD -----------------

/**
 * Laddar upp en fil till Supabase Storage i din 'fullmakts-filer' bucket
 * och genererar ett unikt filnamn med crypto.randomUUID().
 */
export async function uploadFullmakt(file: File, userId: string) {
  if (!file) return { success: false, error: "Ingen fil skickad" };
  if (!userId) return { success: false, error: "Saknar userId" };

  // Uppdaterad till din önskade bucket
  const bucket = "fullmakts-filer"; 
  
  const ext = file.name.split(".").pop()?.toLowerCase() || "dat";
  
  // ANVÄND crypto.randomUUID() istället för uuidv4()
  const filename = `${Date.now()}_${crypto.randomUUID()}.${ext}`;

  const key = `fullmakts-filer/${userId}/${filename}`;

  const { error } = await supabase.storage.from(bucket).upload(key, file);

  if (error) {
    console.error("UPLOAD ERROR:", error);
    return { success: false, error: error.message };
  }

  return { success: true, dokument_url: key };
}


// ----------------- GET FULLMAKTER -----------------

export async function getFullmakterForCustomer(customerId: string) {
  const { data, error } = await supabase
    .from("fullmakts-filer")
    .select("*")
    .eq("fullmakthavare", customerId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data ?? []) as FullmaktRow[];

  const withUrls = await Promise.all(
    rows.map(async (row) => {
      const signed = await getFullmaktSignedUrl(row.dokument_url);
      return { ...row, signedUrl: signed };
    })
  );

  return withUrls;
}


// ----------------- SIGNED URL (lista) -----------------

export async function getFullmaktSignedUrl(path: string, seconds = 3600) {
  void seconds;
  return `/api/templates/download?path=${encodeURIComponent(path)}`;
}


// ----------------- DELETE -----------------

export async function deleteFullmakt(id: string, dokument_url: string) {
  const { error: dbErr } = await supabase
    .from("fullmakters-filer")
    .delete()
    .eq("id", id);

  if (dbErr) throw dbErr;

  // Uppdaterad till din önskade bucket
  const { error: storageErr } = await supabase.storage 
    .from("fullmakts-filer")
    .remove([dokument_url]);

  if (storageErr) throw storageErr;

  return true;
}