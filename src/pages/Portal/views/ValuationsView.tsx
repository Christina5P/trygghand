// src/components/admin/ValuationsView.tsx
import React, { useMemo } from "react";
import type { Valuation, Customer } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { BadgeDollarSign, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";




interface ValuationsViewProps {
  valuations: Valuation[];
  customers: Customer[];
  onDataUpdated: () => Promise<void>;
  onOpenDetails: (valuation: Valuation) => void;
  onDelete: (valuationId: string) => Promise<void> | void;
}

const ValuationsView: React.FC<ValuationsViewProps> = ({
  valuations,
  customers,
  onDataUpdated,
  onOpenDetails,
  onDelete,
}) => {
  const getCustomerName = (customerId: string | null): string => {
    if (!customerId) return "Gästvärdering";
    const customer = customers.find((c) => c.id === customerId);
    return customer
      ? customer.name
      : `Okänd Kund (${customerId.substring(0, 4)}...)`;
  };

  if (valuations.length === 0) {
    return (
      <Card className="p-6 text-center">
        <CardTitle className="text-xl">Inga värderingar hittades</CardTitle>
        <CardDescription className="mt-2">
          Det finns inga registrerade AI-värderingar i databasen ännu.
        </CardDescription>
      </Card>
    );
  }

  return (
   <div className="space-y-3">
  {valuations.map((v) => (
    <Card key={v.id} className="hover:shadow-md transition">
      <CardContent className="flex gap-3 items-start p-3">
        {/* Bild – liten och avlång */}
        {v.image_urls && v.image_urls.length > 0 && (
          <img
            src={v.image_urls[0]}
            alt={`val-${v.id}-img`}
            className="w-24 h-24 object-cover rounded-md border flex-shrink-0"
          />
        )}

        {/* Textdel */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {v.foremal_beskrivning || `Värdering #${v.id}`}
              </div>
              <div className="text-xs text-gray-500">
                Kund: {getCustomerName(v.customer_id)}
              </div>
              <div className="text-xs text-gray-500">
                Skapad: {v.created_at
                  ? format(new Date(v.created_at), "yyyy-MM-dd HH:mm", { locale: sv })
                  : "Okänt datum"}
              </div>
            </div>
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
              AI-Analys
            </Badge>
          </div>

          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onOpenDetails(v)}
            >
              Visa detaljer
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex items-center gap-1"
              onClick={async () => {
                await onDelete(String(v.id));
                await onDataUpdated();
              }}
            >
              <Trash2 className="w-4 h-4" />
              Ta bort
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  ))}

      <div className="text-center pt-4">
        <Button onClick={onDataUpdated} variant="secondary">
          Uppdatera Värderingsdata
        </Button>
      </div>
    </div>
  );
};

export default ValuationsView;
