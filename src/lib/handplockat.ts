// Hämta alla publika handplockat-annonser
import type { PostgrestError } from "@supabase/supabase-js";

export async function fetchHandplockatListings(): Promise<HandplockatListing[]> {
  // Försök hämta från publik vy först
  const { data, error }: { data: HandplockatListing[] | null; error: PostgrestError | null } = await supabase
    .from("handplockat_listings_public")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
import { supabase, isUnauthorizedError } from "@/lib/supabase";
import type { HandplockatListing } from "@/types";

export type ListingInput = Omit<HandplockatListing, "created_at">;
export async function fetchHandplockatListingById(
  id: string
): Promise<HandplockatListing | null> {

  // 1️⃣ försök publikt först
  const pub = await supabase
    .from("handplockat_listings_public")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (pub.error) throw pub.error;
  if (pub.data) return pub.data;

  // 2️⃣ fallback till riktiga tabellen (admin / owner)
  const raw = await supabase
    .from("handplockat_listings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (raw.error) return null;

  return raw.data ?? null;
}

export async function createHandplockatListing(input: ListingInput): Promise<HandplockatListing> {
  const { data, error } = await supabase
    .from("handplockat_listings")
    .insert(input)
    .select("*")
    .single();

  if (error) {
    if (isUnauthorizedError(error)) {
      throw new Error("Du saknar behorighet att skapa annonser.");
    }
    throw error;
  }

  return data as HandplockatListing;
}

export async function updateHandplockatListing(input: Partial<ListingInput> & { id: string }): Promise<HandplockatListing> {
  const { id, ...changes } = input;

  const { data, error } = await supabase
    .from("handplockat_listings")
    .update(changes)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if (isUnauthorizedError(error)) {
      throw new Error("Du saknar behorighet att uppdatera annonser.");
    }
    throw error;
  }

  return data as HandplockatListing;
}

export async function deleteHandplockatListing(id: string): Promise<void> {
  const { error } = await supabase
    .from("handplockat_listings")
    .delete()
    .eq("id", id);

  if (error) {
    if (isUnauthorizedError(error)) {
      throw new Error("Du saknar behörighet att ta bort annonser.");
    }
    throw error;
  }
}

export async function placeHandplockatBid(payload: {
  listingId: string;
  bidAmountSek: number;
  bidderName?: string;
  bidderPhone?: string;
}): Promise<void> {
  const { listingId, bidAmountSek, bidderName, bidderPhone } = payload;

  const { error } = await supabase.rpc("place_handplockat_bid", {
    p_listing_id: listingId,
    p_bid_amount_sek: bidAmountSek,
    p_bidder_name: bidderName ?? null,
    p_bidder_phone: bidderPhone ?? null,
  });

  if (error) throw error;
}

export async function createHandplockatOrder(payload: {
  listingId: string;
  buyerName?: string;
  buyerPhone?: string;
  buyerEmail?: string;
}): Promise<void> {
  const { listingId, buyerName, buyerPhone, buyerEmail } = payload;

  const { data, error } = await supabase.functions.invoke("handplockat-create-order", {
    body: {
      listing_id: listingId,
      buyer_name: buyerName ?? null,
      buyer_phone: buyerPhone ?? null,
      buyer_email: buyerEmail ?? null,
    },
  });

  if (error) throw error;
  if ((data as any)?.ok === false) {
    const msg = (data as any)?.error || (data as any)?.message || "Kunde inte skapa order.";
    throw new Error(msg);
  }
}

export function parseJsonInput(raw: string | null | undefined): unknown | null {
  const s = typeof raw === "string" ? raw : "";
  if (!s.trim()) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export function formatSek(value: number): string {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(value) + " kr";
}

export function normalizeUrlList(raw: string): string[] {
  return raw
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
}
