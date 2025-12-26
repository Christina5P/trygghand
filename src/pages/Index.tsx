import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import About from "@/components/About";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
// Define Route types directly here
type LoaderArgs = { request: Request };
type ComponentProps = { loaderData: { todos?: { id: string | number; name: string }[] } };

export const Route = {
  LoaderArgs: {} as LoaderArgs,
  ComponentProps: {} as ComponentProps,
};



const Index = () => {
  return (
    <div className="min-h-screen">
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
  // loader inte använd — Index använder inte SSR
  return {};
}

