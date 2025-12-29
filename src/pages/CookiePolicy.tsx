import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function CookiePolicy() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const handleBack = () => {
    navigate("/");
    setTimeout(() => {
      const footer = document.getElementById("footer");
      if (footer) footer.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <button onClick={handleBack} className="inline-flex items-center text-primary hover:underline mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Tillbaka
      </button>
      <h1 className="text-2xl font-bold mb-4">Cookie‑policy</h1>

      <p className="mb-4 text-lg">
        Vi använder några enkla cookies. Här förklarar vi kort vad de gör och varför.
      </p>

      <h2 className="font-semibold mt-6">Cookies vi använder</h2>
      <ul className="list-disc pl-5 mt-3 space-y-2 text-base">
        <li>
          <strong>trygghand_cookie_consent</strong> — Denna cookie sparar ditt val om du vill tillåta oss att samla in anonym statistik.
          Den används enbart för att komma ihåg ditt val och påverkar inte webbplatsens funktion.Den sparas i 12 månader.
          </li>
       
      </ul>

      <h2 className="font-semibold mt-6">Vad betyder det?</h2>
      <p className="mb-2 text-base">
        - Nödvändiga cookies: Krävs för att webbplatsen ska fungera. <br />
        - Statistik (valfritt): Hjälper oss förstå hur sidan används och göra den bättre. Vi sätter sådana cookies bara om du godkänner.
      </p>


      <h3 className="font-semibold mt-4">Vår trygghetsgaranti:</h3>
      <p className="text-base mb-4">
        Vi samlar <strong>inga</strong> personliga uppgifter som namn, adress eller personnummer via cookies. All statistik är anonymiserad och hjälper oss bara att se vilka sidor som är mest hjälpsamma för dig.
      </p>
      
      <h3 className="font-semibold mt-4">Cookies för Statistik (Om du godkänner):</h3>
      <p className="text-base mb-4">
        Google Analytics för att förstå hur vår sida används. Dessa cookies samlar in data om t.ex. hur länge du stannar på en sida. Syfte: Förbättra vår information och göra sidan mer lättanvänd.
      </p>
        
      <h3 className="font-semibold mt-4">Ändra eller dra tillbaka ditt val:</h3>
      <p className="text-base">
       Det ska vara enkelt att ändra sig! Du kan alltid klicka på länken <a href="/clearcookies" className="text-primary underline hover:text-primary/80">Rensa cookies</a> längst ned på sidan för att enkelt ändra dina inställningar. Självklart kan du också ringa oss så hjälper vi dig.
      </p>
    </div>
  );
}