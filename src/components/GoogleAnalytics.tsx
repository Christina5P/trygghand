import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

// Hämta GA Measurement ID från miljövariabler
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

export default function GoogleAnalytics() {
  const { user } = useAuth();

  useEffect(() => {
    // Kontrollera cookie-samtycke
    const getCookie = (name: string) => {
      return document.cookie
        .split("; ")
        .find((row) => row.startsWith(name + "="))
        ?.split("=")[1];
    };

    const consentCookie = getCookie("trygghand_cookie_consent");
    let hasAnalyticsConsent = false;

    if (consentCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(consentCookie));
        hasAnalyticsConsent = parsed.analytics === true;
      } catch {
        hasAnalyticsConsent = false;
      }
    }

    // Ladda ENDAST om:
    // 1. GA Measurement ID är konfigurerat
    // 2. Användaren är UTLOGGAD (user === null)
    // 3. Användaren har GODKÄNT analytics
    if (GA_MEASUREMENT_ID && !user && hasAnalyticsConsent) {
      // Kontrollera om skriptet redan är laddat
      if (document.getElementById("ga-script")) return;

      // Lägg till Google Analytics Global Site Tag
      const script = document.createElement("script");
      script.id = "ga-script";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
      document.head.appendChild(script);

      // Initiera gtag när skriptet laddats
      script.onload = () => {
        window.dataLayer = window.dataLayer || [];
        function gtag(...args: any[]) {
          window.dataLayer?.push(args);
        }
        gtag("js", new Date());
        
        // Konfigurera GA med 12 månaders cookie-livslängd
        gtag("config", GA_MEASUREMENT_ID, {
          cookie_flags: "SameSite=Lax;Secure",
          cookie_expires: 365 * 24 * 60 * 60, // 12 månader i sekunder
        });

        // Exponera gtag globalt för eventuell användning
        window.gtag = gtag;
      };

      return () => {
        // Cleanup vid unmount
        const gaScript = document.getElementById("ga-script");
        if (gaScript) gaScript.remove();
        
        // Ta bort dataLayer och gtag
        if (window.dataLayer) {
          (window as any).dataLayer = undefined;
        }
        if (window.gtag) {
          (window as any).gtag = undefined;
        }
      };
    }
  }, [user]);

  return null;
}

// TypeScript-deklarationer för gtag
declare global {
  interface Window {
    dataLayer?: any[];
    gtag?: (...args: any[]) => void;
  }
}
