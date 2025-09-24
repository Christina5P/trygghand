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
  totalLabel?: string;
}

const PriceCalculator = ({ 
  basePrice, 
  baseSqm = 50, 
  pricePerSqm = 100, 
  packageName,
  totalLabel = "Totalt"
}: PriceCalculatorProps) => {
  const [sqm, setSqm] = useState<string>(baseSqm.toString());

  const calculatePrice = () => {
    const sqmNumber = parseInt(sqm);
    if (isNaN(sqmNumber) || sqmNumber < 1) return 0;
    if (sqmNumber <= baseSqm) {
      return basePrice;
    }
    const extraSqm = sqmNumber - baseSqm;
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

        <div className="space-y-2">
       
        </div>

        <Separator />

        <div className="flex justify-between items-center">
          <div className="flex flex-col items-start">
            {totalLabel.includes('efter RUT-avdrag') ? (
              <>
                <span className="font-semibold text-base">Totalt</span>
                <span className="text-xs text-muted-foreground">efter RUT-avdrag</span>
              </>
            ) : (
                <span className="font-semibold text-base">{totalLabel.replace('Totalt pris:', 'Totalt')}</span>
            )}
          </div>
          <span className="text-2xl font-bold text-primary">{formattedPrice} kr</span>
        </div>

       
      </CardContent>
    </Card>
  );
};

export default PriceCalculator;