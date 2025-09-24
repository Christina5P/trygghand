import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface PriceCalculatorProps {
  basePrice: number;
  baseSqm?: number;
  pricePerSqm?: number;
  packageName: string;
}

const PriceCalculator = ({ 
  basePrice, 
  baseSqm = 50, 
  pricePerSqm = 100, 
  packageName 
}: PriceCalculatorProps) => {
  const [sqm, setSqm] = useState(baseSqm);

  const calculatePrice = () => {
    if (sqm <= baseSqm) {
      return basePrice;
    }
    const extraSqm = sqm - baseSqm;
    return basePrice + (extraSqm * pricePerSqm);
  };

  const formattedPrice = calculatePrice().toLocaleString('sv-SE');

  return (
    <Card className="mt-4 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-primary">Prisberäkning</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="sqm-input" className="text-sm font-medium">
            Yta (kvadratmeter)
          </Label>
          <Input
            id="sqm-input"
            type="number"
            value={sqm}
            onChange={(e) => setSqm(Math.max(1, parseInt(e.target.value) || baseSqm))}
            min={1}
            className="w-full"
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Baspris ({baseSqm} kvm):</span>
            <span className="font-medium">{basePrice.toLocaleString('sv-SE')} kr</span>
          </div>
          
          {sqm > baseSqm && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Extra yta ({sqm - baseSqm} kvm × {pricePerSqm} kr):</span>
              <span>+{((sqm - baseSqm) * pricePerSqm).toLocaleString('sv-SE')} kr</span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <span className="font-semibold">Totalt pris:</span>
          <span className="text-2xl font-bold text-primary">{formattedPrice} kr</span>
        </div>

        <p className="text-xs text-muted-foreground mt-2">
          Baserat på {baseSqm} kvm grundyta, därefter {pricePerSqm} kr/kvm
        </p>
      </CardContent>
    </Card>
  );
};

export default PriceCalculator;