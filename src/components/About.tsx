import { Card, CardContent } from "@/components/ui/card";
import { Shield, Heart, Clock, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Review, { Review as ReviewType } from "./Reviews";
import Seo from "./Seo";

import nojdKundLogo from "@/assets/nojdkundlogo.png";


const About = () => {
  const values = [
    {
      icon: Heart,
      title: "Trygghet & Förtroende",
      description: "Vi förstår att du anförtror oss dina mest värdefulla tillhörigheter och minnen. Allt hanteras med största respekt och omsorg och vi arbetar under sekretess."
    },
    {
      icon: CheckCircle,
      title: "Professionell Koordinering",
      description: "En kontaktpunkt för hela processen. Vi tar hand om all koordinering så att du kan fokusera på det som verkligen är viktigt."
    },
    {
      icon: Clock,
      title: "Effektivitet & Transparens",
      description: "Med vår digitala plattform kan du följa processens framsteg i realtid. Vi håller dig informerad varje steg på vägen."
    },

      ];

  const benefits = [
    "Försäkrad verksamhet och nöjd kund-garanti – vi rättar till om något inte blir som förväntat",
    "Flexibel service anpassad efter dina behov",
    "Kostnadsfri första konsultation",
    "Digital uppföljning i realtid – du kan följa arbetet steg för steg",
    //"Nätverk av pålitliga partners för städning, flytt och värdering",
    "Sekretessavtal för din trygghet"
  ];

  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  return (
    <section id="about" className="py-20 bg-soft-gray/30">
      {location.pathname === "/about" && (
        <Seo
          title="Om oss | Trygg Hand"
          description="Läs mer om Trygg Hand – din pålitliga partner för dödsbohantering och äldreflytt i Sundsvall."
          canonical="https://www.trygghand.com/about"
        />
      )}
      <div className="container mx-auto px-4">
        {location.pathname === "/about" && (
          <div className="mb-6">
            <button
              onClick={() => navigate(-1)}
              className="text-sm text-primary hover:underline"
              aria-label="Gå tillbaka"
            >
              ← Tillbaka
            </button>
          </div>
        )}
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                Varför välja Trygg Hand?
              </h2>
              <p className="text-lg text-foreground leading-relaxed">
               När livet förändras kan det praktiska kännas överväldigande.<br></br>Vi finns där för att göra processen enklare – oavsett om det gäller förberedelse och ordning i hemmet, flytt till ett nytt boende  eller att ta hand om ett dödsbo.

<br></br>Med personlig samordning, pålitliga partners och vår nöjd-kund-garanti kan du känna dig trygg i att allt blir ordnat på ett respektfullt och professionellt sätt.
              </p>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-foreground">Vad vi erbjuder:</h3>
              <div className="grid gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-trust-green flex-shrink-0" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
              {/* Nöjd kund-logo under benefits, lite större */}
              <div className="flex justify-start mt-6">
                <img
                  src={nojdKundLogo}
                  alt="Nöjd kund garanti"
                  className="h-24 w-auto"
                />
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

        {location.pathname === "/about" && (
          <div className="text-center py-8 bg-muted/50 mt-12">
            <p className="text-muted-foreground">
              Utforska våra <a href="/#paketlosningar" className="text-primary hover:underline">servicepaket för dödsbohantering och seniorförändring</a>.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

export default About;
           
    