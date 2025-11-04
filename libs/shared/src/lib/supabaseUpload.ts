// lib/supabaseUpload.ts
import { supabase } from "./supabase";

export async function uploadImages(files: File[], folder: string) {
  const uploadedUrls: string[] = [];

  for (const file of files) {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await supabase.storage
      .from("images") // byt mot din bucket
      .upload(filePath, file);

    if (error) {
      console.error("Supabase upload error:", error);
      throw new Error(`Kunde inte ladda upp ${file.name}`);
    }

    // Hämta publik URL
    const { data: urlData } = supabase.storage
      .from("images")
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) throw new Error(`Kunde inte hämta URL för ${file.name}`);

    const publicUrl = urlData.publicUrl;
    uploadedUrls.push(publicUrl);
  }

  return uploadedUrls;
}
