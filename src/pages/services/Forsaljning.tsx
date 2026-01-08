import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
// Ändrade ikonen från Shield till TrendingUp för att signalera försäljning/värdeökning
import { ArrowLeft, CheckCircle, Clock, TrendingUp } from "lucide-react"; 
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Seo from "@/components/Seo";

function Forsaljning() {
  const navigate = useNavigate();

  useEffect(() => {
    // document.title = "Förmedling & Försäljning - Trygg Hand";
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleConsultationClick = () => {
    // Navigera till startsidan
    navigate("/", { replace: false });
    // Scrolla till kontakt efter en kort timeout
    setTimeout(() => scrollToSection("kontakt"), 50);
  };

  const handleBackToServicesClick = () => {
    navigate("/", { replace: false });
    setTimeout(() => window.scrollTo(0, 0), 50);
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Förmedling & Försäljning av dödsbo | Trygg Hand"
        description="Professionell försäljning av dödsboegendom – auktioner, direktförsäljning och värdering i Sundsvall."
        canonical="https://www.trygghand.com/services/forsaljning"
      />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto mb-8">
          <button
            onClick={handleBackToServicesClick}
            className="inline-flex items-center text-primary hover:text-primary/80 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tillbaka till tjänster
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              {/* Ny ikon: Trendande pil upp */}
              <TrendingUp className="h-8 w-8 text-primary" /> 
            </div>
            <div>
             
              <h1 className="text-3xl font-bold text-foreground"> Försäljningsförmedling</h1> 
             
              <p className="text-xl text-muted-foreground">Maximera värdet ur dödsboet eller äldreflytten. För komplett hantering av dödsbo, se vår <Link to="/dodsbohantering-sundsvall" className="text-primary underline">dödsbohantering i Sundsvall</Link>.</p> 
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto mt-8">
          <Card>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-6">
                {/* Ny sektion: Vad vi säljer åt dig */}
                <h3 className="font-semibold text-foreground">Föremål för Förmedling:</h3> 
                <p className="text-muted-foreground text-sm">Vi fokuserar på föremål med goda försäljningsmöjligheter som tillsammans optimerar slutvärdet. Exempel på föremål vi framgångsrikt förmedlar:</p>
                <ul className="space-y-3">
                  {[
                    "Unika eller värdefulla delar av dödsbon",
                    "Kvalitetsmöbler och inredning från äldreflyttar",
                    "Antikviteter, vintage och retroföremål",
                    "Designobjekt och konst",
                    "Specialintressen som samlingar eller verktyg"
                  ].map((item, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

                 {/* Förmåner */}
              <div>
                <h3 className="font-semibold text-foreground mb-6">
                  Förmåner med vår förmedlingstjänst
                </h3>
                <ul className="space-y-4">
                  {[
                    {
                      title: "Ingen initial kostnad",
                      text: "Du betalar endast ett arvode vid lyckad försäljning.",
                    },
                    {
                      title: "Prestationsbaserat arvode",
                      text: "Vi tar 25 % av försäljningspriset – resten går till dig.",
                    },
                    {
                      title: "Tidsbestämd säljperiod",
                      text: "Ett intensivt säljfokus under en överenskommen tidsram för snabb avveckling.",
                    },
                    {
                      title: "Marknadsanpassade kanaler",
                      text: "Vi säljer via flera utvalda kanaler som anpassas efter föremålets värde.",
                    },
                    {
                      title: "Komplett hantering",
                      text: "Värdering, foto, annonsering, kundkontakt, betalning och frakt.",
                    },
                  ].map((item, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-0.5" />
                      <span className="text-muted-foreground text-sm">
                        <strong>{item.title}:</strong> {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>


                {/* Process */}
              <div className="bg-muted/30 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Vår trygga försäljningsprocess i 3 steg
                </h3>
                <div className="space-y-6">
                  {[
                    {
                      step: "Värdering & avtal",
                      text: "Hembesök, urval av säljbara föremål och tydligt förmedlingsavtal.",
                    },
                    {
                      step: "Försäljning & hantering",
                      text: "Annonsering, kunddialog och praktisk hantering.",
                    },
                    {
                      step: "Redovisning & utbetalning",
                      text: "Full transparens och snabb utbetalning efter avslutad period.",
                    },
                  ].map((item, index) => (
                    <div key={index} className="flex items-start">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                        {index + 1}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        <strong>{item.step}:</strong> {item.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ================= CTA BOTTEN ================= */}
        <div className="mt-12 text-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-trust-blue-dark"
            onClick={handleConsultationClick}
          >
            Boka kostnadsfri konsultation & värdering
          </Button>
          <p className="text-muted-foreground mt-4">
            Denna tjänst ingår ofta i våra <a href="/#paketlosningar" className="text-primary hover:underline">servicepaket för dödsbohantering</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Forsaljning;