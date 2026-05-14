import Seo from "@/components/Seo";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function SecondHandSundsvall() {
  return (
    <div className="min-h-screen bg-background">

      <Seo
        title="Second hand Sundsvall – möbler & fynd | Handplockat"
        description="Handplockad second hand i Sundsvall. Möbler och inredning från riktiga hem. Hållbart, lokalt och unikt – upptäck Handplockat."
        canonical="https://www.trygghand.com/second-hand-sundsvall"
      />

      <main className="container mx-auto px-4 py-12 max-w-3xl">

        {/* H1 */}
        <h1 className="text-3xl md:text-4xl font-bold mb-6">
          Second hand i Sundsvall – möbler, inredning & unika fynd
        </h1>

        {/* Intro */}
        <p className="text-lg text-muted-foreground mb-6">
          Letar du efter second hand i Sundsvall? Hos Handplockat hittar du noggrant
          utvalda möbler och inredning från riktiga hem. Ett mer personligt,
          hållbart och lokalt alternativ till traditionella second hand-butiker.
        </p>

        {/* CTA */}
        <Link
          to="/handplockat"
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg mb-10"
        >
          Se aktuella fynd <ArrowRight className="w-4 h-4" />
        </Link>

        {/* H2 */}
        <h2 className="text-2xl font-semibold mb-4">
          Möbler och second hand från riktiga hem i Sundsvall
        </h2>

        <p className="text-muted-foreground mb-4">
          Handplockat är en tjänst från Trygg Hand där möbler och föremål får nytt liv.
          Utbudet kommer från hem i samband med äldreflytt, dödsbo och förändringar
          i livet – vilket gör varje objekt unikt.
        </p>

        <p className="text-muted-foreground mb-6">
          Istället för att slänga fungerande möbler och inredning, ser vi till att de
          hittar nya hem i Sundsvall med omnejd.
        </p>

        {/* LIST */}
        <ul className="list-disc pl-5 mb-10 text-muted-foreground space-y-2">
          <li>Möbler och inredning</li>
          <li>Vintage och äldre föremål</li>
          <li>Brukssaker i gott skick</li>
          <li>Lokala fynd från Sundsvall</li>
        </ul>

        {/* H2 - KLÄDER */}
        <h2 className="text-2xl font-semibold mb-4 mt-10">
          Kläder & Accessoarer i Second Hand
        </h2>

        <p className="text-muted-foreground mb-6">
          Vi erbjuder också ett noggrant urval av kläder och accessoarer i god skick.
          Dessa kommer ofta från samma hem som möblerna – vilket gör att varje plagg
          har sitt eget lilla kapitel.
        </p>

        <p className="text-muted-foreground mb-10">
          Genom att köpa second hand-kläder sparar du inte bara pengar, utan bidrar även
          till ett mer hållbart konsumtionsmönster.
        </p>

        {/* H2 */}
        <h2 className="text-2xl font-semibold mb-4">
          Ett mer hållbart alternativ till second hand-butiker
        </h2>

        <p className="text-muted-foreground mb-6">
          Till skillnad från stora second hand-kedjor är Handplockat mer personligt
          och lokalt. Vi arbetar nära varje uppdrag och erbjuder ett kuraterat
          urval.
        </p>

        {/* H2 */}
        <h2 className="text-2xl font-semibold mb-4">
          Koppling till flytt och dödsbo
        </h2>

        <p className="text-muted-foreground mb-6">
          Många av våra produkter kommer från hem där vi hjälpt till med
          <Link to="/dodsbo-sundsvall" className="text-primary underline ml-1">
            dödsbo
          </Link>{" "}
          eller
          <Link to="/aldreflytt-sundsvall" className="text-primary underline ml-1">
            äldreflytt
          </Link>.
          Det gör att du inte bara köper en produkt – du ger den ett nytt liv.
        </p>

        {/* CTA igen */}
        <div className="bg-muted p-6 rounded-xl text-center mt-10">
          <h3 className="text-lg font-semibold mb-2">
            Se aktuella second hand-fynd i Sundsvall
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Nya produkter läggs upp löpande beroende på aktuella uppdrag.
          </p>

          <Link
            to="/handplockat"
            className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg"
          >
            Gå till Handplockat <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </main>
    </div>
  );
}