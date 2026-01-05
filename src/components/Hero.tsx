import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Heart, Users } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative bg-gradient-to-br from-background via-soft-gray to-trust-green-light py-20 lg:py-32 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight">
                Helhetskoordinator för dödsbo och seniorförändring
              </h1>
              <h2 className="text-2xl lg:text-4xl font-semibold text-foreground/80 leading-tight">
                Från beslut till nytt kapitel
              </h2>
              <p className="text-xl text-foreground leading-relaxed">
                Vi erbjuder servicepaket för seniorförändring och dödsbohantering. 
                Med digital uppföljning och komplett koordinering – all hjälp du behöver, på ett tryggt och smidigt sätt.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
             <a href="#contact">
  <Button size="lg" className="bg-gradient-to-r from-primary to-trust-blue-dark hover:from-trust-blue-dark hover:to-primary shadow-lg">
    Boka kostnadsfri konsultation
    <ArrowRight className="ml-2 h-5 w-5" />
  </Button>
</a>
             <a href="#paketlosningar">
    <Button variant="outline" size="lg" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"> Läs mer om våra tjänster
 </Button>
</a>

            </div>
            
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center space-y-2">
                <Shield className="h-8 w-8 text-primary mx-auto" />
                <p className="text-sm font-medium">Trygg hantering</p>
              </div>
              <div className="text-center space-y-2">
                <Heart className="h-8 w-8 text-trust-green mx-auto" />
                <p className="text-sm font-medium">Personlig service</p>
              </div>
              <div className="text-center space-y-2">
                <Users className="h-8 w-8 text-primary mx-auto" />
                <p className="text-sm font-medium">Fasta priser</p>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-trust-green/20 rounded-3xl transform rotate-3"></div>
            <img 
              src={heroImage} 
              alt="Trygg Hand - professionell hjälp med livsförändringar"
              className="relative rounded-3xl shadow-2xl w-full h-[600px] object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;