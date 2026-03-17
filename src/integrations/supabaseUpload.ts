import { supabase } from "@/lib/supabase";
import { buildCustomerPath, insertCustomerFile } from "@/lib/customerFiles";
import imageCompression from "browser-image-compression";

/**
 * Kontrollera Supabase
 */
function checkSupabaseIsConfigured(): void {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Check your VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
    );
  }
}

/**
 * 🔥 CENTRAL UPLOAD PIPELINE (ENDA stället där bilder processas)
 */
export async function uploadImages(
  files: File[],
  folder = "valuations",
  options?: { customerId?: string; returnType?: "path" | "signedUrl" }
): Promise<string[]> {
  checkSupabaseIsConfigured();

  const uploadBucket = "images";
  const customerId = options?.customerId;
  const returnType = options?.returnType ?? "path";

  if (!customerId) throw new Error("Missing customer_id for upload");

  const uploadTasks = files.map(async (file) => {
    // 🔥 1. Ta bort EXIF
    const stripped = await stripExif(file);

    // 🔥 2. Komprimera (DETTA LÖSER DIN MOBIL-PROBLEM)
    const compressed = await imageCompression(stripped, {
      maxSizeMB: 0.4, // 🔥 viktig
      maxWidthOrHeight: 1600,
      useWebWorker: true,
    });

    const ext = "jpg";
    const fileId = crypto.randomUUID();
    const filename = `${fileId}.${ext}`;
    const path = buildCustomerPath(customerId, [folder], filename);

    const { error } = await supabase.storage
      .from(uploadBucket)
      .upload(path, compressed, {
        upsert: false,
        contentType: compressed.type, // 🔥 viktig
      });

    if (error) {
      console.error("Error uploading image:", error.message);
      throw new Error(`Kunde inte ladda upp en bild: ${error.message}`);
    }

    // Spara metadata
    await insertCustomerFile({
      customerId,
      bucket: uploadBucket,
      path,
      fileType: compressed.type || null,
      size: compressed.size,
    });

    // Returnera signed URL om behövs
    if (returnType === "signedUrl") {
      const { data, error } = await supabase.storage
        .from(uploadBucket)
        .createSignedUrl(path, 600);

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
 * Tar bort EXIF (rotation + metadata)
 */
export async function stripExif(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");

    canvas.width = Math.max(1, bitmap.width);
    canvas.height = Math.max(1, bitmap.height);

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0);

    const blob: Blob = await new Promise((resolve, reject) => {
      const type = "image/jpeg"; // 🔥 alltid jpeg (mindre än png)
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Kunde inte skapa bildblob"))),
        type,
        0.9
      );
    });

    const baseName = file.name.replace(/\.[^/.]+$/, "");

    return new File([blob], `${baseName}-clean.jpg`, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
  } catch (err) {
    console.warn("stripExif failed, using original file", err);
    return file;
  }
}

/**
 * (Behåll om du använder den någonstans)
 */
export type UploadResult = {
  url: string;
  key?: string;
};

export async function uploadToSupabase(
  file: File,
  options?: { bucket?: string }
): Promise<UploadResult> {
  if (!file) throw new Error("No file provided");

  return Promise.resolve({
    url: `https://example.invalid/uploads/${encodeURIComponent(file.name)}`,
    key: file.name,
  });
}