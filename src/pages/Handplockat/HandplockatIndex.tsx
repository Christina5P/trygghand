import { useEffect, useMemo, useState } from "react";
import Seo from "@/components/Seo";
import { fetchHandplockatListings } from "@/lib/handplockat";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { HandplockatListing } from "@/types";
import ListingCard from "@/components/ListingCard";
import { ArrowRight, Search, ShieldCheck, Smartphone } from "lucide-react";

const DEFAULT_DESCRIPTION = "Kop cirkulara fynd lokalt i Sundsvall. Handplockade annonser med trygga affarer.";

export default function HandplockatIndex() {
  const [listings, setListings] = useState<HandplockatListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Supabase är inte konfigurerat i denna miljö.");
      setLoading(false);
      return;
    }

    let isMounted = true;
    fetchHandplockatListings()
      .then((data) => {
        if (!isMounted) return;
        setListings(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(typeof err?.message === "string" ? err.message : "Kunde inte hämta annonser.");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleListings = useMemo(
    () => listings.filter((listing) => listing.status === "available"),
    [listings]
  );

  // JSON-LD ItemList
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Handplockat Sundsvall',
    description: DEFAULT_DESCRIPTION,
    url: 'https://www.trygghand.com/handplockat',
    itemListElement: visibleListings.map((listing, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `https://www.trygghand.com/handplockat/${listing.id}`,
      name: listing.title,
      image: listing.image_cutout || undefined,
      description: listing.description,
    })),
  };

  // OG-image: första annonsbild eller fallback
  const ogImage = visibleListings[0]?.image_cutout || '/handplockat.jpg';

  return (
    <div className="min-h-[100svh] bg-background">
      <Seo
        title="Handplockat Sundsvall | Cirkulär marknad"
        description={DEFAULT_DESCRIPTION}
        canonical="https://www.trygghand.com/handplockat"
        ogImage={ogImage}
        jsonLd={itemListJsonLd}
      />
      <main className="pb-16">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0">
            <img
              src="/handplockat.jpg"
              alt="Handplockade vintagefynd"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-foreground/80 via-foreground/50 to-transparent" />
          </div>
          <div className="relative container mx-auto px-4 py-16 md:py-24">
            <div className="max-w-lg">
              <h1 className="text-4xl md:text-5xl text-primary-foreground mb-4 leading-tight">
                Handplockade fynd i Sundsvall
              </h1>
              <p className="text-lg text-primary-foreground/80 mb-8">
                Utvalda second hand-prylar från riktiga hem.<br/> Köp tryggt och enkelt – lokalt och cirkulärt.
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="#listings"
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                 Se vad som gömmer sig här
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="listings" className="container mx-auto px-4 py-12">
          {loading && <p className="text-muted-foreground">Laddar annonser...</p>}
          {error && <p className="text-destructive">{error}</p>}

          {!loading && !error && visibleListings.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center">
              <h2 className="text-xl font-semibold text-foreground">Inga aktuella annonser just nu</h2>
              <p className="text-muted-foreground mt-2">
                Vi fyller på med nya objekt hela tiden. Kom tillbaka snart eller följ oss i Facebook-gruppen.
              </p>
            </div>
          )}

          {!loading && !error && visibleListings.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl md:text-3xl text-foreground">
                    Aktuella fynd
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    {visibleListings.length} föremål till salu i Sundsvall
                  </p>
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {visibleListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
