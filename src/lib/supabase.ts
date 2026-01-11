// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

// HMR-säker singleton för att undvika flera GoTrueClient-instanser
const globalForSupabase = globalThis as unknown as {
  __supabase?: SupabaseClient;
};

export const supabase: SupabaseClient =
  globalForSupabase.__supabase ??
  (globalForSupabase.__supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Unik nyckel för den här appen så att parallella instanser inte krockar
      storageKey: "sb-trygghand-auth",
    },
  }));

export function isUnauthorizedError(err: unknown): boolean {
  const e = err as any;
  const status = e?.status ?? e?.context?.status;
  const message = typeof e?.message === "string" ? e.message.toLowerCase() : "";
  const name = typeof e?.name === "string" ? e.name.toLowerCase() : "";
  return (
    status === 401 ||
    name.includes("unauthorized") ||
    message === "unauthorized" ||
    message.includes("jwt expired") ||
    message.includes("invalid jwt") ||
    message.includes("missing authorization")
  );
}

export function isMissingColumnError(err: unknown, columnName?: string): boolean {
  const e = err as any;
  const code = typeof e?.code === "string" ? e.code : undefined;
  const message = typeof e?.message === "string" ? e.message.toLowerCase() : "";
  if (code !== "42703") return false;
  if (!columnName) return true;
  return message.includes(columnName.toLowerCase()) && message.includes("does not exist");
}

export async function tryRefreshSession(): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return false;
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error) return false;
    return !!refreshed.session;
  } catch {
    return false;
  }
}


// ---------- IMAGE UPLOAD (for valuations etc) ----------
/** ligger i supabaseUploads istället
export async function uploadImages(files: File[]): Promise<string[]> {
  const results: string[] = [];

  for (const file of files) {
    const safeName = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
    const filePath = `public/${safeName}`;

    const { data, error } = await supabase.storage
      .from("images")
      .upload(filePath, file);

    if (error) throw error;

    const { data: pub } = supabase.storage
      .from("images")
      .getPublicUrl(filePath);

    results.push(pub?.publicUrl ?? "");
  }

  return results;
}


// ---------- DEBUG STORAGE ----------
/** Manuell test för att kontrollera anslutningen till Supabase Storage och verifiera
 * att det finns filer i en specifik mapp (documents/fullmakter). 
 * Den är inte avsedd att användas i den slutgiltiga applikationen, utan snarare som ett tillfälligt verktyg under utvecklingsfasen. */

export async function debugStorage() {
  const list = await supabase.storage.from("documents").list("fullmakter", {
    limit: 100,
  });
  console.log("DEBUG list fullmakter:", list);
}
