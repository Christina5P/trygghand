import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <Link to="/" className="inline-flex items-center text-primary hover:underline mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Tillbaka till startsidan
      </Link>
      <h1 className="text-2xl font-bold mb-4">Integritet & personuppgifter</h1>

      <p className="mb-4 text-lg">
        Vi tar din integritet på allvar. Här förklarar vi enkelt vilken information vi samlar in, varför och hur du kan påverka det.
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

     
      <p className="text-sm text-muted-foreground">Senast uppdaterad: 2025-10-16</p>
    </div>
  );
}