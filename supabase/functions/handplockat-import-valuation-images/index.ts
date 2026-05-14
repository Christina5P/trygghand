// supabase/functions/handplockat-import-valuation-images/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

declare const Deno: { env: { get: (key: string) => string | undefined } };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      v
    )
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

function parseMaybeJson(value: unknown): any | null {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Tar emot:
 * - rena storage paths: "valuations/abc.jpg" => "valuations/abc.jpg"
 * - supabase object URL-paths: "/storage/v1/object/public/images/valuations/abc.jpg" => "valuations/abc.jpg"
 * - fulla URL:er till storage => "valuations/abc.jpg"
 *
 * Returnerar alltid "path i bucket" (utan bucket-prefix).
 */
function toStoragePath(value: unknown): string | null {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const fromObjectPath = (input: string): string | null => {
    const decoded = decodeURIComponent(input || "").replace(/^\/+/, "");
    if (!decoded) return null;

    const storageMatch = decoded.match(
      /^storage\/v1\/object\/(?:public|sign|authenticated)\/[^/]+\/(.+)$/i
    );
    if (storageMatch?.[1]) return storageMatch[1].replace(/^\/+/, "") || null;

    const objectMatch = decoded.match(
      /^object\/(?:public|sign|authenticated)\/[^/]+\/(.+)$/i
    );
    if (objectMatch?.[1]) return objectMatch[1].replace(/^\/+/, "") || null;

    return null;
  };

  if (!isHttpUrl(raw)) {
    const fromObject = fromObjectPath(raw);
    if (fromObject) return fromObject;

    // om klient skickar "images/valuations/..", "handplockat-private/..", etc
    return (
      raw
        .replace(/^\/+/, "")
        .replace(/^(images|handplockat-private|handplockat-public)\//i, "") ||
      null
    );
  }

  try {
    const url = new URL(raw);
    return fromObjectPath(url.pathname);
  } catch {
    return null;
  }
}

function normalizeStoragePaths(items: unknown[]): string[] {
  const normalized = items
    .map((item) => toStoragePath(item))
    .filter((item): item is string => Boolean(item));
  return Array.from(new Set(normalized));
}

/**
 * Försök läsa valuation med olika kolumnuppsättningar.
 * (Viktigt eftersom du såg 42703 på fel kolumnnamn tidigare.)
 */
async function getValuationById(service: any, valuationId: string) {
  const attempts = [
    // nyare/utökad
    "id, customer_id, auth_user_id, image_urls, analysis, analysis_result, deleted_at",
    // utan analysis_result
    "id, customer_id, auth_user_id, image_urls, analysis, deleted_at",
    // utan auth_user_id
    "id, customer_id, image_urls, analysis, analysis_result, deleted_at",
    // minimal
    "id, customer_id, image_urls, analysis, deleted_at",
  ];

  for (const selectCols of attempts) {
    const { data, error } = await service
      .from("valuations")
      .select(selectCols)
      .eq("id", valuationId)
      .is("deleted_at", null)
      .maybeSingle();

    // Om selectCols innehåller en kolumn som inte finns -> error, prova nästa.
    if (!error) return { data, error: null };
  }

  return { data: null, error: new Error("Could not read valuation") };
}

/**
 * Hitta importbara bildpaths i valuation.
 * Du har visat att image_urls kan innehålla "valuations/....jpg".
 */
function getAllowedValuationPaths(valuation: any): string[] {
  const analysis = parseMaybeJson(valuation?.analysis);
  const analysisResult = parseMaybeJson((valuation as any)?.analysis_result);

  const candidateArrays = [
    valuation?.image_urls,
    analysis?.image_paths,
    analysis?.image_urls,
    analysisResult?.image_paths,
    analysisResult?.image_urls,
  ];

  for (const candidate of candidateArrays) {
    if (!Array.isArray(candidate)) continue;
    const normalized = normalizeStoragePaths(candidate);
    if (normalized.length > 0) return normalized;
  }

  // fallback om någon lagrat enstaka sträng
  const singleCandidates = [
    (valuation as any)?.signedURL,
    (valuation as any)?.signedUrl,
    analysis?.signedURL,
    analysis?.signedUrl,
    analysisResult?.signedURL,
    analysisResult?.signedUrl,
  ];

  for (const candidate of singleCandidates) {
    const path = toStoragePath(candidate);
    if (path) return [path];
  }

  return [];
}

function inferExtFromPath(path: string): string | null {
  const m = String(path).toLowerCase().match(/\.([a-z0-9]+)$/i);
  if (!m?.[1]) return null;
  const ext = m[1];
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

async function downloadFromBuckets(
  service: any,
  buckets: string[],
  path: string
) {
  for (const bucket of buckets) {
    const { data, error } = await service.storage.from(bucket).download(path);
    if (!error && data) {
      const buffer = await data.arrayBuffer();
      const contentType = (data as any).type as string | undefined;
      return { bytes: new Uint8Array(buffer), bucket, contentType };
    }
  }
  throw new Error(`Object not found: ${path}`);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength
  ) as ArrayBuffer;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
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
  const valuationId = payload?.valuation_id;

  // Optional (säkerhets-check): klient skickar paths den tror är i valuation
  const sourcePathsFromClient = Array.isArray(payload?.source_image_paths)
    ? normalizeStoragePaths(payload.source_image_paths)
    : [];

  if (!isUuid(listingId)) return json(400, { error: "Invalid listing_id" });
  if (!isUuid(valuationId)) return json(400, { error: "Invalid valuation_id" });

  // Auth user (anon client + JWT)
  const authHeader = req.headers.get("authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userErr || !user) return json(401, { error: "Unauthorized" });

  // Service role for storage/db reads & writes
  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const admin = await isAdmin(service, user.id);

  // Läs valuation och gör ownership-check
  const { data: valuation, error: valuationError } = await getValuationById(
    service,
    valuationId
  );
  if (valuationError) return json(500, { error: "Could not verify valuation" });
  if (!valuation) return json(404, { error: "Valuation not found" });

  // ✅ Ägarskap: kund ska kunna importera även om admin har "bytt kund" på värderingen.
  // Vi tar customer_id först (nytt), annars auth_user_id (äldre rader).
  const valuationCustomerId = String((valuation as any)?.customer_id ?? "");
  const valuationAuthUserId = String((valuation as any)?.auth_user_id ?? "");
  const ownerId = valuationCustomerId || valuationAuthUserId;
  const isOwner = Boolean(ownerId) && ownerId === user.id;

  if (!admin && !isOwner) {
    // logga utan persondata
    console.warn("handplockat_import_forbidden_owner_mismatch", {
      user_id: user.id,
      valuation_id: valuationId,
      listing_id: listingId,
      owner_id: ownerId || null,
      created_at: new Date().toISOString(),
    });
    return json(403, { error: "Forbidden" });
  }

  // Derivera tillåtna paths från valuation (server-side)
  const allowedSourcePaths = getAllowedValuationPaths(valuation);
  if (allowedSourcePaths.length === 0) {
    return json(400, { error: "No importable valuation images found" });
  }

  // Om klienten skickade paths: logga varning men tillåt ändå (server-side validation räcker)
  if (sourcePathsFromClient.length > 0) {
    // Ingen URL tillåten i klientdata
    if (sourcePathsFromClient.some((p) => isHttpUrl(p))) {
      return json(400, {
        error: "source_image_paths måste vara storage-paths (inte URL).",
      });
    }

    const allowedSet = new Set(allowedSourcePaths);
    const mismatch = sourcePathsFromClient.some((p) => !allowedSet.has(p));
    if (mismatch) {
      console.warn("handplockat_import_path_mismatch_but_allowed", {
        user_id: user.id,
        valuation_id: valuationId,
        listing_id: listingId,
        client_paths: sourcePathsFromClient,
        server_paths: allowedSourcePaths,
        created_at: new Date().toISOString(),
      });
      // Tillåt ändå - server-side validation räcker
    }
  }

  // Buckets att prova för nedladdning (justera om du vet exakt)
  const buckets = ["images", "handplockat-private", "handplockat-public"];

  try {
    const importedPaths: string[] = [];

    // Importera ALLA images från valuation (inte klientens lista)
    for (const sourcePath of allowedSourcePaths) {
      const { bytes, contentType } = await downloadFromBuckets(
        service,
        buckets,
        sourcePath
      );

      const MAX_BYTES = 10_000_000;
      if (bytes.byteLength > MAX_BYTES) {
        return json(413, {
          error: "Bilden är för stor att importera (max 10 MB).",
        });
      }

      const ext =
        inferExtFromPath(sourcePath) || inferExtFromMime(contentType) || "jpg";
      const mime =
        contentType ||
        (ext === "png"
          ? "image/png"
          : ext === "webp"
          ? "image/webp"
          : "image/jpeg");

      const fileId = crypto.randomUUID();
      const targetPath = `handplockat-original/${listingId}/${fileId}.${ext}`;

      const { error: uploadErr } = await service.storage
        .from("handplockat-private")
        .upload(targetPath, new Blob([toArrayBuffer(bytes)], { type: mime }), {
          upsert: false,
        });

      if (uploadErr) throw uploadErr;

      importedPaths.push(targetPath);
    }

    return json(200, {
      ok: true,
      imported_paths: importedPaths,
      valuation_id: valuationId,
      source_buckets_tried: buckets,
      is_admin: admin,
      is_owner: isOwner,
      allowed_source_paths_count: allowedSourcePaths.length,
      debug_info: {
        client_provided_paths: sourcePathsFromClient.length,
        server_extracted_paths: allowedSourcePaths.length,
        total_images_processed: importedPaths.length
      }
    });
  } catch (err) {
    const msg = getErrorMessage(err, "Kunde inte importera bilder");
    if (msg.startsWith("Object not found:")) {
      return json(404, { 
        error: "Bilderna från värderingen kunde inte hittas. Kontrollera att värderingen innehåller giltiga bilder.",
        tried_buckets: buckets,
        details: msg
      });
    }
    if (msg.includes("storage") || msg.includes("upload")) {
      return json(500, { 
        error: "Kunde inte spara importerade bilder. Försök igen senare.",
        details: msg
      });
    }
    console.error("handplockat-import-valuation-images error", err);
    return json(500, { error: msg });
  }
});