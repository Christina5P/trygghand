import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter, // Valfri
  CardDescription // Valfri
} from "@/components/ui/card";
import { 
  ArrowLeft, 
  CheckCircle, 
  Home, 
  MapPin, 
  ClipboardCheck, 
  Trash2, 
  Sparkles, 
  ShieldCheck,
  CircleDollarSign
} from "lucide-react"; 
import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Seo from "@/components/Seo";

const DodsbohanteringSundsvall = () => {
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
        title="Dödsbo i Sundsvall – hjälp med tömning, städning & försäljning"
        description="Behöver du hjälp med dödsbo i Sundsvall? Trygg Hand tar hand om hela processen – från sortering och tömning av bohag till flyttstädning."
        canonical="https://www.trygghand.com/dodsbo-sundsvall"
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

          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <Home className="h-10 w-10 text-primary" /> 
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4">Dödsbohantering i Sundsvall</h1>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Att hantera ett dödsbo är krävande, både praktiskt och känslomässigt. Som din lokala helhetskoordinator tar jag hand om helheten, så att du kan fokusera på det som är viktigt.
              </p>
            </div>
          </div>
        </div>
        <section className="max-w-3xl mx-auto mb-12 text-center">
         <p className="mb-4">
            Behöver du istället stöd vid en äldreflytt? Läs mer om vår{" "}
            <Link to="/seniorforandring-sundsvall" className="text-primary underline">
              seniorförändring i Sundsvall
            </Link>
            .
          </p>
        </section>


        <div className="max-w-4xl mx-auto space-y-12">
          
          {/* Tjänstebeskrivning i kortformat */}
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Tömning av bohag",
                text: "Vi sorterar, packar och transporterar bort det som inte ska behållas med största respekt.",
                icon: <Trash2 className="h-6 w-6 text-primary" />
              },
              {
                title: "Dödsbostäd",
                text: "Grundlig rengöring av alla ytor så att bostaden är redo för försäljning eller överlämning.",
                icon: <Sparkles className="h-6 w-6 text-primary" />
              },
              {
                title: "Samordning",
                text: "Vi hjälper till med all nödvändig administration, som kontakt med myndigheter och försäljning av egendom eller donationer.",
                icon: <ClipboardCheck className="h-6 w-6 text-primary" />
              }
            ].map((item, index) => (
              <Card key={index} className="border-none shadow-lg bg-white">
                <CardContent className="p-6 text-center space-y-3">
                  <div className="mx-auto w-12 h-12 bg-primary/5 rounded-full flex items-center justify-center">
                    {item.icon}
                  </div>
                  <h3 className="font-bold text-foreground">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Varför välja Trygg Hand */}
          <section className="bg-muted/30 rounded-2xl p-8 md:p-12 border border-muted">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              Varför välja Trygg Hand i Sundsvall?
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Som lokal aktör i Sundsvall förstår vi de unika utmaningarna i regionen. Vi är inte bara en flyttfirma – vi är din koordinator som håller i alla trådar.
                </p>
                <ul className="space-y-3">
                  {[
                    "Lokal närvaro i Sundsvall med omnejd",
                    "Respektfull hantering av personliga minnen",
                    "En enda kontaktperson för hela processen",
                    "Hjälp med både praktiskt och administrativt"
                  ].map((bullet, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm font-medium">
                      <CheckCircle className="h-4 w-4 text-trust-green" /> {bullet}
                    </li>
                  ))}
                </ul>
              </div>
           
            </div>
          </section>

          {/* Sektion: Priser och servicepaket (Transparenta priser) */}
          <section className="py-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl font-bold mb-4 flex items-center justify-center gap-2">
                <CircleDollarSign className="h-6 w-6 text-primary" />
                Transparenta priser & Servicepaket
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Vi vill att du ska känna dig trygg med kostnaden. Därför arbetar vi med tydliga paketlösningar där du själv väljer omfattningen av vår hjälp.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-primary/10 hover:border-primary/30 transition-colors">
                <CardHeader>
                  <CardTitle className="text-lg">Anpassade Servicepaket</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Vi erbjuder färdiga paketlösningar för dödsbohantering. Från den lilla genomgången till den kompletta tömningen och städningen.
                  </p>
                  <ul className="text-sm space-y-2 italic">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-primary/50" /> Fast pris per uppdrag
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-primary/50" /> Tydlig specifikation
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3 w-3 text-primary/50" /> Inga oväntade avgifter
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-primary/5 border-none">
                <CardHeader>
                  <CardTitle className="text-lg">Gratis konsultation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Varje boende är unikt. Vi besöker er alltid kostnadsfritt i Sundsvall för att ge en exakt offert baserad på era specifika behov.
                  </p>
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={handleConsultationClick}
                  >
                    Boka kostnadsfritt besök
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Process i steg */}
          <div className="space-y-8 py-8">
            <h2 className="text-2xl font-bold text-center">Processen steg för steg</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              {[
                "Kontakt & Möte",
                "Värdering & Plan",
                "Tömning",
                "Städning",
                "Administration"
              ].map((step, i) => (
                <div key={i} className="space-y-2">
                  <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center mx-auto font-bold">
                    {i + 1}
                  </div>
                  <p className="text-xs font-bold uppercase tracking-tighter">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA BOTTEN */}
        <div className="mt-16 text-center space-y-6 bg-primary/5 p-12 rounded-3xl">
          <MapPin className="h-8 w-8 text-primary mx-auto" />
          <h2 className="text-3xl font-bold">Din hjälpande hand i Sundsvall</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Kontakta Trygg Hand idag för en förutsättningslös konsultation. Vi finns här för att underlätta för dig och din familj.
          </p>
          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-trust-blue-dark shadow-xl px-10 py-7 text-lg"
            onClick={handleConsultationClick}
          >
            Kontakta oss nu
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DodsbohanteringSundsvall;