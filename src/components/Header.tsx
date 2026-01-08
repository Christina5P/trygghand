import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Phone, Mail, User, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "./HouseHandsLogo.jsx";
import { Customer } from "@/types"; // <-- adjust path if needed
import { useAuth } from "@/hooks/useAuth"; // <-- adjust path if needed

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [servicesOpen, setServicesOpen] = useState(false);
  const [desktopServicesOpen, setDesktopServicesOpen] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);

  // Scroll to hash target on navigation, always scroll to top of section
  useEffect(() => {
    // Scroll to hash target on location change, with offset for header
    if (location.hash) {
      const id = location.hash.replace('#', '');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          const yOffset = -90; // adjust for header height
          const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 0);
    }
  }, [location]);

  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const desktopServicesRef = useRef<HTMLDivElement | null>(null);

  // Helper to close mobile menu
  const closeMobileMenu = () => {
    if (mobileMenuRef.current) mobileMenuRef.current.open = false;
    setServicesOpen(false);
  };

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (desktopServicesRef.current && !desktopServicesRef.current.contains(e.target as Node)) {
        setDesktopServicesOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDesktopServicesOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <a href="#top" onClick={e => { e.preventDefault(); window.scrollTo({top: 0, behavior: 'smooth'}); }}>
            <Logo />
          </a>
        </div>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <div
            ref={desktopServicesRef}
            className="relative"
            onMouseEnter={() => {
              if (closeTimeoutRef.current) {
                clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = null;
              }
              setDesktopServicesOpen(true);
            }}
            onMouseLeave={() => {
              // fördröjd stängning så pekaren hinner till dropdown
              if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
              closeTimeoutRef.current = window.setTimeout(() => {
                setDesktopServicesOpen(false);
                closeTimeoutRef.current = null;
              }, 150);
            }}
          >
            <button
              type="button"
              onFocus={() => setDesktopServicesOpen(true)}
              onBlur={() => {
                // kort delay så tabbning in i menyn inte stänger direkt
                if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                closeTimeoutRef.current = window.setTimeout(() => {
                  setDesktopServicesOpen(false);
                  closeTimeoutRef.current = null;
                }, 150);
              }}
              aria-haspopup="true"
              aria-expanded={desktopServicesOpen}
              className="text-foreground hover:text-primary transition-colors flex items-center gap-2"
            >
              Tjänster
              <svg
                className={`w-3 h-3 transition-transform ${desktopServicesOpen ? "rotate-180" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {desktopServicesOpen && (
              <div
                className="absolute left-0 mt-2 w-56 bg-background border border-border rounded-md shadow-lg z-50"
                onMouseEnter={() => {
                  // om vi går in i dropdown, avbryt stängningen
                  if (closeTimeoutRef.current) {
                    clearTimeout(closeTimeoutRef.current);
                    closeTimeoutRef.current = null;
                  }
                  setDesktopServicesOpen(true);
                }}
                onMouseLeave={() => {
                  if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
                  closeTimeoutRef.current = window.setTimeout(() => {
                    setDesktopServicesOpen(false);
                    closeTimeoutRef.current = null;
                  }, 150);
                }}
              >
                <div className="py-2">
                  <Link to="/#paketlosningar" className="block px-4 py-2 text-primary font-semibold hover:bg-primary/5" onClick={() => setDesktopServicesOpen(false)}>Servicepaket</Link>
                  <Link to="/#paketlosningar" className="block px-4 py-2 text-primary font-semibold hover:bg-primary/5" onClick={() => setDesktopServicesOpen(false)}>Seniorförändring</Link>
                  <Link to="/#paketlosningar" className="block px-4 py-2 text-primary font-semibold hover:bg-primary/5" onClick={() => setDesktopServicesOpen(false)}>Dödsbohantering</Link>
                  <Link to="/#las-mer-tjanster" className="block px-4 py-2 text-primary font-semibold hover:bg-primary/5" onClick={() => setDesktopServicesOpen(false)}>Läs mer om våra tjänster</Link>
                  <Link to="/services/radgivning-planering" className="block px-4 py-2 text-foreground hover:bg-primary/10" onClick={() => setDesktopServicesOpen(false)}>Rådgivning & planering</Link>
                  <Link to="/services/stadning" className="block px-4 py-2 text-foreground hover:bg-primary/10" onClick={() => setDesktopServicesOpen(false)}>Städning</Link>
                  <Link to="/services/tomning-bohag" className="block px-4 py-2 text-foreground hover:bg-primary/10" onClick={() => setDesktopServicesOpen(false)}>Tömning av bohag</Link>
                  <Link to="/services/flytt" className="block px-4 py-2 text-foreground hover:bg-primary/10" onClick={() => setDesktopServicesOpen(false)}>Flytt</Link>
                  <Link to="/services/vardering" className="block px-4 py-2 text-foreground hover:bg-primary/10" onClick={() => setDesktopServicesOpen(false)}>Värdering</Link>
                  <Link to="/services/forsaljning" className="block px-4 py-2 text-foreground hover:bg-primary/10" onClick={() => setDesktopServicesOpen(false)}>Försäljning</Link>
                  <Link to="/services/magasinering" className="block px-4 py-2 text-foreground hover:bg-primary/10" onClick={() => setDesktopServicesOpen(false)}>Magasinering</Link>
                </div>
              </div>
            )}
          </div>

          <Link to="/#about" className="text-foreground hover:text-primary transition-colors">Om oss</Link>
          <Link to="/fragor-tips" className="text-foreground hover:text-primary transition-colors">Frågor och Tips</Link>
          <Link to="/#contact" className="text-foreground hover:text-primary transition-colors">Kontakt</Link>
        </nav>

        {/* Mobile hamburger menu */}
        <div className="md:hidden flex items-center">
          <details className="relative" ref={mobileMenuRef}>
            <summary className="cursor-pointer p-1 rounded focus:outline-none focus:ring-2 focus:ring-primary">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-menu text-foreground">
                <line x1="4" y1="8" x2="20" y2="8" />
                <line x1="4" y1="16" x2="20" y2="16" />
              </svg>
            </summary>
            <nav className="absolute left-1/2 -translate-x-1/2 mt-2 w-80 bg-background border border-border shadow-lg z-50">
              <Link to="/#about" className="block px-4 py-2 text-foreground hover:bg-primary/10" onClick={closeMobileMenu}>Om oss</Link>
              <div className="border-t border-border">
                <button
                  type="button"
                  onClick={() => setServicesOpen(v => !v)}
                  className="w-full text-left px-4 py-2 flex items-center justify-between text-foreground hover:bg-primary/10 rounded"
                  aria-expanded={servicesOpen}
                  aria-controls="mobile-services-list"
                >
                  <span>Tjänster</span>
                  <svg
                    className={`w-4 h-4 ml-2 transition-transform ${servicesOpen ? "rotate-180" : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>

                {servicesOpen && (
                  <div id="mobile-services-list" className="pl-4">
                    <span className="block py-2 text-xs font-semibold text-primary">Paketeringar</span>
                    <Link to="/#paketlosningar" className="block py-2 text-foreground hover:bg-primary/10" onClick={closeMobileMenu}>Seniorförändring</Link>
                    <Link to="/#paketlosningar" className="block py-2 text-foreground hover:bg-primary/10" onClick={closeMobileMenu}>Dödsbohantering</Link>
                    <Link to="/#las-mer-tjanster" className="block py-2 text-primary font-semibold" onClick={closeMobileMenu}>Läs mer om våra tjänster</Link>
                    <Link to="/services/radgivning-planering" className="block py-2 text-foreground hover:bg-primary/10" onClick={closeMobileMenu}>Rådgivning & planering</Link>
                    <Link to="/services/stadning" className="block py-2 text-foreground hover:bg-primary/10" onClick={closeMobileMenu}>Städning</Link>
                    <Link to="/services/tomning-bohag" className="block py-2 text-foreground hover:bg-primary/10" onClick={closeMobileMenu}>Tömning av bohag</Link>
                    <Link to="/services/flytt" className="block py-2 text-foreground hover:bg-primary/10" onClick={closeMobileMenu}>Flytt</Link>
                    <Link to="/services/vardering" className="block py-2 text-foreground hover:bg-primary/10" onClick={closeMobileMenu}>Värdering</Link>
                    <Link to="/services/forsaljning" className="block py-2 text-foreground hover:bg-primary/10" onClick={closeMobileMenu}>Försäljning</Link>
                    <Link to="/services/magasinering" className="block py-2 text-foreground hover:bg-primary/10" onClick={closeMobileMenu}>Magasinering</Link>
                  </div>
                )}
              </div>
              <Link to="/fragor-tips" className="block px-4 py-2 text-foreground hover:bg-primary/10" onClick={closeMobileMenu}>Frågor och Tips</Link>
              <Link to="/#contact" className="block px-4 py-2 text-foreground hover:bg-primary/10" onClick={closeMobileMenu}>Kontakt</Link>
              <Link to="/portal" className="block px-4 py-2 text-foreground hover:bg-primary/10" onClick={closeMobileMenu}>Min sida</Link>
            </nav>
          </details>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden lg:flex items-center space-x-4 text-sm text-foreground">
            <div className="flex items-center space-x-1">
              <Phone className="h-4 w-4" />
              <span>076- 116 95 54</span>
            </div>
            <a href="mailto:kontakt@trygghand.com" className="flex items-center space-x-1 hover:text-primary transition-colors">
              <Mail className="h-4 w-4" />
              <span>kontakt@trygghand.com</span>
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