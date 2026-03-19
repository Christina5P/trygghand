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
  "Upptäck handplockade second hand och loppis fynd i Sundsvall. Möbler och inredning från riktiga hem – hållbart, lokalt och unikt.";

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

  {/* 🔥 MÖRK OVERLAY */}
  <div className="absolute inset-0 bg-black/40" />

  <div className="relative container mx-auto px-4 py-20 text-white">
    <h1 className="text-4xl mb-4 drop-shadow-md">
      Second hand i Sundsvall – handplockade fynd
    </h1>

    <p className="max-w-xl text-white/90 mb-6 drop-shadow-sm">
      Möbler och föremål från riktiga hem. Hållbart, lokalt och personligt.
    </p>

    <a
      href="#listings"
      className="bg-primary text-white px-6 py-3 rounded-lg inline-flex gap-2 shadow-lg"
    >
      Hitta fynd <ArrowRight className="w-4 h-4" />
    </a>
  </div>
</section>

        {/* LIST */}
        <section id="listings" className="container mx-auto px-4 py-12">
          {/* liten subtil rad */}
          <div className="text-center text-sm text-muted-foreground mb-6">
            Nya fynd läggs upp löpande i Sundsvall
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

        {/* ACCORDION – diskret SEO */}
       <section className="container mx-auto px-4 pb-16">
        <div className="max-w-2xl"></div>
          <div className="w-full md:w-3/4 lg:w-2/3">
            <Accordion type="single" collapsible>
              <AccordionItem value="seo-info">
                <AccordionTrigger>
                  <span className="text-lg font-semibold text-primary flex items-center gap-2">
                  
                    Läs mer om Handplockat
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="bg-white border border-border rounded-2xl shadow-sm p-6 mt-3 space-y-4 text-sm text-muted-foreground">
                    <h2 className="font-semibold text-lg">Second hand och återbruk i Sundsvall</h2>
                    <p>
                      Handplockat erbjuder second hand i Sundsvall med fokus på kvalitet,
                      hållbarhet och omtanke.
                      Föremålen kommer från hem där vi hjälpt till vid äldreflytt eller tömning.
                    </p>
                    <br/>  
                    <h2 className="font-semibold text-lg">Möbler och inredning från riktiga hem</h2>
                    <p> Här hittar du möbler, inredning och unika föremål som får ett nytt liv istället
                    för att gå till spillo.
                    Ett lokalt och mer personligt alternativ till traditionell loppis.</p>
                    <br/>
                    <ul className="list-disc pl-5">
                      <li>Möbler och mindre inredning</li>
                      <li>Vintage och äldre föremål</li>
                      <li>Brukssaker i gott skick</li>
                    </ul>
                    <br/>
                    <p>
                      Utbudet uppdateras löpande beroende på aktuella uppdrag i Sundsvall.
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