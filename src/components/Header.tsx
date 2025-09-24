import { Button } from "@/components/ui/button";
import { Phone, Mail, User } from "lucide-react";
import { Link } from "react-router-dom";

const Header = () => {
  return (
    <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <a href="#top" onClick={e => { e.preventDefault(); window.scrollTo({top: 0, behavior: 'smooth'}); }}>
            <h1 className="text-2xl font-bold text-primary cursor-pointer">Trygg Hand</h1>
          </a>
        </div>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <a href="#las-mer-tjanster" className="text-foreground hover:text-primary transition-colors">Tjänster</a>
          <a href="#about" className="text-foreground hover:text-primary transition-colors">Om oss</a>
          <Link to="/fragor-tips" className="text-foreground hover:text-primary transition-colors">Frågor och Tips</Link>
          <a href="#contact" className="text-foreground hover:text-primary transition-colors">Kontakt</a>
        </nav>

        {/* Mobile hamburger menu */}
        <div className="md:hidden flex items-center">
          <details className="relative">
            <summary className="cursor-pointer p-1 rounded focus:outline-none focus:ring-2 focus:ring-primary">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-menu text-foreground">
                <line x1="4" y1="8" x2="20" y2="8" />
                <line x1="4" y1="16" x2="20" y2="16" />
              </svg>
            </summary>
            <nav className="absolute left-1/2 -translate-x-1/2 mt-2 w-80 bg-background border border-border shadow-lg z-50">
              <a href="#about" className="block px-4 py-2 text-foreground hover:bg-primary/10">Om oss</a>
              <details>
                <summary className="px-4 py-2 cursor-pointer text-foreground hover:bg-primary/10 rounded">Tjänster</summary>
                <div className="pl-4">
                  <a href="#las-mer-tjanster" className="block py-2 text-primary font-semibold">Läs mer om våra tjänster</a>
                  <a href="/services/RadgivningPlanering" className="block py-2 text-foreground hover:bg-primary/10">Rådgivning & planering</a>
                  <a href="/services/stadning" className="block py-2 text-foreground hover:bg-primary/10">Städning</a>
                  <a href="/services/tomning-bohag" className="block py-2 text-foreground hover:bg-primary/10">Tömning av bohag</a>
                  <a href="/services/flytt" className="block py-2 text-foreground hover:bg-primary/10">Flytt</a>
                  <a href="/services/vardering" className="block py-2 text-foreground hover:bg-primary/10">Värdering</a>
                  <a href="/services/forsaljning" className="block py-2 text-foreground hover:bg-primary/10">Försäljning</a>
                  <a href="/services/magasinering" className="block py-2 text-foreground hover:bg-primary/10">Magasinering</a>
                  <span className="block py-2 text-xs font-semibold text-primary">Paketeringar</span>
                  <a href="#las-mer-tjanster" className="block py-2 text-foreground hover:bg-primary/10">Seniorförändring</a>
                  <a href="#las-mer-tjanster" className="block py-2 text-foreground hover:bg-primary/10">Dödsbohantering</a>
                </div>
              </details>
              <Link to="/fragor-tips" className="block px-4 py-2 text-foreground hover:bg-primary/10">Frågor och Tips</Link>
              <a href="#contact" className="block px-4 py-2 text-foreground hover:bg-primary/10">Kontakt</a>
              <Link to="/portal" className="block px-4 py-2 text-foreground hover:bg-primary/10">Min sida</Link>
            </nav>
          </details>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden lg:flex items-center space-x-4 text-sm text-foreground">
            <div className="flex items-center space-x-1">
              <Phone className="h-4 w-4" />
              <span>070-175 35 85</span>
            </div>
            <a href="mailto:info@trygghand.se" className="flex items-center space-x-1 hover:text-primary transition-colors">
              <Mail className="h-4 w-4" />
              <span>info@trygghand.se</span>
            </a>
          </div>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-trust-blue text-trust-blue hover:bg-trust-blue hover:text-white"
          >
            <Link to="/portal">
              <User className="w-4 h-4 mr-2" />
              Min sida
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;