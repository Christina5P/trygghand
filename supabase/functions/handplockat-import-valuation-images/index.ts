import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

declare const Deno: { env: { get: (key: string) => string | undefined } };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getErrorMessage(err: unknown, fallback: string) {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as any).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
}

function isUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
  );
}

// ✅ Matchar din RLS: profiles.is_admin = true
async function isAdmin(service: any, userId: string): Promise<boolean> {
  const { data: profile, error } = await service
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle();

  if (error) return false;
  return Boolean((profile as any)?.is_admin);
}

function isHttpUrl(v: string) {
  return /^https?:\/\//i.test(String(v || "").trim());
}

function inferExtFromPath(path: string): string | null {
  const m = String(path).toLowerCase().match(/\.([a-z0-9]+)$/i);
  if (!m?.[1]) return null;
  const ext = m[1];
  // normalisera lite
  if (ext === "jpeg") return "jpg";
  return ext;
}

function inferExtFromMime(mime: string | undefined): string | null {
  const m = (mime || "").toLowerCase();
  if (m.includes("image/png")) return "png";
  if (m.includes("image/jpeg")) return "jpg";
  if (m.includes("image/webp")) return "webp";
  if (m.includes("image/heic")) return "heic";
  return null;
}

async function downloadFromBuckets(service: any, buckets: string[], path: string) {
  for (const bucket of buckets) {
    const { data, error } = await service.storage.from(bucket).download(path);
    if (!error && data) {
      // data är Blob
      const buffer = await data.arrayBuffer();
      const contentType = (data as any).type as string | undefined;
      return { bytes: new Uint8Array(buffer), bucket, contentType };
    }
  }
  throw new Error(`Object not found: ${path}`);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, { error: "Server configuration missing" });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const listingId = payload?.listing_id;
  const sourcePaths = Array.isArray(payload?.source_image_paths)
    ? payload.source_image_paths.map(String).filter(Boolean)
    : [];

  // valfritt: om du vet exakt vilken bucket värderingsbilderna ligger i
  const sourceBucket = typeof payload?.source_bucket === "string" ? payload.source_bucket : null;

  // valfritt: om du vill styra flera buckets från klienten
  const sourceBucketsFromClient = Array.isArray(payload?.source_buckets)
    ? payload.source_buckets.map(String).filter(Boolean)
    : null;

  if (!isUuid(listingId)) return json(400, { error: "Invalid listing_id" });
  if (sourcePaths.length === 0) return json(400, { error: "Missing source_image_paths" });

  // Vi vill bara ha storage paths (inte URL)
if (sourcePaths.some((p: string) => isHttpUrl(p))) {
    return json(400, { error: "source_image_paths måste vara storage-paths (inte URL)." });
  }

  const authHeader = req.headers.get("authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return json(401, { error: "Unauthorized" });

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const admin = await isAdmin(service, user.id);
  if (!admin) return json(403, { error: "Forbidden" });

  // Default: prova buckets du faktiskt har (justera om du har fler)
  const defaultBuckets = ["images", "handplockat-private", "handplockat-public"];
  const buckets = sourceBucketsFromClient?.length
    ? sourceBucketsFromClient
    : sourceBucket
    ? [sourceBucket]
    : defaultBuckets;

  try {
    const importedPaths: string[] = [];

    for (const sourcePath of sourcePaths) {
      const { bytes, contentType } = await downloadFromBuckets(service, buckets, sourcePath);

      const MAX_BYTES = 10_000_000; // 10 MB, lite mer generöst vid import
      if (bytes.byteLength > MAX_BYTES) {
        return json(413, { error: "Bilden är för stor att importera (max 10 MB)." });
      }

      const ext = inferExtFromPath(sourcePath) || inferExtFromMime(contentType) || "jpg";
      const mime =
        contentType ||
        (ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg");

      const fileId = crypto.randomUUID();
      const targetPath = `handplockat-original/${listingId}/${fileId}.${ext}`;

      const { error: uploadErr } = await service.storage
        .from("handplockat-private")
        .upload(targetPath, new Blob([toArrayBuffer(bytes)], { type: mime }), { upsert: false });

      if (uploadErr) throw uploadErr;

      importedPaths.push(targetPath);
    }

    return json(200, {
      ok: true,
      imported_paths: importedPaths,
      source_buckets_tried: buckets,
    });
  } catch (err) {
    const msg = getErrorMessage(err, "Kunde inte importera bilder");
    // Gör not found tydligt
    if (msg.startsWith("Object not found:")) {
      return json(404, { error: msg, tried_buckets: buckets });
    }
    console.error("handplockat-import-valuation-images error", err);
    return json(500, { error: msg });
  }
});