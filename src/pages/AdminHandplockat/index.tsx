import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import AdminHandplockatDashboard from "./AdminHandplockatDashboard";

export default function AdminHandplockat() {
  const { user, loading, signIn } = useAuth();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (loading) return;

    if (!user) {
      setIsAdmin(null);
      return;
    }

    setCheckingAdmin(true);
    setError(null);

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        setError(error.message);
        setIsAdmin(false);
      } else {
        setIsAdmin(Boolean(data?.is_admin));
      }

      setCheckingAdmin(false);
    })();

    return () => {
      mounted = false;
    };
  }, [loading, user]);

  if (loading || checkingAdmin || (user && isAdmin === null)) {
    return <div className="p-8 text-center">Laddar...</div>;
  }

  if (!user) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          if (!signIn) return setError("Inloggning ej tillgänglig");
          const { error } = await signIn(email, password);
          if (error) setError(error.message);
        }}
        className="max-w-sm mx-auto mt-16 p-6 bg-white rounded shadow"
      >
        <h2 className="text-xl font-bold mb-4">Admininloggning</h2>

        <input
          type="email"
          placeholder="E-post"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-2 w-full border p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Lösenord"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full border p-2 rounded"
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded font-semibold"
        >
          Logga in
        </button>

        {error && <div className="text-red-600 mt-2">{error}</div>}
      </form>
    );
  }

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-600">Ej behörig</div>;
  }

  return <AdminHandplockatDashboard />;
}