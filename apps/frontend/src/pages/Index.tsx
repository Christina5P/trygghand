import Header from "app/src/components/Header";
import Hero from "app/src/components/Hero";
import Services from "app/src/components/Services";
import About from "app/src/components/About";
import Contact from "app/src/components/Contact";
import Footer from "app/src/components/Footer";
// Define Route types directly here
type LoaderArgs = { request: Request };
type ComponentProps = { loaderData: { todos?: { id: string | number; name: string }[] } };

export const Route = {
  LoaderArgs: {} as LoaderArgs,
  ComponentProps: {} as ComponentProps,
};

import { supabase } from "../../../lib/supabase";

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

