// services.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Heart, Users, Shield, CheckCircle } from "lucide-react";
import PriceCalculator from "./PriceCalculator"; 
import { Link } from "react-router-dom";
import React from "react";
import { PRICES } from "@/config/prices"; // Importera din prisdatabas

// --- HJÄLPFUNKTIONER (Behålls för PackageCard) ---

const VAT_RATE = 0.25;

/**
 * Beräkna totalpris efter RUT-avdrag och inklusive moms.
 */
function totalEfterRutInklMoms(
  rutGrundandeDel: number,
  ejRutDel: number,
  vatRate = 0.25
): number {
  const rutAvdrag = rutGrundandeDel * 0.5;
  const totalEfterRutExMoms = (rutGrundandeDel - rutAvdrag) + ejRutDel;
  return Math.round((totalEfterRutExMoms * (1 + vatRate)) / 10) * 10;
}

/**
 * Beräkna pris inkl moms före RUT-avdrag.
 */
function prisInklMomsFöreRut(rutGrundandeDel: number, ejRutDel: number, vatRate = 0.25) {
  const totalExMoms = rutGrundandeDel + ejRutDel;
  return Math.round((totalExMoms * (1 + vatRate)) / 10) * 10;
}

// --- PAKETDEFINITIONER ---

const seniorPackages = [
  {
    title: "BASPAKET SENIORFÖRÄNDRING",
    key: 'bas', // Hämta priser från PRICES.senior.bas
    rutAvdrag: true,
    included: [
      "Grundläggande Planering (1h)",
      "Tömning av Bohag",
      "Flyttstädning",
    ],
    // Kalkylatorns defaultvärden styrs av prices.ts, men kan överstyras här.
    // Vi tar bort de tomma calculator-objekten för att låta prices.ts styra.
  },
  {
    title: "STANDARDPAKET SENIORFÖRÄNDRING",
    key: 'standard', // Hämta priser från PRICES.senior.standard
    rutAvdrag: true,
    included: [
      "Allt som ingår i BASPAKET", // Tydliggör att det bygger på föregående
      "Hjälp med anmälan av Adressändring och Folkbokföring till Skatteverket",
      "Översyn och uppsägning/flytt av abonnemang för El, Bredband, TV, Fast telefoni och andra löpande avtal",
      "Rådgivning och assistans med att flytta eller teckna ny Hemförsäkring",
      "Sortering och packning",
      "Flytt av Bohag",
    ],
    popular: true,
  },
  {
    title: "PREMIUMPAKET SENIORFÖRÄNDRING",
    key: 'premium', // Hämta priser från PRICES.senior.premium
    rutAvdrag: true,
    included: [
      "Allt som ingår i STANDARDPAKET", // Tydliggör att det bygger på föregående
      "Full Projektledning",
      "Värdering av Bohag",
      "Magasinering & Extratransport (1 månad)",
      "Inredningsassistans",
      "Digital Installation",
      "Första-natten service (Sängen bäddas, badrum görs i ordning med nödvändigheter)",
    ],
    allIncluded: true,
  }
];

const dodsboPackages = [
  {
    title: "BASPAKET DÖDSBO",
    key: 'bas', // Hämta priser från PRICES.dodsbo.bas
    rutAvdrag: false, 
    included: [
      "Grundläggande Planering/Dödsboförvaltning (1h)", // Matchar Senior Bas Planering
      "Personlig kontaktperson för familjen",
      "Tömning av Bohag", 
      "Bortforsling av icke-säljbara föremål",
      "Flyttstädning",
    ],
  },
  {
    title: "STANDARDPAKET DÖDSBO",
    key: 'standard', // Hämta priser från PRICES.dodsbo.standard
    rutAvdrag: false,
    included: [
      "Allt som ingår i BASPAKET", 
      "Uppsägning av hyreskontrakt, el, vatten, värme",
      "Uppsägning av abonnemang för Mobiltelefoni, Bredband, TV-paket och andra löpande abonnemang",
      "Beställa eftersändning av post",
      "Kontakt med försäkringsbolag",
      "Avsluta digitala konton",
      "Sortering och packning", 
      "Inventering och värdering", 
      
    ],
    popular: true,
  },
  {
    title: "PREMIUMPAKET DÖDSBO",
    key: 'premium', // Hämta priser från PRICES.dodsbo.premium
    rutAvdrag: false,
    included: [
      "Allt som ingår i STANDARDPAKET", 
      "Full Projektledning", 
      "Stöd vid bouppteckning och bankärenden",
      "Samla in all nödvändig information och dokumentation till bouppteckning,",
      "Identifiera och kontakta samtliga banker och samla in utdrag och frysa banktjänster,", 
      "Beställa intyg på värdet av eventuella fonder, aktier, pensioner och försäkringar per dödsdagen.",
      "Samla in pantbrev och andra fastighetsdokument för att underlätta försäljning eller överlåtelse.",
      "Fullständig sortering, värdering och försäljning av bohag", 
      "Magasinering & Extratransport (1 månad)", 
    ],
    allIncluded: true,
  }
];

