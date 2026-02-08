import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Shield, CheckCircle, ArrowLeft, Truck } from "lucide-react";
import Seo from "@/components/Seo";

const Flytt = () => {
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
    setTimeout(() => scrollToSection("skraddarsydda-losningar"), 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Flytthjälp & Bohagsflytt i Sundsvall | Trygg Hand"
        description="Behöver du hjälp med flytten? Vi erbjuder omsorgsfull flytthjälp och bohagsflytt i Sundsvall, särskilt anpassat för äldreflytt och dödsbon. Boka konsultation!"
        canonical="https://www.trygghand.com/services/flytt"
      />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={handleBackToServicesClick}
            className="inline-flex items-center text-primary hover:text-primary/80 mb-4 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tillbaka till tjänster
          </button>

          <div className="flex items-center gap-5 mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Truck className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Flytthjälp i Sundsvall</h1>
              <h2 className="text-xl font-medium text-foreground/80">Din personliga flyttkoordinator vid bohagsflytt</h2>
              <p className="text-lg text-muted-foreground italic">Sortering och borttransport</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="transition-shadow duration-200 hover:shadow-xl border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">Smidig bohagsflytt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground leading-relaxed mb-6">
                Att flytta innebär en nystart – men själva flytten kan kännas både tung och stressig, särskilt vid en äldreflytt. 
                Som din <strong>flyttkoordinator</strong> ser vi till att hela eller delar av din flytt sker helt utan krångel.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Flexibelt: Välj mellan enbart transport eller full service med packning och uppställning.",
                  "Tryggt: Vi utgår från Sundsvall och har god lokalkännedom.",
                  "Samordnat: Vi koordinerar med städning och tömning.",
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-trust-green mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-foreground text-sm leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-foreground">Prisindikation & RUT:</p>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Ca 100 kr/m² efter RUT-avdrag (inom Sundsvall). 
          <br />
          <span className="text-primary/90 font-medium italic block mt-1">
          * Observera att RUT-avdrag gäller för privatpersoner, ej vid tömning/flytt av dödsbo.
          </span>
          Vi sköter all administration med Skatteverket direkt på din faktura för privatpersoner.
        </p>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-shadow duration-200 hover:shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl">Omtanke för både dig och miljön</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground text-sm leading-relaxed">
                Vi arbetar med hållbara lösningar. Våra flyttkartonger kan hyras och återanvändas, emballage återvinns och vi strävar efter att minimera onödiga transporter. På så sätt blir din flytt inte bara enklare, utan även mer skonsam för miljön.
              </p>
              
              <div>
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                   I flytthjälpen ingår:
                </h3>
                <ul className="grid gap-2">
                  {[
                    "Omsorgsfull bärhjälp och transport",
                    "Lastning och lossning av bohag",
                    "Ansvarsförsäkring under hela transporten",
                    "Serviceinriktad personal med vana av äldreflytt",
                  ].map((item, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground text-xs">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold text-foreground mb-3">Tillval:</h3>
                <ul className="grid gap-2">
                  {[
                    "Hjälp med professionell packning och uppackning",
                    "Uthyrning av stabila flyttkartonger",
                    "Montering av möbler i den nya bostaden",
                    "Bortforsling av skräp och emballage",
                  ].map((item, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-primary/60 mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground text-xs">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center bg-primary/5 p-10 rounded-3xl border border-primary/10">
          <h3 className="text-2xl font-bold mb-4 text-foreground">Behöver du hjälp med flytten i Sundsvall?</h3>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Vi pratar gärna igenom dina behov och ger dig ett fast pris på din bohagsflytt.
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-trust-blue-dark shadow-md hover:shadow-lg px-10"
            onClick={handleConsultationClick}
          >
            Boka Flytt i Sundsvall
          </Button>
          <p className="text-sm text-muted-foreground mt-6">
            Denna tjänst är en central del av våra <a href="/#paketlosningar" className="text-primary hover:underline font-medium">servicepaket vid seniorförändring</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Flytt;