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
        Trygg Hand AB (559564-3445) är personuppgiftsansvarig. Det innebär att vi ansvarar för dina personuppgifter.
      </p>
      <p className="mb-2">
        För frågor: <a href="mailto:kontakt@trygghand.com" className="underline">kontakt@trygghand.com</a>
      </p>

      <h2 className="font-semibold mt-6">Vad samlar vi in?</h2>
      <ul className="list-disc pl-5 mt-2">
        <li>Kontaktuppgifter du själv lämnar (som namn, e-post och telefon).</li>
        <li>Information som behövs för att utföra våra tjänster (t.ex. adress vid flytt/uppdrag, personnummer vid RUT-avdrag).</li>
        <li>Information kopplad till uppdrag, kundportal och kommunikation i ärenden.</li>
        <li>Vid köp eller försäljning via Handplockat behandlar vi uppgifter som behövs för att genomföra affären (t.ex. kontaktuppgifter och upphämtningsinformation).</li>
        <li>Tekniska data: cookies (se cookie-policy nedan) och loggar för att hålla tjänsten igång.</li>
      </ul>
      <p className="mb-2 mt-2">
        Vi lagrar även kategorisering av värderingar (t.ex. sälja, skänka, behålla) för att kunna utföra avtalade tjänster.
      </p>

      <h2 className="font-semibold mt-6">Push-notiser (valfritt)</h2>
      <p className="mb-2">
        Om du väljer att aktivera push-notiser i kundportalen sparas en teknisk prenumeration kopplad till din enhet.
      </p>
      <p className="mb-2">Push-notiser:</p>
      <ul className="list-disc pl-5 mt-2">
        <li>Är frivilliga</li>
        <li>Kräver ditt samtycke</li>
        <li>Kan stängas av när som helst</li>
      </ul>
      <p className="mb-2 mt-2">
        Notiser innehåller aldrig känsliga personuppgifter, utan endast generell information, exempelvis: “Du har en uppdatering i kundportalen.”
      </p>
      <p className="mb-2">
        Vid användning av push-notiser kan viss teknisk information behandlas av din webbläsarleverantör (t.ex. Google, Apple eller Mozilla).
      </p>

      <h2 className="font-semibold mt-6">Varför samlar vi in det?</h2>
      <p className="mb-2">För att:</p>
      <ul className="list-disc pl-5 mt-2">
        <li>Genomföra avtal</li>
        <li>Hantera bokningar och kontakter</li>
        <li>Administrera köp och försäljning</li>
        <li>Kommunicera med dig</li>
        <li>Förbättra tjänsten (statistik)</li>
        <li>Följa lagar och bokföringskrav</li>
      </ul>

      <h2 className="font-semibold mt-6">Rättslig grund</h2>
      <p className="mb-2">Vi använder:</p>
      <ul className="list-disc pl-5 mt-2">
        <li>Avtal – för att kunna utföra våra tjänster</li>
        <li>Rättslig förpliktelse – exempelvis bokföringslagen</li>
        <li>Berättigat intresse – för nödvändig administration</li>
        <li>Samtycke – för statistik och push-notiser</li>
      </ul>
      <p className="mb-2 mt-2">Du kan när som helst återkalla ett samtycke.</p>

      <h2 className="font-semibold mt-6">Hur länge sparar vi uppgifter?</h2>
      <p className="mb-2">Vi sparar endast uppgifter så länge det behövs för ändamålet eller enligt lag.</p>
      <ul className="list-disc pl-5 mt-2">
        <li>Bokföringsunderlag sparas enligt bokföringslagen (7 år)</li>
        <li>Uppdrags- och kundportalsuppgifter sparas så länge uppdraget pågår och en rimlig tid därefter</li>
        <li>Push-notiser sparas tills du stänger av dem</li>
        <li>Intresseanmälningar utan genomfört uppdrag sparas högst 12 månader</li>
      </ul>
      <p className="mb-2 mt-2">Kontakta oss för exakta lagringstider i din situation.</p>

      <h2 className="font-semibold mt-6">Tredje parter / leverantörer</h2>
      <p className="mb-2">
        Vi använder vissa tjänster för webb, databas, bokföring och kommunikation. Dessa är personuppgiftsbiträden och vi har avtal för att skydda dina uppgifter.
      </p>
      <p className="mb-2">
        För statistik använder vi Google (Google Ireland Limited).
      </p>

      <h2 className="font-semibold mt-6">Dina rättigheter</h2>
      <ul className="list-disc pl-5 mt-2">
        <li>Begära tillgång till dina uppgifter</li>
        <li>Begära rättelse eller radering</li>
        <li>Begära begränsning eller invända mot behandling</li>
        <li>Få ut dina uppgifter i maskinläsbar form (dataportabilitet)</li>
      </ul>
      <p className="mb-2">
        Skicka e-post till <a href="mailto:kontakt@trygghand.com" className="underline">kontakt@trygghand.com</a> med vad du vill (t.ex. “radera mina uppgifter”). Vi svarar normalt inom 30 dagar.
      </p>

      <h2 className="font-semibold mt-8">Cookies – detaljerad information</h2>
      <p className="mb-4 text-base">
        Vi använder några enkla cookies. Här förklarar vi kort vad de gör och varför.
      </p>

      <h3 className="font-semibold mt-4">Användning av Google Tag Manager och Google Analytics</h3>
      <p className="mb-2 text-base">
        Vi använder Google Tag Manager som ett tekniskt verktyg för att hantera trafik till hemsidan. Google Tag Manager i sig lagrar inte personuppgifter.
      </p>
      <p className="mb-2 text-base">
        Google Analytics 4 används endast för statistik och förbättring av vår tjänst, och endast efter att du har gett ditt aktiva samtycke.
      </p>
      <p className="mb-2 text-base">
        Vi använder Google Consent Mode, vilket innebär att analyscookies är blockerade som standard. Ingen statistik skickas innan du aktivt godkänner det.
      </p>
      <p className="mb-2 text-base">
        Statistiken är pseudonymiserad och används för att förstå hur webbplatsen används och förbättra informationen.
      </p>
      <p className="mb-2 text-base">
        Du kan när som helst återkalla ditt samtycke genom att använda länken “Rensa cookies” längst ned på sidan.
      </p>

      <h3 className="font-semibold mt-4">Cookies vi använder</h3>
      <ul className="list-disc pl-5 mt-3 space-y-2 text-base">
        <li>
          <strong>trygghand_cookie_consent</strong><br />
          Denna cookie sparar ditt val om du vill tillåta statistik. Den används enbart för att komma ihåg ditt val och påverkar inte webbplatsens funktion.
          Den sparas i 12 månader.
        </li>
      </ul>

      <h3 className="font-semibold mt-4">Vad betyder det?</h3>
      <ul className="list-disc pl-5 mt-2 text-base">
        <li>Nödvändiga cookies: Krävs för att webbplatsen ska fungera.</li>
        <li>Statistik (valfritt): Hjälper oss förstå hur sidan används och göra den bättre. Vi sätter sådana cookies bara om du godkänner.</li>
      </ul>

      <h3 className="font-semibold mt-4">Vår trygghetsgaranti</h3>
      <p className="text-base mb-4">
        Vi samlar inga personliga uppgifter som namn, adress eller personnummer via cookies.
      </p>
      <p className="text-base mb-4">
        Vi säljer aldrig dina personuppgifter.
      </p>
      <p className="text-base mb-4">
        Vi samlar endast in det som behövs för att kunna hjälpa dig på ett tryggt och professionellt sätt.
      </p>

      <h3 className="font-semibold mt-4">Ändra eller dra tillbaka ditt val</h3>
      <p className="text-base mb-6">
       Det ska vara enkelt att ändra sig. Du kan alltid klicka på länken <a href="/clearcookies" className="text-primary underline hover:text-primary/80">Rensa cookies</a> längst ned på sidan för att ändra dina inställningar.
      </p>
      <p className="text-base mb-6">
        Du kan också ta bort cookien <code>trygghand_cookie_consent</code> i din webbläsare eller kontakta oss så hjälper vi dig.
      </p>

      <p className="text-sm text-muted-foreground">Senast uppdaterad: 2026-01-07</p>
    </div>
  );
}