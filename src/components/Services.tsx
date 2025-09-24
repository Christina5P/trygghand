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
import { Link } from "react-router-dom";
import PriceCalculator from "./PriceCalculator";

const Services = () => {
  const seniorPackages = [
    {
      title: "BASPAKET SENIORFÖRÄNDRING",
      basePrice: 15000,
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
      basePrice: 28000,
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
      basePrice: 45000,
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
      basePrice: 25000,
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
      basePrice: 42000,
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
      basePrice: 65000,
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
            <span className="text-2xl font-bold text-primary">Från {pkg.basePrice.toLocaleString('sv-SE')} kr</span>
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
        
        <PriceCalculator 
          basePrice={pkg.basePrice}
          packageName={pkg.title}
          pricePerSqm={600}
          totalLabel={type === 'senior' ? 'Totalt pris efter RUT-avdrag:' : 'Totalt pris:'}
        />
        
        <Button className="w-full mt-6 bg-gradient-to-r from-primary to-trust-blue-dark">
          Välj {pkg.title.split(' ')[0].toLowerCase()}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <section id="Services" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Servicepaket</h2>
          <p className="text-xl text-foreground max-w-3xl mx-auto">
            Livskoordinator för Seniorflytt och Dödsbohantering. <br />
            Vi erbjuder kompletta servicepaket med fasta priser, eller skräddarsytt efter dina speciella behov.
          </p>
        </div>
        
        <Tabs defaultValue="senior"  className="text-lg py-3 px-8 font-semibold rounded-t-lg 
             bg-blue-100 
             data-[state=active]:bg-blue-200">
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
        
        <div className="text-center mt-16 space-y-8">
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

          <div className="text-lg max-w-2xl mx-auto text-foreground">
              <h3 id="skraddarsydda-losningar" className="text-xl font-semibold text-foreground mb-4">Skräddarsydda lösningar</h3>
              <p className="leading-relaxed">
                Behöver du hjälp med specifika tjänster utanför våra paket? Vi erbjuder även individuella tjänster och skräddarsydda lösningar anpassade efter dina unika behov.
              </p>
              <p className="text-sm text-muted-foreground">Kontakta oss för en kostnadsfri konultation så diskuterar vi hur bäst vi kan hjälpa dig.</p>
          </div>
          <div></div>
          
            <a href="#kontakt">
              <Button id="boka-kostnadsfri" size="lg" className="bg-gradient-to-r from-primary to-trust-blue-dark">
                Boka kostnadsfri konsultation
              </Button>
            </a>
         

          <ServicesGrid />
        </div>
      </div>
      
    </section>
  );
};

function ServicesGrid() {
  return (
    <div id="las-mer-tjanster" className="mt-16" >
  
       <h3 
  
  className="text-3xl font-bold text-foreground underline" 
>
  Läs mer om våra tjänster
</h3>

<br />
  <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
        <Link to="/services/RadgivningPlanering" className="text-center space-y-3 block hover:scale-105 transition-transform">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Users className="h-10 w-10 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground">Rådgivning & planering</p>
        </Link>
        <Link to="/services/stadning" className="text-center space-y-3 block hover:scale-105 transition-transform">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Heart className="h-10 w-10 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground">Städning</p>
        </Link>
        <Link to="/services/tomning-bohag" className="text-center space-y-3 block hover:scale-105 transition-transform">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground">Tömning av bohag</p>
        </Link>
        <Link to="/services/flytt" className="text-center space-y-3 block hover:scale-105 transition-transform">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground">Flytt</p>
        </Link>
        <Link to="/services/vardering" className="text-center space-y-3 block hover:scale-105 transition-transform">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Users className="h-10 w-10 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground">Värdering</p>
        </Link>
        <Link to="/services/forsaljning" className="text-center space-y-3 block hover:scale-105 transition-transform">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Heart className="h-10 w-10 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground">Försäljning</p>
        </Link>
        <Link to="/services/magasinering" className="text-center space-y-3 block hover:scale-105 transition-transform">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground">Magasinering</p>
        </Link>
      </div>
    </div>
  );
}

export default Services;