import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Vardering = () => {
  const navigate = useNavigate();

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
    setTimeout(() => scrollToSection("skraddarsydda-losningar"), 50);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={handleBackToServicesClick}
            className="inline-flex items-center text-primary hover:text-primary/80 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tillbaka till tjänster
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Värdering</h1>
              <p className="text-xl text-muted-foreground">Professionell värdering av bohag</p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Professionell värdering</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground leading-relaxed">
                Vi erbjuder professionell värdering av alla typer av föremål som kan ingå i ett dödsbo.
              </p>

              <div className="bg-muted/30 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-foreground mb-4">Enkel och säker process</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Vi vet att det kan vara känslosamt och tidskrävande att sälja hela bohag eller ta hand om ett dödsbo. 
                  Vårt mål är att göra processen så enkel och trygg som möjligt. Vi hjälper dig med allt från inledande 
                  inventering av lösöre i dödsbo till transport och administration. Om det finns föremål som har högt 
                  värdering används en värderingsexpert.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mt-8">
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Vad vi värderar:</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Antika föremål</li>
                    <li>• Vintage-objekt</li>
                    <li>• Design-föremål</li>
                    <li>• Smycken och värdeföremål</li>
                    <li>• Konst och tavlor</li>
                    <li>• Möbler</li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">Vår process:</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li>• Kostnadsfri konsultation</li>
                    <li>• Professionell inventering</li>
                    <li>• Expertbedömning</li>
                    <li>• Detaljerad värderingsrapport</li>
                    <li>• Rådgivning kring försäljning</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-trust-blue-dark"
            onClick={handleConsultationClick}
          >
            Boka kostnadsfri konsultation
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Vardering;