// --- PACKAGE CARD KOMPONENT ---

const PackageCard = ({ pkg, type }: { pkg: any; type: string }) => {
  const key = pkg.key || "bas"; 
  const defaultGroup = type === "dodsbo" ? PRICES.dodsbo : PRICES.senior;
  
  // Hämta prisdata från prices.ts baserat på typ och nyckel
  const defaultsForPackage = (defaultGroup as any)[key] || PRICES.default;

  // Slå ihop defaultvärden från prices.ts med eventuella overrides i paketobjektet (pkg)
  const merged = {
    ...defaultsForPackage,
    ...pkg,
    // Överskridande av priser i pkg-objektet går före prices.ts
    basePrice: Number(pkg.basePrice ?? defaultsForPackage.basePrice)
  };

  const rutBase = Number.isFinite(Number(merged.rutGrundandeDel)) ? Number(merged.rutGrundandeDel) : 0;
  const ejRutBase = Number.isFinite(Number(merged.ejRutDel)) ? Number(merged.ejRutDel) : 0;

  // Bestäm om RUT ska appliceras
  const applyRutProp = merged.rutAvdrag !== false && type !== "dodsbo";

  // Beräkna Från-pris
  let displayPrice = 0;
  if (applyRutProp) {
    displayPrice = totalEfterRutInklMoms(rutBase, ejRutBase, VAT_RATE);
  } else {
    // Utan RUT (dödsbo)
    displayPrice = Math.round(((rutBase + ejRutBase) * (1 + VAT_RATE)) / 10) * 10;
  }
  
  // Fallback
  if (displayPrice === 0 && merged.basePrice) {
     displayPrice = Math.round((Number(merged.basePrice) * (1 + VAT_RATE)) / 10) * 10;
  }
  
  //const prisFöreRut = prisInklMomsFöreRut(rutBase, ejRutBase, VAT_RATE); // Används i PriceCalculator

  return (
    <Card className="relative h-full transform-gpu transition-transform transition-shadow duration-300 hover:-translate-y-2 hover:scale-105 hover:shadow-2xl">
      <CardHeader>
        <CardTitle className="text-xl font-bold">{merged.title}</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">
            Från {displayPrice.toLocaleString("sv-SE", { minimumFractionDigits: 0 })} kr
          </span>
          {merged.rutAvdrag ? (
            <Badge variant="secondary" className="bg-trust-green-light text-trust-green">
              Pris inkl. moms och RUT-avdrag
            </Badge>
          ) : type === "dodsbo" ? (
            <Badge variant="secondary" className="bg-trust-green-light text-trust-green">
              Pris inkl. moms
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 flex flex-col h-full">
        <div>
          <h4 className="font-semibold mb-2">Ingår i paketet</h4>
          <ul className="space-y-1">
            {[...(pkg.included || []), ...(pkg.services || [])].map((item: string, i: number) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start">
                <CheckCircle className="h-4 w-4 text-trust-green mr-2 min-w-[1rem]" /> {item}
              </li>
            ))}
          </ul>
        </div>
        
        {/* Prisberäknaren använder nu de centraliserade priserna */}
        <PriceCalculator
          rutGrundandeDel={merged.rutGrundandeDel}
          ejRutDel={merged.ejRutDel}
          baseSqm={merged.baseSqm}
          pricePerSqm={merged.pricePerSqm}
          basePrice={merged.basePrice}
          packageName={merged.title || pkg.title}
          applyRut={type !== "dodsbo"}
          totalLabel={type === "dodsbo" ? "Uppskattat totalpris (inkl. moms)" : "Uppskattat totalpris"}
        />

        <button
          onClick={(e) => {
            e.preventDefault();
            const el = document.getElementById("kontakt-form");
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "start" });
              setTimeout(() => {
                (el.querySelector("input,textarea,button") as HTMLElement)?.focus();
              }, 300);
            } else {
              window.location.hash = "#kontakt-form";
            }
          }}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full mt-6 bg-gradient-to-r from-primary to-trust-blue-dark"
        >
          Kontakta oss för prisuppgift
        </button>
      </CardContent>
    </Card>
  );
};

// --- SERVICES HUVUDKOMPONENT ---

