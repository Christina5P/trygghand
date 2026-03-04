import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const args = process.argv.slice(2);

const writeMode = args.includes("--write");
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const maxDimensionArg = args.find((arg) => arg.startsWith("--max-dimension="));
const qualityArg = args.find((arg) => arg.startsWith("--quality="));
const onlyIdArg = args.find((arg) => arg.startsWith("--only-id="));

const limit = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : 0;
const maxDimension = maxDimensionArg ? Number.parseInt(maxDimensionArg.split("=")[1], 10) : 1600;
const quality = qualityArg ? Number.parseInt(qualityArg.split("=")[1], 10) : 82;
const onlyIds = new Set(
  (onlyIdArg?.split("=")[1] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);

if (Number.isNaN(limit) || limit < 0) {
  console.error("Invalid --limit value. Use a non-negative integer.");
  process.exit(1);
}

if (Number.isNaN(maxDimension) || maxDimension < 320) {
  console.error("Invalid --max-dimension value. Use an integer >= 320.");
  process.exit(1);
}

if (Number.isNaN(quality) || quality < 40 || quality > 95) {
  console.error("Invalid --quality value. Use an integer between 40 and 95.");
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing environment variables. Required: SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const BUCKET = "handplockat-public";
const PAGE_SIZE = 200;

const summary = {
  rowsRead: 0,
  rowsUpdated: 0,
  imagesChecked: 0,
  imagesConverted: 0,
  imagesSkipped: 0,
  imagesFailed: 0,
  bytesBefore: 0,
  bytesAfter: 0,
};

function parsePublicStorageUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value);
    const marker = "/storage/v1/object/public/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    const relative = url.pathname.slice(markerIndex + marker.length);
    const slashIndex = relative.indexOf("/");
    if (slashIndex === -1) return null;

    const bucket = relative.slice(0, slashIndex);
    const objectPath = relative.slice(slashIndex + 1);
    if (!bucket || !objectPath) return null;

    return { bucket, objectPath };
  } catch {
    return null;
  }
}

function toWebpPath(objectPath) {
  return objectPath.replace(/\.(png|jpg|jpeg|webp)$/i, "") + ".webp";
}

async function optimizeUrlIfNeeded(url) {
  summary.imagesChecked += 1;

  const parsed = parsePublicStorageUrl(url);
  if (!parsed || parsed.bucket !== BUCKET) {
    summary.imagesSkipped += 1;
    return url;
  }

  const inputPath = parsed.objectPath;
  const outputPath = toWebpPath(inputPath);

  if (inputPath.toLowerCase().endsWith(".webp")) {
    summary.imagesSkipped += 1;
    return url;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const sourceBuffer = Buffer.from(await response.arrayBuffer());
    summary.bytesBefore += sourceBuffer.byteLength;

    const optimizedBuffer = await sharp(sourceBuffer)
      .rotate()
      .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    if (optimizedBuffer.byteLength >= sourceBuffer.byteLength * 0.98) {
      summary.imagesSkipped += 1;
      return url;
    }

    summary.bytesAfter += optimizedBuffer.byteLength;

    if (writeMode) {
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(outputPath, optimizedBuffer, {
          upsert: true,
          cacheControl: "31536000",
          contentType: "image/webp",
        });

      if (uploadError) throw uploadError;
    }

    const { data: pubData } = supabase.storage.from(BUCKET).getPublicUrl(outputPath);
    summary.imagesConverted += 1;
    return pubData.publicUrl;
  } catch (error) {
    summary.imagesFailed += 1;
    console.warn(`Failed to optimize image: ${url}`);
    console.warn(String(error));
    return url;
  }
}

async function processListingRow(row) {
  const nextImageCutout = await optimizeUrlIfNeeded(row.image_cutout || "");

  const currentArray = Array.isArray(row.images_cutout) ? row.images_cutout.filter(Boolean) : [];
  const nextImagesCutout = [];
  for (const imageUrl of currentArray) {
    nextImagesCutout.push(await optimizeUrlIfNeeded(imageUrl));
  }

  const changedImageCutout = nextImageCutout !== (row.image_cutout || null);
  const changedArray = JSON.stringify(nextImagesCutout) !== JSON.stringify(currentArray);
  const changed = changedImageCutout || changedArray;

  if (!changed) return;

  if (writeMode) {
    const { error: updateError } = await supabase
      .from("handplockat_listings")
      .update({
        image_cutout: nextImageCutout || null,
        images_cutout: nextImagesCutout,
      })
      .eq("id", row.id);

    if (updateError) throw updateError;
  }

  summary.rowsUpdated += 1;
  console.log(`${writeMode ? "UPDATED" : "DRY-RUN"} listing ${row.id}`);
}

async function main() {
  console.log(writeMode ? "Write mode: ON" : "Write mode: OFF (dry-run)");
  console.log(`Settings: maxDimension=${maxDimension}, quality=${quality}, limit=${limit || "all"}`);

  let offset = 0;

  while (true) {
    const to = offset + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("handplockat_listings")
      .select("id,image_cutout,images_cutout")
      .order("created_at", { ascending: false })
      .range(offset, to);

    if (error) throw error;
    if (!data?.length) break;

    for (const row of data) {
      if (onlyIds.size > 0 && !onlyIds.has(row.id)) continue;
      if (limit > 0 && summary.rowsRead >= limit) break;

      summary.rowsRead += 1;
      await processListingRow(row);
    }

    if (limit > 0 && summary.rowsRead >= limit) break;

    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  const savedBytes = Math.max(0, summary.bytesBefore - summary.bytesAfter);
  const savedMb = (savedBytes / (1024 * 1024)).toFixed(2);

  console.log("\nDone.");
  console.log(`Rows read: ${summary.rowsRead}`);
  console.log(`Rows changed: ${summary.rowsUpdated}`);
  console.log(`Images checked: ${summary.imagesChecked}`);
  console.log(`Images converted: ${summary.imagesConverted}`);
  console.log(`Images skipped: ${summary.imagesSkipped}`);
  console.log(`Images failed: ${summary.imagesFailed}`);
  console.log(`Estimated bytes saved: ${savedBytes} (~${savedMb} MB)`);
}

main().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});
