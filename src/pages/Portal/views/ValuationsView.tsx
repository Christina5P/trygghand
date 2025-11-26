// src/components/admin/ValuationsView.tsx
import React from "react";
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
<div className="space-y-4">
<CardHeader className="bg-white rounded-t-lg shadow-sm p-4 border-b">
<CardTitle className="flex items-center gap-2">
<BadgeDollarSign className="w-5 h-5 text-green-600" />
Alla Värderingsrapporter ({valuations.length})
</CardTitle>
</CardHeader>
 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {valuations.map((v) => (
      <Card key={v.id} className="hover:shadow-lg transition duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium truncate">
            {v.foremal_beskrivning || `Värdering #${v.id}`}
          </CardTitle>
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
            AI-Analys
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-700">
            {v.varde_min_sek} - {v.varde_max_sek} SEK
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Kund: {getCustomerName(v.customer_id)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Skapad:{" "}
            {v.created_at
              ? format(new Date(v.created_at), "yyyy-MM-dd HH:mm", { locale: sv })
              : "Okänt datum"}
          </p>

          <div className="mt-4 flex gap-2">
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
        </CardContent>
      </Card>
    ))}
  </div>

  <div className="text-center pt-4">
    <Button onClick={onDataUpdated} variant="secondary">
      Uppdatera Värderingsdata
    </Button>
  </div>
</div>
);
};

export default ValuationsView;