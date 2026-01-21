import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import Seo from "@/components/Seo";
import { supabase } from "@/lib/supabase";
import { useLocation } from "react-router-dom";
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
        title="Helhetskoordinator för dödsbo & äldreflytt i Sundsvall"
        description="Vi erbjuder servicepaket med fasta priser eller individuella tjänster med offert för seniorförändring och dödsbohantering i Sundsvall – samordning, städ, uppsägningar och digital översikt."
        canonical="https://www.trygghand.com/"
      />
      <Header />
      <main>
        <Hero />
        <Services />
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

