import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface PriceCalculatorProps {
  rutGrundandeDel: number;
  ejRutDel: number;
  baseSqm?: number;
  pricePerSqm?: number;
  packageName: string;
  totalLabel?: string;
}

const PriceCalculator = ({
  rutGrundandeDel,
  ejRutDel,
  baseSqm = 50,
  pricePerSqm = 100,
  packageName,
  totalLabel = "Totalt",
}: PriceCalculatorProps) => {
  const [sqm, setSqm] = useState<string>("50");
  const VAT_RATE = 0.25;

  // Sätt rätt pris per kvm beroende på paketnamn
  let dynamicPricePerSqm = pricePerSqm;
  if (packageName.toLowerCase().includes("bas")) {
    dynamicPricePerSqm = 90;
  } else if (
    packageName.toLowerCase().includes("standard") ||
    packageName.toLowerCase().includes("premium")
  ) {
    dynamicPricePerSqm = 240;
  }

  const sqmNumber = parseInt(sqm);
  const extraSqm = !isNaN(sqmNumber) && sqmNumber > 50 ? sqmNumber - 50 : 0;
  const rutDel = rutGrundandeDel + extraSqm * dynamicPricePerSqm;
  const ejRut = ejRutDel;

  const prisFöreRut = Math.round(((rutDel + ejRut) * (1 + VAT_RATE)) / 10) * 10;

  const rutAvdrag = rutDel * 0.5;
  const totalEfterRutExMoms = (rutDel - rutAvdrag) + ejRut;
  const totalEfterRutInklMoms = Math.round((totalEfterRutExMoms * (1 + VAT_RATE)) / 10) * 10;

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
            <span className="font-semibold text-base">Uppskattat totalpris</span>
            <span className="text-xs text-foreground">efter RUT-avdrag, inkl. moms</span>
          </div>
          <span className="text-2xl font-bold text-primary">{totalEfterRutInklMoms.toLocaleString("sv-SE")} kr</span>
        </div>

        <div className="text-s foreground mt-4 text-left">
          Pris inkl. moms innan RUT-avdrag: {prisFöreRut.toLocaleString("sv-SE")} kr
        </div>
      </CardContent>
    </Card>
  );
};

export default PriceCalculator;