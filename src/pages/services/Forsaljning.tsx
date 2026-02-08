import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle, Clock, TrendingUp, Gem, Handshake } from "lucide-react"; 
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Seo from "@/components/Seo";

function Forsaljning() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleConsultationClick = () => {
    navigate("/", { replace: false });
    setTimeout(() => scrollToSection("kontakt"), 100);
  };

  const handleBackToServicesClick = () => {
    navigate("/", { replace: false });
    setTimeout(() => scrollToSection("skraddarsydda-losningar"), 50);
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Försäljning av bohag & dödsbo i Sundsvall | Trygg Hand"
        description="Maximera värdet vid försäljning av bohag eller dödsbo. Vi sköter allt från värdering till annonsering – tryggt och professionellt."
        canonical="https://www.trygghand.com/services/forsaljning"
      />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto mb-8">
          <button
            onClick={handleBackToServicesClick}
            className="inline-flex items-center text-primary hover:text-primary/80 mb-4 transition-colors font-medium"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tillbaka till tjänster
          </button>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-8 w-8 text-primary" /> 
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Försäljningsförmedling</h1> 
              <p className="text-xl text-muted-foreground leading-relaxed">
                Vi hjälper dig att maximera värdet ur dödsboet inför äldreflytt eller avveckling. <br />
                För komplett hantering av dödsbo, se vår <Link to="/dodsbohantering-sundsvall" className="text-primary underline font-medium hover:text-primary/80">dödsbohantering i Sundsvall</Link>.
              </p> 
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto mt-8">
          <Card className="border-t-4 border-t-primary shadow-lg overflow-hidden">
            <CardContent className="p-8 space-y-10">
              
              {/* Sektion: Urval */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <Gem className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-bold text-foreground">Föremål för Förmedling</h3>
                </div>
                <p className="text-muted-foreground text-sm">
                  Vi fokuserar på föremål med goda försäljningsmöjligheter som tillsammans optimerar slutvärdet för boet. Exempel på föremål:
                </p>
                <ul className="grid md:grid-cols-2 gap-3">
                  {[
                    "Kvalitetsmöbler och modern inredning",
                    "Unika eller värdefulla delar av dödsbon",
                    "Designobjekt, konst och belysning",
                    "Vintage, retro och utvalda klassiker"
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-trust-green flex-shrink-0" />
                      <span className="text-muted-foreground text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Förmåner */}
              <div className="pt-8 border-t">
                <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
                  <Handshake className="h-6 w-6 text-primary" />
                  Dina förmåner
                </h3>
                <div className="grid gap-4">
                  {[
                    {
                      title: "Ingen initial kostnad",
                      text: "Du betalar endast arvode vid lyckad försäljning.",
                    },
                    {
                      title: "Prestationsbaserat arvode",
                      text: "Vi tar 25 % av försäljningspriset – du behåller 75 %.",
                    },
                    {
                      title: "Tidsbestämd säljperiod",
                      text: "Intensivt fokus under en överenskommen tid för snabb avveckling.",
                    },
                    {
                      title: "Marknadsanpassade kanaler",
                      text: "Vi säljer via utvalda kanaler som anpassas efter föremålets värde",
                    },
                    {
                      title: "Komplett hantering",
                      text: "Värdering, foto, annons, kundkontakt och redovisning – vi sköter allt.",
                    },
                  ].map((item, index) => (
                    <div key={index} className="flex items-start gap-3 bg-muted/30 p-4 rounded-xl">
                      <CheckCircle className="h-5 w-5 text-trust-green mt-0.5" />
                      <div>
                        <span className="font-bold text-foreground block text-sm">{item.title}</span>
                        <span className="text-muted-foreground text-sm">{item.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Process */}
              <div className="bg-primary/5 rounded-2xl p-8 border border-primary/10">
                <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Säljprocessen i 3 steg
                </h3>
                <div className="grid md:grid-cols-3 gap-8">
                  {[
                    {
                      step: "Värdering & Avtal",
                      text: "Hembesök, urval av säljbara föremål och förmedlingsavtal.",
                    },
                    {
                      step: "Försäljning & hantering",
                      text: "Vi fotograferar, annonserar och hanterar köparfrågor.",
                    },
                    {
                      step: "Redovisning",
                      text: "Redovisning och utbetalning sker efter periodens slut.",
                    },
                  ].map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="text-primary font-bold text-lg">0{index + 1}.</div>
                      <h4 className="font-bold text-foreground text-sm uppercase tracking-wider">{item.step}</h4>
                      <p className="text-muted-foreground text-xs leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CTA BOTTEN */}
        <div className="mt-12 text-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-trust-blue-dark shadow-xl hover:scale-105 transition-transform px-8 py-6"
            onClick={handleConsultationClick}
          >
            Boka kostnadsfri värdering
          </Button>
          <p className="text-sm text-muted-foreground mt-6 leading-relaxed">
            Denna tjänst är ofta en nyckel i att finansiera övriga delar i våra <br className="hidden md:block" />
            <a href="/#paketlosningar" className="text-primary hover:underline font-medium">helhetslösningar för dödsbohantering</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Forsaljning;