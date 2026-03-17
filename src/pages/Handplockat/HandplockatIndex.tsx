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
import { ArrowRight } from "lucide-react";

const DEFAULT_DESCRIPTION =
  "Handplockade second hand-fynd i Sundsvall med lokala upphämtningar.";

/* 🔥 Skeleton loader */
function ListingSkeleton() {
  return (
    <div className="rounded-2xl border border-border p-4 space-y-3 animate-pulse">
      <div className="aspect-[4/3] bg-gray-200 rounded-xl" />
      <div className="h-4 bg-gray-200 rounded w-2/3" />
      <div className="h-4 bg-gray-200 rounded w-1/3" />
    </div>
  );
}

export default function HandplockatIndex() {
  const { customer, loading: authLoading } = useAuth();
  const [listings, setListings] = useState<HandplockatListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("Alla");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Supabase är inte konfigurerat.");
      setLoading(false);
      return;
    }

    fetchHandplockatListings()
      .then(setListings)
      .catch(() => setError("Kunde inte hämta annonser."))
      .finally(() => setLoading(false));
  }, []);

  const visibleListings = useMemo(
    () => listings.filter((l) => l.status === "available"),
    [listings]
  );

  const categoryFilters = useMemo(() => {
    const cats = Array.from(
      new Set(visibleListings.map((l) => l.category || "").filter(Boolean))
    );
    return ["Alla", ...cats];
  }, [visibleListings]);

  const filteredListings = useMemo(() => {
    if (selectedCategory === "Alla") return visibleListings;
    return visibleListings.filter((l) => l.category === selectedCategory);
  }, [visibleListings, selectedCategory]);

  const canCreate = !authLoading && !!customer;

  return (
    <div className="min-h-[100svh] bg-background">
      <Seo
        title="Handplockat – Second hand i Sundsvall"
        description={DEFAULT_DESCRIPTION}
        canonical="https://www.trygghand.com/handplockat"
      />

      <main className="pb-16">
        {/* HERO */}
        <section className="relative overflow-hidden">
          <img
            src="/handplockat.webp"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            fetchPriority="high"
          />

          <div className="relative container mx-auto px-4 py-20">
            <h1 className="text-4xl text-white mb-4">
              Handplockade second hand-fynd
            </h1>

            <a
              href="#listings"
              className="bg-primary text-white px-6 py-3 rounded-lg inline-flex gap-2"
            >
              Hitta fynd <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* LIST */}
        <section id="listings" className="container mx-auto px-4 py-12">
          {canCreate && (
            <div className="mb-6 flex justify-end">
              <Button asChild>
                <Link to="/portal/handplockat/skapa">Skapa annons</Link>
              </Button>
            </div>
          )}

          {/* FILTER */}
          <div className="mb-6 flex flex-wrap gap-2">
            {categoryFilters.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1 rounded-full border ${
                  selectedCategory === c ? "bg-primary text-white" : ""
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* LOADING */}
          {loading && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <ListingSkeleton key={i} />
              ))}
            </div>
          )}

          {/* ERROR */}
          {error && <p className="text-red-500">{error}</p>}
                    
          {/* LISTINGS */}
          {!loading && !error && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredListings.map((listing, index) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  eager={index < 4}
                />
              ))}
            </div>
          )}

          {/* FORM */}
          <div className="mt-10">
            <HandplockatInterestForm />
          </div>
        </section>
      </main>
    </div>
  );
}