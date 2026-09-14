import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import Seo from "@/components/Seo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { fetchHandplockatListings } from "@/lib/handplockat";
import { isSupabaseConfigured } from "@/lib/supabase";
import type { HandplockatListing } from "@/types";
import ListingCard from "@/components/ListingCard";
import HandplockatInterestForm from "./HandplockatInterestForm";
import { ArrowLeft, ArrowRight, Heart, SlidersHorizontal } from "lucide-react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const FEATURED_LISTINGS_STORAGE_KEY = "handplockat_featured_ids";

const DEFAULT_DESCRIPTION =
  "Handplockat i Sundsvall – vintage, retro möbler och utvald inredning från riktiga hem. Handplockade fynd från Trygg Hand.";

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
  const [featuredCarouselRef, featuredCarouselApi] = useEmblaCarousel({
    loop: true,
    align: "start",
    skipSnaps: false,
    slidesToScroll: 2,
  });
  const [isFeaturedHovered, setIsFeaturedHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [autoRotationReset, setAutoRotationReset] = useState(0);
  const [featuredSelection, setFeaturedSelection] = useState<string[]>([]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError("Supabase är inte konfigurerat.");
      setLoading(false);
      return;
    }

    try {
      const raw = localStorage.getItem(FEATURED_LISTINGS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setFeaturedSelection(Array.isArray(parsed) ? parsed.map(String) : []);
      }
    } catch {
      setFeaturedSelection([]);
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

  const featuredListings = useMemo(() => {
    if (featuredSelection.length === 0) {
      return [];
    }

    return featuredSelection
      .map((id) => visibleListings.find((listing) => String(listing.id) === String(id)))
      .filter((listing): listing is HandplockatListing => Boolean(listing))
      .slice(0, 8);
  }, [featuredSelection, visibleListings]);

  useEffect(() => {
    if (!featuredCarouselApi || prefersReducedMotion || isFeaturedHovered || featuredListings.length < 2) {
      return;
    }

    const rotationTimer = window.setInterval(() => {
      featuredCarouselApi.scrollNext();
    }, 3500);

    return () => window.clearInterval(rotationTimer);
  }, [featuredCarouselApi, featuredListings.length, isFeaturedHovered, prefersReducedMotion, autoRotationReset]);

  const categoryFilters = useMemo(() => {
    const cats = Array.from(
      new Set(visibleListings.map((l) => l.category || "").filter(Boolean))
    );
    return ["Alla", ...cats];
  }, [visibleListings]);

  const clothingCategories = useMemo(() => {
    return categoryFilters.filter(
      (c) => c.toLowerCase().includes("kläd") || c.toLowerCase().includes("klä") || c.toLowerCase().includes("tröja") || c.toLowerCase().includes("byxor") || c.toLowerCase().includes("skor") || c.toLowerCase().includes("jacka")
    );
  }, [categoryFilters]);

  const otherCategories = useMemo(() => {
    return categoryFilters.filter(
      (c) =>
        !clothingCategories.includes(c) && c !== "Alla"
    );
  }, [categoryFilters, clothingCategories]);

  const filteredListings = useMemo(() => {
    if (selectedCategory === "Alla") return visibleListings;
    return visibleListings.filter((l) => l.category === selectedCategory);
  }, [visibleListings, selectedCategory]);

  const canCreate = !authLoading && customer?.is_admin === true;

  const scrollFeatured = (direction: "previous" | "next") => {
    if (!featuredCarouselApi) return;
    if (direction === "next") featuredCarouselApi.scrollNext();
    else featuredCarouselApi.scrollPrev();
    setAutoRotationReset((value) => value + 1);
  };

  return (
    <div className="min-h-[100svh] bg-[#f8f6f1] text-[#26352f]">
      <Seo
        title="Handplockat – Vintage & retro möbler i Sundsvall"
        description={DEFAULT_DESCRIPTION}
        canonical="https://www.trygghand.com/handplockat"
      />

      <main className="pb-20">

        {/* HERO */}
        <section className="relative min-h-[560px] overflow-hidden bg-[#30443c]">
          <img
            src="/handplockat.webp"
            alt="Utvalda vintageföremål från Handplockat i Sundsvall"
            className="absolute inset-0 h-full w-full object-cover object-center"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1d2b27]/90 via-[#1d2b27]/55 to-[#1d2b27]/15" />

          <div className="relative mx-auto flex min-h-[560px] max-w-7xl items-end px-5 py-16 text-white sm:px-8 lg:items-center lg:py-20">
            <div className="max-w-2xl">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.22em] text-[#e6c98e]">Vintage · Retro · Återbruk</p>
            <h1 className="mb-6 max-w-xl font-nunito text-4xl font-bold leading-[1.05] sm:text-6xl">
              Vintage, retro & handplockade möbler från Sundsvall
            </h1>

            <p className="mb-7 max-w-xl text-lg leading-relaxed text-white/85">
              Vi hittar sakerna när vi hjälper familjer med flytt, avveckling och dödsbon – och ger dem en ny chans istället för att de går till spillo.
            </p>

            <p className="mb-8 text-sm font-medium text-white/75">Nya fynd läggs upp löpande.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <a href="#listings" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#e6c98e] px-6 font-semibold text-[#26352f] shadow-lg transition-transform hover:-translate-y-0.5">Se Handplockat just nu<ArrowRight className="h-4 w-4" /></a>
              <a href="#interest-request" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/50 px-6 font-semibold text-white transition-colors hover:bg-white/10">Jag letar efter något särskilt</a>
            </div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:py-24">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#aa7945]">Det här är Handplockat</p>
            <h2 className="font-nunito text-3xl font-bold leading-tight sm:text-4xl">Saker med en historia</h2>
          </div>
          <div className="max-w-2xl space-y-4 text-lg leading-relaxed text-[#5f6963]">
            <p>Handplockat är en del av Trygg Hand.</p>
            <p>När ett hem förändras finns ofta saker som är för fina för att försvinna. Genom Trygg Hand möter vi dessa hem vid flytt, avveckling och dödsbon.</p>
            <p>Vi handplockar ut möbler, inredning och föremål som kan få ett nytt liv hos någon annan. Det är Handplockat.</p>
          </div>
        </section>

        <section className="bg-[#eee9df] py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="mb-3 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.22em] text-[#aa7945]"><span className="h-px w-10 bg-[#d6c29c]" /> Skyltfönster</p>
                <h2 className="font-nunito text-3xl font-bold sm:text-4xl">Handplockat just nu</h2>
                <p className="mt-3 max-w-xl text-[#6b746e]">Saker vi fastnade lite extra för just nu.</p>
              </div>
              <div className="flex items-center gap-2">
                <a href="#listings" className="mr-2 inline-flex items-center gap-2 text-base font-bold text-[#8d6335] transition hover:text-[#6e4e2d] hover:underline">Se alla fynd <ArrowRight className="h-4 w-4" /></a>
                <button type="button" onClick={() => scrollFeatured("previous")} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d6cfc2] bg-white text-[#30443c] transition hover:bg-[#f6e9c9]" aria-label="Föregående fynd">
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => scrollFeatured("next")} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d6cfc2] bg-white text-[#30443c] transition hover:bg-[#f6e9c9]" aria-label="Nästa fynd">
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {loading && (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 4 }).map((_, i) => <ListingSkeleton key={i} />)}
              </div>
            )}

            {!loading && !error && (
              <div
                ref={featuredCarouselRef}
                onMouseEnter={() => setIsFeaturedHovered(true)}
                onMouseLeave={() => setIsFeaturedHovered(false)}
                className="overflow-hidden"
                role="region"
                aria-roledescription="carousel"
                aria-label="Handplockat just nu"
              >
                <div className="-ml-6 flex">
                {featuredListings.map((listing, index) => (
                  <div key={listing.id} className="min-w-0 shrink-0 grow-0 basis-[84vw] pl-6 sm:basis-1/2 lg:basis-1/2">
                    <ListingCard listing={listing} eager={index < 4} />
                  </div>
                ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ALL LISTINGS */}
        <section id="listings" className="bg-white/70 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#aa7945]">Hela sortimentet</p>
              <h2 className="font-nunito text-3xl font-bold sm:text-4xl">Alla Handplockade Fynd</h2>
              <p className="mt-3 max-w-xl text-[#6b746e]">Bläddra bland alla tillgängliga vintage-, retro- och återbruksfynd.</p>
            </div>
            <p className="text-sm text-[#6b746e]">Nya fynd läggs upp löpande i Sundsvall</p>
          </div>

          {canCreate && (
            <div className="mb-6 flex justify-end">
              <Button asChild>
                <Link to="/portal/handplockat/skapa">Skapa annons</Link>
              </Button>
            </div>
          )}

          {/* FILTER */}
          <Accordion type="single" collapsible className="mb-8">
            <AccordionItem value="filters">
              <AccordionTrigger className="rounded-lg border border-border bg-card px-4 py-3 text-sm hover:no-underline">
                <span className="flex items-center gap-2 font-medium">
                  <SlidersHorizontal className="h-4 w-4 text-[#aa7945]" />
                  Filtrera fynd
                  {selectedCategory !== "Alla" && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {selectedCategory}
                    </span>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-3">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCategory("Alla")}
                      className={`inline-flex min-h-10 items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                        selectedCategory === "Alla"
                          ? "bg-primary text-white border-primary"
                          : "border-border bg-background text-foreground hover:border-primary hover:text-primary"
                      }`}
                    >
                      Alla fynd
                    </button>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {[...otherCategories, ...clothingCategories].map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`min-h-10 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                          selectedCategory === category
                            ? "border-primary bg-primary text-white"
                            : "border-border bg-background text-foreground hover:border-primary hover:text-primary"
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

            <a
            href="#interest-request"
            className="mb-12 flex min-h-12 items-center justify-between gap-3 rounded-2xl border border-[#d6c29c] bg-[#fbf3df] px-5 py-4 text-sm font-semibold text-[#26352f] transition-colors hover:bg-[#f6e9c9]"
          >
            <span>Hittar du inte rätt föremål?</span>
            <span className="inline-flex items-center gap-1 text-[#8d6335]">
              Berätta vad du söker <ArrowRight className="h-4 w-4" />
            </span>
          </a>
          {/* LOADING */}
          {loading && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <ListingSkeleton key={i} />)}
            </div>
          )}

          {error && <p className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">{error}</p>}

          {!loading && !error && (
            <>
              {filteredListings.length > 0 ? (
                <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
                  {filteredListings.map((listing, index) => (
                    <ListingCard key={listing.id} listing={listing} eager={index < 4} compact />
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-[#cfc9bc] px-4 py-10 text-center text-sm text-[#6b746e]">Inga fynd i den här kategorin just nu.</p>
              )}

              <div id="interest-request" className="mt-16 scroll-mt-4 border-t border-[#ddd8ce] pt-16">
                <HandplockatInterestForm />
              </div>
            </>
          )}
          </div>
        </section>


        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.5fr]">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#aa7945]">Enkelt från början till slut</p>
              <h2 className="font-nunito text-3xl font-bold sm:text-4xl">Så fungerar det</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                ["01", "Hitta något du gillar", "Bläddra bland våra aktuella fynd."],
                ["02", "Boka eller lämna intresse", "Följ den befintliga köp- eller intresseprocessen."],
                ["03", "Hämta i Sundsvall", "Hämtning sker enligt informationen i annonsen."],
              ].map(([number, title, text]) => (
                <div key={number} className="border-t-2 border-[#d6c29c] pt-4">
                  <span className="text-sm font-semibold text-[#aa7945]">{number}</span>
                  <h3 className="mt-4 font-nunito text-xl font-bold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#6b746e]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#30443c] text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-center lg:py-20">
            <div className="max-w-2xl">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#e6c98e]"><Heart className="h-4 w-4" /> Trygg Hand</p>
              <h2 className="font-nunito text-3xl font-bold sm:text-4xl">Handplockat är en del av Trygg Hand</h2>
              <p className="mt-5 text-lg leading-relaxed text-white/75">Trygg Hand hjälper familjer genom äldreflytt, avveckling och dödsbon. När ett hem ska förändras finns ofta möbler och saker som någon annan kan uppskatta. Handplockat är vårt sätt att ge utvalda föremål ett nytt hem.</p>
            </div>
            <Link to="/" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 font-semibold text-[#30443c] transition-transform hover:-translate-y-0.5">Läs mer om Trygg Hand <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>

        {/* SEO ACCORDION */}
        <section className="container mx-auto px-4 pb-16">
          <div className="w-full md:w-3/4 lg:w-2/3">
            <Accordion type="single" collapsible>
              <AccordionItem value="seo-info">
                <AccordionTrigger>
                  <span className="text-lg font-semibold text-primary">
                    Vintage, återbruk och second hand i Sundsvall
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="bg-white border border-border rounded-2xl shadow-sm p-6 mt-3 space-y-4 text-sm text-muted-foreground">
                    <p>
                      På Handplockat hittar du utvalda vintage- och retromöbler, inredning och föremål från hem i Sundsvall med omnejd.
                      </p>

                      <p>
                        Här kan du hitta allt från teakmöbler och retro lampor till porslin, konst och andra saker med karaktär. Vi säljer begagnade möbler och föremål som vi handplockat ut genom Trygg Hands arbete med flytt, avveckling och dödsbon.
                      </p>

                      <p>
                        Det är ett lokalt återbruk med personlighet – och ett alternativ för dig som letar efter vintage möbler, retro inredning eller second hand möbler i Sundsvall.
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