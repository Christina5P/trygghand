import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, AlertCircle, FileText, Calculator, Archive, ClipboardList } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useEffect } from "react";

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
      title: "När får man RUT-avdrag för dödsbohantering?",
      icon: <Calculator className="h-6 w-6" />,
      category: "Skatt",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            RUT-avdrag kan tillämpas på vissa tjänster vid dödsbohantering:
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-semibold text-trust-green mb-2">Berättigat för RUT-avdrag:</h4>
              <ul className="space-y-1 text-sm">
                <li>• Städning av bostaden</li>
                <li>• Flytt av möbler</li>
                <li>• Rengöring efter tömning</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-red-600 mb-2">Ej berättigat:</h4>
              <ul className="space-y-1 text-sm">
                <li>• Värdering av föremål</li>
                <li>• Administrativt arbete</li>
                <li>• Försäljning av lösöre</li>
              </ul>
            </div>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium">Viktigt att veta:</p>
            <p className="text-sm text-muted-foreground mt-1">
              Avdraget är 50% av arbetskostnaden, max 75 000 kr per person och år.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Döstädning - Varför det är värt att börja tidigt",
      icon: <Archive className="h-6 w-6" />,
      category: "Tips",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground">
            Döstädning innebär att i god tid rensa bland sina ägodelar för att underlätta för anhöriga.
          </p>
          <div className="space-y-3">
            <h4 className="font-semibold">Fördelar med döstädning:</h4>
            <ul className="space-y-2">
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
              Börja med en kategori i taget - kläder, böcker, papper. Ta pauser och få hjälp vid behov.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "Ordna arkivet - En hjälp för anhöriga",
      icon: <FileText className="h-6 w-6" />,
      category: "Planering",
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
                <li>• Försäkringshandlingar</li>
                <li>• Bankuppgifter</li>
                <li>• Pensionsbesked</li>
              </ul>
              <ul className="space-y-1 text-sm">
                <li>• Aktieportfölj</li>
                <li>• Fastighetshandlingar</li>
                <li>• Kontaktuppgifter till rådgivare</li>
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
        </div>
      )
    },
    {
      id: 5,
      title: "Skatt för dödsbo - Vad gäller?",
      icon: <Calculator className="h-6 w-6" />,
      category: "Skatt",
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
                <li>□ Kontakta begravningsbyrå</li>
                <li>□ Hitta testamente</li>
                <li>□ Informera bank och försäkringsbolag</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Första månaden:</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>□ Bouppteckning (inom 3 månader)</li>
                <li>□ Ansök om dödsbevis</li>
                <li>□ Kontakta arbetsgivare</li>
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
      <Header />
      
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
          <div className="space-y-8">
            {articles.map((article, index) => (
              <Card key={article.id} className="border-border">
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
                
                {index < articles.length - 1 && (
                  <div className="px-6 pb-6">
                    <Separator />
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Contact CTA */}
          <Card className="mt-12 bg-primary/5 border-primary/20">
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
                  href="mailto:info@trygghand.se"
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