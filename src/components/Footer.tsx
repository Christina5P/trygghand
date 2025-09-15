import { Phone, Mail, MapPin, Facebook, Linkedin, Instagram } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold">Trygg Hand</h3>
            <p className="text-background/80 text-sm leading-relaxed">
              Från beslut till nytt kapitel. Vi erbjuder helhetslösning för livsförändringar, 
              äldreflytt och hantering av dödsbo.
            </p>
            <div className="flex space-x-4">
              <Facebook className="h-5 w-5 text-background/80 hover:text-background cursor-pointer transition-colors" />
              <Linkedin className="h-5 w-5 text-background/80 hover:text-background cursor-pointer transition-colors" />
              <Instagram className="h-5 w-5 text-background/80 hover:text-background cursor-pointer transition-colors" />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold">Tjänster</h4>
            <ul className="space-y-2 text-sm text-background/80">
              <li>Rådgivning & planering</li>
              <li>Städning</li>
              <li>Tömning av bohag</li>
              <li>Flytt</li>
              <li>Värdering</li>
              <li>Försäljning</li>
              <li>Magasinering</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold">Företag</h4>
            <ul className="space-y-2 text-sm text-background/80">
              <li>Om oss</li>
              <li>Våra värderingar</li>
              <li>Partner</li>
              <li>Integritetspolicy</li>
              <li>Villkor</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold">Kontakt</h4>
            <div className="space-y-3 text-sm text-background/80">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>070-175 35 85</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>info@trygghand.se</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Sundsvall, Sverige</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-background/20 mt-12 pt-8 text-center">
          <p className="text-sm text-background/60">
            © 2025 Trygg Hand. Alla rättigheter förbehållna.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;