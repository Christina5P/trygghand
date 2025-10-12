// prices.ts

export const PRICES = {
  // Globala standardvärden (används som fallback)
  default: { baseSqm: 50, pricePerSqm: 90, rutGrundandeDel: 14750, ejRutDel: 750, basePrice: 15500 },
  
  // Prisdata för SENIORFÖRÄNDRING (Hämtat från kalkylen)
  senior: {
    // BASPAKET SENIORFÖRÄNDRING
    bas: { 
      basePrice: 15500, // Total Ex Moms
      // Beräknas: (Tömning 10250 + Städning 4500) = 14750 (RUT)
      // + 1h Rådgivning 750 (Ej RUT)
      rutGrundandeDel: 14750, 
      ejRutDel: 750, 
      baseSqm: 50, 
      pricePerSqm: 90, // Städning per extra kvm (RUT-grundande)
    },
    // STANDARDPAKET SENIORFÖRÄNDRING
    standard: { 
      basePrice: 34250, // Total Ex Moms
      // RUT-grundande: Bas RUT (14750) + Sortering (7500) + Flytt (7500) = 29750
      // OBS: Kalkylen verkar använda en annan uppdelning. Vi följer kalkylens Total/RUT/Ej-RUT-kolumner.
      // Baserat på dina totala kostnader och uppdelningen:
      rutGrundandeDel: 22250, // Hämtat från din kalkyl: 22 250 kr
      ejRutDel: 11500,  // Hämtat från din kalkyl: 11 500 kr
      baseSqm: 50, 
      pricePerSqm: 150, // Flytt/Sortering/Städning per extra kvm (RUT-grundande)
    },
    // PREMIUMPAKET SENIORFÖRÄNDRING
    premium: { 
      basePrice: 53000, // Total Ex Moms
      // Baserat på din kalkyl:
      rutGrundandeDel: 43000,  // Största RUT-delen
      ejRutDel: 10000,   // Största Ej RUT-delen
      baseSqm: 0, 
      pricePerSqm: 0, 
    },
  },

  // Prisdata för DÖDSBOHANTERING (Hämtat exakt från din kalkyl)
  dodsbo: {
    // BASPAKET DÖDSBO
    bas: { 
      basePrice: 15500, // Total Ex Moms
      //rutGrundandeDel: 14750, // Baserat på din kalkyl (den del som *skulle* vara RUT-grundande)
      ejRutDel: 15500, 
      baseSqm: 50, 
      pricePerSqm: 90, // Städning per extra kvm (Ej RUT)
    },
    // STANDARDPAKET DÖDSBO
    standard: { 
      basePrice: 30500, // Total Ex Moms
      //rutGrundandeDel: 26500, // Hämtat från din kalkyl: 26 500 kr
      ejRutDel: 30500, // Hämtat från din kalkyl: 7 750 kr
      baseSqm: 50, 
      pricePerSqm: 150, // Städning/Tömning per extra kvm (Ej RUT)
    },
    // PREMIUMPAKET DÖDSBO
    premium: { 
      basePrice: 60500, // Total Ex Moms
      //rutGrundandeDel: 48000, // Hämtat från din kalkyl: 48 000 kr
      ejRutDel: 60500, // Hämtat från din kalkyl: 12 500 kr
      baseSqm: 0, 
      pricePerSqm: 0, 
    },
  },
};