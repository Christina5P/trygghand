import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "app/src/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "app/src/components/ui/card";
import { Shield, CheckCircle, ArrowLeft } from "lucide-react";

const Flytt = () => {
  const navigate = useNavigate();

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
              <h1 className="text-3xl font-bold text-foreground">Flytt</h1>
              <p className="text-xl text-muted-foreground">Sortering och borttransport</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          <Card className="transition-shadow duration-200 hover:shadow-2xl hover:shadow-gray-300">
            <CardHeader>
              <CardTitle className="text-xl">Flytthjälp</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed mb-6">
              Att flytta innebär en nystart – men själva flytten kan kännas både tidskrävande och stressig.
              Vår flyttjänst är ett tryggt och smidigt alternativ där vi hjälper dig hela vägen – från planering till att dina saker står på plats i ditt nya hem.
              <br />  I denna tjänst väljer du själv hur mycket hjälp du vill ha- från enbart transport till även packning och förberedelse av nytt hem.</p>
            <br />Kostnaden varierar beroende på bohagets storlek, tillgänglighet och tillval. <br />Prisindikation flytt per m² : ca 100 kr/m2 efter RUT, inom Sundsvall </CardContent>
          </Card>

          <Card className="transition-shadow duration-200 hover:shadow-2xl hover:shadow-gray-300">
            <CardHeader>
              <CardTitle className="text-xl">Omtanke för både dig och miljönn</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
               Vi arbetar alltid med hållbara lösningar: våra flyttkartonger kan hyras och återanvändas, emballage sorteras och återvinns, och vi strävar efter att minimera onödiga transporter. På så sätt blir din flytt inte bara enklare, utan även mer skonsam för miljön.
              </p>
              
                        
              <div>
                <h3 className="font-semibold text-foreground mb-3">I flytthjälpen ingår:</h3>
                <ul className="space-y-2">
                  {[
                    "Bärhjälp och transport från bostad till ny adress",
                    "Lastning och lossning av bohag",
                    "Ansvarsförsäkring för bohaget under transporten",
                    "Trevlig och serviceinriktad personal som ser till att flytten blir smidig",
                  ].map((item, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

                <div>
                <h3 className="font-semibold text-foreground mb-3">Tillval till flytthjälpen:</h3>
                <ul className="space-y-2">
                  {[
                    "Uthyrning eller köp av flyttkartonger och emballage",
                    "Hjälp med packning och uppackning",
                    "Montering av möbler",
                    "Ned- och uppackning av kök, porslin och ömtåliga föremål",
                    "Bortforsling av emballage och skräp efter flytten"
                  ].map((item, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
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

export default Flytt;
