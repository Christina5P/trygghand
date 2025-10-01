import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, ArrowLeft, CheckCircle, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Stadning = () => {
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
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Städning</h1>
              <p className="text-xl text-muted-foreground">Flyttstädning</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="transition-shadow duration-200 hover:shadow-2xl hover:shadow-gray-300">
            <CardHeader>
              <CardTitle className="text-xl">Detta ingår i vårt flyttstäd:</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-foreground mb-3">Samtliga rum</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Fönsterputsning, bakom element och utsida samt målade ytor, rengöring av fönsterbänkar, fönsterkarmars insida, rengöring av golvlister, 
                  elkontakter, belysningsknappar, dörrar och dörrkarmar, . 
                  Rengöring av golv och trösklar, rengöring av garderober, in- och utvändigt samt ovanpå. 
                  Väggar och tak dammas. )
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-3">Badrum & toalett</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Rengöring av tvättställ, toalett inkl. rör,
                  Badkar-ovansidan och baksidan, eller dusch inkl blandare och rör.
                  Rengöring av kakelväggar/klinkers och fogar. 
                  Rengöring av alla synliga rör, samt putsning av speglar.
                  Rengöring av badrumsskåp samt övriga förvaringsutrymmen.
                  Rengöring av golvbrunnar och ventiler. 
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-3">Kök</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Rengöring av fast belysning och av kyl och frys in- och utvändigt samt under och bakom. 
                  Rengöring av spis, ugn in- och utvändigt, tillhörande plåtar och galler samt under och bakom. 
                  Rengöring av diskmaskin, in- och utvändigt.
                  Av- och uttorkning av skåp även under överskåp,lådor och arbetsbänkar. 
                  Avtorkning av köksfläkt, rengöring av filter och ventiler.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-3">Tvättstuga</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Om det finns en tvättstuga gäller enligt samtliga rum. Inklusive rengöring av tvättmaskin, 
                  torktumlare och torkskåp in- och utvändigt.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-shadow duration-200 hover:shadow-2xl hover:shadow-gray-300">
            <CardHeader>
              <CardTitle className="text-xl">Att tänka på innan vi kommer och städar:</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {[
                  "Se till att frysen är avstängd och avfrostad och glöm ej att tömma kylen inför rengöring.",
                  "Dra ut alla vitvaror som går så som kyl, frys, spis samt tvättmaskin och torktumlare för att vi ska kunna rengöra bakom.",
                  "Rensning av vattenlås under handfat och diskho ingår inte i flyttstädningen. (Vi ser helst att ni gör det själva).",
                  "Vi behöver också veta vid bokningen om ni har persienner och vill att vi rengör dem annars behöver det vara gjort innan vi kommer ut och städar.",
                  "Se till att bostaden är tömd på möbler och lösa föremål.",
                  "Tänk också på att biytor som t.ex. förråd, garage och balkonger inte ingår i flyttstädningen. Självklart hjälper vi gärna till med det också men då behöver vi veta det i samband med bokningen."
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground text-sm">{item}</span>
                  </li>
                ))}
              </ul>
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

export default Stadning;
