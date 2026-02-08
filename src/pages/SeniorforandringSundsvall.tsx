import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, 
  CheckCircle, 
  Heart, 
  MapPin, 
  ClipboardList, 
  Truck, 
  Sparkles, 
  Users 
} from "lucide-react"; 
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Seo from "@/components/Seo";

function Seniorforandring() {
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

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="Seniorförändring i Sundsvall – äldreflytt med helhetsstöd | Trygg Hand"
        description="Trygg seniorförändring i Sundsvall. Helhetskoordinator vid äldreflytt: planering, sortering, flyttsamordning och anhörigstöd – steg för steg." 
        canonical="https://www.trygghand.com/services/seniorforandring"
      />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto mb-12">
          <Link 
            to="/" 
            className="inline-flex items-center text-primary hover:text-primary/80 mb-6 transition-colors font-medium"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tillbaka till startsidan
          </Link>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left mb-8">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Heart className="h-10 w-10 text-primary" /> 
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">Seniorförändring i Sundsvall</h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                En äldreflytt kan väcka många känslor. Som Trygg Hands helhetskoordinator i Sundsvall hjälper vi dig som senior och er som anhöriga med 
                en trygg, respektfull och stegvis äldreflytt.<br />Vi samordnar helheten, så flytten till mindre boende,
                trygghetsboende eller särskilt boende blir så lugn och tydlig som möjligt.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* Tjänstens innehåll - Grid av kort */}
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Planering & Rådgivning",
                text: "Vi går igenom tidplan och beslut i din takt, så att allt känns hanterbart.",
                icon: <ClipboardList className="h-6 w-6 text-primary" />
              },
              {
                title: "Sortering med omsorg",
                text: "Hjälp att välja ut vad som ska följa med till det nya hemmet på ett respektfullt sätt.",
                icon: <Heart className="h-6 w-6 text-primary" />
              },
              {
                title: "Flyttsamordning",
                text: "Vi samordnar flytten med rätt insatser vid rätt tidpunkt. Det kan inkludera koordinering av transport, nycklar, tillträde och andra praktiska detaljer i både den gamla och nya bostaden",
                icon: <Truck className="h-6 w-6 text-primary" />
              },
              {
                title: "Städ & Överlämning",
                text: "När flytten är klar ordnar vi städ och förbereder bostaden för nästa steg.",
                icon: <Sparkles className="h-6 w-6 text-primary" />
              }
            ].map((item, index) => (
              <Card key={index} className="border-none shadow-md bg-muted/20">
                <CardContent className="p-6 flex gap-4">
                  <div className="mt-1">{item.icon}</div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.text}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Anhörigstöd - Lyfts fram extra */}
          <Card className="bg-primary/5 border-primary/10 overflow-hidden">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1 space-y-4">
                  <h2 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                    <Users className="h-6 w-6 text-primary" />
                    Anhörigstöd & Kommunikation
                  </h2>
                  <p className="text-muted-foreground">
                    En äldreflytt berör hela familjen. Jag fungerar som en samlande kraft och trygg kontaktpunkt 
                    för anhöriga, så att ni kan fokusera på att finnas där för varandra istället för att rodda i logistik.
                  </p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-primary/10 w-full md:w-auto">
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-foreground/80">
                      <CheckCircle className="h-4 w-4 text-trust-green" /> Tydliga uppdateringar
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground/80">
                      <CheckCircle className="h-4 w-4 text-trust-green" /> Minskad stress för familjen
                    </li>
                    <li className="flex items-center gap-2 text-sm text-foreground/80">
                      <CheckCircle className="h-4 w-4 text-trust-green" /> Lokal samordning i Sundsvall
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sektion: Priser och kostnader */}
<section className="py-12 border-t border-b bg-muted/10 my-12">
  <div className="max-w-3xl mx-auto px-4 text-center">
    <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center justify-center gap-2">
      <Sparkles className="h-6 w-6 text-primary" />
      Priser och servicepaket
    </h2>
    <p className="text-muted-foreground mb-8">
      Vi tror på full transparens. Därför erbjuder vi fasta servicepaket, 
      så att du vet exakt vad som ingår och vad det kostar.
      Du kan även välja en skräddarsydd tjänst där vi anpassar insatserna efter just dina behov och önskemål.
    </p>
    
    <div className="grid md:grid-cols-2 gap-6 text-left">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-primary/10">
        <h3 className="font-bold text-lg mb-2">Servicepaket</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Färdiga paketlösningar för olika behov och budgetar. 
        </p>
        <ul className="space-y-2 text-sm italic">
          <li>• Räkna ut pris direkt</li>
          <li>• Tydlig specifikation på moment</li>
          <li>• Inga dolda avgifter</li>
        </ul>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-primary/10">
        <h3 className="font-bold text-lg mb-2">Skräddarsydd offert</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Varje hem eller behov är unikt. Vi erbjuder alltid en gratis konsultation för att ge en exakt prisbild.
        </p>
      
      </div>
    </div>

    <div className="mt-8 p-4 bg-primary/5 rounded-lg">
      <p className="text-xs text-muted-foreground leading-relaxed">
        * Observera att RUT-avdrag ofta är tillämpligt vid seniorflytt (t.ex. packning och flyttstäd), 
        vilket kan reducera arbetskostnaden med upp till 50%. 
      </p>
    </div>
  </div>
</section>

          {/* Process-steg */}
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-center">Så fungerar en seniorförändring</h2>
            <div className="relative">
              <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-primary/20 hidden md:block" />
              {[
                { step: "Kontakt", desc: "Vi börjar med ett samtal om er situation." },
                { step: "Planering", desc: "Vi tar fram en tydlig tidplan och budget." },
                { step: "Genomförande", desc: "Sortering, packning och flyttsamordning." },
                { step: "Klart", desc: "Bostaden överlämnad och det nya hemmet redo." }
              ].map((item, index) => (
                <div key={index} className="relative flex items-center mb-8 md:justify-between">
                  <div className="flex flex-col md:w-[45%] items-start md:items-end text-left md:text-right px-4">
                    <span className="font-bold text-primary">Steg {index + 1}</span>
                    <h4 className="font-bold text-foreground">{item.step}</h4>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <div className="absolute left-0 md:left-1/2 transform -translate-x-1/2 w-4 h-4 bg-primary rounded-full z-10" />
                  <div className="hidden md:block w-[45%]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-20 text-center space-y-6">
          <div className="inline-flex items-center gap-2 text-primary font-medium mb-2">
            <MapPin className="h-5 w-5" />
            Din personliga koordinator i Sundsvall
          </div>
          <h2 className="text-3xl font-bold">Låt oss göra förändringen tryggare</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Boka en kostnadsfri konsultation så går vi igenom hur jag kan avlasta just er vid nästa äldreflytt.
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-trust-blue-dark shadow-xl hover:scale-105 transition-transform px-10 py-7 text-lg"
            onClick={handleConsultationClick}
          >
           Kontakta oss nu
          </Button>
          <div className="pt-4">
            <Link to="/dodsbohantering-sundsvall" className="text-sm text-muted-foreground underline hover:text-primary">
              Behöver du istället hjälp med dödsbo? Klicka här.
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Seniorforandring;