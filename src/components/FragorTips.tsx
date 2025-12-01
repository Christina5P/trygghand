import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, AlertCircle, FileText, Calculator, Archive, ClipboardList } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const FragorTips = () => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const articles = [
    {
      id: 1,
      title: "Får man tömma ett dödsbo innan bouppteckning?",
      icon: <AlertCircle className="h-6 w-6" />,
      category: "Juridik",
      imageUrl: "/images/bouppteckning.png",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Nej, som huvudregel ska dödsboet inte tömmas eller förändras innan bouppteckningen är gjord. 
            Detta är viktigt av flera skäl:
          </p>
          <ul className="space-y-2">
            <li className="flex items-start">
              <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-1 flex-shrink-0" />
              <span>Alla tillgångar måste inventeras och värderas</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-1 flex-shrink-0" />
              <span>Skatteverket behöver en korrekt förmögenhetsbild</span>
            </li>
            <li className="flex items-start">
              <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-1 flex-shrink-0" />
              <span>Arvingar har rätt att se vad som fanns i dödsboet</span>
            </li>
          </ul>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium">Tips:</p>
            <p className="text-sm text-muted-foreground mt-1">
              Kontakta oss för professionell hjälp med bouppteckning och tömning i rätt ordning.
            </p>
          </div>
        </div>
      )
    },
    {
     id: 2,
title: "Vilka Seniortjänster och Dödsbohantering ger RUT-avdrag?",
icon: <Calculator className="h-6 w-6" />,
category: "Skatt & Ekonomi",
imagePrompt: "Illustration av en kalkylator, kvitton och en checklista bredvid flyttlådor, stilren och enkel.",
imageUrl: "/images/rutavdrag.png",
content: (
  <div className="space-y-4">
    <p className="text-muted-foreground">
      RUT-avdrag kan tillämpas på arbetskostnaden för hushållsnära tjänster. Reglerna omfattar både vanliga flyttar (seniorförändringar) och hantering av dödsbon innan bortgång. <br></br>Då RUT-avdrag endast gäller för betalande kund i sin bostad fungerar det tyvärr att använda vid tömning/städ av dödsbo.
    </p>
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <h4 className="font-semibold text-trust-green mb-2">Berättigat för RUT-avdrag (Arbetskostnad):</h4>
        <ul className="space-y-1 text-sm">
          <li>• Flytt av bohag mellan bostäder eller till/från magasinering.</li>
          <li>• Sortering, packning och utpackning i bostaden.</li>
          <li>• Städning av bostaden inför flytt eller efter tömning.</li>
          <li>• Hjälp med betalning av räkningar och enklare ärenden.</li>
          <li>• Själva transporten av bohag till annan bostad eller försäljning.</li>
        </ul>
      </div>
      <div>
        <h4 className="font-semibold text-red-600 mb-2">Ej berättigat (Administration, Konsultation & Avgifter):</h4>
        <ul className="space-y-1 text-sm">
          <li>• Rådgivning, planering och kontakter med myndigheter/abonnemang.</li>
          <li>• Experttjänster som värdering, auktion eller försäljning av lösöre.</li>
          <li>• Kostnad för hyra/förvaring.</li>
          <li>• Kostnader för tippavgifter eller hantering av skräp/avfall.</li>
        </ul>
      </div>
    </div>
    
    <div className="bg-muted p-4 rounded-lg border border-gray-200">
      <p className="text-sm font-medium">Viktigt att veta om Dödsbo:</p>
      <p className="text-sm text-muted-foreground mt-1">
        RUT-avdrag kan beviljas för dödsbohantering om arbetet utfördes före dödsfallet.
      </p>
    </div>
    
    <div className="bg-trust-green/10 p-4 rounded-lg">
      <p className="text-sm font-medium">Maximalt Avdrag:</p>
      <p className="text-sm text-muted-foreground mt-1">
        Avdraget är **50% av den totala arbetskostnaden** för de berättigade tjänsterna, upp till **75 000 kr** per person och år. På skatteverket kan man se hur mycket man har förbrukat.
      </p>
    </div>
  </div>
)
    },
    {
      id: 3,
      title: "Framtidsorganisering - Varför det är värt att börja tidigt",
      icon: <Archive className="h-6 w-6" />,
      category: "Tips",
      imageUrl: "/images/dostadning.png",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Många kallar det 'dödstädning', men vi ser det som Omtänksam Överlämning eller Framtidsorganisering.
          </p>
          <div className="space-y-3">
            <h4 className="font-semibold">Fördelar med Framtidsorganisering:</h4>
            <ul className="space-y-2">
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-1 flex-shrink-0" />
                <span>Du får använda RUT-avdrag vid köp av hjälp av servicetjänster som hjälp</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-1 flex-shrink-0" />
                <span>Minskar stress för familjen efter dödsfallet</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-1 flex-shrink-0" />
                <span>Du bestämmer själv vad som ska bevaras</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-1 flex-shrink-0" />
                <span>Viktiga dokument och minnen kan märkas</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-1 flex-shrink-0" />
                <span>Skapar ordning och överblick</span>
              </li>
            </ul>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium">Praktiskt tips:</p>
            <p className="text-sm text-muted-foreground mt-1">
              Börja med en kategori i taget - kläder, böcker, papper. Ta pauser och få hjälp vid behov.<br></br>
              Det här kan vara en  gruvsam och känslomässig process, som du kan få hjälp med som en servicetjänst av oss.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "Skapa Trygghetspärmen / Arkivet - En hjälp för anhöriga",
      icon: <FileText className="h-6 w-6" />,
      category: "Planering",
      imageUrl: "/images/arkiv.png",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Ett välorganiserat arkiv underlättar enormt för anhöriga som ska hantera dina ärenden.
          </p>
          <div className="space-y-3">
            <h4 className="font-semibold">Viktiga dokument att samla:</h4>
            <div className="grid gap-2 md:grid-cols-2">
              <ul className="space-y-1 text-sm">
                <li>• Testamente</li>
                <li>• Gåvobrev: Om det finns gåvor som har getts under livstiden som kan påverka arvet.</li>
                <li>• Försäkringshandling</li>
                <li>• Bankuppgifter</li>
                <li>• Pensionsbesked</li>
              </ul>
              <ul className="space-y-1 text-sm">
                <li>• Aktieportfölj</li>
                
                <li>• Fastighetshandlingar</li>
                <li>• Kontaktuppgifter till ev.bankman, jurist, försäkringsagent, läkare, nära vänner</li>
                <li>• Digitala lösenord</li>
              </ul>
            </div>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium">Smart lösning:</p>
            <p className="text-sm text-muted-foreground mt-1">
              Skapa en "viktig pärm" med alla centrala dokument och berätta för närmast anhörig var den finns.
            </p>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium">Tips:</p>
            <p className="text-sm text-muted-foreground mt-1">
              Om du redan har fyllt i Grav/Begravningsönskemål på en begravningsbyrå är det viktigt att ange <i>var</i> önskemålen finns. 
            </p>
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: "Skatt för dödsbo - Vad gäller?",
      icon: <Calculator className="h-6 w-6" />,
      category: "Skatt",
      imageUrl: "/images/skatt.png",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Dödsbon är skattskyldiga och måste lämna deklaration om vissa villkor uppfylls.
          </p>
          <div className="space-y-3">
            <h4 className="font-semibold">När ska dödsbo deklarera:</h4>
            <ul className="space-y-2">
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-1 flex-shrink-0" />
                <span>Om bruttoinkomsten överstiger 200 kr</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-1 flex-shrink-0" />
                <span>Vid försäljning av tillgångar</span>
              </li>
              <li className="flex items-start">
                <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-1 flex-shrink-0" />
                <span>Om dödsboet har preliminärskatt att betala</span>
              </li>
            </ul>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium">Viktigt datum:</p>
            <p className="text-sm text-muted-foreground mt-1">
              Dödsbo ska deklarera senast den 31 maj året efter dödsfallet.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 6,
      title: "Checklista vid dödsfall",
      icon: <ClipboardList className="h-6 w-6" />,
      category: "Planering",
      imageUrl: "/images/checklista.png",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            En strukturerad checklista hjälper dig att hantera alla praktiska ärenden efter ett dödsfall.
          </p>
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Första veckan:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>□ Anmäl dödsfall till Skatteverket</li>
                <li>□ Kontakta arbetsgivare</li>
                <li>□ Kontakta begravningsbyrå</li>
                <li>□ Informera bank och försäkringsbolag</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Första månaden:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>□ Bouppteckning (inom 3 månader)</li>
                <li>□ Ansök om dödsbevis</li>
                <li>□ Hitta testamente</li>
                <li>□ Säg upp abonnemang</li>
              </ul>
            </div>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium">Behöver du hjälp?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Vi hjälper dig med hela processen - från bouppteckning till tömning av dödsboet.
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Global header — visa utan utloggning på denna sida */}
      <Header />

      {/* Back link so user can navigate away from Frågor & Tips */}
      <div className="container mx-auto px-4 pt-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <Link to="/" className="inline-flex items-center text-sm text-primary hover:underline">
              ← Tillbaka
            </Link>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">Frågor och Tips</h1>
            <p className="text-xl text-muted-foreground">
              Allt du behöver veta om dödsbohantering, skatter och praktiska tips
            </p>
          </div>

          {/* Articles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-64 gap-y-12">
            {articles.map((article, index) => {
              const [imgWidth, setImgWidth] = useState<number | undefined>(undefined);
              const imgRef = useRef<HTMLImageElement>(null);

              const handleImgLoad = () => {
                if (imgRef.current) {
                  setImgWidth(imgRef.current.naturalWidth);
                }
              };

              return (
                <Card
                  key={article.id}
                  className="border-border overflow-hidden transition-transform duration-300 hover:shadow-xl hover:scale-[1.02] rounded-2xl mx-auto p-4"
                  style={imgWidth ? { width: imgWidth > 400 ? 400 : imgWidth } : undefined}
                >
                  {/* Bild */}
                  {article.imageUrl && (
                    <div
                      className="w-full h-80 sm:h-96 flex items-center justify-center overflow-hidden relative px-2 py-2"
                      style={{
                        background: "linear-gradient(135deg, #e0e7ef 0%, #f3f4f6 100%)"
                      }}
                    >
                      {/* Blurad bakgrundsbild */}
                      <img
                        src={article.imageUrl}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-xl scale-105 z-0"
                        style={{ filter: "blur(24px)", opacity: 0.5 }}
                      />
                      {/* Främre bild med extra padding och rundade hörn */}
                      <img
                        ref={imgRef}
                        src={article.imageUrl}
                        alt={article.title}
                        onLoad={handleImgLoad}
                        className="relative object-contain max-h-full max-w-full drop-shadow-lg z-10 p-4 rounded-2xl"
                      />
                      {/* Soft vignette effect */}
                      <div className="absolute inset-0 pointer-events-none z-20"
                        style={{
                          background: "radial-gradient(circle at center, rgba(0,0,0,0.06) 0%, transparent 80%)"
                        }}
                      />
                    </div>
                  )}

                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                          {article.icon}
                        </div>
                        <div>
                          <CardTitle className="text-xl text-foreground">
                            {article.title}
                          </CardTitle>
                          <Badge variant="secondary" className="mt-2">
                            {article.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {article.content}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Contact CTA */}
          <Card className="mt-12 bg-primary/5 border-primary/20 rounded-2xl">
            <CardContent className="text-center py-8">
              <h3 className="text-2xl font-semibold text-foreground mb-4">
                Har du fler frågor?
              </h3>
              <p className="text-muted-foreground mb-6">
                Kontakta oss för personlig rådgivning och hjälp med dödsbohantering
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="tel:070-175 35 85"
                  className="inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Ring oss: 070-175 35 85
                </a>
                <a 
                  href="mailto:kontakt@trygghand.com"
                  className="inline-flex items-center justify-center px-6 py-3 border border-primary text-primary rounded-lg hover:bg-primary/10 transition-colors"
                >
                  Skicka e-post
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default FragorTips;
