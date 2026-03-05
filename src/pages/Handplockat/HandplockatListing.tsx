import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Seo from "@/components/Seo";
import { createHandplockatOrder, fetchHandplockatListingById, formatSek } from "@/lib/handplockat";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { HandplockatListing as HandplockatListingType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const CONTACT_EMAIL = "kontakt@trygghand.com";

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

export default function HandplockatListing() {
  const { id: listingId } = useParams();
  const [listing, setListing] = useState<HandplockatListingType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [orderName, setOrderName] = useState("");
  const [orderPhone, setOrderPhone] = useState("");
  const [orderEmail, setOrderEmail] = useState("");
  const [offeredPriceSek, setOfferedPriceSek] = useState("");
  const [orderMode, setOrderMode] = useState<"direct_buy" | "price_offer">("direct_buy");
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [activeImageSrc, setActiveImageSrc] = useState("");

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
  const cutoutImages = useMemo(() => {
    if (!listing) return [] as string[];
    const fromArray = Array.isArray((listing as any).images_cutout)
      ? ((listing as any).images_cutout as string[]).filter(Boolean)
      : [];
    if (fromArray.length > 0) return fromArray;
    return listing.image_cutout ? [listing.image_cutout] : [];
  }, [listing]);

  useEffect(() => {
    const first = cutoutImages[0] || "";
    setActiveImageSrc(first);
  }, [cutoutImages]);

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

  const imageSrc = activeImageSrc || "";
  const pickupText = listing.pickup_text
    ? listing.pickup_text
    : listing.pickup_window
      ? `${listing.pickup_area} – ${listing.pickup_window}`
      : listing.pickup_area || "Sundsvall – tid enligt överenskommelse";

  const priceLabel = formatSek(listing.price_sek);
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

  const canEdit = !authLoading && (customer?.is_admin || (customer?.id && customer.id === listing.owner_id));

  const handleCreateOrder = async () => {
    setOrderError(null);
    setOrderSuccess(null);

    if (!listing.id) return;
    if (!orderPhone.trim()) {
      setOrderError("Telefonnummer krävs.");
      return;
    }

    const parsedOffer = Number(offeredPriceSek);
    if (orderMode === "price_offer") {
      if (!offeredPriceSek.trim() || Number.isNaN(parsedOffer) || parsedOffer <= 0) {
        setOrderError("Ange ett giltigt prisförslag.");
        return;
      }
    }

    setOrderLoading(true);
    try {
      await createHandplockatOrder({
        listingId: listing.id,
        buyerName: orderName.trim() || undefined,
        buyerPhone: orderPhone.trim(),
        buyerEmail: orderEmail.trim() || undefined,
        orderType: orderMode,
        offeredPriceSek: orderMode === "price_offer" ? parsedOffer : undefined,
      });

      if (orderMode === "direct_buy") {
        const updated = await import("@/lib/handplockat").then((m) =>
          m.updateHandplockatListing({ id: listing.id, status: "reserved" })
        );
        setListing(updated);
      }

      setOrderSuccess(
        orderMode === "direct_buy"
          ? "Tack! Vi har tagit emot din reservation och återkommer via e-post."
          : "Tack! Vi har tagit emot ditt prisförslag och återkommer via e-post."
      );
      setOrderName("");
      setOrderPhone("");
      setOrderEmail("");
      setOfferedPriceSek("");
      setShowOrderForm(false);
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
    image: cutoutImages,
    url: `https://www.trygghand.com/handplockat/${listing.id}`,
    offers: {
      "@type": "Offer",
      priceCurrency: "SEK",
      price: listing.price_sek,
      availability: listing.status === "available" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `https://www.trygghand.com/handplockat/${listing.id}`,
    },
  };

  // ✅ Fixar TS-felet: string | null | undefined -> string | undefined
  const ogImage = cutoutImages[0] ?? undefined;

  return (
    <div className="min-h-[100svh] bg-background">
      <Seo
        title={`${listing.title} | Handplockat Sundsvall – second hand och loppis`}
        description={`Köp cirkulära fynd i Sundsvall. Second hand, loppis och återbruk. ${seoDescription}`}
        canonical={`https://www.trygghand.com/handplockat/${listing.id}`}
        ogImage={ogImage}
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
                      <img
                        src={imageSrc}
                        alt={listing.title}
                        className="h-full w-full object-contain p-6"
                        loading="eager"
                        fetchPriority="auto"
                        decoding="async"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">Ingen bild</span>
                    )}
                  </div>
                  {cutoutImages.length > 1 && (
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      {cutoutImages.map((url) => (
                        <button
                          key={url}
                          type="button"
                          className="aspect-square rounded-xl overflow-hidden border border-border bg-secondary/60"
                          onClick={() => setActiveImageSrc(url)}
                        >
                          <img
                            src={url}
                            alt={listing.title}
                            className="h-full w-full object-contain"
                            loading="lazy"
                            decoding="async"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                  {!imageSrc && (
                    <p className="mt-4 text-xs text-muted-foreground">
                      Annonsbild saknas. Lägg till image_cutout eller images_cutout för publik visning.
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

                  {canEdit && (
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/admin/handplockat/redigera/${listing.id}`}
                        className="inline-flex flex-1 items-center justify-center rounded-xl border border-border bg-card py-2 text-sm font-semibold text-foreground hover:bg-muted"
                      >
                        Redigera (Ägare)
                      </Link>
                      <Link
                        to={`/portal/handplockat/${listing.id}/redigera`}
                        className="inline-flex flex-1 items-center justify-center rounded-xl border border-border bg-card py-2 text-sm font-semibold text-foreground hover:bg-muted"
                      >
                        Redigera (Admin)
                      </Link>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">{listing.title}</h1>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {skickLabel}
                      </Badge>
                      <Badge variant="outline" className="text-xs font-normal border-primary/30 text-primary">
                        Direktköp
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground whitespace-pre-line">{listing.description}</p>

                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-primary">{priceLabel}</span>
                  </div>

                  <div className="space-y-2 text-sm">
                    {listing.category && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">Kategori</span>
                        <span className="text-right">{listing.category}</span>
                      </div>
                    )}
                    {dimensionLabel && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">Mått</span>
                        <span className="text-right">{dimensionLabel}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Upphämtning</span>
                      <span className="text-right">{pickupText}</span>
                    </div>

                    {listing.pickup_deadline_at && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">Hämtas senast</span>
                        <span className="text-right">{new Date(listing.pickup_deadline_at).toLocaleDateString("sv-SE")}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Betalning</span>
                      <span className="text-right">{paymentLabel}</span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground">Kontakt</span>
                      <span className="text-right">E-post {CONTACT_EMAIL}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOrderError(null);
                        setOrderSuccess(null);
                        setOrderMode("direct_buy");
                        setShowOrderForm(true);
                      }}
                      className={`inline-flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold transition-colors ${
                        orderMode === "direct_buy"
                          ? "bg-primary text-primary-foreground hover:opacity-90"
                          : "border border-border bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      Köp
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOrderError(null);
                        setOrderSuccess(null);
                        setOrderMode("price_offer");
                        setShowOrderForm(true);
                      }}
                      className={`inline-flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold transition-colors ${
                        orderMode === "price_offer"
                          ? "bg-primary text-primary-foreground hover:opacity-90"
                          : "border border-border bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      Prisförslag
                    </button>
                  </div>

                  {showOrderForm && (
                    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                    
                      <input
                        value={orderName}
                        onChange={(e) => setOrderName(e.target.value)}
                        placeholder="Namn"
                        className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                      />
                      <input
                        value={orderPhone}
                        onChange={(e) => setOrderPhone(e.target.value)}
                        placeholder="Telefonnummer"
                        type="tel"
                        autoComplete="tel"
                        className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                      />
                      <input
                        value={orderEmail}
                        onChange={(e) => setOrderEmail(e.target.value)}
                        placeholder="E-post"
                        type="email"
                        autoComplete="email"
                        className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                      />
                      {orderMode === "price_offer" && (
                        <input
                          value={offeredPriceSek}
                          onChange={(e) => setOfferedPriceSek(e.target.value)}
                          placeholder="Ditt prisförslag (kr)"
                          type="number"
                          min="1"
                          className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                        />
                      )}

                      {orderError && <p className="text-xs text-destructive">{orderError}</p>}
                      {orderSuccess && <p className="text-xs text-trust-green">{orderSuccess}</p>}

                      <button
                        type="button"
                        onClick={handleCreateOrder}
                        disabled={orderLoading}
                        className="inline-flex w-full items-center justify-center rounded-xl bg-primary text-white py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
                      >
                        {orderLoading ? "Skickar…" : "Bekräfta"}
                      </button>

                      <p className="text-xs text-muted-foreground">
                        Vi använder uppgifterna endast för att kontakta dig om köpet.
                      </p>
                    </div>
                  )}
                </div>

                  <div className="rounded-3xl border border-border bg-card p-6">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    Trygg handel med Swish-betalning
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
                    <Smartphone className="h-4 w-4 text-primary" />
                    Enkel kontakt via e-post
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
             
                   
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      </div>
  )    
}
