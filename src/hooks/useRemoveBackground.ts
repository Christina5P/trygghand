import { removeBackground } from "@imgly/background-removal";
import { supabase } from "@/lib/supabase";

export async function removeBgAndUpload(
  imageUrl: string
): Promise<string> {
  // 1️⃣ Ta bort bakgrund
  const blob = await removeBackground(imageUrl);

  // 2️⃣ Ladda upp till Supabase
  const filePath = `clean/${Date.now()}.png`;

  const { error } = await supabase.storage
    .from("handplockat-public")
    .upload(filePath, blob, {
      contentType: "image/png",
      upsert: true,
    });

  if (error) {
    console.error("Upload error:", error);
    throw error;
  }

  // 3️⃣ Returnera public URL
  const { data } = supabase.storage
    .from("handplockat-public")
    .getPublicUrl(filePath);

  return data.publicUrl;
}