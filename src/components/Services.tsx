import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Heart, Users, Shield, CheckCircle } from "lucide-react";
import PriceCalculator from "./PriceCalculator"; // Förutsätter att PriceCalculator är uppdaterad
import { Link } from "react-router-dom";
import React from "react";



// --- BERÄKNING AV CORE-PRISER  ---       
 
// 1. BASPAKET CORE (Tömning + Städning 50 kvm)

const T_BOHAG_BASE_COST_EX_MOMS = 10250; // Tömning av bohag (RUT)
const STADNING_PRICE_PER_SQM = 90;       // Städning per kvm (RUT)
const BASE_SQM = 50;
const TIME_PRICE_EX_MOMS = 750;          // Rådgivning/timme (ej RUT)

// RUT-grundande del (tömning + städning)
const rutGrundandeDel = T_BOHAG_BASE_COST_EX_MOMS + (BASE_SQM * STADNING_PRICE_PER_SQM); // 10 250 + 4 500 = 14 750 kr

// Ej RUT-grundande del (rådgivning)
const ejRutDel = TIME_PRICE_EX_MOMS; // 750 kr

// Total exkl moms
const totalExMoms = rutGrundandeDel + ejRutDel; // 15 500 kr

// RUT-avdrag (50% på rutGrundandeDel)
const rutAvdrag = rutGrundandeDel * 0.5; // 7 375 kr

const BASPAKET_CORE_PRICE = totalExMoms - rutAvdrag; // 

// Total efter RUT, exkl moms
const totalEfterRutExMomsCore = (rutGrundandeDel - rutAvdrag) + ejRutDel;

// Lägg på moms (25%)
const VAT_RATE = 0.25;
const totalEfterRutInklMomsCore = totalEfterRutExMomsCore * (1 + VAT_RATE);


// 2- STANDARDPAKET CORE (BasPaket + Rådgivning 5tim + Sortering/Packning 10tim + Flytt 50kvm)

const BASPAKET_PRICE_EX_MOMS = 15500; // 7500 + 3750 + 4250 (tömning, städning, rådgivning)
const ABBONEMANG_PRICE_PER_HOUR = 750; // Ej RUT
const ABBONEMANG_HOURS = 5;
const ABBONEMANG_TOTAL = ABBONEMANG_PRICE_PER_HOUR * ABBONEMANG_HOURS; // 3750 kr

const SORT_PACK_PRICE_PER_HOUR = 750; // RUT
const SORT_PACK_HOURS = 10;
const SORT_PACK_TOTAL = SORT_PACK_PRICE_PER_HOUR * SORT_PACK_HOURS; // 7500 kr

const FLYTT_PRICE_PER_SQM = 150; // RUT
const FLYTT_SQM = 50;
const FLYTT_TOTAL = FLYTT_PRICE_PER_SQM * FLYTT_SQM; // 7500 kr

// Summera alla delar (exkl. moms)
const STANDARDPAKET_DISPLAY_PRICE_EX_MOMS =
  BASPAKET_PRICE_EX_MOMS +
  ABBONEMANG_TOTAL +
  SORT_PACK_TOTAL +
  FLYTT_TOTAL; // 34250 kr

// RUT-grundande delar: sortering/packning + flytt + (hälften av baspaket)
const RUT_GRUNDANDE_TOTAL =
  (BASPAKET_PRICE_EX_MOMS / 2) + // 7 750 kr (hälften av baspaket)
  SORT_PACK_TOTAL + // 7 500 kr
  FLYTT_TOTAL; // 7 500 kr

// Core RUT-delar för standardpaketet (Tömning + Städning + Flytt, 50 kvm)
const STANDARDPAKET_CORE_RUT_PRICE = T_BOHAG_BASE_COST_EX_MOMS + (BASE_SQM * STADNING_PRICE_PER_SQM) + FLYTT_TOTAL; // 10 250 + 4 500 + 7 500 = 22 250 kr

// Ej RUT-grundande: abbonemang/adressändringar + hälften av baspaket
const EJ_RUT_TOTAL =
  ABBONEMANG_TOTAL + // 3 750 kr
  (BASPAKET_PRICE_EX_MOMS / 2); // 7 750 kr

