// src/lib/fullmakter.ts
import { supabase } from "./supabase";
import { v4 as uuidv4 } from "uuid";

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

export async function uploadFullmakt(file: File, userId: string) {
  if (!file) return { success: false, error: "Ingen fil skickad" };
  if (!userId) return { success: false, error: "Saknar userId" };

  const bucket = "documents";
  const ext = file.name.split(".").pop()?.toLowerCase() || "dat";
  const filename = `${Date.now()}_${uuidv4()}.${ext}`;

  const key = `fullmakter/${userId}/${filename}`;

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
    .from("fullmakter")
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


// ----------------- SIGNED URL (view) -----------------

export async function getFullmaktSignedUrl(path: string, seconds = 3600) {
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, seconds);

  if (error) {
    console.error("SIGNED URL ERROR:", error);
    return null;
  }

  return data?.signedUrl ?? null;
}


// ----------------- DELETE -----------------

export async function deleteFullmakt(id: string, dokument_url: string) {
  const { error: dbErr } = await supabase
    .from("fullmakter")
    .delete()
    .eq("id", id);

  if (dbErr) throw dbErr;

  const { error: storageErr } = await supabase.storage
    .from("documents")
    .remove([dokument_url]);

  if (storageErr) throw storageErr;

  return true;
}
