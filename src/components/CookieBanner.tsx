import React, { useEffect, useState } from "react";

const COOKIE_NAME = "trygghand_cookie_consent";

function setCookie(name: string, value: string, days = 365) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${days *
    24 *
    60 *
    60};SameSite=Lax`;
}
function getCookie(name: string) {
  return document.cookie.split("; ").find((row) => row.startsWith(name + "="))?.split("=")[1];
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const c = getCookie(COOKIE_NAME);
    const url = new URL(window.location.href);
    const force = url.searchParams.get("showCookieBanner") === "1";
    if (!c || force) setVisible(true);
  }, []);

  /* Triggar en reload/event när användaren ändrar sitt samtycke, så att GoogleAnalytics-komponenten reagerar */

  const acceptAll = () => {
    setCookie(COOKIE_NAME, JSON.stringify({ analytics: true, marketing: true }), 365);
    setVisible(false);
    window.dispatchEvent(new Event("cookieConsentGiven"));
    // Ladda om sidan för att aktivera Google Analytics (om utloggad)
    window.location.reload();
  };

  const acceptOnlyNecessary = () => {
    setCookie(COOKIE_NAME, JSON.stringify({ analytics: false, marketing: false }), 365);
    setVisible(false);
    window.dispatchEvent(new Event("cookieConsentDenied"));
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie-meddelande"
      className="fixed left-4  bottom-6 z-50 max-w-3xl mx-auto"
    >
      <div
        className="bg-[#d6dde0] text-gray-800 border border-[#d6e6ee] rounded-lg shadow-lg p-3 md:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 max-w-xl mx-auto"
        style={{ fontSize: "14px" }}
      >
        <div>
          <strong className="block text-lg mb-1">Vi använder cookies</strong>
          <div className="text-base">
            Vi behöver några tekniska cookies för att sidan ska fungera. Välj "Acceptera alla" om du vill tillåta statistik‑cookies som hjälper oss förbättra tjänsten? Ditt val sparas i ett år.
          </div>
          <a href="/cookiepolicy" className="text-sm underline mt-2 inline-block">Läs mer om cookies</a>
        </div>

        <div className="flex gap-3 items-center">
          <button
            onClick={acceptOnlyNecessary}
            className="rounded-md px-4 py-3 border border-gray-300 bg-gray-50 text-sm"
            aria-label="Endast nödvändiga cookies"
          >
            Endast nödvändiga
          </button>

          <button
            onClick={acceptAll}
            className="rounded-md px-5 py-3 bg-[#2f6f99] hover:bg-[#256089] text-white font-semibold"
            aria-label="Acceptera alla cookies"
          >
            Acceptera alla
          </button>
        </div>
      </div>
    </div>
  );
}