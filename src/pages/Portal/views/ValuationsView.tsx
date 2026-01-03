// src/components/admin/ValuationsView.tsx
import React, { useMemo, useEffect, useState } from "react";
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
import { getCleanDescription, getPriceLabel } from "@/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";




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
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all");

  useEffect(() => {
    if (valuations && valuations.length > 0) {
      console.debug("ValuationsView sample valuation:", valuations[0]);
    } else {
      console.debug("ValuationsView: no valuations available");
    }
  }, [valuations]);
  const filteredValuations = useMemo(() => {
    if (selectedCustomerId === "all") return valuations;
    return valuations.filter(v => v.customer_id === selectedCustomerId);
  }, [valuations, selectedCustomerId]);

  const getCustomerName = (customerId: string | null): string => {
    if (!customerId) return "Gästvärdering";
    const customer = customers.find((c) => c.id === customerId);
    return customer
      ? customer.name
      : `Okänd Kund (${customerId.substring(0, 4)}...)`;
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(price) + " kr";

  const getPriceDisplay = (v: Valuation): string | null => {
    return getPriceLabel((v as any).analysis_result ?? (v as any).analysis ?? "");
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
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Filtrera på kund:</label>
        <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Välj kund" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla kunder</SelectItem>
            {customers.map((customer) => (
              <SelectItem key={customer.id} value={customer.id}>
                {customer.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredValuations.map((v) => (
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
              <div className="text-sm font-medium truncate">Värdering #{v.id}</div>
              {getPriceDisplay(v) && (
                <div className="text-sm font-semibold text-black mt-1">
                  {getPriceDisplay(v)}
                </div>
              )}
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
              {getCustomerName(v.customer_id)}
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
            <button
              onClick={() => onDelete(v.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Ta bort
            </button>
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
