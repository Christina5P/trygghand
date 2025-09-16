import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Flytt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Tömning dödsbo innebär att vi tar hand om att tömma alla tillhörigheter från en bostad efter en person avlidit. 
                Det inkluderar bortforsling av möbler, kläder, köksartiklar och annat, samt säkerställande av att inga värdefulla 
                eller personliga saker går förlorade i processen.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Slänga & återvinna</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                I samband med din flytt kan vi även hjälpa dig med återvinning av de saker som du inte längre har någon 
                användning för. Med vår tjänst slänga och återvinna vill vi göra det så enkelt och smidigt som möjligt för dig. 
                Vi vet nämligen att du har nog att tänka på ändå.
              </p>
              
              <p className="text-muted-foreground leading-relaxed">
                Vid planeringsmötet av din flytt går vi igenom och märker upp vad som ska slängas och vad som ska gå till återvinning. 
                Vi har flera fina samarbetspartners i Borås med närområde.
              </p>

              <div className="bg-trust-green-light/20 rounded-lg p-4 mt-6">
                <p className="font-medium text-trust-green mb-2">Tillsammans kan vi göra skillnad för miljön!</p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-3">I återvinningen ingår:</h3>
                <ul className="space-y-2">
                  {[
                    "Upphämtning av det du önskar bli av med",
                    "Transport av det som går att återbruka till second hand-butiker/loppis",
                    "Transport av övrigt till återvinningscentral"
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