const Services = () => {
  return (
    <section id="paketlosningar" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Servicepaket</h2>
          <p className="text-xl text-foreground max-w-3xl mx-auto">
            Vi erbjuder kompletta paket eller skräddarsydda lösningar för seniorflytt och dödsbohantering.
          </p>
        </div>

        <Tabs defaultValue="senior">
          <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-2 mb-12 overflow-hidden rounded-2xl border border-primary/30 bg-white shadow-md">
            <TabsTrigger
              value="senior"
              className="flex h-full w-full items-center justify-center gap-2 px-2 py-1 text-sm sm:text-base font-semibold whitespace-normal break-words text-center leading-snug rounded-none data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-primary/80 data-[state=inactive]:bg-primary/5"
            >
              <Heart className="mr-1 h-5 w-5" /> Seniorförändring
            </TabsTrigger>
            <TabsTrigger
              value="dodsbo"
              className="flex h-full w-full items-center justify-center gap-2 px-2 py-1 text-sm sm:text-base font-semibold whitespace-normal break-words text-center leading-snug rounded-none data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-primary/80 data-[state=inactive]:bg-primary/5"
            >
              <Shield className="mr-1 h-5 w-5" /> Dödsbohantering
            </TabsTrigger>
          </TabsList>

          <TabsContent value="senior" className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {seniorPackages.map((pkg, i) => (
              <PackageCard key={i} pkg={pkg} type="senior" />
            ))}
          </TabsContent>

          <TabsContent value="dodsbo" className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {dodsboPackages.map((pkg, i) => (
              <PackageCard key={i} pkg={pkg} type="dodsbo" />
            ))}
          </TabsContent>
        </Tabs>
        
        {/* ... Resten av komponenten (ServicesGrid etc.) ... */}
        <div className="text-center mt-16 space-y-8">
          <div className="flex justify-center space-x-6 mb-8">
            <div className="text-center space-y-2">
              <Users className="h-8 w-8 text-primary mx-auto" />
              <p className="text-sm font-medium">Fasta priser</p>
            </div>
            <div className="text-center space-y-2">
              <Heart className="h-8 w-8 text-trust-green mx-auto" />
              <p className="text-sm font-medium">Omtanke & respekt</p>
            </div>
            <div className="text-center space-y-2">
              <Shield className="h-8 w-8 text-primary mx-auto" />
              <p className="text-sm font-medium">Trygg hantering</p>
            </div>
          </div>

          <div className="text-lg max-w-2xl mx-auto text-foreground">
            <h3 id="skraddarsydda-losningar" className="text-xl font-semibold text-foreground mb-4">Skräddarsydda lösningar</h3>
            <p id="las-mer-tjanster"className="leading-relaxed">
              Behöver du hjälp med specifika tjänster utanför våra paket? Vi erbjuder även individuella tjänster och skräddarsydda lösningar anpassade efter dina unika behov.
            </p>
            <p className="text-sm text-muted-foreground mb-8">Kontakta oss för en kostnadsfri konultation så diskuterar vi hur bäst vi kan hjälpa dig.</p>
          </div>
          
          <a href="#contact">
            <Button id="boka-kostnadsfri" size="lg" className="bg-gradient-to-r from-primary to-trust-blue-dark">
              Boka kostnadsfri konsultation
            </Button>
          </a>
        </div>
      </div>
      <ServicesGrid />
    </section>
  );
};

function ServicesGrid() {
  return (
    <div className="mt-16 text-center">
      <h3 className="text-3xl font-bold text-foreground underline inline-block mb-6">
        Läs mer om våra tjänster
      </h3>
  
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
        <Link to="/services/radgivning-planering" className="text-center space-y-3 block hover:scale-105 transition-transform">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Users className="h-10 w-10 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground">Rådgivning & planering</p>
        </Link>
        <Link to="/services/stadning" className="text-center space-y-3 block hover:scale-105 transition-transform">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Heart className="h-10 w-10 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground">Städning</p>
        </Link>
        <Link to="/services/tomning-bohag" className="text-center space-y-3 block hover:scale-105 transition-transform">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground">Tömning av bohag</p>
        </Link>
        <Link to="/services/flytt" className="text-center space-y-3 block hover:scale-105 transition-transform">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-10 w-10 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground">Flytt</p>
        </Link>
        <Link to="/services/vardering" className="text-center space-y-3 block hover:scale-105 transition-transform">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Users className="h-10 w-10 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground">Värdering</p>
        </Link>
        <Link to="/services/forsaljning" className="text-center space-y-3 block hover:scale-105 transition-transform">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Heart className="h-10 w-10 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground">Försäljning</p>
        </Link>
        <Link to="/services/magasinering" className="text-center space-y-3 block hover:scale-105 transition-transform">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <p className="text-lg font-semibold text-foreground">Magasinering</p>
        </Link>
      </div>
    </div>
  );
}

export default Services;