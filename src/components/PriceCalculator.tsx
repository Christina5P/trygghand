import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface PriceCalculatorProps {
  rutGrundandeDel?: number;
  ejRutDel?: number;
  baseSqm?: number;
  pricePerSqm?: number;
  packageName: string;
  totalLabel?: string;
  applyRut?: boolean; // true = applicera 50% RUT på rutGrundandeDel, false = ingen RUT
  basePrice?: number; // fallback displaypris exkl moms
}

const VAT_RATE = 0.25;

export default function PriceCalculator({
  rutGrundandeDel,
  ejRutDel,
  baseSqm = 50,
  pricePerSqm = 100,
  packageName,
  totalLabel = "Uppskattat totalpris",
  applyRut = true,
  basePrice,
}: PriceCalculatorProps) {
  const [sqm, setSqm] = useState<string>(String(baseSqm || 50));

  const sqmNumber = Math.max(1, Number.parseInt(sqm || "0", 10) || 0);
  const extraSqm = sqmNumber > (baseSqm || 50) ? sqmNumber - (baseSqm || 50) : 0;

  const rutBase = Number.isFinite(Number(rutGrundandeDel)) ? Number(rutGrundandeDel) : 0;
  const ejRutBase = Number.isFinite(Number(ejRutDel)) ? Number(ejRutDel) : 0;
  const dynPricePerSqm = Number.isFinite(Number(pricePerSqm)) ? Number(pricePerSqm) : 0;

  // RUT-grundande delen anpassas efter extra yta
  const rutDel = rutBase + extraSqm * dynPricePerSqm;
  const ejRut = ejRutBase;

  const prisFöreRutInklMoms = Math.round(((rutDel + ejRut) * (1 + VAT_RATE)) / 10) * 10;

  let totalEfterRutInklMoms: number;
  if (applyRut && rutDel > 0) {
    const rutAvdrag = rutDel * 0.5;
    const totalEfterRutExMoms = (rutDel - rutAvdrag) + ejRut;
    totalEfterRutInklMoms = Math.round((totalEfterRutExMoms * (1 + VAT_RATE)) / 10) * 10;
  } else if (rutDel > 0 || ejRut > 0) {
    // dödsbo eller inget RUT: använd rutDel + ejRut utan avdrag
    totalEfterRutInklMoms = Math.round(((rutDel + ejRut) * (1 + VAT_RATE)) / 10) * 10;
  } else if (basePrice) {
    totalEfterRutInklMoms = Math.round((Number(basePrice) * (1 + VAT_RATE)) / 10) * 10;
  } else {
    totalEfterRutInklMoms = 0;
  }

  return (
    <Card className="mt-4 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-primary">Prisberäkning</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sqm-input" className="text-sm font-medium">
            Yta (kvm)
          </Label>
          <Input
            id="sqm-input"
            type="number"
            value={sqm}
            onChange={(e) => setSqm(e.target.value)}
            min={1}
            className="w-full"
          />
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <div className="flex flex-col items-start">
            <span className="font-semibold text-xs">{totalLabel}</span>
            {applyRut && <span className="text-xs text-foreground">efter RUT-avdrag, inkl. moms</span>}
          </div>
          <span className="text-2xl font-bold text-primary">{totalEfterRutInklMoms.toLocaleString("sv-SE")} kr</span>
        </div>

        {applyRut && (rutDel > 0 || ejRut > 0) && (
          <div className="text-sm text-foreground mt-4 text-left">
            Pris inkl. moms innan RUT-avdrag: {prisFöreRutInklMoms.toLocaleString("sv-SE")} kr
          </div>
        )}
      </CardContent>
    </Card>
  );
}