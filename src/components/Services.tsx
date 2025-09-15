import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Heart,
  Users,
  Shield,
  CheckCircle
} from "lucide-react";

const Services = () => {
  const seniorPackages = [
    {
      title: "BASPAKET SENIORFÖRÄNDRING",
      price: "15 000 kr",
      rutAvdrag: true,
      included: [
        "Personlig livskoordinator som kontaktperson",
        "Koordinering av tjänster"
      ],
      services: [
        "Tömning av bohag",
        "Transport/flytt",
        "Flyttstädning av bostad",
        "Uppsägning av abonnemang (el, bredband, tidningar)",
        "Flyttanmälan till myndigheter",        
         ]
      
      
    },
    {
      title: "STANDARDPAKET SENIORFÖRÄNDRING",
      price: "28 000 kr",
      rutAvdrag: true,
      included: [
        "Personlig livskoordinator som kontaktperson",
        "Utökad projektledning och koordinering",
        "Stöd vid myndighetskontakter"
      ],
      services: [
        "Omfattande sortering, rensning och packning",
        "Tömning av bohag",
        "Transport/flytt",
        "Grundläggande värdering av bohag",
        "Flyttstädning av bostad",
        "Iordningställande av nytt boende",
        "Uppsägning av abonnemang (el, bredband, tidningar)",
        "Flyttanmälan till myndigheter",        
        "Hjälp med avslut av sociala medier",
        "Försäkringsärenden och adressändringar"
      ],
      
      popular: true
    },
    {
      title: "PREMIUMPAKET SENIORFÖRÄNDRING",
      price: "45 000 kr",
      rutAvdrag: true,
      included: [
        "Personlig livskoordinator som kontaktperson",
        "Utökad projektledning och koordinering",
        "Stöd vid myndighetskontakter"
      ],
      services: [
        "Omfattande sortering, rensning och packning",
        "Tömning av bohag",
        "Transport/flytt",
        "Iordningställande av nytt boende",
        "Eventuell en extra transport till magasinering",
        "Värdering av bohag (med möjlighet till försäljning)",
        "Uppsägning av alla abonnemang, avtal och medlemskap",
        "Komplett flyttanmälan till alla relevanta instanser",        
        "Hjälp med avslut av sociala medier",
        "Hantering av alla försäkrings- och bankärenden",
        "Familjesamordning och kommunikation"

        
        
        
        
        
        
        
      ],
      allIncluded: true
    }
  ];

  const dodsboPackages = [
    {
      title: "BASPAKET DÖDSBO",
      price: "25 000 kr",
      rutAvdrag: false,
      included: [
        "Dödsboförvaltning (vi tar hand om allt praktiskt kring dödsboet)",
        "Kontakt med myndigheter",
        "Personlig kontaktperson för familjen"
      ],
      services: [
        "Grundläggande sortering och inventering",
        "Värdering",
        "Tömning av bohag",
        "Flyttstädning av bostad",
        "Uppsägning av abonnemang och avtal",
        
        "Kontakt med försäkringsbolag",
        
      ],
      selectCount: 3
    },
    {
      title: "STANDARDPAKET DÖDSBO",
      price: "42 000 kr",
      rutAvdrag: false,
      included: [
        "Dödsboförvaltning (vi tar hand om allt praktiskt kring dödsboet)",
        "Kontakt med myndigheter",
        "Personlig kontaktperson för familjen",
        "Rådgivning och support",
        
        
      ],
      services: [
        "Uppsägning av alla abonnemang och medlemskap",
        "Professionell inventering och sortering",
        "Tömning av bostad",
        "Värdering av hela dödsboet",
        "Flyttstädning av bostad",
        "Uppköp och försäljning av bohag",
        "Hjälp med internetkonton och sociala medier",
        "Hantering av försäkringsärenden",
        "Koordinering med bouppteckning"
      ],
      selectCount: 6,
      popular: true
    },
    {
      title: "PREMIUMPAKET DÖDSBO",
      price: "65 000 kr",
      rutAvdrag: false,
      included: [

        "Dödsboförvaltning (vi tar hand om allt praktiskt kring dödsboet)",
        "Kontakt med myndigheter",
        "Personlig kontaktperson för familjen",
        "Rådgivning och support",
        "Familjesamordning och medling",
        
      ],
      services: [
        "Uppsägning av alla abonnemang och medlemskap",
        "Professionell inventering och sortering",
        "Tömning av bohag",
        "Värdering av hela dödsboet",
        "Flyttstädning av bostad ",
        "Uppköp och försäljning av bohag",
        "Hjälp med internetkonton och sociala medier",
        "Hantering av alla försäkrings-, bank- och myndighetsärenden",
        "Rådgivning genom hela bouppteckningsprocessen",
        "Familjemedling och kommunikationshjälp",
        
      ],
      Included: true
    }
  ];

  const PackageCard = ({ pkg, type }: { pkg: any, type: string }) => (
    <Card className={`relative h-full${pkg.popular ? " hover:shadow-lg transition-all duration-300" : ""}`}>
    
      <CardHeader className="space-y-4">
        <div className="space-y-2">
          <CardTitle className="text-xl font-bold">{pkg.title}</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">Från {pkg.price}</span>
            {pkg.rutAvdrag && (
              <Badge variant="secondary" className="bg-trust-green-light text-trust-green">
                RUT-avdrag
              </Badge>
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-semibold text-foreground">Ingår alltid:</h4>
          <ul className="space-y-1">
            {pkg.included.map((item: string, index: number) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start">
                <CheckCircle className="h-4 w-4 text-trust-green mr-2 mt-0.5 flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-foreground mb-2">
            {pkg.allIncluded ? "Alla tjänster ingår:" : `Tjänster`}
          </h4>
          <ul className="space-y-1">
            {pkg.services.map((service: string, index: number) => (
              <li key={index} className="text-sm text-muted-foreground flex items-start">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mr-2 mt-2 flex-shrink-0"></div>
                {service}
              </li>
            ))}
          </ul>
        </div>
        
        <Button className="w-full mt-6 bg-gradient-to-r from-primary to-trust-blue-dark">
          Välj {pkg.title.split(' ')[0].toLowerCase()}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <section id="tjanster" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Servicepaket</h2>
          <p className="text-xl text-foreground max-w-3xl mx-auto">
            Livskoordinator för Seniorflytt och Dödsbohantering. <br />
            Vi erbjuder kompletta servicepaket med fasta priser, eller skräddarsytt efter dina speciella behov.
          </p>
        </div>
        
        <Tabs defaultValue="senior" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-12">
            <TabsTrigger value="senior" className="text-lg py-3">
              <Heart className="mr-2 h-5 w-5" />
              Seniorförändring
            </TabsTrigger>
            <TabsTrigger value="dodsbo" className="text-lg py-3">
              <Shield className="mr-2 h-5 w-5" />
              Dödsbohantering
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="senior" className="space-y-8">
            <div className="text-center mb-8">
              <Badge className="bg-trust-green-light text-trust-green text-lg px-4 py-2">
                Inklusive RUT-avdrag
              </Badge>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {seniorPackages.map((pkg, index) => (
                <PackageCard key={index} pkg={pkg} type="senior" />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="dodsbo" className="space-y-8">
            <div className="text-center mb-8">
              <Badge variant="outline" className="text-lg px-4 py-2">
                Utan RUT-avdrag
              </Badge>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {dodsboPackages.map((pkg, index) => (
                <PackageCard key={index} pkg={pkg} type="dodsbo" />
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="text-center mt-16 space-y-4">
          <div className="flex justify-center space-x-6 mb-8">
            <div className="text-center space-y-2">
              <Users className="h-8 w-8 text-primary mx-auto" />
              <p className="text-sm font-medium">Fasta priser</p>
            </div>
            <div className="text-center space-y-2">
              <Heart className="h-8 w-8 text-trust-green mx-auto" />
              <p className="text-sm font-medium">Omtanke & respekt</p>
            </div>
            <div className="text-center space-y-2">
              <Shield className="h-8 w-8 text-primary mx-auto" />
              <p className="text-sm font-medium">Trygg hantering</p>
            </div>
          </div>
          <a href="#kontakt">
  <Button size="lg" className="bg-gradient-to-r from-primary to-trust-blue-dark">
    Boka kostnadsfri konsultation
  </Button>
</a>
        </div>
      </div>
    </section>
  );
};

export default Services;