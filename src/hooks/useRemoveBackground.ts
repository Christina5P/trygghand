import { removeBackground } from "@imgly/background-removal";
import { supabase } from "@/lib/supabase";

// Rotera en PNG/JPG-blob (efter friläggning) i 90-graders steg
async function rotateBlob(blob: Blob, rotationDeg: 0 | 90 | 180 | 270): Promise<Blob> {
  if (rotationDeg === 0) return blob;

  const img = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return blob;

  const swap = rotationDeg === 90 || rotationDeg === 270;
  canvas.width = swap ? img.height : img.width;
  canvas.height = swap ? img.width : img.height;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  const out = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b as Blob), "image/png")
  );
  return out;
}

// Skapa en URL som background-removal kan läsa (signed om private)
async function getProcessableImageUrl(pathOrUrl: string): Promise<string> {
  const v = String(pathOrUrl || "").trim();
  if (!v) throw new Error("Saknar bild-path.");

  if (/^https?:\/\//i.test(v)) return v; // redan url

  // testa private först, sen images
  const tryBuckets: Array<"handplockat-private" | "images"> = ["handplockat-private", "images"];
  for (const b of tryBuckets) {
    const { data, error } = await supabase.storage.from(b).createSignedUrl(v, 600);
    if (!error && data?.signedUrl) return data.signedUrl;
  }

  throw new Error("Kunde inte skapa signed URL för bilden (fel bucket/path).");
}

async function removeBgLocalAndUpload(args: {
  listingId: string;
  sourcePathOrUrl: string;     // storage-path (rekommenderat) eller url
  rotationDeg: 0 | 90 | 180 | 270;
}): Promise<string> {
  const { listingId, sourcePathOrUrl, rotationDeg } = args;

  // 1) hämta url (signed om private)
  const imageUrl = await getProcessableImageUrl(sourcePathOrUrl);

  // 2) frilägg (gratis i browsern)
  // removeBackground kan ta en URL-string. (Du kan även hämta blob själv om du vill.)
  const cutoutBlob: Blob = await removeBackground(imageUrl);

  // 3) rotera om användaren valt
  const rotated = await rotateBlob(cutoutBlob, rotationDeg);

  // 4) ladda upp till public bucket
  const filename = `1.png`;
  const targetPath = `handplockat/${listingId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from("handplockat-public")
    .upload(targetPath, rotated, { upsert: true, contentType: "image/png" });

  if (uploadError) throw uploadError;

  // 5) public url
  const { data: pub } = supabase.storage.from("handplockat-public").getPublicUrl(targetPath);
  if (!pub?.publicUrl) throw new Error("Kunde inte skapa public URL.");

  return pub.publicUrl;
}