import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Truck, 
  Sparkles, 
  Scale, 
  ShoppingCart, 
  FileText,
  Package,
  Users
} from "lucide-react";

const Services = () => {
  const services = [
    {
      icon: FileText,
      title: "Rådgivning & planering",
      description: "Professionell rådgivning i förändringsbeslut och juridiska frågor. Vi hjälper dig att ta fram en plan för hela processen.",
      features: ["Juridisk rådgivning", "Processplanering", "Beslutsstöd"]
    },
    {
      icon: Sparkles,
      title: "Städning",
      description: "Grundlig städning av bostaden både före och efter tömning. Vi ser till att allt är perfekt inför nästa steg.",
      features: ["Förstädning", "Slutstädning", "Fönsterputs"]
    },
    {
      icon: Home,
      title: "Tömning av bostad",
      description: "Varsam och respektfull tömning av hem. Vi sorterar och hanterar alla föremål med största omsorg.",
      features: ["Sortering", "Emballering", "Bortforsling"]
    },
    {
      icon: Truck,
      title: "Flytt",
      description: "Professionell flytthjälp från A till Ö. Vi koordinerar hela flytten för en smidig övergång.",
      features: ["Packning", "Transport", "Uppackning"]
    },
    {
      icon: Scale,
      title: "Värdering",
      description: "Expertis inom värdering av både föremål och fastigheter. Vi hjälper dig att förstå värdet av tillgångarna.",
      features: ["Föremålsvärdering", "Fastighetsvärdering", "Marknadsvärdering"]
    },
    {
      icon: ShoppingCart,
      title: "Försäljning",
      description: "Vi hjälper till att sälja värdefulla föremål och hanterar hela försäljningsprocessen åt dig.",
      features: ["Auktionssäljning", "Direktförsäljning", "Online-försäljning"]
    },
    {
      icon: Package,
      title: "Magasinering",
      description: "Säker förvaring av föremål som ska sparas. Klimatkontrollerade lokaler med fullständig säkerhet.",
      features: ["Kortidsförvaring", "Långtidsförvaring", "Säker hantering"]
    },
    {
      icon: Users,
      title: "Komplett koordinering",
      description: "En kontaktpunkt för hela processen. Vi koordinerar alla tjänster och håller dig informerad i realtid.",
      features: ["Digital uppföljning", "Projektledning", "Kundservice"]
    }
  ];

  return (
    <section id="tjanster" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Våra tjänster</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Vi erbjuder en komplett helhetstjänst som skapar trygghet och sinnesro. 
            En enda kontaktpunkt som tar hand om hela processen.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card key={index} className="relative hover:shadow-lg transition-all duration-300 border-border/50 hover:border-primary/20 group">
                <CardHeader className="space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-trust-green-light flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="h-6 w-6 text-trust-green group-hover:text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg group-hover:text-primary transition-colors">{service.title}</CardTitle>
                    <CardDescription className="text-muted-foreground leading-relaxed">
                      {service.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="text-sm text-muted-foreground flex items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-trust-green mr-2 flex-shrink-0"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <div className="text-center mt-12">
          <Button size="lg" className="bg-gradient-to-r from-primary to-trust-blue-dark">
            Kontakta oss för en skräddarsydd lösning
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Services;