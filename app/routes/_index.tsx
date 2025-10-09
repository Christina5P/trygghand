
import type { Route } from "./+types/home";

function createClient(_request: Request) {
  return {
    supabase: {
      from: (table: string) => ({
        select: async () => {
          // Minimal stub for supabase client used in this route.
          // Replace with real Supabase client initialization if available.
          return { data: [] as { id: string | number; name: string }[] };
        },
      }),
    },
  };
}

export async function loader({ request }: Route["LoaderArgs"]) {
  const { supabase } = createClient(request);
  const { data: todos } = await supabase.from("todos").select();

  return { todos };
}

export default function Home({ loaderData }: Route["ComponentProps"]) {
  return (
    <>
      <ul>
        {loaderData.todos?.map((todo: { id: string | number; name: string }) => (
          <li key={todo.id}>{todo.name}</li>
        ))}
      </ul>
    </>
  );
}

