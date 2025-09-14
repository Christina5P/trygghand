import { Button } from "@/components/ui/button";
import { Phone, Mail } from "lucide-react";

const Header = () => {
  return (
    <header className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h1 className="text-2xl font-bold text-primary">Trygg Hand</h1>
          <p className="text-muted-foreground text-sm hidden md:block">Från beslut till nytt kapitel</p>
        </div>
        
        <nav className="hidden md:flex items-center space-x-8">
          <a href="#tjanster" className="text-foreground hover:text-primary transition-colors">Tjänster</a>
          <a href="#om-oss" className="text-foreground hover:text-primary transition-colors">Om oss</a>
          <a href="#kontakt" className="text-foreground hover:text-primary transition-colors">Kontakt</a>
        </nav>
        
        <div className="flex items-center space-x-4">
          <div className="hidden lg:flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-1">
              <Phone className="h-4 w-4" />
              <span>08-123 456 78</span>
            </div>
            <div className="flex items-center space-x-1">
              <Mail className="h-4 w-4" />
              <span>info@trygghand.se</span>
            </div>
          </div>
          <Button>Kostnadsfri konsultation</Button>
        </div>
      </div>
    </header>
  );
};

export default Header;