import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Seo from "@/components/Seo";
import {
  createHandplockatOrder,
  fetchHandplockatListingById,
  formatSek,
  placeHandplockatBid,
} from "@/lib/handplockat";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { HandplockatListing as HandplockatListingType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Copy, ShieldCheck, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  return fallback;
};

function safeParseJson(value: HandplockatListingType["valuation_json"]) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value as any;
}

function buildSmsBody(listingId: string, title: string, ctaTyp: "bud" | "direktkop") {
  if (ctaTyp === "bud") return `ID ${listingId} - ${title} - bud: `;
  return `ID ${listingId} - ${title} - köp direkt`;
}

export default function HandplockatListing() {
  const { listingId } = useParams();
  const [listing, setListing] = useState<HandplockatListingType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bidAmount, setBidAmount] = useState("");
  const [bidderName, setBidderName] = useState("");
  const [bidderPhone, setBidderPhone] = useState("");
  const [bidLoading, setBidLoading] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState<string | null>(null);

  const [orderName, setOrderName] = useState("");
  const [orderPhone, setOrderPhone] = useState("");
  const [orderEmail, setOrderEmail] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  const { customer, loading: authLoading } = useAuth();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!listingId) {
      setError("Saknar annons-id.");
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setError("Supabase är inte konfigurerat i denna miljö.");
      setLoading(false);
      return;
    }

    let isMounted = true;

    fetchHandplockatListingById(listingId)
      .then((data) => {
        if (!isMounted) return;
        setListing(data);
        setError(null);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(typeof (err as any)?.message === "string" ? (err as any).message : "Kunde inte hämta annonsen.");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [listingId]);

  const valuation = useMemo(() => safeParseJson(listing?.valuation_json), [listing]);

  if (loading) {
    return (
      <div className="min-h-[100svh] bg-background">
        <main className="container mx-auto px-4 py-12">
          <p className="text-muted-foreground">Laddar annons…</p>
        </main>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-[100svh] bg-background">
        <main className="container mx-auto px-4 py-12">
          <p className="text-destructive">{error ?? "Annonsen kunde inte hittas."}</p>
          <Link to="/handplockat" className="text-primary mt-4 inline-block">
            Tillbaka till Handplockat
          </Link>
        </main>
      </div>
    );
  }

  const imageSrc = listing.image_cutout || "";
  const pickupText = listing.pickup_text
    ? listing.pickup_text
    : listing.pickup_window
      ? `${listing.pickup_area} – ${listing.pickup_window}`
      : listing.pickup_area || "Sundsvall – tid enligt överenskommelse";

  const smsBody = buildSmsBody(listing.id, listing.title, listing.cta_typ);
  const smsLink = `sms:${listing.sms_phone}?&body=${encodeURIComponent(smsBody)}`;

  const priceLabel =
    listing.cta_typ === "bud" && listing.current_bid_sek
      ? `Ledande bud ${formatSek(listing.current_bid_sek)}`
      : listing.cta_typ === "bud" && listing.bid_start_sek
        ? `Budstart ${formatSek(listing.bid_start_sek)}`
        : formatSek(listing.price_sek);

  const paymentLabel = listing.payment_method ? listing.payment_method : "Swish";
  const skickLabel = listing.skick || valuation?.skick || "Okänt skick";

  const dimensionLabel = listing.dimensions_mm
    ? [
        listing.dimensions_mm.length ? `${listing.dimensions_mm.length} mm` : null,
        listing.dimensions_mm.width ? `${listing.dimensions_mm.width} mm` : null,
        listing.dimensions_mm.height ? `${listing.dimensions_mm.height} mm` : null,
      ]
        .filter(Boolean)
        .join(" x ")
    : null;

  const valuationRange =
    valuation?.varde_min_sek || valuation?.varde_max_sek
      ? `${valuation?.varde_min_sek ? formatSek(valuation.varde_min_sek) : "-"} –${
          valuation?.varde_max_sek ? ` ${formatSek(valuation.varde_max_sek)}` : " -"
        }`
      : null;

  const seoDescription = listing.description.length > 150 ? `${listing.description.slice(0, 150)}…` : listing.description;
  const isAuction = listing.cta_typ === "bud";

  const handlePlaceBid = async () => {
    setBidError(null);
    setBidSuccess(null);

    const amount = Number(bidAmount);
    if (!listing.id || Number.isNaN(amount) || amount <= 0) {
      setBidError("Ange ett giltigt bud.");
      return;
    }
    if (!bidderPhone.trim()) {
      setBidError("Telefonnummer krävs för bud.");
      return;
    }

    setBidLoading(true);
    try {
      await placeHandplockatBid({
        listingId: listing.id,
        bidAmountSek: amount,
        bidderName: bidderName.trim() || undefined,
        bidderPhone: bidderPhone.trim(),
      });

      setBidSuccess("Bud mottaget! Vi återkommer via SMS.");
      setBidAmount("");
      setBidderName("");
      setBidderPhone("");

      const refreshed = await fetchHandplockatListingById(listing.id);
      if (refreshed) setListing(refreshed);
    } catch (err) {
      setBidError(getErrorMessage(err, "Kunde inte lägga bud."));
    } finally {
      setBidLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    setOrderError(null);
    setOrderSuccess(null);

    if (!listing.id) return;
    if (!orderPhone.trim()) {
      setOrderError("Telefonnummer krävs för direktköp.");
      return;
    }

    setOrderLoading(true);
    try {
      await createHandplockatOrder({
        listingId: listing.id,
        buyerName: orderName.trim() || undefined,
        buyerPhone: orderPhone.trim(),
        buyerEmail: orderEmail.trim() || undefined,
      });

      setOrderSuccess("Tack! Vi har reserverat ditt köp och återkommer via SMS.");
      setOrderName("");
      setOrderPhone("");
      setOrderEmail("");

      const refreshed = await fetchHandplockatListingById(listing.id);
      if (refreshed) setListing(refreshed);
    } catch (err) {
      setOrderError(getErrorMessage(err, "Kunde inte skapa order."));
    } finally {
      setOrderLoading(false);
    }
  };

  // JSON-LD Product/Offer
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description,
    image: listing.image_cutout ? [listing.image_cutout] : [],
    url: `https://www.trygghand.com/handplockat/${listing.id}`,
    offers: {
      "@type": "Offer",
      priceCurrency: "SEK",
      price: listing.price_sek,
      availability: listing.status === "available" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `https://www.trygghand.com/handplockat/${listing.id}`,
    },
  };

  return (
    <div className="min-h-[100svh] bg-background">
      <Seo
        title={`${listing.title} | Handplockat Sundsvall`}
        description={`Köp cirkulära fynd i Sundsvall. ${seoDescription}`}
        canonical={`https://www.trygghand.com/handplockat/${listing.id}`}
        ogImage={listing.image_cutout ?? undefined}
        jsonLd={productJsonLd}
      />

      <main className="pb-24">
        <section className="bg-gradient-to-br from-soft-gray via-background to-trust-green-light">
          <div className="container mx-auto px-4 py-10">
            <Link to="/handplockat" className="text-sm text-muted-foreground hover:text-foreground">
              ← Tillbaka till Handplockat
            </Link>

            <div className="mt-4 flex flex-col gap-8 lg:flex-row">
              <div className="flex-1">
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
                  <div className="aspect-[4/3] rounded-2xl bg-secondary/60 flex items-center justify-center">
                    {imageSrc ? (
                      <img src={imageSrc} alt={listing.title} className="h-full w-full object-contain p-6" />
                    ) : (
                      <span className="text-sm text-muted-foreground">Ingen bild</span>
                    )}
                  </div>
                  {!imageSrc && (
                    <p className="mt-4 text-xs text-muted-foreground">
                      Frilagd bild saknas. Lägg till image_cutout för publik visning.
                    </p>
                  )}
                </div>
              </div>

              <div className="w-full lg:w-[420px] space-y-6">
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">Handplockat</span>
                    <Badge variant="secondary" className="text-xs">
                      {listing.status === "available" ? "Tillgänglig" : listing.status}
                    </Badge>
                  </div>

                  {!authLoading && customer?.is_admin && (
                    <Link
                      to={`/admin/handplockat/redigera/${listing.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-border bg-card py-2 text-sm font-semibold text-foreground hover:bg-muted"
                    >
                      Redigera
                    </Link>
                  )}

                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">{listing.title}</h1>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {skickLabel}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-normal border-primary/30 text-primary">
                        {listing.cta_typ === "bud" ? "Budgivning" : "Direktköp"}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">{listing.description}</p>

                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-primary">{priceLabel}</span>
                    {isAuction && listing.auction_end_at && (
                      <span className="text-xs text-muted-foreground">
                        Slutar {new Date(listing.auction_end_at).toLocaleDateString("sv-SE")}
                      </span>
                    )}
                  </div>

                  {isAuction && (
                    <div className="text-xs text-muted-foreground">
                      {listing.bid_count ? `${listing.bid_count} bud` : "Inga bud angivna"}
                    </div>
                  )}

                  <div className="space-y-2 text-sm">
                    {listing.category && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Kategori</span>
                        <span>{listing.category}</span>
                      </div>
                    )}
                    {dimensionLabel && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Mått</span>
                        <span>{dimensionLabel}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Upphämtning</span>
                      <span>{pickupText}</span>
                    </div>
                    {listing.pickup_deadline_at && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Hämtas senast</span>
                        <span>{new Date(listing.pickup_deadline_at).toLocaleDateString("sv-SE")}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Betalning</span>
                      <span>{paymentLabel}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Kontakt</span>
                      <span>SMS {listing.sms_phone}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <a
                      href={smsLink}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-foreground text-background py-3 text-sm font-semibold transition-colors hover:bg-foreground/90"
                    >
                      {listing.cta_typ === "bud" ? "Öppna SMS för bud" : "Öppna SMS för köp"}
                    </a>

                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(window.location.href)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card py-2 text-sm font-medium text-foreground hover:bg-muted"
                    >
                      <Copy className="h-4 w-4" />
                      Kopiera länk
                    </button>
                  </div>

                  <p className="text-xs text-muted-foreground">Köp sker via SMS – inte via Facebook.</p>

                  {isAuction ? (
                    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                      <h3 className="text-sm font-semibold text-foreground">Lägg ditt bud</h3>
                      <input
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        type="number"
                        min="0"
                        placeholder="Budbelopp (SEK)"
                        className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                      />
                      <input
                        value={bidderName}
                        onChange={(e) => setBidderName(e.target.value)}
                        placeholder="Namn (valfritt)"
                        className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                      />
                      <input
                        value={bidderPhone}
                        onChange={(e) => setBidderPhone(e.target.value)}
                        placeholder="Telefonnummer"
                        className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                      />
                      {bidError && <p className="text-xs text-destructive">{bidError}</p>}
                      {bidSuccess && <p className="text-xs text-trust-green">{bidSuccess}</p>}
                      <button
                        type="button"
                        onClick={handlePlaceBid}
                        disabled={bidLoading}
                        className="inline-flex w-full items-center justify-center rounded-xl bg-primary text-primary-foreground py-2 text-sm font-semibold hover:bg-primary/90"
                      >
                        {bidLoading ? "Skickar…" : "Lägg bud"}
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                      <h3 className="text-sm font-semibold text-foreground">Direktköp</h3>
                      <input
                        value={orderName}
                        onChange={(e) => setOrderName(e.target.value)}
                        placeholder="Namn (valfritt)"
                        className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                      />
                      <input
                        value={orderPhone}
                        onChange={(e) => setOrderPhone(e.target.value)}
                        placeholder="Telefonnummer"
                        className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                      />
                      <input
                        value={orderEmail}
                        onChange={(e) => setOrderEmail(e.target.value)}
                        placeholder="E-post (valfritt)"
                        className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                      />
                      {orderError && <p className="text-xs text-destructive">{orderError}</p>}
                      {orderSuccess && <p className="text-xs text-trust-green">{orderSuccess}</p>}
                      <button
                        type="button"
                        onClick={handleCreateOrder}
                        disabled={orderLoading}
                        className="inline-flex w-full items-center justify-center rounded-xl bg-primary text-primary-foreground py-2 text-sm font-semibold hover:bg-primary/90"
                      >
                        {orderLoading ? "Reserverar…" : "Reservera köp"}
                      </button>
                    </div>
                  )}
                </div>

                {valuation && (
                  <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-3">
                    <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Transparens</h2>
                    <p className="text-sm text-foreground">Pris satt med lokal värdeanalys.</p>
                    <div className="grid gap-3 text-sm">
                      <div className="rounded-xl bg-secondary/60 p-3">
                        <div className="text-xs text-muted-foreground">Värdespann</div>
                        <div className="font-semibold">{valuationRange ?? "-"}</div>
                      </div>
                      {(valuation?.afterfragan_lokalt || valuation?.saljbarhet) && (
                        <div className="rounded-xl bg-secondary/60 p-3">
                          <div className="text-xs text-muted-foreground">Efterfrågan / säljbarhet</div>
                          <div className="font-semibold">
                            {[valuation?.afterfragan_lokalt, valuation?.saljbarhet].filter(Boolean).join(" • ")}
                          </div>
                        </div>
                      )}
                      {valuation?.motivering && (
                        <div className="rounded-xl bg-secondary/60 p-3">
                          <div className="text-xs text-muted-foreground">Motivering</div>
                          <div className="line-clamp-3">{valuation.motivering}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="rounded-3xl border border-border bg-card p-6">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Trygg handel med Swish-betalning
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
                    <Smartphone className="h-4 w-4 text-primary" />
                    Enkel kontakt via SMS
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div>
            <div className="text-xs text-muted-foreground">{listing.cta_typ === "bud" ? "Budstart" : "Pris"}</div>
            <div className="text-base font-semibold text-foreground">{priceLabel}</div>
          </div>
          <a
            href={smsLink}
            className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            {listing.cta_typ === "bud" ? "Buda" : "Köp"}
          </a>
        </div>
      </div>
    </div>
  );
}