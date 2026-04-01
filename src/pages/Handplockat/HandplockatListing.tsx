import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Seo from "@/components/Seo";
import {
  createHandplockatOrder,
  fetchHandplockatListingById,
  formatSek,
  updateHandplockatListing,
} from "@/lib/handplockat";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { HandplockatListing as HandplockatListingType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Smartphone, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const CONTACT_EMAIL = "kontakt@trygghand.com";

export default function HandplockatListing() {
  const { id: listingId } = useParams();
  const { user, customer, loading: authLoading } = useAuth();

  const [listing, setListing] = useState<HandplockatListingType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);

  const [orderMode, setOrderMode] = useState<"direct_buy" | "price_offer">("direct_buy");
  const [showOrderForm, setShowOrderForm] = useState(false);

  const [orderName, setOrderName] = useState("");
  const [orderPhone, setOrderPhone] = useState("");
  const [orderEmail, setOrderEmail] = useState("");
  const [offeredPriceSek, setOfferedPriceSek] = useState("");

  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!listingId) { setError("Saknar annons-id."); setLoading(false); return; }
    if (!isSupabaseConfigured) { setError("Supabase är inte konfigurerat."); setLoading(false); return; }

    fetchHandplockatListingById(listingId)
      .then(setListing)
      .catch(() => setError("Kunde inte hämta annons"))
      .finally(() => setLoading(false));
  }, [listingId]);

  // All images – prefer images_cutout array, fall back to single image_cutout
  const images = useMemo(() => {
    if (!listing) return [];
    return listing.images_cutout?.length
      ? listing.images_cutout
      : listing.image_cutout
      ? [listing.image_cutout]
      : [];
  }, [listing]);

  // Reset to first image when listing changes
  useEffect(() => { setActiveIndex(0); }, [images]);

  const activeImage = images[activeIndex] || "";

  const prev = () => setActiveIndex((i) => (i - 1 + images.length) % images.length);
  const next = () => setActiveIndex((i) => (i + 1) % images.length);

  const canEdit =
    !!user?.id &&
    (user.id === listing?.owner_id || customer?.is_admin);

  const dimensionLabel = listing?.dimensions_mm
    ? [
        listing.dimensions_mm.length && `L ${listing.dimensions_mm.length} mm`,
        listing.dimensions_mm.width && `B ${listing.dimensions_mm.width} mm`,
        listing.dimensions_mm.height && `H ${listing.dimensions_mm.height} mm`,
      ]
        .filter(Boolean)
        .join(" × ")
    : null;

  // Extrahera storlek och märke ur description (sparas som "Storlek: M" / "Märke: Nike")
  // Read size/brand from dedicated DB columns (fallback to description for old rows)
  const sizeLabel = (listing as any)?.size?.trim() || listing?.description?.match(/Storlek:\s*(.+)/i)?.[1]?.replace(/^Storlek:\s*/i,"").trim() || null;
  const brandLabel = (listing as any)?.brand?.trim() || listing?.description?.match(/Märke:\s*(.+)/i)?.[1]?.trim() || null;
  const clothingTypeLabel = listing?.clothingtype ?? null;

  const priceLabel = formatSek(listing?.price_sek || 0);

  const handleCreateOrder = async () => {
    setOrderError(null);
    setOrderSuccess(null);
    if (!listing) return;
    if (!orderPhone.trim()) { setOrderError("Telefonnummer krävs"); return; }
    const parsedOffer = Number(offeredPriceSek);
    if (orderMode === "price_offer") {
      if (!offeredPriceSek.trim() || Number.isNaN(parsedOffer) || parsedOffer <= 0) {
        setOrderError("Ange ett giltigt prisförslag.");
        return;
      }
    }
    try {
      setOrderLoading(true);
      await createHandplockatOrder({
        listingId: listing.id,
        buyerName: orderName.trim() || undefined,
        buyerPhone: orderPhone.trim(),
        buyerEmail: orderEmail.trim() || undefined,
        orderType: orderMode,
        offeredPriceSek: orderMode === "price_offer" ? parsedOffer : undefined,
      });
      if (orderMode === "direct_buy") {
        const updated = await updateHandplockatListing({ id: listing.id, status: "reserved" });
        setListing(updated);
      }
      setOrderSuccess(
        orderMode === "direct_buy"
          ? "Tack! Vi har tagit emot din beställning och återkommer för bekräftelse."
          : "Tack! Vi har tagit emot ditt prisförslag."
      );
      setOrderName(""); setOrderPhone(""); setOrderEmail(""); setOfferedPriceSek("");
      setShowOrderForm(false);
    } catch {
      setOrderError("Kunde inte skicka.");
    } finally {
      setOrderLoading(false);
    }
  };

  if (loading) return <div className="p-10">Laddar…</div>;
  if (error || !listing) return <div className="p-10">{error}</div>;

  return (
    <div className="min-h-screen bg-background">
      <Seo title={listing.title} description={listing.description} />

      <main className="container mx-auto px-4 py-10">
        <Link to="/handplockat" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Tillbaka
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 mt-6">

          {/* ── IMAGE GALLERY ── */}
          <div className="space-y-3">

            {/* Main image */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-muted">
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={listing.title}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Ingen bild
                </div>
              )}

              {/* Prev / Next arrows – only shown when more than 1 image */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition"
                    aria-label="Föregående bild"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={next}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition"
                    aria-label="Nästa bild"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  {/* Dot indicators */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveIndex(i)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          i === activeIndex ? "bg-white scale-125" : "bg-white/50"
                        }`}
                        aria-label={`Bild ${i + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails – only shown when more than 1 image */}
            {images.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {images.map((url, i) => (
                  <button
                    key={url}
                    onClick={() => setActiveIndex(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                      i === activeIndex
                        ? "border-primary opacity-100"
                        : "border-border opacity-60 hover:opacity-100"
                    }`}
                    aria-label={`Välj bild ${i + 1}`}
                  >
                    <img src={url} alt={`Bild ${i + 1}`} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── INFO ── */}
          <div className="space-y-3 text-sm">

            <div className="flex flex-wrap gap-2">
              <Badge className="bg-blue-600 text-white">
                {listing.skick || "Okänt skick"}
              </Badge>
              {listing.clothingtype && (
                <Badge variant="secondary">
                  {listing.clothingtype}
                </Badge>
              )}
              {listing.category && (
                <Badge variant="outline">
                  {listing.category}
                </Badge>
              )}
            </div>

            <h1 className="text-2xl font-bold">{listing.title}</h1>

            {canEdit && (
              <Link to={`/admin/handplockat/${listing.id}/redigera`}>
                <button className="mt-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold shadow hover:opacity-90 transition">
                  Redigera annons
                </button>
              </Link>
            )}

            <div className="text-base text-gray-900 font-medium">
              {listing.description
                .split("\n")
                .filter((l) => !/^(Storlek|Märke):/i.test(l.trim()))
                .map((line, i) => (
                  <span key={i}>{line}<br /></span>
                ))}
            </div>

            {dimensionLabel && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mått</span>
                <span>{dimensionLabel}</span>
              </div>
            )}

            {clothingTypeLabel && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Typ</span>
                <span>{clothingTypeLabel}</span>
              </div>
            )}

            {sizeLabel && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Storlek</span>
                <span>{sizeLabel}</span>
              </div>
            )}

            {brandLabel && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Märke</span>
                <span>{brandLabel}</span>
              </div>
            )}

            {(listing.pickup_area || listing.pickup_window) && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Upphämtning</span>
                <span>
                  {listing.pickup_area}
                  {listing.pickup_window && ` – ${listing.pickup_window}`}
                </span>
              </div>
            )}

            {listing.pickup_deadline_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Hämtas senast</span>
                <span>{new Date(listing.pickup_deadline_at).toLocaleDateString("sv-SE")}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-muted-foreground">Betalning</span>
              <span>{listing.payment_method || "Swish"}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Kontakt</span>
              <span>{CONTACT_EMAIL}</span>
            </div>

            <div className="text-2xl font-bold text-primary">{priceLabel}</div>

            <div className="flex rounded-xl border overflow-hidden">
              <button
                onClick={() => { setOrderMode("direct_buy"); setShowOrderForm(true); }}
                className={`flex-1 py-2 ${orderMode === "direct_buy" ? "bg-primary text-white" : "bg-transparent"}`}
              >
                Boka direkt
              </button>
              <button
                onClick={() => { setOrderMode("price_offer"); setShowOrderForm(true); }}
                className={`flex-1 py-2 ${orderMode === "price_offer" ? "bg-primary text-white" : "bg-transparent"}`}
              >
                Prisförslag
              </button>
            </div>

            {showOrderForm && (
              <div className="space-y-2 border p-4 rounded-xl">
                {orderMode === "price_offer" && (
                  <input value={offeredPriceSek} onChange={(e) => setOfferedPriceSek(e.target.value)} placeholder="Ditt prisförslag (kr)" className="w-full border px-3 py-2 rounded" />
                )}
                <input value={orderName} onChange={(e) => setOrderName(e.target.value)} placeholder="Namn" className="w-full border px-3 py-2 rounded" />
                <input value={orderPhone} onChange={(e) => setOrderPhone(e.target.value)} placeholder="Telefon" className="w-full border px-3 py-2 rounded" />
                <input value={orderEmail} onChange={(e) => setOrderEmail(e.target.value)} placeholder="E-post" className="w-full border px-3 py-2 rounded" />
                {orderError && <p className="text-red-500 text-sm">{orderError}</p>}
                {orderSuccess && <p className="text-green-600 text-sm">{orderSuccess}</p>}
                <button onClick={handleCreateOrder} disabled={orderLoading} className="w-full bg-primary text-white py-2 rounded disabled:opacity-60">
                  {orderLoading ? "Skickar…" : orderMode === "direct_buy" ? "Slutför förfrågan" : "Skicka förslag"}
                </button>
              </div>
            )}

                  <div className="text-xs text-muted-foreground mt-2">
          Ingen betalning sker direkt – vi bekräftar din beställning först.
        </div>

          </div>
        </div>
      </main>
    </div>
  );
}