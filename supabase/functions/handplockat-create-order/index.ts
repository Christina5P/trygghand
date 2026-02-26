import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore - Remote supabase-js for Deno resolved at deploy/runtime
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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

function isUuid(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      v
    )
  );
}

async function sendBrevoEmail(
  apiKey: string,
  payload: Record<string, unknown>
) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify(payload),
  });

  // Debug: se exakt vad Brevo svarar i Supabase Logs
  const text = await res.text();
  console.log("BREVO RESPONSE", res.status, text);

  if (!res.ok) {
    throw new Error(`Email failed: ${text}`);
  }
}

async function sendOrderEmailToAdmin(
  apiKey: string,
  from: string,
  to: string,
  details: any
) {
  const subject = `Ny köp-reservation: ${details.title}`;
  const textContent = `
Ny beställning från Handplockat:

Annons: ${details.title}
Listing ID: ${details.listingId}
Pris: ${details.price}
Kontakt: ${details.buyerPhone || "-"}
E-post: ${details.buyerEmail || "-"}

Skapa uppföljning i admin.
`;

  await sendBrevoEmail(apiKey, {
    sender: { name: "Handplockat", email: from },
    to: [{ email: to }],
    subject,
    textContent,
  });
}

async function sendOrderConfirmationToBuyer(
  apiKey: string,
  from: string,
  to: string,
  details: any
) {
  const subject = `Bekräftelse – Handplockat | ${details.title}`;
  const textContent = `
Hej!

Vi har tagit emot ditt köp av ${details.title}.
Vi bekräftar via mail så snart som möjligt.

Handplockat | Sundsvall
`;

  await sendBrevoEmail(apiKey, {
    sender: { name: "Handplockat", email: from },
    to: [{ email: to }],
    subject,
    textContent,
  });
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const brevoKey = Deno.env.get("BREVO_API_KEY");
  const emailFrom = Deno.env.get("HANDPLOCKAT_EMAIL_FROM");
  const adminEmail = Deno.env.get("HANDPLOCKAT_ADMIN_EMAIL");

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "Server configuration missing" });
  }

  // Viktigt: du kan välja att INTE stoppa orderflödet om mail saknas.
  // Men här behåller vi din guard så du ser direkt om secrets saknas.
  if (!brevoKey || !emailFrom || !adminEmail) {
    return json(500, { error: "Email configuration missing" });
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const listingId = payload?.listing_id;
  const buyerName = payload?.buyer_name
    ? String(payload.buyer_name).trim()
    : null;
  const buyerPhone = payload?.buyer_phone
    ? String(payload.buyer_phone).trim()
    : null;
  const buyerEmail = payload?.buyer_email
    ? String(payload.buyer_email).trim()
    : null;

  if (!isUuid(listingId)) return json(400, { error: "Invalid listing_id" });
  if (!buyerPhone) return json(400, { error: "Missing buyer_phone" });

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: listing, error: listingErr } = await service
    .from("handplockat_listings")
    .select(
      "id, title, price_sek, status, cta_typ, pickup_deadline_at, pickup_area, pickup_window"
    )
    .eq("id", listingId)
    .maybeSingle();

  if (listingErr) return json(500, { error: "Kunde inte hamta annons." });
  if (!listing) return json(404, { error: "Annonsen hittades inte." });
  if ((listing as any).cta_typ !== "direktkop") {
    return json(400, { error: "Annonsen ar inte tillganglig for direktkop." });
  }
  if ((listing as any).status !== "available") {
    return json(409, { error: "Annonsen är inte tillgänglig." });
  }

  const { data: orderRow, error: orderErr } = await service
    .from("handplockat_orders")
    .insert({
      listing_id: listingId,
      buyer_name: buyerName,
      buyer_phone: buyerPhone,
      buyer_email: buyerEmail,
      pickup_place: (listing as any).pickup_area ?? null,
      pickup_deadline_at: (listing as any).pickup_deadline_at ?? null,
      status: "reserved",
    })
    .select("id")
    .single();

  if (orderErr) return json(500, { error: "Kunde inte skapa order." });

  const { error: updateErr } = await service
    .from("handplockat_listings")
    .update({ status: "reserved" })
    .eq("id", listingId);

  if (updateErr) return json(500, { error: "Kunde inte reservera annons." });

  const priceLabel = `${(listing as any).price_sek} kr`;
  const details = {
    listingId,
    title: (listing as any).title ?? "Handplockat",
    price: priceLabel,
    buyerPhone,
    buyerEmail,
  };

  try {
    await sendOrderEmailToAdmin(brevoKey, emailFrom, adminEmail, details);
    if (buyerEmail) {
      await sendOrderConfirmationToBuyer(brevoKey, emailFrom, buyerEmail, details);
    }
  } catch (err) {
    console.error("Email send error", err);
    // Ordern ska fortfarande gå igenom även om mail faller.
  }

  return json(200, { ok: true, order_id: (orderRow as any)?.id });
});