import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ArrowLeft, CheckCircle, MessageSquare, Clock, UserCheck, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RadgivningPlanering = () => {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleConsultationClick = () => {
    // Om vi redan är på startsidan kan vi bara scrolla
    if (window.location.pathname === "/") {
      scrollToSection("kontakt");
    } else {
      // Navigera till startsidan först och scrolla efter render
      navigate("/", { replace: false });
      setTimeout(() => scrollToSection("kontakt"), 100); // öka timeout lite
    }
  };

  const handleBackToServicesClick = () => {
    if (window.location.pathname === "/") {
      scrollToSection("skraddarsydda-losningar");
    } else {
      navigate("/", { replace: false });
      setTimeout(() => scrollToSection("skraddarsydda-losningar"), 100);
    }
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
              <h1 className="text-3xl font-bold text-foreground">Rådgivning & Planering</h1>
              <p className="text-xl text-muted-foreground">Vägledning genom hela processen</p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl">Personlig vägledning hela vägen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground leading-relaxed text-lg">
                Vi erbjuder snabbt svar på många frågor direkt på hemsidan och ni kan följa hela processen 
                när ni loggat in på mina sidor.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Vad vi hjälper dig med:</h3>
                  <ul className="space-y-2">
                    {[
                      "Initial behovsanalys",
                      "Planering av hela processen",
                      "Tidslinje och milstolpar",
                      "Koordinering av tjänster",
                      "Myndighetskontakter",
                      "Juridisk vägledning"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-foreground">Din kontaktperson:</h3>
                  <ul className="space-y-2">
                    {[
                      "Personlig livskoordinator",
                      "Tillgänglig via telefon och e-post",
                      "Regelbunden uppföljning",
                      "Stöd genom hela processen",
                      "Expertkunskap inom området",
                      "Empati och förståelse"
                    ].map((item, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="pt-6 text-center">
                <MessageSquare className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Snabba svar</h3>
                <p className="text-sm text-muted-foreground">
                  Få svar på dina frågor direkt via vår hemsida eller genom din personliga kontakt
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Följ processen</h3>
                <p className="text-sm text-muted-foreground">
                  Logga in på "Mina sidor" för att följa hela processen och se uppdateringar i realtid
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <UserCheck className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-2">Personlig service</h3>
                <p className="text-sm text-muted-foreground">
                  Din dedikerade livskoordinator guidar dig genom varje steg av processen
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Så fungerar vår rådgivning:</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-start">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-1">{step}</div>
                    <div>
                      <h4 className="font-medium text-foreground">
                        {step === 1 && "Första konsultationen"}
                        {step === 2 && "Planering"}
                        {step === 3 && "Genomförande"}
                        {step === 4 && "Uppföljning"}
                      </h4>
                      <p className="text-muted-foreground text-sm">
                        {step === 1 && "Vi träffas för att förstå dina behov och situation"}
                        {step === 2 && "Vi skapar en detaljerad plan anpassad efter dina behov"}
                        {step === 3 && "Vi följer planen med regelbundna uppdateringar"}
                        {step === 4 && "Vi säkerställer att allt genomförts enligt plan"}
                      </p>
                    </div>
                  </div>
                ))}
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

export default RadgivningPlanering;
