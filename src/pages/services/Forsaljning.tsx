import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, ArrowLeft, CheckCircle, Shield } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";

function Forsaljning() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Försäljning - Trygg Hand";
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
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Försäljning</h1>
              <p className="text-xl text-muted-foreground">Inköp av bohag</p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent>
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Vad vi köper:</h3>
                <ul className="space-y-2">
                  {[
                    "Hela eller delar av dödsbon",
                    "Bohag vid äldreflytt",
                    "Enstaka föremål antikt",
                    "Vintage-objekt",
                    "Design-föremål"
                  ].map((item, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-4 mt-6">
                <h3 className="font-semibold text-foreground">Våra tjänster:</h3>
                <ul className="space-y-2">
                  {[
                    "Kostnadsfritt hembesök",
                    "Försäljning via webshop",
                    "Försäljning via Tradera",
                    "Försäljning via Bokbörsen",
                    "Professionell marknadsföring"
                  ].map((item, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-muted/30 rounded-lg p-6 mt-8">
                <h3 className="text-lg font-semibold text-foreground mb-3">Så här fungerar det:</h3>
                <div className="space-y-3">
                  {[
                    "Kontakta oss för ett kostnadsfritt hembesök",
                    "Vi värderar och ger ett erbjudande",
                    "Vi hanterar försäljningen och du får betalt"
                  ].map((step, index) => (
                    <div key={index} className="flex items-start">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mr-3 mt-0.5">
                        {index + 1}
                      </div>
                      <p className="text-muted-foreground">{step}</p>
                    </div>
                  ))}
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
}

export default Forsaljning;
