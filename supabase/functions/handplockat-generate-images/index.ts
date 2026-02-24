// @ts-ignore - Deno std library types resolved at runtime
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Remote supabase-js for Deno resolved at deploy/runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
// @ts-ignore - Deno module types resolved at runtime
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";

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

function isUuid(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

async function isAdmin(service: any, userId: string): Promise<boolean> {
  const { data: roles, error: rolesErr } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin");

  if (!rolesErr && Array.isArray(roles) && roles.length > 0) return true;

  const { data: profile, error: profileErr } = await service
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!profileErr && (profile as any)?.role === "admin") return true;
  return false;
}

async function downloadFromBuckets(service: any, buckets: string[], path: string) {
  for (const bucket of buckets) {
    const { data, error } = await service.storage.from(bucket).download(path);
    if (!error && data) {
      const buffer = await data.arrayBuffer();
      return { bytes: new Uint8Array(buffer), bucket };
    }
  }
  throw new Error("Kunde inte hamta originalbild");
}

const TARGET_SIZE = 1200;
const BG_COLOR = 0xf5f2edff;

type RemovalResult = {
  bytes: Uint8Array;
  usedProvider: string | null;
};

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

async function removeBackground(input: Uint8Array): Promise<RemovalResult> {
  const provider = (Deno.env.get("BACKGROUND_REMOVAL_PROVIDER") || "").toLowerCase();
  if (!provider) {
    return { bytes: input, usedProvider: null };
  }

  const start = Date.now();
  try {
    if (provider === "removebg") {
      const apiKey = Deno.env.get("REMOVEBG_API_KEY");
      if (!apiKey) throw new Error("REMOVEBG_API_KEY missing");

      const form = new FormData();
      form.append("image_file", new Blob([toArrayBuffer(input)], { type: "image/jpeg" }), "image.jpg");
      form.append("size", "auto");

      const res = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": apiKey },
        body: form,
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`remove.bg failed: ${msg}`);
      }

      const buffer = await res.arrayBuffer();
      console.log(`removeBackground provider=removebg latencyMs=${Date.now() - start}`);
      return { bytes: new Uint8Array(buffer), usedProvider: provider };
    }

    if (provider === "photoroom") {
      const apiKey = Deno.env.get("PHOTOROOM_API_KEY");
      if (!apiKey) throw new Error("PHOTOROOM_API_KEY missing");

      const form = new FormData();
      form.append("image_file", new Blob([toArrayBuffer(input)], { type: "image/jpeg" }), "image.jpg");

      const res = await fetch("https://sdk.photoroom.com/v1/segment", {
        method: "POST",
        headers: { "x-api-key": apiKey },
        body: form,
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`photoroom failed: ${msg}`);
      }

      const buffer = await res.arrayBuffer();
      console.log(`removeBackground provider=photoroom latencyMs=${Date.now() - start}`);
      return { bytes: new Uint8Array(buffer), usedProvider: provider };
    }

    if (provider === "replicate") {
      const apiKey = Deno.env.get("REPLICATE_API_TOKEN");
      if (!apiKey) throw new Error("REPLICATE_API_TOKEN missing");

      throw new Error("replicate provider not implemented");
    }

    console.log(`removeBackground provider=none latencyMs=${Date.now() - start}`);
    return { bytes: input, usedProvider: null };
  } catch (err) {
    console.warn(`removeBackground provider=${provider} failed`, err);
    return { bytes: input, usedProvider: null };
  }
}

async function generateImage(bytes: Uint8Array, useAlpha: boolean): Promise<Uint8Array> {
  const original = await Image.decode(bytes);
  const scale = Math.min(TARGET_SIZE / original.width, TARGET_SIZE / original.height);
  const nextWidth = Math.max(1, Math.round(original.width * scale));
  const nextHeight = Math.max(1, Math.round(original.height * scale));
  const resized = original.resize(nextWidth, nextHeight);

  const canvas = new Image(TARGET_SIZE, TARGET_SIZE);
  if (useAlpha) {
    canvas.fill(0x00000000);
  } else {
    canvas.fill(BG_COLOR);
  }
  const offsetX = Math.floor((TARGET_SIZE - nextWidth) / 2);
  const offsetY = Math.floor((TARGET_SIZE - nextHeight) / 2);
  canvas.composite(resized, offsetX, offsetY);

  if (useAlpha) {
    return await canvas.encodePNG();
  }
  return await canvas.encodeJPEG(90);
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
  const sourcePaths = Array.isArray(payload?.source_image_paths) ? payload.source_image_paths.map(String) : [];
  const sourceBucket = typeof payload?.source_bucket === "string" ? payload.source_bucket : null;

  if (!isUuid(listingId)) return json(400, { error: "Invalid listing_id" });
  if (sourcePaths.length === 0) return json(400, { error: "Missing source_image_paths" });

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

  const buckets = sourceBucket ? [sourceBucket] : ["handplockat-private", "images"];

  try {
    const publicUrls: string[] = [];

    for (let i = 0; i < sourcePaths.length; i += 1) {
      const path = sourcePaths[i];
      const { bytes } = await downloadFromBuckets(service, buckets, path);
      const removal = await removeBackground(bytes);
      const useAlpha = Boolean(removal.usedProvider);
      const processed = await generateImage(removal.bytes, useAlpha);
      const filename = `${i + 1}.${useAlpha ? "png" : "jpg"}`;
      const targetPath = `handplockat/${listingId}/${filename}`;

      const contentType = useAlpha ? "image/png" : "image/jpeg";
      const { error: uploadError } = await service.storage
        .from("handplockat-public")
        .upload(targetPath, new Blob([toArrayBuffer(processed)], { type: contentType }), { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicData } = service.storage.from("handplockat-public").getPublicUrl(targetPath);
      if (publicData?.publicUrl) publicUrls.push(publicData.publicUrl);
    }

    return json(200, { ok: true, public_urls: publicUrls });
  } catch (err) {
    console.error("handplockat-generate-images error", err);
    return json(500, { error: "Kunde inte skapa proffsbilder" });
  }
});
