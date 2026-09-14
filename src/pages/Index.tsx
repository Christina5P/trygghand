import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import campaignImage from "@/assets/kampanj_aldreboende.png";
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

type LoaderArgs = {
  request: Request;
};

type ComponentProps = {
  loaderData: {
    todos?: {
      id: string | number;
      name: string;
    }[];
  };
};

export const Route = {
  LoaderArgs: {} as LoaderArgs,
  ComponentProps: {} as ComponentProps,
};

const Index = () => {
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash;
    if (!hash) return;

    const id = hash.replace(/^#/, "");
    if (!id) return;

    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      el?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);

    return () => window.clearTimeout(t);
  }, [location.hash]);

  return (
    <div className="min-h-screen">
      <Seo
        title="Flyttkoordinator i Sundsvall – Äldreflytt & Dödsbo | Trygg Hand"
        description="Trygg Hand hjälper dig med äldreflytt och dödsbo i Sundsvall. Vi samordnar allt från planering och sortering till flytt, städning och försäljning. Vi erbjuder specialiserad flyttstädning på äldreboenden i Sundsvall."
        canonical="https://www.trygghand.com/"
      />

      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "Trygg Hand",
          description: "Flyttstädning av äldreboenden i Sundsvall",
          areaServed: {
            "@type": "Place",
            name: "Sundsvall",
            additionalType: "https://en.wikipedia.org/wiki/Sundsvall",
          },
          serviceType: "Städning",
          priceRange: "3500 SEK",
        })}
      </script>

      <Header />

      <main>

        {/* =========================================================
            KAMPANJ – FLYTTSTÄDNING PÅ ÄLDREBOENDE
            ========================================================= */}
        <section
          aria-label="Kampanj för flyttstädning på äldreboende"
          className="w-full bg-gradient-to-b from-white via-white to-gray-50 px-4 py-5 md:py-7"
        >
          <div className="mx-auto w-full max-w-5xl">
            <div className="overflow-hidden rounded-[1.5rem] border border-cyan-200/60 bg-white shadow-lg">
              <div className="grid md:grid-cols-[42%_58%] md:h-[390px]">
                <div className="relative h-[230px] overflow-hidden md:h-full">
                  <img
                    src={campaignImage}
                    alt="Äldreboenderum med säng, fåtölj, mindre köksdel, bord och stolar"
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="flex items-center bg-[#f3f8f8] px-6 py-6 md:px-8 md:py-8">
                  <div className="w-full">
                    <div className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-[#1598b5]">
                      Kampanj
                    </div>

                    <h2 className="max-w-xl text-[1.50rem] font-extrabold leading-[1.08] tracking-tight text-[#163f4b] md:text-[1.75rem]">
                      Vi tar hand om
                      <br />
                      flyttstädningen
                    </h2>

                    <p className="mt-4 max-w-md text-sm leading-relaxed text-[#315765] md:text-base">
                      Ska ett äldreboende tömmas efter en flytt eller ett dödsfall? Vi erbjuder <span className="font-extrabold text-[#163f4b]">fast pris 3 500 kr inkl. moms</span> för ett normalt stort rum i Sundsvallsområdet.
                    </p>

                    <ul className="mt-4 space-y-2 text-sm leading-relaxed text-[#315765] md:text-[0.98rem]">
                      <li className="flex items-start gap-3">
                        <span className="mt-1 text-[#1598b5]">✓</span>
                        <span>Vi har direktkontakt med boendet</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <span className="mt-1 text-[#1598b5]">✓</span>
                        <span>Vi besiktar tillsammans med personalen</span>
                      </li>
                    </ul>

                    <p className="mt-4 max-w-md text-[1rem] font-bold leading-tight text-[#163f4b] md:text-[1rem]">
                      Tryggt, enkelt och en sak mindre att tänka på.
                    </p>

                    <div className="mt-6 mb-2">
                      <Link
                        to="/#kontakt-form"
                         className="rounded-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-700 hover:to-cyan-600 text-white font-bold py-2.5 px-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 text-sm"
                  >
                        Boka flyttstädning
                        <br />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Hero />

        {/* Servicepaket */}
        <div className="bg-white px-4 py-8 md:py-12">
          <div className="container mx-auto max-w-6xl">
            <Services />
          </div>
        </div>

        <About />

        <Contact />

        {/* SEO-information */}
        <div className="hidden" aria-hidden="true">
          Vi erbjuder flyttstädning på äldreboenden:
          Alnösol, Attmarhem, Granlunda, Havssundet, Heffnersgården,
          Hellbergsgården, Knutshemmet, Kristinelund, Lindgården,
          Ljustagården, Norra Kajen, Rutsgården, Skogsbrynet,
          Skottsundsbacken, Solgården, Solhaga, Thulegården, Tingsta,
          Tunastrand.
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;


/*
 * Behåll loader/API-strukturen som projektet förväntar sig.
 */
export async function loader({ request }: LoaderArgs) {
  const { supabase } = createClient(request);

  const { data: todos } = await supabase
    .from("todos")
    .select();

  return { todos };
}

export function Home({ loaderData }: ComponentProps) {
  return (
    <ul>
      {loaderData.todos?.map((todo) => (
        <li key={todo.id}>{todo.name}</li>
      ))}
    </ul>
  );
}

function createClient(request: Request): { supabase: any } {
  throw new Error("Function not implemented.");
}