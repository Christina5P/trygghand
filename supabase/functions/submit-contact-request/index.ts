// @ts-ignore - Remote Deno std import resolved at deploy/runtime
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
// @ts-ignore - Remote supabase-js for Deno resolved at deploy/runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import "https://deno.land/std@0.177.0/dotenv/load.ts";

// Minimal Deno typing to satisfy workspace TypeScript checks
declare const Deno: { env: { get: (key: string) => string | undefined } };

// This function must run with the anon key (RLS allows anon inserts)
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
const serviceRoleKey = process.env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY env");
}

const supabase = createClient(supabaseUrl!, anonKey!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing server configuration" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const { firstname, lastname, email, phone, message, service_interest } = await req.json();

    // Only firstname and phone mandatory; email and message optional
    if (!firstname || !phone) {
      return new Response(
        JSON.stringify({ error: "firstname and phone are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const payload = {
      firstname: String(firstname).slice(0, 200),
      lastname: lastname ? String(lastname).slice(0, 200) : "",
      email: String(email ?? "").toLowerCase().slice(0, 320),
      phone: String(phone).slice(0, 50),
      message: String(message ?? "").slice(0, 5000),
      service_interest: service_interest ? String(service_interest).slice(0, 200) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("contact_requests")
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error("submit-contact-request insert error:", error.message || error);
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true, data }), { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error("submit-contact-request exception:", err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || "Server error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

export interface Customer {
  id: string;
  name: string;
  email?: string | null; // Gör email optional
  phone: string;
  created_from_contact?: string;
  source?: string;
  // ... andra fält
}
