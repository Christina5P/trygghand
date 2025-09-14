import { Card, CardContent } from "@/components/ui/card";
import { Shield, Heart, Clock, CheckCircle } from "lucide-react";

const About = () => {
  const values = [
    {
      icon: Shield,
      title: "Trygghet & Förtroende",
      description: "Vi förstår att du anförtror oss dina mest värdefulla tillhörigheter och minnen. Allt hanteras med största respekt och omsorg."
    },
    {
      icon: Heart,
      title: "Integritet & Medkänsla",
      description: "Vi vet att livsförändringar kan vara känslomässigt krävande. Vårt team arbetar med empati och förståelse för din situation."
    },
    {
      icon: Clock,
      title: "Effektivitet & Transparens",
      description: "Med vår digitala plattform kan du följa processens framsteg i realtid. Vi håller dig informerad varje steg på vägen."
    },
    {
      icon: CheckCircle,
      title: "Professionell Koordinering",
      description: "En kontaktpunkt för hela processen. Vi tar hand om all koordinering så att du kan fokusera på det som verkligen är viktigt."
    }
  ];

  const benefits = [
    "Över 10 års erfarenhet av livsförändringar",
    "Licensierade och försäkrade partners",
    "Digital uppföljning i realtid",
    "Kostnadsfri initial konsultation",
    "Flexibel service anpassad efter dina behov",
    "Etablerat nätverk av pålitliga partners"
  ];

  return (
    <section id="om-oss" className="py-20 bg-soft-gray/30">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                Varför välja Trygg Hand?
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Vi hjälper dig att lösa problem med hantering av livsförändringar, äldreflytt och dödsbon 
                som kan vara tids- och energikrävande i svåra stunder.
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-foreground">Vad våra kunder säger:</h3>
              <div className="grid gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-trust-green flex-shrink-0" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-foreground">Våra kärnvärden</h3>
            <div className="grid gap-6">
              {values.map((value, index) => {
                const Icon = value.icon;
                return (
                  <Card key={index} className="border-border/50 hover:border-primary/20 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="w-12 h-12 rounded-full bg-trust-green-light flex items-center justify-center flex-shrink-0">
                          <Icon className="h-6 w-6 text-trust-green" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-semibold text-foreground">{value.title}</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {value.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;