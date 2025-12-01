// src/components/customer/ValuationManager.tsx
import React, { useMemo, useState } from "react";
import { useCustomerData } from "@/hooks/useCustomerData";
import { useAuth } from "@/hooks/useAuth";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import ValueEstimator from "@/components/ValueEstimator";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import type { Valuation } from "@/types";


interface ValuationManagerProps {
  valuations: Valuation[];
  onDataUpdated: () => Promise<void>;
  customerId?: string;
}
  
export const ValuationManager: React.FC<ValuationManagerProps> = ({ valuations, onDataUpdated }) => {
const { customer } = useAuth();
const {
loadingVals,
fetchValuations,
deleteValuation,
} = useCustomerData();

const [mainTab, setMainTab] = useState<"new" | "saved">("new");

const savedValsContent = useMemo(() => {
if (loadingVals) {
return <p className="text-gray-500">Laddar sparade värderingar…</p>;
}
if (!loadingVals && valuations.length === 0) {
return <p className="text-gray-500">Inga sparade värderingar.</p>;
}
return (
<div className="grid gap-4">
{valuations.map((v: Valuation) => (
<div key={String(v.id)} className="p-4 border rounded bg-white relative">
{/* Ta bort knapp */}
<button
onClick={async () => {
await deleteValuation(String(v.id));
await fetchValuations();
}}
className="absolute top-2 right-2 text-gray-400 hover:text-red-600"
aria-label="Ta bort värdering"
>
<X className="w-4 h-4" />
</button>
<div className="flex items-start gap-4 pr-6">
          {/* Bild / Placeholder */}
          {v.image_urls && v.image_urls.length > 0 ? (
            <img
              src={v.image_urls[0]}
              alt={`val-${v.id}-img`}
              className="w-16 h-16 object-cover rounded-md border flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-50 rounded-md flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
              Ingen bild
            </div>
          )}

          <div className="flex-1">
            <div className="text-sm font-medium">Värdering #{String(v.id)}</div>
            <div className="text-xs text-gray-500">
              {v.created_at ? format(new Date(v.created_at), "yyyy-MM-dd", { locale: sv }) : ""}
            </div>
            <div className="mt-1 text-xs text-gray-600 line-clamp-2">
              {(() => {
                const text = (v as any).analysis_result ?? (v as any).analysis ?? "";
                try {
                  const parsed = typeof text === "string" ? JSON.parse(text) : text;
                  return parsed?.foremal_beskrivning ?? parsed?.motivering ?? String(text);
                } catch {
                  return String(text);
                }
              })()}
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);
}, [loadingVals, valuations, deleteValuation, fetchValuations]);

return (
<div className="mb-6">
<CollapsibleCard
defaultOpen
title={
<div className="flex flex-col">
<span className="font-bold text-lg">Värdebedömningsverktyg</span>
<span className="text-sm text-gray-600">
Hjälpmedel för att uppskatta värdet på dina bilder och föremål.
</span>
</div>
}
>
{/* Tabs */}
<div className="flex space-x-2 mb-4">
<Button
onClick={() => setMainTab("new")}
variant={mainTab === "new" ? "default" : "outline"}
size="sm"
>
Ny värdering
</Button>
<Button
onClick={() => {
setMainTab("saved");
fetchValuations();
}}
variant={mainTab === "saved" ? "default" : "outline"}
size="sm"
>
Sparade värderingar
</Button>
</div>
 {/* Innehåll */}
    {mainTab === "new" && (
      <ValueEstimator
        customerId={customer?.id}
        onSaved={() => {
          setMainTab("saved");
          fetchValuations();
        }}
        onOpenSaved={() => {
          setMainTab("saved");
          fetchValuations();
        }}
        onNew={() => {
          setMainTab("new");
        }}
      />
    )}

    {mainTab === "saved" && savedValsContent}
  </CollapsibleCard>
</div>
);
};

export default ValuationManager;