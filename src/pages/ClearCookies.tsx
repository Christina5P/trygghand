import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Seo from "@/components/Seo";
import { clearCookieConsent } from "@/utils/cookies";

export default function ClearCookies() {
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    clearCookieConsent();
    setDone(true);
  }, []);

  const handleReturn = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  };

  useEffect(() => {
    if (!done) return;
    const timeoutId = window.setTimeout(() => {
      handleReturn();
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [done]);

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
              onClick={() => {
                window.location.assign("/");
              }}
              className="px-4 py-2 bg-[#2f6f99] text-white rounded-md"
            >
              Ladda om startsidan
            </button>
            <button
              onClick={() => {
                handleReturn();
              }}
              className="px-4 py-2 border rounded-md"
            >
              Tillbaka
            </button>
          </div>
        </>
      ) : (
        <p className="text-base">Rensar cookies…</p>
      )}
    </div>
  );
}