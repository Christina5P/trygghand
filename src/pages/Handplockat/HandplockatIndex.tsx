import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchHandplockatListings } from "@/lib/handplockat";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { HandplockatListing } from "@/types";
import ListingCard from "@/components/ListingCard";
import HandplockatInterestForm from "./HandplockatInterestForm";
import { ArrowRight, Search, ShieldCheck, Smartphone } from "lucide-react";

const DEFAULT_DESCRIPTION = "Köp cirkulära fynd lokalt i Sundsvall. Second hand, loppis och återbruk med handplockade annonser, förmedlade av Trygg Hand.";

type HandplockatInterest = {
  id: string;
  category: string | null;
  budgetSek: string | null;
  area: string | null;
  wish: string | null;
  imageUrl: string | null;
  createdAt: string | null;
};

export default function HandplockatIndex() {
  const { customer, loading: authLoading } = useAuth();
  const [listings, setListings] = useState<HandplockatListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interests, setInterests] = useState<HandplockatInterest[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch("/api/handplockat-interest-list")
      .then(async (response) => {
        if (!response.ok) throw new Error("Kunde inte hämta köpintressen.");
        return response.json();
      })
      .then((payload) => {
        if (!isMounted) return;
        const next = Array.isArray(payload?.interests) ? payload.interests : [];
        setInterests(next);
      })
      .catch(() => {
        if (!isMounted) return;
        setInterests([]);
      });

    return () => {
      isMounted = false;
    };
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

  const canCreate = !authLoading && !!customer;

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
      image: listing.image_cutout || listing.images_cutout?.[0] || undefined,
      description: listing.description,
    })),
  };

  // OG-image: första annonsbild eller fallback
  const ogImage =
    visibleListings[0]?.image_cutout ||
    visibleListings[0]?.images_cutout?.[0] ||
    '/handplockat.jpg';

  return (
    <div className="min-h-[100svh] bg-background">
      <Seo
        title="Handplockat Sundsvall | Second hand, loppis och återbruk"
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
                 Hitta ditt fynd
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="listings" className="container mx-auto px-4 py-12">
          {canCreate && (
            <div className="mb-6 flex items-center justify-end">
              <Button asChild>
                <Link to="/portal/handplockat/skapa">Skapa annons</Link>
              </Button>
            </div>
          )}

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

          {!loading && !error && (
            <div className="mt-10 rounded-3xl border border-border bg-card p-6 md:p-8">
              <h3 className="text-xl font-semibold text-foreground">Aktuella köpintressen</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Besökare kan se vad andra söker just nu. Kontaktuppgifter visas inte publikt.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Visar köpintressen från de senaste 90 dagarna.
              </p>

              {interests.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Inga publika köpintressen ännu. Skicka in ett köpintresse i formuläret ovan.
                </p>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {interests.map((interest) => (
                    <div key={interest.id} className="rounded-2xl border border-border bg-background p-4 space-y-2">
                      {interest.imageUrl && (
                        <div className="aspect-[4/3] rounded-xl overflow-hidden bg-secondary/60">
                          <img src={interest.imageUrl} alt="Köpintresse" className="w-full h-full object-cover" />
                        </div>
                      )}
                      {interest.category && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Kategori:</span> {interest.category}
                        </p>
                      )}
                      {interest.budgetSek && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Budget:</span> {interest.budgetSek} kr
                        </p>
                      )}
                      {interest.area && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Område:</span> {interest.area}
                        </p>
                      )}
                      {interest.wish && (
                        <p className="text-sm text-muted-foreground whitespace-pre-line">{interest.wish}</p>
                      )}
                      {interest.createdAt && (
                        <p className="text-xs text-muted-foreground">
                          Inlagd {new Date(interest.createdAt).toLocaleDateString("sv-SE")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!loading && !error && <HandplockatInterestForm />}
        </section>
      </main>
    </div>
  );
}
