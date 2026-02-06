import { Phone, Mail, MapPin, Facebook, Linkedin, Instagram } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleAboutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === "/about") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      navigate("/about");
      setTimeout(() => window.scrollTo({ top: 0, behavior: "auto" }), 50);
    }
  };
  return (
    <footer id="footer" className="bg-foreground text-background py-8 text-center text-sm text-muted-foreground">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-5 gap-8 text-left">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-background/80">Trygg Hand AB</h3>
            <p className="text-background/80 text-sm leading-relaxed">
              Från beslut till nytt kapitel. Vi erbjuder helhetslösning för livsförändringar, 
              äldreflytt och hantering av dödsbo.
            </p>
            <div className="flex space-x-4 mt-6">
              <a href="https://www.facebook.com/profile.php?id=61583353061701" target="_blank" rel="noopener noreferrer">
                <Facebook className="h-5 w-5 text-background/80 hover:text-background cursor-pointer transition-colors" />
              </a>
              <Linkedin className="h-5 w-5 text-background/80 hover:text-background cursor-pointer transition-colors" />
              <Instagram className="h-5 w-5 text-background/80 hover:text-background cursor-pointer transition-colors" />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-background/80">Tjänster</h4>
            <ul className="space-y-2 text-sm text-background/80">
              <li><Link to="/services/radgivning-planering" className="hover:underline">Rådgivning & planering</Link></li>
              <li><Link to="/services/flyttstad" className="hover:underline">Städning</Link></li>
              <li><Link to="/services/tomning-bohag" className="hover:underline">Tömning av bohag</Link></li>
              <li><Link to="/services/Flytt" className="hover:underline">Flytt</Link></li>
              <li><Link to="/services/vardering" className="hover:underline">Värdering</Link></li>
              <li><Link to="/services/Forsaljning" className="hover:underline">Försäljning</Link></li>
              <li><Link to="/services/Magasinering" className="hover:underline">Magasinering</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-background/80">Företag</h4>
            <ul className="space-y-2 text-sm text-background/80">
              <li>
                <button type="button" onClick={handleAboutClick} className="hover:underline text-left">
                  Om oss
                </button>
              </li>
              <li><Link to="/services/Juridikguide" className="hover:underline">Din Juridiska Guide i Fickan</Link></li>
              <li><Link to="/privacy" className="hover:underline">Integritet & Cookies</Link></li>
              <li><Link to="/terms" className="hover:underline">Allmänna villkor</Link></li>
              <li><Link to="/clearcookies" className="hover:underline">Rensa cookies</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-semibold text-background/80">Kontakt</h4>
            <div className="space-y-3 text-sm text-background/80">
              <div className="">
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
              <div className="flex items-center space-x-2">
                <span className="font-medium">Org. nr:</span>
                <span>559564-3445</span>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "url('/images/medelpad-karta.png')",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: "contain",
                opacity: 0.4,
              }}
              aria-hidden="true"
            />
            <div className="relative z-10">
              <h4 className="font-semibold mb-4 border-b border-background/20 pb-2 text-background/80">Här finns vi:</h4>
              <ul className="text-background/80 text-sm space-y-1">
             
                 <li className="flex items-center">
                <span className="mr-2">📍</span> Sundsvall (kontor Alnö)
              </li>
              <li className="flex items-center">
                <span className="mr-2">📍</span> Timrå - Söråker
              </li>
              <li className="flex items-center">
                <span className="mr-2">📍</span> Kvissleby - Njurunda
              </li>
              <li className="flex items-center">
                <span className="mr-2">📍</span> Matfors - Stöde
              </li>
              <li className="flex items-center">
                <span className="mr-2">📍</span> Kovland - Indal
              </li>
            </ul>
              <p className="mt-4 text-xs text-background/60 italic">
                Med god lokalkännedom hjälper vi familjer i hela Medelpad
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-background/20 mt-12 pt-8 text-center">
          <p className="text-sm text-background/60">
            © 2025 Trygg Hand AB. ❤️ Egenutvecklad och noggrant designad. Alla rättigheter förbehållna.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;