import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Seo from "@/components/Seo";

export default function ClearCookies() {
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    try {
      // Ta bort vår consent-cookie i denna webbläsare
      document.cookie = "trygghand_cookie_consent=; path=/; max-age=0; SameSite=Lax";
      // (valfritt) ta bort andra cookies här om behövligt
    } catch (err) {
      console.error("Could not clear cookies", err);
    }
    setDone(true);
  }, []);

  return (
    <div className="container mx-auto px-4 py-12 max-w-xl text-center">
      <Seo
        title="Rensa Cookies | Trygg Hand"
        description="Rensa dina cookies och återställ cookie-inställningar för Trygg Hand."
        canonical="https://www.trygghand.com/clearcookies"
        robots="noindex, follow"
      />
      <h1 className="text-2xl font-bold mb-4">Rensa cookies</h1>

      {done ? (
        <>
          <p className="mb-4 text-base">
            Cookien som sparar ditt cookie‑val är nu borttagen i den här webbläsaren.
            Ladda om sidan för att se cookie‑bannern igen.
          </p>

          <div className="flex justify-center gap-3">
            <button
              onClick={() => location.reload()}
              className="px-4 py-2 bg-[#2f6f99] text-white rounded-md"
            >
              Ladda om sidan
            </button>
            <button
              onClick={() => {
                navigate("/");
                setTimeout(() => {
                  const footer = document.getElementById("footer");
                  if (footer) footer.scrollIntoView({ behavior: "smooth" });
                }, 100);
              }}
              className="px-4 py-2 border rounded-md"
            >
              Till startsidan
            </button>
          </div>
        </>
      ) : (
        <p className="text-base">Rensar cookies…</p>
      )}
    </div>
  );
}