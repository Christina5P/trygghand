import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, ClipboardCheck, Lock, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Seo from "@/components/Seo";

const Vardering = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // document.title = "Värdering & beslutsunderlag - Trygg Hand";
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleConsultationClick = () => {
    navigate("/", { replace: false });
    setTimeout(() => scrollToSection("kontakt"), 50);
  };

  const handleBackToServicesClick = () => {
    navigate("/", { replace: false });
    setTimeout(() => window.scrollTo(0, 0), 50);
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Digital värderingshjälp för bohag – vägledande bedömning | Trygg Hand"
        description="En digital, vägledande värderingshjälp som stöd för planering – ej juridisk eller marknadsvärdering."
        canonical="https://www.trygghand.com/services/vardering"
      />
      <div className="container mx-auto px-4 py-8">
        {/* Tillbaka */}
        <button
          onClick={handleBackToServicesClick}
          className="inline-flex items-center text-primary hover:text-primary/80 mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tillbaka till tjänster
        </button>

        {/* ================= HERO ================= */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="flex gap-5">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <ClipboardCheck className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Värdering som ger trygghet – och rätt beslut
              </h1>
              <p className="text-lg text-muted-foreground mb-4">
                Vi hjälper dig att förstå vad som faktiskt har värde,
                vad som kan säljas – och vad som tryggt kan släppas vidare.
              </p>
              <p className="text-sm text-muted-foreground">
                💡 Värdering är ofta första steget till att frigöra
                ekonomiskt värde vid dödsbo eller äldreflytt.
              </p>
            </div>
          </div>
        </div>

        {/* ================= INNEHÅLL ================= */}
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Kundlåst verktyg */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Digitalt värderingsverktyg – endast för kunder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Som kund hos Trygg Hand får du tillgång till vårt digitala
                värderingsverktyg – ett tryggt och strukturerat stöd i en
                ofta komplex process.
              </p>

              <ul className="space-y-2 text-sm">
                {[
                  "Ladda upp bilder på föremål",
                  "Få strukturerade bedömningar och noteringar",
                  "Spara beslutsunderlag för arvskifte eller försäljning",
                  "Full transparens – allt samlat på ett ställe",
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">✔</span>
                    {item}
                  </li>
                ))}
              </ul>

              <p className="text-sm italic">
                Tillgång ges som del av uppdrag eller som särskild
                värderingstjänst. Avgift tillkommer för enbart värdering.
              </p>
            </CardContent>
          </Card>

          {/* Process */}
          <Card>
            <CardHeader>
              <CardTitle>Så går värderingen till</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <ol className="space-y-3 text-sm">
                <li>
                  <strong>1. Inledande bedömning:</strong> Kostnadsfri
                  översikt för att se om värdering är relevant.
                </li>
                <li>
                  <strong>2. Fördjupad värdering:</strong> Genom verktyg,
                  hembesök eller videogenomgång.
                </li>
                <li>
                  <strong>3. Eventuell expert:</strong> Vid behov anlitar
                  vi professionell värderare efter godkännande.
                </li>
              </ol>
            </CardContent>
          </Card>

          {/* Koppling till försäljning */}
          <Card className="bg-muted/30">
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  Från värdering till försäljning
                </h3>
              </div>

              <p className="text-muted-foreground text-sm">
                När värderingen är klar hjälper vi dig att avgöra om
                försäljning är ekonomiskt försvarbart.
                <br />
                Väljer du att gå vidare tar vi hand om hela processen –
                från annonsering till utbetalning.
              </p>

              <Button
                variant="link"
                className="px-0"
                onClick={() => navigate("/services/Forsaljning")}
              >
                Läs mer om vår försäljningstjänst →
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-trust-blue-dark"
            onClick={handleConsultationClick}
          >
            Boka kostnadsfri första bedömning
          </Button>
          <p className="text-muted-foreground mt-4">
            Denna tjänst ingår ofta i våra <a href="/#paketlosningar" className="text-primary hover:underline">servicepaket för dödsbohantering</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Vardering;
