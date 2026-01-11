// src/components/customer/ValuationManager.tsx
import React, { useCallback, useMemo, useState } from "react";
import { useCustomerData } from "@/hooks/useCustomerData";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import ValueEstimator from "@/components/ValueEstimator";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { getCleanDescription, getPriceLabel } from "@/utils";
import type { Valuation } from "@/types";


interface ValuationManagerProps {
  valuations: Valuation[];
  onDataUpdated: () => Promise<void>;
  customerId?: string;
}
  
export const ValuationManager: React.FC<ValuationManagerProps> = ({ valuations, onDataUpdated }) => {
const { customer } = useAuth();
const isAdmin = Boolean(customer?.is_admin);
const { toast } = useToast();
const {
loadingVals,
deleteValuation,
} = useCustomerData();

const [deletingValuationId, setDeletingValuationId] = useState<string | null>(null);

const [mainTab, setMainTab] = useState<"new" | "saved">("new");
const [newEstimatorKey, setNewEstimatorKey] = useState(0);

const visibleValuations = useMemo(() => {
  // If the backend includes soft-delete metadata, hide deleted rows.
  // This keeps the UI consistent even if the caller passes through deleted rows.
  return (valuations ?? []).filter((v) => !(v as any)?.deleted_at);
}, [valuations]);

const handleDelete = useCallback(
  async (valuationId: string) => {
    if (!valuationId) return;
    setDeletingValuationId(valuationId);
    try {
      await deleteValuation(valuationId);
      await onDataUpdated();
    } catch (err) {
      console.error("delete valuation failed", err);
      toast({
        title: "Fel",
        description: "Kunde inte radera värderingen.",
        variant: "destructive",
      });
    } finally {
      setDeletingValuationId(null);
    }
  },
  [deleteValuation, onDataUpdated, toast]
);

const savedValsContent = useMemo(() => {
if (loadingVals) {
return <p className="text-gray-500">Laddar sparade värderingar…</p>;
}
if (!loadingVals && visibleValuations.length === 0) {
return <p className="text-gray-500">Inga sparade värderingar.</p>;
}
return (
<div className="grid gap-4">
{visibleValuations.map((v: Valuation) => (
<div key={String(v.id)} className="p-4 border rounded bg-white">
<div className="flex items-start gap-4">
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
            {getPriceLabel((v as any).analysis_result ?? (v as any).analysis ?? "") && (
              <div className="text-sm font-semibold text-black mt-1">
                {getPriceLabel((v as any).analysis_result ?? (v as any).analysis ?? "")}
              </div>
            )}
            <div className="text-xs text-gray-500">
              {v.created_at ? format(new Date(v.created_at), "yyyy-MM-dd", { locale: sv }) : ""}
            </div>
            <div className="mt-1 text-xs text-gray-600 line-clamp-2">
              {getCleanDescription((v as any).analysis_result ?? (v as any).analysis ?? "")}
            </div>
            <div className="mt-2">
              <button
                onClick={() => handleDelete(String(v.id))}
                disabled={deletingValuationId === String(v.id)}
                className="text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                {deletingValuationId === String(v.id) ? "Raderar…" : "Radera"}
              </button>
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);
}, [loadingVals, visibleValuations, handleDelete, deletingValuationId]);

return (
<div className="mb-6">
<CollapsibleCard
defaultOpen={!isAdmin}
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
onClick={() => {
setMainTab("new");
setNewEstimatorKey((k) => k + 1);
}}
variant={mainTab === "new" ? "default" : "outline"}
size="sm"
>
Ny värdering
</Button>
<Button
onClick={() => {
setMainTab("saved");
onDataUpdated();
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
        key={newEstimatorKey}
        customerId={customer?.id}
        onSaved={() => {
          setMainTab("saved");
          onDataUpdated();
        }}
      />
    )}

    {mainTab === "saved" && savedValsContent}
  </CollapsibleCard>
</div>
);
};

export default ValuationManager;