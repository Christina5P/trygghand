import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only guard: prevent accidental client import
 */
if (typeof window !== "undefined") {
  throw new Error("supabase.server.js is server-only and must not be imported from client code.");
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in backend env");
  throw new Error("Missing SUPABASE env variables");
}

export const supabaseServer = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Lightweight cookie header parser
 */
function parseCookieHeader(header = "") {
  if (!header) return {};
  return header.split(";").reduce((acc, part) => {
    const [k, ...v] = part.split("=");
    const key = k?.trim();
    if (!key) return acc;
    acc[key] = decodeURIComponent((v || []).join("=").trim());
    return acc;
  }, {});
}

/**
 * Create a request-bound Supabase client for server routes.
 * Returns { supabase, headers } where headers can be forwarded to responses.
 */
export function createClient(request) {
  const cookieHeader = request && typeof request.getHeader === "function"
    ? request.getHeader("cookie")
    : (request && request.headers && (request.headers.get ? request.headers.get("cookie") : request.headers.cookie)) || "";

  const cookies = parseCookieHeader(cookieHeader);
  const accessToken =
    cookies["sb-access-token"] ||
    cookies["sb:token"] ||
    cookies["supabase-auth-token"] ||
    cookies["access_token"] ||
    null;

  const globalOptions = {
    fetch,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
  };

  const client = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { global: globalOptions });

  const responseHeaders = new Headers();
  return { supabase: client, headers: responseHeaders };
}

export default supabaseServer;