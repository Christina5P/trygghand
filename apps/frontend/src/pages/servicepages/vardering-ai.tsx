import { Button } from "app/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "app/src/components/ui/card";
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
              <p className="text-xl text-muted-foreground">Värdering av bohag</p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <Card className="transition-shadow duration-200 hover:shadow-2xl hover:shadow-gray-300">
            <CardHeader>
              <CardTitle className="text-xl">Värdering – för ett rättvist och tryggt beslut</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground leading-relaxed">
                När man står inför en flytt eller tömning av ett hem kan det vara svårt att veta vad som har ekonomiskt värde, och vad som bäst lämnas till återbruk eller återvinning. Med vår värderingstjänst får du hjälp att ta beslut som både är rättvisa och hållbara.
                <br />Utifrån vår värdering kan vi även köpa värdeföremål som konst, möbler, smycken och andra ägodelar.
                Vi använder marknadsvärdet, vilket är försäljningspriset på andrahandsmarknaden
              </p>

              <div className="bg-muted/30 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-foreground mb-4">Enkel och säker process</h3>
                <p className="text-muted-foreground leading-relaxed">
                Med vår värderingstjänst får du hjälp att ta beslut som både är rättvisa och hållbara.
                Med denna tjänst kan du känna dig trygg med att inget av värde går förlorat, samtidigt som saker får en chans till ett nytt liv.
                <br /><br />Vi hjälper till med värdering utifrån foton,video eller personligt besök.
                <br />
                Vid värdefulla föremål kan vi ta hjälp av en värderingsexpert.


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
                    <li>• Professionell inventering</li>
                    <li>• Eventuell Expertbedömning</li>
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
