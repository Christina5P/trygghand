import React from "react";

export default function CookiePolicy() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-4">Cookie‑policy</h1>

      <p className="mb-4 text-lg">
        Vi använder några enkla cookies. Här förklarar vi kort vad de gör och varför.
      </p>

      <h2 className="font-semibold mt-6">Cookies vi använder</h2>
      <ul className="list-disc pl-5 mt-3 space-y-2 text-base">
        <li>
          <strong>trygghand_cookie_consent</strong> — Sparar ditt val om du vill tillåta statistik/marknadsföring. 
          Den används enbart för att komma ihåg ditt val och påverkar inte webbplatsens funktion. (Persistent cookie)
        </li>
       
      </ul>

      <h2 className="font-semibold mt-6">Vad betyder det?</h2>
      <p className="mb-2 text-base">
        - Nödvändiga cookies: Krävs för att webbplatsen ska fungera. <br />
        - Statistik (valfritt): Hjälper oss förstå hur sidan används och göra den bättre. Vi sätter sådana cookies bara om du godkänner.
      </p>

      <h2 className="font-semibold mt-6">Hur ändrar jag mitt val?</h2>
      <p className="mb-4 text-base">
        Vill du ändra ditt val: radera cookie med namnet <code>trygghand_cookie_consent</code> i din webbläsare eller kontakta oss så hjälper vi till.
      </p>

      <h3 className="font-semibold mt-4">Säkerhet och personliga uppgifter</h3>
      <p className="text-base mb-4">
        Vi samlar inte personuppgifter via cookies i annat syfte än att komma ihåg dina val eller, om du godkänner, för statistik. För mer information, kontakta oss gärna.
      </p>

      <h3 className="font-semibold mt-4">Behöver du hjälp?</h3>
      <p className="text-base">
        Om du vill ha hjälp med att rensa cookies eller är osäker på något, ring eller mejla oss så hjälper vi gärna.
      </p>
    </div>
  );
}