import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Seo from "@/components/Seo";
import {
  createHandplockatOrder,
  fetchHandplockatListingById,
  formatSek,
} from "@/lib/handplockat";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { HandplockatListing as HandplockatListingType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Smartphone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const CONTACT_EMAIL = "kontakt@trygghand.com";
const SITE_URL = "https://www.trygghand.com";

/* ---------------- IMAGE COMPONENTS ---------------- */

function ImageWithLoader({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative w-full h-full">
      <img
        src={src}
        alt={alt}
        loading="eager"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-contain transition duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
      {!loaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
    </div>
  );
}

function Thumb({
  src,
  alt,
  onClick,
}: {
  src: string;
  alt: string;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      className="aspect-square overflow-hidden rounded-xl border border-border bg-secondary/60 relative"
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-contain transition ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
      {!loaded && <div className="absolute inset-0 bg-gray-200 animate-pulse" />}
    </button>
  );
}

/* ---------------- HELPERS ---------------- */

function safeParseJson(value: HandplockatListingType["valuation_json"]) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value as Record<string, any>;
}

function getAvailability(status: string | null | undefined) {
  return status === "available"
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
}

function getStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "available":
      return "Tillgänglig";
    case "reserved":
      return "Reserverad";
    case "sold":
      return "Såld";
    default:
      return status || "Okänd status";
  }
}

/* ---------------- COMPONENT ---------------- */

export default function HandplockatListing() {
  const { id: listingId } = useParams();
  const [listing, setListing] = useState<HandplockatListingType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError("Supabase är inte konfigurerat.");
      setLoading(false);
      return;
    }

    fetchHandplockatListingById(listingId)
      .then(setListing)
      .catch(() => setError("Kunde inte hämta annonsen."))
      .finally(() => setLoading(false));
  }, [listingId]);

  const valuation = useMemo(
    () => safeParseJson(listing?.valuation_json),
    [listing]
  );

  const cutoutImages = useMemo(() => {
    if (!listing) return [];
    if (listing.images_cutout?.length) return listing.images_cutout;
    return listing.image_cutout ? [listing.image_cutout] : [];
  }, [listing]);

  useEffect(() => {
    setActiveImageSrc(cutoutImages[0] || "");
  }, [cutoutImages]);

  if (loading) return <div className="p-10">Laddar…</div>;
  if (error || !listing) return <div className="p-10">{error}</div>;

  const canonicalUrl = `${SITE_URL}/handplockat/${listing.id}`;
  const imageSrc = activeImageSrc;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description,
    image: cutoutImages,
    offers: {
      "@type": "Offer",
      price: String(listing.price_sek),
      priceCurrency: "SEK",
      availability: getAvailability(listing.status),
    },
  };

  return (
    <div className="min-h-[100svh] bg-background">
      <Seo
        title={listing.title}
        description={listing.description}
        canonical={canonicalUrl}
        ogImage={cutoutImages[0]}
        jsonLd={productJsonLd}
      />

      <main className="container mx-auto px-4 py-10">
        <Link to="/handplockat">← Tillbaka</Link>

        <div className="grid lg:grid-cols-2 gap-8 mt-6">
          {/* IMAGE */}
          <div>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden">
              {imageSrc ? (
                <ImageWithLoader src={imageSrc} alt={listing.title} />
              ) : (
                <div>Ingen bild</div>
              )}
            </div>

            {cutoutImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {cutoutImages.map((url) => (
                  <Thumb
                    key={url}
                    src={url}
                    alt={listing.title}
                    onClick={() => setActiveImageSrc(url)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* INFO */}
          <div className="space-y-4">
            <Badge>{getStatusLabel(listing.status)}</Badge>

            <h1 className="text-2xl font-bold">{listing.title}</h1>

            <p className="text-muted-foreground">{listing.description}</p>

            <div className="text-2xl font-bold text-primary">
              {formatSek(listing.price_sek)}
            </div>

            <div className="text-sm text-muted-foreground">
              Upphämtning: {listing.pickup_area}
            </div>

            <div className="text-sm text-muted-foreground">
              Kontakt: {CONTACT_EMAIL}
            </div>

            <div className="flex gap-2 pt-4">
              <button className="bg-primary text-white px-4 py-2 rounded-xl">
                Köp
              </button>
              <button className="border px-4 py-2 rounded-xl">
                Prisförslag
              </button>
            </div>

            <div className="pt-6 text-xs text-muted-foreground flex gap-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Trygg handel
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> Enkel kontakt
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}