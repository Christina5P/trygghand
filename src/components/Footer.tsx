import { Phone, Mail, MapPin, Facebook, Linkedin, Instagram } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background py-8 text-center text-sm text-muted-foreground">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 text-left">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold">Trygg Hand</h3>
            <p className="text-background/80 text-sm leading-relaxed">
              Från beslut till nytt kapitel. Vi erbjuder helhetslösning för livsförändringar, 
              äldreflytt och hantering av dödsbo.
            </p>
            <div className="flex space-x-4 mt-6">
              <Facebook className="h-5 w-5 text-background/80 hover:text-background cursor-pointer transition-colors" />
              <Linkedin className="h-5 w-5 text-background/80 hover:text-background cursor-pointer transition-colors" />
              <Instagram className="h-5 w-5 text-background/80 hover:text-background cursor-pointer transition-colors" />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold">Tjänster</h4>
            <ul className="space-y-2 text-sm text-background/80">
              <li><Link to="/services/RadgivningPlanering" className="hover:underline">Rådgivning & planering</Link></li>
              <li><Link to="/services/Stadning" className="hover:underline">Städning</Link></li>
              <li><Link to="/services/tomning-bohag" className="hover:underline">Tömning av bohag</Link></li>
              <li><Link to="/services/Flytt" className="hover:underline">Flytt</Link></li>
              <li><Link to="/services/Vardering" className="hover:underline">Värdering</Link></li>
              <li><Link to="/services/Forsaljning" className="hover:underline">Försäljning</Link></li>
              <li><Link to="/services/Magasinering" className="hover:underline">Magasinering</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold">Företag</h4>
            <ul className="space-y-2 text-sm text-background/80">
              <li><Link to="/about" className="hover:underline">Om oss</Link></li>
              <li><Link to="/services/Juridikguide" className="hover:underline">Din Juridiska Guide i Fickan</Link></li>
              <li><Link to="/values" className="hover:underline">Våra värderingar</Link></li>
              <li><Link to="/partners" className="hover:underline">Partners</Link></li>
              <li><Link to="/privacy" className="hover:underline">Integritetspolicy</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold">Kontakt</h4>
            <div className="space-y-3 text-sm text-background/80">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4" />
                <span>076- 116 95 54</span>
              </div>
              <div className="flex items-center space-x-2">
                <a href="mailto:kontakt@trygghand.com" className="flex items-center space-x-1 hover:text-primary transition-colors">
                  <Mail className="h-4 w-4" />
                  <span>kontakt@trygghand.com</span>
                </a>
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
            © 2025 Trygg Hand. ❤️ Egenutvecklad och noggrant designad. Alla rättigheter förbehållna.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;