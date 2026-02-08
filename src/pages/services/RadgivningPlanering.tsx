import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  CheckCircle,
  Shield,
  FileText,
  KeyRound,
  ClipboardList,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Seo from "@/components/Seo";

const RadgivningPlanering = () => {
  const navigate = useNavigate();

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleConsultationClick = () => {
    if (window.location.pathname === "/") {
      scrollToSection("kontakt");
    } else {
      navigate("/", { replace: false });
      setTimeout(() => scrollToSection("kontakt"), 100);
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
      <Seo
        title="Rådgivning & Planering vid Dödsbo & Flytt i Sundsvall"
        description="Få hjälp med planering av dödsbohantering, äldreflytt och digitalt arv i Sundsvall. Vi skapar struktur och trygghet när du behöver det som mest."
        canonical="https://www.trygghand.com/services/radgivning-planering"
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
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Rådgivning & Planering i Sundsvall
              </h1>
              <p className="text-lg text-muted-foreground">
                Vi hjälper dig att överblicka vad som behöver göras, i vilken
                ordning – och ser till att inget viktigt faller mellan stolarna vid en äldreflytt eller dödsbohantering.
              </p>
            </div>
          </div>
        </div>

        {/* ================= INNEHÅLL ================= */}
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Vad vi hjälper till med */}
          <Card className="border-l-4 border-l-primary shadow-md">
            <CardHeader>
              <CardTitle>Vad rådgivningen omfattar</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-muted-foreground text-sm">
                {[
                  "Initial behovsanalys och överblick",
                  "Planering av hela processen vid äldreflytt eller dödsbo",
                  "Stöd kring boendealternativ och nästa steg",
                  "Samordning av viktiga kontakter (myndigheter, tjänster, abonnemang)",
                  "Stöd i planering av Vita Arkivet",
                  "Översiktlig information om framtidsfullmakt, testamente och god man",
                  "Rådgivning inför värdering, försäljning eller avveckling",
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Digitalt arv */}
          <Card className="bg-primary/5 border-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <KeyRound className="h-6 w-6" />
                Digitalt arv – något många inte tänker på
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground text-sm">
              <p>
                I dagens digitala värld lämnar vi efter oss konton, bilder och abonnemang. 
                Vi hjälper dig i Sundsvall att hantera det <strong>digitala arvet</strong> på ett tryggt och respektfullt sätt.
              </p>

              <ul className="space-y-2">
                {[
                  "Översikt av digitala konton och tjänster",
                  "Stöd i att dokumentera inloggningar och önskemål",
                  "Råd kring sociala medier, e-post och molntjänster",
                  "Avslut eller överlämning av digitala abonnemang",
                ].map((item, index) => (
                  <li key={index} className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>

              <p className="italic">
                Målet är att skapa trygghet, respekt och tydlighet – både nu och
                för framtiden.
              </p>
            </CardContent>
          </Card>

          {/* Process */}
          <Card>
            <CardHeader>
              <CardTitle>Så fungerar rådgivningen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                {
                  step: "Samtal",
                  text: "Vi går igenom din situation och skapar en tydlig överblick.",
                },
                {
                  step: "Planering",
                  text: "Vi tar fram en strukturerad plan anpassad efter dina behov.",
                },
                {
                  step: "Stöd",
                  text: "Vi stöttar och följer upp under processens gång.",
                },
                {
                  step: "Klart",
                  text: "Vi säkerställer att inget viktigt missas.",
                },
              ].map((item, index) => (
                <div key={index} className="flex items-start">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold mr-4 mt-1">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">
                      {item.step}
                    </h4>
                    <p className="text-muted-foreground text-sm">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
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
            Boka kostnadsfri rådgivning
          </Button>
          <p className="text-muted-foreground mt-4">
            Denna tjänst ingår ofta i våra <a href="/#paketlosningar" className="text-primary hover:underline">servicepaket för dödsbohantering och seniorförändring</a>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default RadgivningPlanering;
