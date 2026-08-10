import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { supabase } from "@/lib/supabase";
import { useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { useEffect } from "react";
// Define Route types directly here
type LoaderArgs = { request: Request };
type ComponentProps = { loaderData: { todos?: { id: string | number; name: string }[] } };

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

    // Vänta en tick så att sektionen hinner renderas innan scroll.
    const t = window.setTimeout(() => {
      const el = document.getElementById(id);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);

    return () => window.clearTimeout(t);
  }, [location.hash]);

  return (
    <div className="min-h-screen">
      <Seo
        title="Flyttkoordinator i Sundsvall – Äldreflytt & Dödsbo | Trygg Hand"
        description="Trygg Hand hjälper dig med äldreflytt och dödsbo i Sundsvall. Vi samordnar allt från planering och sortering till flytt, städning och försäljning."
        canonical="https://www.trygghand.com/"
      />
      <Header />
      <main>
        {/* Banner Kampanj - Äldreboende */}
        <div className="w-full bg-gradient-to-b from-white via-white to-gray-50 py-6 md:py-8 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="rounded-2xl shadow-xl overflow-hidden bg-gradient-to-r from-cyan-50 via-blue-50 to-cyan-50 border-2 border-cyan-200/50 hover:shadow-2xl transition-shadow duration-300">
              <div className="grid md:grid-cols-2 gap-0 md:gap-0 md:auto-rows-fr">
                {/* Bild */}
                <div className="hidden md:flex relative bg-cover bg-center items-center justify-center" style={{
                  backgroundImage: 'url(/stad_aldreboende.png)',
                  minHeight: '256px',
                }}>
                  <div className="absolute inset-0 bg-black/20" />
                </div>
                {/* Text & Knapp */}
                <div className="p-6 md:p-8 flex flex-col justify-center items-start gap-5 bg-gradient-to-br from-white to-blue-50/30">
                  <div>
                    <h3 className="text-xs md:text-sm font-bold text-cyan-600 mb-2 tracking-widest uppercase"> Kampanj</h3>
                    <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">Vi flyttstädar din anhörigs äldreboende.</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">Fast pris 3 500 kr inkl. moms för normalstort rum i Sundsvallsområdet.</p>
                  </div>
                  <Link
                    to="/#kontakt-form"
                    className="rounded-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-700 hover:to-cyan-600 text-white font-bold py-3 px-7 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95 text-sm md:text-base"
                  >
                    Boka flyttstädning → 3 500 kr
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        <Hero />
        {/* Servicepaket */}
        <div className="py-8 md:py-12 px-4 bg-white">
          <div className="container mx-auto max-w-6xl">
            <Services />
          </div>
        </div>
        <About />
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default Index;

export async function loader({ request }: LoaderArgs) {
  const { supabase } = createClient(request);
  const { data: todos } = await supabase.from("todos").select();

  return { todos };
}

export function Home({ loaderData }: ComponentProps) {
  return (
    <>
      <ul>
        {loaderData.todos?.map((todo) => (
          <li key={todo.id}>{todo.name}</li>
        ))}
      </ul>
    </>
  );
}
function createClient(request: Request): { supabase: any; } {
  throw new Error("Function not implemented.");
}