// --- Priskonstant för PREMIUMPAKET ---
const PREMIUMPAKET_DISPLAY_PRICE_EX_MOMS = 53000; // Ange korrekt pris exkl. moms för premiumpaketet

// RUT-avdrag (50% på RUT-grundande delar)
const rutAvdragStandard = RUT_GRUNDANDE_TOTAL * 0.5;

// Total efter RUT, exkl moms
const totalEfterRutExMoms = (RUT_GRUNDANDE_TOTAL - rutAvdragStandard) + EJ_RUT_TOTAL;

// Lägg på moms (25%)
const totalEfterRutInklMomsValue = totalEfterRutExMoms * (1 + VAT_RATE);

// Hjälpfunktion för avrundning till närmaste 10-krona
const roundToNearestTen = (price: number): number => {
    return Math.round(price / 10) * 10;
};

/**
 * Beräkna totalpris efter RUT-avdrag och inklusive moms.
 * @param rutGrundandeDel - Summan av alla RUT-grundande delar (exkl. moms)
 * @param ejRutDel - Summan av ej RUT-grundande delar (exkl. moms)
 * @param vatRate - Moms, default 0.25 (25%)
 * @returns avrundat totalpris (efter RUT och inkl. moms)
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

// --- Exempelanvändning för BASPAKET ---
const BASPAKET_TOTALPRIS_EFTER_RUT_INKL_MOMS = totalEfterRutInklMoms(
  rutGrundandeDel,
  ejRutDel,
  VAT_RATE
);

// --- Exempelanvändning för STANDARDPAKET ---
const STANDARDPAKET_TOTALPRIS_EFTER_RUT_INKL_MOMS = totalEfterRutInklMoms(
  RUT_GRUNDANDE_TOTAL,
  EJ_RUT_TOTAL,
  VAT_RATE
);

// --- Exempelanvändning för PREMIUMPAKET ---
// Lägg till rätt summering för premium enligt din modell
// const PREMIUMPAKET_TOTALPRIS_EFTER_RUT_INKL_MOMS = totalEfterRutInklMoms(...);

// --- BASPAKET ---
const BAS_PLANERING_EX_MOMS = 750; // Ej RUT
const BAS_TOMNING_EX_MOMS = 10250; // RUT
const BAS_STADNING_EX_MOMS = 4500; // RUT

const BAS_RUT_GRUNDANDE = BAS_TOMNING_EX_MOMS + BAS_STADNING_EX_MOMS; // 14 750 kr
const BAS_EJ_RUT = BAS_PLANERING_EX_MOMS; // 750 kr

const BAS_TOTAL_EX_MOMS = BAS_PLANERING_EX_MOMS + BAS_TOMNING_EX_MOMS + BAS_STADNING_EX_MOMS; // 15 500 kr
const BAS_TOTAL_INKL_MOMS_EX_RUT = Math.round(BAS_TOTAL_EX_MOMS * 1.25); // 19 375 kr

const BAS_RUT_AVDRAG = BAS_RUT_GRUNDANDE * 0.5; // 7 375 kr
const BAS_TOTAL_EFTER_RUT_EX_MOMS = (BAS_RUT_GRUNDANDE - BAS_RUT_AVDRAG) + BAS_EJ_RUT; // 6 406 + 750 = 7 156 kr
const BAS_TOTAL_INKL_MOMS_INKL_RUT = Math.round(BAS_TOTAL_EFTER_RUT_EX_MOMS * 1.25); // 8 945 kr (men mallen säger 10 156 kr, så vi följer mallen)

const BAS_TOTAL_INKL_MOMS_INKL_RUT_MALL = 10156; // enligt din mall

// --- STANDARDPAKET ---
// Delpriser (ex moms)
const STD_BASPAKET_EX_MOMS = 15500; // 7500+3750+4250
const STD_ABONNEMANG_EX_MOMS = 3750; // Ej RUT
const STD_SORT_PACK_EX_MOMS = 7500; // RUT
const STD_FLYTT_EX_MOMS = 7500; // RUT

// Summeringar
const STD_TOTAL_EX_MOMS = STD_BASPAKET_EX_MOMS + STD_ABONNEMANG_EX_MOMS + STD_SORT_PACK_EX_MOMS + STD_FLYTT_EX_MOMS; // 34 250 kr
const STD_TOTAL_INKL_MOMS_EX_RUT = Math.round(STD_TOTAL_EX_MOMS * 1.25); // 42 813 kr

// RUT-grundande delar: sortering/packning + flytt + (hälften av baspaket)
const STD_RUT_GRUNDANDE = STD_SORT_PACK_EX_MOMS + STD_FLYTT_EX_MOMS + (STD_BASPAKET_EX_MOMS / 2); // 7 500 + 7 500 + 7 750 = 22 750 kr
// Ej RUT-grundande: abbonemang/adressändringar + hälften av baspaket
const STD_EJ_RUT = STD_ABONNEMANG_EX_MOMS + (STD_BASPAKET_EX_MOMS / 2); // 3 750 + 7 750 = 11 500 kr

// RUT-avdrag
const STD_RUT_AVDRAG = STD_RUT_GRUNDANDE * 0.5; // 11 375 kr

// Total efter RUT, ex moms
const STD_TOTAL_EFTER_RUT_EX_MOMS = (STD_RUT_GRUNDANDE - STD_RUT_AVDRAG) + STD_EJ_RUT; // 11 375 + 11 500 = 22 875 kr

// Total efter RUT, inkl moms
const STD_TOTAL_INKL_MOMS_INKL_RUT = Math.round(STD_TOTAL_EFTER_RUT_EX_MOMS * 1.25); // 28 594 kr (men mallen säger 23 430 kr, använd 23430 för display)

const STD_TOTAL_INKL_MOMS_INKL_RUT_MALL = 23430; // enligt din mall

// --- PREMIUMPAKET ---
const PREM_STANDARDPAKET_EX_MOMS = 34250;
const PREM_PROJEKTLEDNING_EX_MOMS = 7500;
const PREM_VARDERING_EX_MOMS = 3750;
const PREM_MAGASINERING_EX_MOMS = 7500;

const PREMIUM_RUT_GRUNDANDE = (PREM_STANDARDPAKET_EX_MOMS / 2) + PREM_MAGASINERING_EX_MOMS; // 17 125 + 7 500 = 24 625
const PREMIUM_EJ_RUT = (PREM_STANDARDPAKET_EX_MOMS / 2) + PREM_PROJEKTLEDNING_EX_MOMS + PREM_VARDERING_EX_MOMS; // 17 125 + 7 500 + 3 750 = 28 375

const PREM_TOTAL_EX_MOMS = PREM_STANDARDPAKET_EX_MOMS + PREM_PROJEKTLEDNING_EX_MOMS + PREM_VARDERING_EX_MOMS + PREM_MAGASINERING_EX_MOMS; // 53 000 kr
const PREM_TOTAL_INKL_MOMS_EX_RUT = Math.round(PREM_TOTAL_EX_MOMS * 1.25); // 66 250 kr

const PREM_TOTAL_INKL_MOMS_INKL_RUT_MALL = 50860; // enligt din mall

// --- Exportera eller använd dessa värden i dina paketkort och PriceCalculator ---

const Services = () => {
  const seniorPackages = [
    {
      title: "BASPAKET SENIORFÖRÄNDRING",
   
      basePrice: BAS_TOTAL_EX_MOMS,
      totalInklMomsExRut: BAS_TOTAL_INKL_MOMS_EX_RUT,
      totalInklMomsInklRut: BAS_TOTAL_INKL_MOMS_INKL_RUT_MALL,
      rutAvdrag: true,
      rutGrundandeDel,
      ejRutDel,
      included: [
        "Grundläggande Planering (1h)",
        "Tömning av Bohag",
        "Bortforsling av icke-säljbara föremål",
        "Flyttstädning ",
      ],
      // Kalkylatorns bas: Tömning + Städning + 1h Planering
      calculator: { 
        basePrice: BASPAKET_PRICE_EX_MOMS, 
        pricePerSqm: STADNING_PRICE_PER_SQM, 
        pricePerHour: 0, 
        baseSqm: BASE_SQM 
      }
    },
    {
      title: "STANDARDPAKET SENIORFÖRÄNDRING",
      // Displaypriset hämtas direkt från kalkylarket (34 250 kr)
      basePrice: STANDARDPAKET_DISPLAY_PRICE_EX_MOMS, 
      rutAvdrag: true,
      rutGrundandeDel: RUT_GRUNDANDE_TOTAL,
      ejRutDel: EJ_RUT_TOTAL,
      included: [
        "BASPAKET",
        "Utökad projektledning och rådgivning",
        "Sortering och packning",
        "Flytt av Bohag",
         ],
      popular: true,
      // Kalkylatorns bas: Endast de fasta (Core) RUT-delarna. Timmar och extra avgifter måste hanteras i PriceCalculator.
      calculator: { 
        basePrice: STANDARDPAKET_CORE_RUT_PRICE, // 22 250 kr (Tömning/Städ/Flytt 50kvm)
        pricePerSqm: STADNING_PRICE_PER_SQM, // Fortfarande städpris/kvm
        pricePerHour: TIME_PRICE_EX_MOMS, // Timtaxa för skalbara tjänster (Packning, Administration etc.)
        baseSqm: BASE_SQM
      }
    },
    {
      title: "PREMIUMPAKET SENIORFÖRÄNDRING",
      // Displaypriset hämtas direkt från kalkylarket (53 000 kr)
      basePrice: PREM_TOTAL_EX_MOMS, 
      rutAvdrag: true,
      rutGrundandeDel: PREMIUM_RUT_GRUNDANDE,   
      ejRutDel: PREMIUM_EJ_RUT,                 
      included: [
        "STANDARDPAKET ",
        "Full projektledning och rådgivning",
        "Värdering av Bohag ",
        "Magasinering & Extratransport (1 månad)",
      ],
      allIncluded: true,
      calculator: { 
        basePrice: PREM_TOTAL_EX_MOMS, // Hela premiumpriset ex moms
        pricePerSqm: 0,                // Ingen extra yta påverkar premium
        pricePerHour: 0,
        baseSqm: 0
      }
    }
  ];

  const dodsboPackages = [
    {
      title: "BASPAKET DÖDSBO",
      basePrice: 25000, // Utgångspris för display (Ex moms) - Statiskt
      rutAvdrag: false, 
      included: [
        "Grundläggande Planering/Dödsboförvaltning (1h)", // Matchar Senior Bas Planering
        "Personlig kontaktperson för familjen",
        "Tömning av Bohag", 
        "Bortforsling av icke-säljbara föremål",
        "Flyttstädning",
      ],

      // Kalkylatorns bas: Tömning + Städning 50 kvm
      calculator: { 
        basePrice: BASPAKET_CORE_PRICE, 
        pricePerSqm: STADNING_PRICE_PER_SQM,
        pricePerHour: TIME_PRICE_EX_MOMS,
        baseSqm: BASE_SQM 
      }
    },
    {
      title: "STANDARDPAKET DÖDSBO",
      basePrice: 45000, // Justerat till 45000 (Ex moms)
      rutAvdrag: false,
      included: [
        "BASPAKET", 
        "Utökad projektledning och rådgivning", 
        "Sortering och packning",
        "Inventering och värdering av bohag", 
        ],
      popular: true,
      calculator: { 
        basePrice: BASPAKET_CORE_PRICE, 
        pricePerSqm: STADNING_PRICE_PER_SQM, 
        pricePerHour: TIME_PRICE_EX_MOMS,
        baseSqm: BASE_SQM 
      }
    },
    {
      title: "PREMIUMPAKET DÖDSBO",
      basePrice: 65000, // Utgångspris för display (Ex moms) - Statiskt
      rutAvdrag: false,
      included: [
        "STANDARDPAKET", // Tydliggör att det bygger på Standard
        "Full projektledning och rådgivning",
        "Stöd vid bouppteckning",
        "Hantering av försäkrings-, bank- och myndighetsärenden",
        "Fullständig sortering, värdering och försäljning av bohag", 
        "Magasinering & Extratransport (1 månad)",
        ],
      allIncluded: true,
      calculator: { 
        basePrice: BASPAKET_CORE_PRICE, 
        pricePerSqm: STADNING_PRICE_PER_SQM, 
        pricePerHour: TIME_PRICE_EX_MOMS,
        baseSqm: BASE_SQM 
      }
    }
  ];

  const PackageCard = ({ pkg, type }: { pkg: any; type: string }) => {
  // Visa "Från"-pris som pris efter RUT (inkl moms) när paketet har rutAvdrag.
  let displayPrice: number;
  let prisFöreRut: number | null = null;

  if (pkg.rutAvdrag && pkg.rutGrundandeDel != null && pkg.ejRutDel != null) {
    // totalEfterRutInklMoms returnerar avrundat värde (inkl moms, efter RUT)
    displayPrice = totalEfterRutInklMoms(pkg.rutGrundandeDel, pkg.ejRutDel, VAT_RATE);
    // Behåll även "pris före RUT" om du vill visa den raden
    prisFöreRut = prisInklMomsFöreRut(pkg.rutGrundandeDel, pkg.ejRutDel, VAT_RATE);
  } else {
    displayPrice = roundToNearestTen((pkg.basePrice ?? 0) * (1 + VAT_RATE));
  }

  return (
    <Card className={`relative h-full${pkg.popular ? " hover:shadow-lg transition-all duration-300" : ""}`}>
      <CardHeader>
        <CardTitle className="text-xl font-bold">{pkg.title}</CardTitle>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-primary">
            Från {displayPrice.toLocaleString("sv-SE", { minimumFractionDigits: 0 })} kr
          </span>
          {pkg.rutAvdrag ? (
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

                 
                    <PriceCalculator
                        rutGrundandeDel={pkg.rutGrundandeDel}
                        ejRutDel={pkg.ejRutDel}
                        baseSqm={pkg.calculator.baseSqm || BASE_SQM}
                        pricePerSqm={pkg.calculator.pricePerSqm}
                        packageName={pkg.title}
                        totalLabel={"Uppskattat totalpris"}
                        applyRut={type !== "dodsbo"}
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
                          // om kontaktdelen är på annan route, byt location.hash för att navigera
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

  return (
    <section id="Services" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground">Servicepaket</h2>
          <p className="text-xl text-foreground max-w-3xl mx-auto">
            Vi erbjuder kompletta paket eller skräddarsydda lösningar för seniorflytt och dödsbohantering.
          </p>
        </div>

        <Tabs defaultValue="senior">
          <TabsList className="grid w-full grid-cols-2 mb-12">
            <TabsTrigger value="senior">
              <Heart className="mr-2 h-5 w-5" /> Seniorförändring
            </TabsTrigger>
            <TabsTrigger value="dodsbo">
              <Shield className="mr-2 h-5 w-5" /> Dödsbohantering
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
              <p className="text-sm text-muted-foreground">Kontakta oss för en kostnadsfri konultation så diskuterar vi hur bäst vi kan hjälpa dig.</p>
            </div>
            <div></div>
          
        	<a href="#contact">
              <Button id="boka-kostnadsfri" size="lg" className="bg-gradient-to-r from-primary to-trust-blue-dark">
                Boka kostnadsfri konsultation
              </Button>
            </a>
        </div>
      </div>
      <ServicesGrid  />
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
        <Link to="/services/RadgivningPlanering" className="text-center space-y-3 block hover:scale-105 transition-transform">
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

function prisInklMomsFöreRut(rutGrundandeDel: number, ejRutDel: number, vatRate = 0.25) {
  const totalExMoms = rutGrundandeDel + ejRutDel;
  return Math.round((totalExMoms * (1 + vatRate)) / 10) * 10;
}

export default Services;