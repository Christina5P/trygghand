import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Remote supabase-js for Deno resolved at deploy/runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

declare const Deno: { env: { get: (key: string) => string | undefined } };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { status: 200, headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json(500, { error: "Server configuration missing" });
  }

  // 1) Verify caller identity via JWT (no PII logged)
  const authHeader = req.headers.get("authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { error: "Unauthorized" });
  }

  // 2) Read-only list from Storage using service role
  const url = new URL(req.url);
  let prefixRaw = (url.searchParams.get("prefix") || "fullmaktsmallar") + "";
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body?.prefix) prefixRaw = String(body.prefix);
    } catch {
      return json(400, { error: "Invalid JSON" });
    }
  }
  const prefix = prefixRaw.replace(/^\/+/, "").replace(/\/+$/, "");

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await serviceClient.storage
    .from("fullmakts-filer")
    .list(prefix, { limit: 100 });

  if (error) {
    return json(500, { error: "Could not list templates" });
  }

  const templates = (data || [])
    .filter((f) => !!f?.name)
    .map((f) => ({ name: f.name, storage_path: `${prefix}/${f.name}` }));

  return json(200, { templates });
});
