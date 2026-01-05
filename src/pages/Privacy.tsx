import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Seo from "@/components/Seo";

export default function Privacy() {
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
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <Seo
        title="Integritetspolicy | Trygg Hand"
        description="Läs vår integritetspolicy och cookie-policy för att förstå hur vi hanterar dina personuppgifter."
        canonical="https://www.trygghand.com/privacy"
        robots="noindex, follow"
      />
      <button onClick={handleBack} className="inline-flex items-center text-primary hover:underline mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Tillbaka
      </button>
      <h1 className="text-2xl font-bold mb-4">Integritetspolicy & Cookies</h1>

      <p className="mb-4 text-lg">
        Vi tar din integritet på allvar. Här förklarar vi enkelt vilken information vi samlar in, varför och hur du kan påverka det. Vi förklarar också vår användning av cookies.
      </p>

      <h2 className="font-semibold mt-6">Vem ansvarar för uppgifterna?</h2>
      <p className="mb-2">
        Trygg Partner (org.nr ) är personuppgiftsansvarig. Det innebär att Trygg Hand är ansvarig för dina personuppgifter. För frågor: <a href="mailto:kontakt@trygghand.com" className="underline">kontakt@trygghand.com</a>
      </p>

      <h2 className="font-semibold mt-6">Vad samlar vi in?</h2>
      <ul className="list-disc pl-5 mt-2">
        <li>Kontaktuppgifter du själv lämnar (namn, e‑post, telefon).</li>
        <li>Information som behövs för att utföra våra tjänster (t.ex. adress vid flytt/uppdrag).</li>
        <li>Tekniska data: cookies (se cookie‑policy) och loggar för att hålla tjänsten igång.</li>
      </ul>

      <h2 className="font-semibold mt-6">Varför samlar vi in det?</h2>
      <p className="mb-2">
        För att: genomföra avtal, hantera bokningar och kontakter, förbättra tjänsten (statistik) samt följa lagar.
      </p>

      <h2 className="font-semibold mt-6">Rättslig grund</h2>
      <p className="mb-2">Vi använder avtals- eller berättigat intresse för nödvändiga behandlingar. För statistik används ditt samtycke (om du godkänner cookies).</p>

      <h2 className="font-semibold mt-6">Hur länge sparar vi uppgifter?</h2>
      <p className="mb-2">Vi sparar endast så länge det behövs för ändamålet eller enligt lag (t.ex. bokföring). Kontakta oss för exakta lagringstider för din situation.</p>

      <h2 className="font-semibold mt-6">Tredje parter / leverantörer</h2>
      <p className="mb-2">
        Vi använder vissa tjänster (databas). Dessa är personuppgiftsbiträden och vi har avtal för att skydda dina uppgifter.
      </p>

      <h2 className="font-semibold mt-6">Dina rättigheter</h2>
      <ul className="list-disc pl-5 mt-2">
        <li>Begära tillgång till dina uppgifter.</li>
        <li>Begära rättelse eller radering.</li>
        <li>Begära begränsning eller invända mot behandling.</li>
        <li>Dataportabilitet (få ut dina uppgifter i maskinläsbar form).</li>
      </ul>

      <h2 className="font-semibold mt-6">Hur begär jag något?</h2>
      <p className="mb-2">
        Skicka e‑post till <a href="mailto:kontakt@trygghand.com" className="underline">kontakt@trygghand.com</a> med vad du vill (ex: radera mina uppgifter). Vi svarar normalt inom 30 dagar.
      </p>

      <h2 className="font-semibold mt-6">Vill du radera cookies eller ändra val?</h2>
      <p className="mb-2">
        Använd vår sida för att rensa cookies eller kontakta oss. För att återkalla samtycke kan du ta bort cookien <code>trygghand_cookie_consent</code> eller besöka <a href="/clearcookies" className="underline">/clearcookies</a>.
      </p>

      <h2 className="font-semibold mt-8">Cookies - detaljerad information</h2>
      <p className="mb-4 text-base">
        Vi använder några enkla cookies. Här förklarar vi kort vad de gör och varför.
      </p>

      <h3 className="font-semibold mt-4">Cookies vi använder</h3>
      <ul className="list-disc pl-5 mt-3 space-y-2 text-base">
        <li>
          <strong>trygghand_cookie_consent</strong> — Denna cookie sparar ditt val om du vill tillåta oss att samla in anonym statistik.
          Den används enbart för att komma ihåg ditt val och påverkar inte webbplatsens funktion. Den sparas i 12 månader.
        </li>
      </ul>

      <h3 className="font-semibold mt-4">Vad betyder det?</h3>
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
      <p className="text-base mb-6">
       Det ska vara enkelt att ändra sig! Du kan alltid klicka på länken <a href="/clearcookies" className="text-primary underline hover:text-primary/80">Rensa cookies</a> längst ned på sidan för att enkelt ändra dina inställningar. Självklart kan du också ringa oss så hjälper vi dig.
      </p>

      <p className="text-sm text-muted-foreground">Senast uppdaterad: 2025-10-16</p>
    </div>
  );
}