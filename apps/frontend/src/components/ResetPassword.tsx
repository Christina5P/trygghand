import React, { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isRecovery, setIsRecovery] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("type") === "recovery") setIsRecovery(true);
    } catch {}
  }, []);

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return setMsg("Fyll i e‑post.");
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setMsg(error ? "Kunde inte skicka länk: " + error.message : "Återställningslänk skickad. Kolla din e‑post.");
    setLoading(false);
  };

  const setPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pw || pw !== pw2) return setMsg("Lösenorden matchar inte.");
    setLoading(true);
    setMsg(null);
    const { error } = await supabase.auth.updateUser({ password: pw } as any);
    setMsg(error ? "Kunde inte uppdatera: " + error.message : "Lösenord uppdaterat. Du kan logga in.");
    setLoading(false);
    setPw(""); setPw2("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-semibold mb-4">{isRecovery ? "Sätt nytt lösenord" : "Glömt lösenord"}</h1>

        {!isRecovery ? (
          <form onSubmit={sendReset} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">E‑post</span>
              <input
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@epost.se"
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex justify-center items-center rounded-md bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "Skickar..." : "Skicka återställningslänk"}
            </button>

            {msg && <p className="text-sm text-center text-gray-700">{msg}</p>}
          </form>
        ) : (
          <form onSubmit={setPassword} className="space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Nytt lösenord</span>
              <input
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Bekräfta lösenord</span>
              <input
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                type="password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                required
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex justify-center items-center rounded-md bg-indigo-600 text-white px-4 py-2 hover:bg-indigo-700 disabled:opacity-60"
            >
              {loading ? "Uppdaterar..." : "Sätt nytt lösenord"}
            </button>

            {msg && <p className="text-sm text-center text-gray-700">{msg}</p>}

            <div className="flex justify-end items-center mt-2">
              <a href="/login" className="text-sm text-gray-600 hover:underline">
                Avbryt
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}