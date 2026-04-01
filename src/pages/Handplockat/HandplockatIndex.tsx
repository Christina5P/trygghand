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
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const DEFAULT_DESCRIPTION =
  "Second hand i Sundsvall med handplockade möbler och inredning från riktiga hem. Lokalt, hållbart och personligt via Trygg Hand.";

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
        title="Second hand i Sundsvall – möbler & fynd | Handplockat"
        description={DEFAULT_DESCRIPTION}
        canonical="https://www.trygghand.com/handplockat"
      />

      <main className="pb-16">

        {/* HERO */}
        <section className="relative overflow-hidden">
          <img
            src="/handplockat.webp"
            alt="Second hand i Sundsvall – Handplockat"
            className="absolute inset-0 w-full h-full object-cover"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-black/40" />

          <div className="relative container mx-auto px-4 py-20 text-white">
            <h1 className="text-4xl mb-4 drop-shadow-md">
              Second hand i Sundsvall – handplockade möbler & fynd
            </h1>

            <p className="max-w-xl text-white/90 mb-6 drop-shadow-sm">
              Upptäck unika möbler och inredning från riktiga hem i Sundsvall.
              Handplockat erbjuder ett mer personligt alternativ till traditionell second hand.
            </p>

            <a
              href="#listings"
              className="bg-primary text-white px-6 py-3 rounded-lg inline-flex gap-2 shadow-lg"
            >
              Hitta fynd <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* 🔥 SEO TEXT (VIKTIGAST) */}
        <section className="container mx-auto px-4 pt-10 max-w-3xl">
          <h2 className="text-2xl font-semibold mb-4">
            Second hand i Sundsvall – möbler, inredning & återbruk
          </h2>

          <p className="text-muted-foreground mb-4">
            Handplockat är en lokal second hand-tjänst i Sundsvall där möbler och föremål
            får nytt liv istället för att slängas. Utbudet kommer från riktiga hem i samband
            med äldreflytt, dödsbo och bostadsförändringar.
          </p>

          <p className="text-muted-foreground mb-4">
            Här hittar du noggrant utvalda möbler, vintage och inredning – ett mer hållbart
            och personligt alternativ till traditionella second hand-butiker.
          </p>

          <p className="text-muted-foreground">
            Letar du efter hjälp med flytt eller dödsbo? Läs mer om våra tjänster{" "}
            <Link to="/" className="text-primary underline">
              här
            </Link>.
          </p>
        </section>

        {/* LIST */}
        <section id="listings" className="container mx-auto px-4 py-12">
          <div className="text-center text-sm text-muted-foreground mb-6">
            Nya second hand-fynd i Sundsvall läggs upp löpande
          </div>

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

        {/* SEO ACCORDION */}
        <section className="container mx-auto px-4 pb-16">
          <div className="w-full md:w-3/4 lg:w-2/3">
            <Accordion type="single" collapsible>
              <AccordionItem value="seo-info">
                <AccordionTrigger>
                  <span className="text-lg font-semibold text-primary">
                    Läs mer om second hand i Sundsvall
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="bg-white border border-border rounded-2xl shadow-sm p-6 mt-3 space-y-4 text-sm text-muted-foreground">
                    <p>
                      Handplockat erbjuder second hand i Sundsvall med fokus på kvalitet,
                      hållbarhet och lokalt återbruk. Våra produkter kommer från hem där vi
                      hjälpt till vid flytt eller dödsbo.
                    </p>

                    <ul className="list-disc pl-5">
                      <li>Möbler och inredning</li>
                      <li>Vintage och unika fynd</li>
                      <li>Hållbara alternativ till nyköp</li>
                    </ul>

                    <p>
                      Genom att handla second hand bidrar du till minskat avfall och ett mer
                      hållbart samhälle.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

      </main>
    </div>
  );
}