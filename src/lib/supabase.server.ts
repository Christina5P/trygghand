import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * This module is server-only. Prevent accidental client-side import which
 * causes `process is not defined` in the browser.
 */
if (typeof window !== "undefined") {
  throw new Error("supabase.server.ts is server-only and must not be imported from client code.");
}

// Safe access to env vars in Node
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  throw new Error("Missing SUPABASE env variables");
}

export const supabaseServer = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Skapa en Supabase-klient för SSR eller API-routes (Node-miljö).
 * Används INTE i frontend!
 */

function parseCookieHeader(header: string): { name: string; value: string }[] {
  if (!header) return [];
  return header.split(";").map((kv) => {
    const [k, ...rest] = kv.split("=");
    const name = k.trim();
    const value = rest.join("=").trim();
    return { name, value };
  });
}

function serializeCookieHeader(name: string, value: string, options?: any): string {
  const parts = [`${name}=${value}`];
  if (options) {
    if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
    if (options.expires) parts.push(`Expires=${new Date(options.expires).toUTCString()}`);
    if (options.path) parts.push(`Path=${options.path}`);
    if (options.domain) parts.push(`Domain=${options.domain}`);
    if (options.httpOnly) parts.push(`HttpOnly`);
    if (options.secure) parts.push(`Secure`);
    if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  }
  return parts.join("; ");
}

export function createClient(request: Request) {
  const headers = new Headers();

  const supabase = createSupabaseClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            headers.append(
              "Set-Cookie",
              serializeCookieHeader(name, value, options)
            )
          );
        },
      },
    } as any
  );

  return { supabase, headers };
}