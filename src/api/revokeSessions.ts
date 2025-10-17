import type { IncomingMessage, ServerResponse } from "http";
import { createClient } from "@supabase/supabase-js";

/**
 * Server‑endpoint (Node) som tar emot POST { userId }
 * Kräver dessa env:
 *  - SUPABASE_URL
 *  - SUPABASE_SERVICE_ROLE  (mycket känslig — använd endast server)
 *  - REVOKE_API_KEY         (intern nyckel för att skydda endpointen)
 *
 * OBS: Anpassa export/handler till din hosting (Vercel, Netlify, Express etc.)
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const REVOKE_API_KEY = process.env.REVOKE_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE || !REVOKE_API_KEY) {
  console.warn("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE / REVOKE_API_KEY env vars for revokeSessions");
}

const supabaseAdmin = createClient(SUPABASE_URL || "", SUPABASE_SERVICE_ROLE || "");

export default async function handler(req: IncomingMessage & { body?: any; headers?: any }, res: ServerResponse & { writeHead?: any; end?: any }) {
  try {
    if ((req as any).method !== "POST") {
      res.writeHead?.(405, { "Content-Type": "application/json" });
      res.end?.(JSON.stringify({ error: "Method not allowed" }));
      return;
    }

    // Enkel auth: kräver intern header x-revoke-key
    const headers = (req as any).headers || {};
    const provided = headers["x-revoke-key"] || headers["X-Revoke-Key"];
    if (!provided || provided !== REVOKE_API_KEY) {
      res.writeHead?.(401, { "Content-Type": "application/json" });
      res.end?.(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    const body = (req as any).body || await new Promise(resolve => {
      let data = "";
      req.on?.("data", (chunk: any) => data += chunk);
      req.on?.("end", () => resolve(data ? JSON.parse(data) : {}));
    });

    const userId = body.userId;
    if (!userId) {
      res.writeHead?.(400, { "Content-Type": "application/json" });
      res.end?.(JSON.stringify({ error: "userId required" }));
      return;
    }

    // Revokera sessioner (metod kan variera per supabase-js version)
    // För supabase-js v2:
    // await supabaseAdmin.auth.admin.invalidateUserSessions(userId);
    // För äldre versioner, kontrollera docs.
    if (typeof (supabaseAdmin.auth as any)?.admin?.invalidateUserSessions === "function") {
      await (supabaseAdmin.auth as any).admin.invalidateUserSessions(userId);
    } else {
      // fallback: radera refresh tokens via SQL (exempel — anpassa efter schema)
      await supabaseAdmin.from("auth.refresh_tokens").delete().eq("user_id", userId);
    }

    res.writeHead?.(200, { "Content-Type": "application/json" });
    res.end?.(JSON.stringify({ ok: true, userId }));
  } catch (err: any) {
    console.error("revokeSessions error:", err);
    res.writeHead?.(500, { "Content-Type": "application/json" });
    res.end?.(JSON.stringify({ error: String(err) }));
  }
}