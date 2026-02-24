import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { fetchHandplockatListings } from "@/lib/handplockat";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { HandplockatListing } from "@/types";
import ListingCard from "@/components/ListingCard";
import { ArrowRight, Search, ShieldCheck, Smartphone } from "lucide-react";

const DEFAULT_DESCRIPTION = "Kop cirkulara fynd lokalt i Sundsvall. Handplockade annonser med trygga affarer via SMS.";

export default function HandplockatIndex() {
  const [listings, setListings] = useState<HandplockatListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Supabase ar inte konfigurerat i denna miljo.");
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
        setError(typeof err?.message === "string" ? err.message : "Kunde inte hamta annonser.");
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

  return (
    <div className="min-h-[100svh] bg-background">
      <Seo
        title="Handplockat Sundsvall | Cirkular marknad"
        description={DEFAULT_DESCRIPTION}
        canonical="https://www.trygghand.com/handplockat"
      />
      <Header />
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
                Kurerade second hand-prylar fran riktiga hem. Kop tryggt via SMS och Swish – lokalt och cirkulart.
              </p>
              <div className="flex flex-wrap gap-4">
                <a
                  href="#listings"
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                  Se alla fynd
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 justify-center md:justify-start">
                <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm text-muted-foreground">
                  Trygg handel med Swish-betalning
                </span>
              </div>
              <div className="flex items-center gap-3 justify-center">
                <Smartphone className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm text-muted-foreground">
                  Enkel kontakt via SMS
                </span>
              </div>
              <div className="flex items-center gap-3 justify-center md:justify-end">
                <Search className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm text-muted-foreground">
                  Varderade med lokal analys
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-4">
              Kop sker via SMS – inte via Facebook.
            </p>
          </div>
        </section>

        <section id="listings" className="container mx-auto px-4 py-12">
          {loading && <p className="text-muted-foreground">Laddar annonser...</p>}
          {error && <p className="text-destructive">{error}</p>}

          {!loading && !error && visibleListings.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center">
              <h2 className="text-xl font-semibold text-foreground">Inga aktuella annonser just nu</h2>
              <p className="text-muted-foreground mt-2">
                Vi fyller pa med nya objekt hela tiden. Kom tillbaka snart eller folj oss i Facebook-gruppen.
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
                    {visibleListings.length} foremal till salu i Sundsvall
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
      <Footer />
    </div>
  );
}
