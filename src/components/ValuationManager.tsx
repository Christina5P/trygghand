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
import { getCleanDescription, getPriceLabel, getPriceRange } from "@/utils";
import type { Valuation } from "@/types";
import { jsPDF } from "jspdf";


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

const summary = useMemo(() => {
  const fmt = (n: number) => new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
  const total = visibleValuations.length;

  let pricedCount = 0;
  let sumMin = 0;
  let sumMax = 0;

  for (const v of visibleValuations) {
    const analysis = (v as any).analysis_result ?? (v as any).analysis ?? "";
    const range = getPriceRange(analysis);
    if (!range) continue;
    const min = range.min;
    const max = range.max ?? range.min;
    if (min == null && max == null) continue;
    pricedCount += 1;
    if (min != null) sumMin += min;
    if (max != null) sumMax += max;
  }

  const hasAnyPrice = pricedCount > 0;

  return {
    total,
    pricedCount,
    hasAnyPrice,
    sumMin,
    sumMax,
    fmt,
  };
}, [visibleValuations]);

const handleDownloadPdf = useCallback(() => {
  if (!visibleValuations || visibleValuations.length === 0) return;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentWidth = pageWidth - margin * 2;

  const fmtMoney = (n: number) => new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
  const nowLabel = format(new Date(), "yyyy-MM-dd HH:mm", { locale: sv });

  let y = margin;

  const addWrapped = (text: string, fontSize = 11, lineGap = 4) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text, contentWidth);
    const lineHeight = fontSize + lineGap;
    for (const line of lines) {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(String(line), margin, y);
      y += lineHeight;
    }
  };

  // Title
  doc.setFontSize(18);
  doc.text("Värderingar – sammanställning", margin, y);
  y += 26;

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Genererad: ${nowLabel}`, margin, y);
  y += 16;

  const customerName = (customer as any)?.name ?? (customer as any)?.full_name ?? null;
  if (customerName) {
    doc.text(`Kund: ${String(customerName)}`, margin, y);
    y += 16;
  }

  doc.setTextColor(0);
  y += 6;
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  // Summary
  addWrapped(`Totalt sparade värderingar: ${summary.total}`, 12);
  if (summary.hasAnyPrice) {
    addWrapped(
      `Summa uppskattat värde: ${summary.fmt(summary.sumMin)} – ${summary.fmt(summary.sumMax)} kr (baserat på ${summary.pricedCount} värderingar)`,
      12
    );
  }
  y += 10;
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  // List
  addWrapped("Detaljer", 13);
  y += 6;

  const maxItems = 200; // safety to avoid huge PDFs
  for (const v of visibleValuations.slice(0, maxItems)) {
    const title = (v as any)?.title ?? `Värdering #${String(v.id)}`;
    const created = v.created_at ? format(new Date(v.created_at), "yyyy-MM-dd", { locale: sv }) : "";
    const analysis = (v as any).analysis_result ?? (v as any).analysis ?? "";

    const range = getPriceRange(analysis);
    const priceLabel = getPriceLabel(analysis);
    const desc = getCleanDescription(analysis);

    const min = range?.min;
    const max = range?.max;

    addWrapped(`${created}  ${title}`, 11);
    if (priceLabel) {
      addWrapped(priceLabel, 10);
    } else if (min != null || max != null) {
      const a = min != null ? fmtMoney(min) : "–";
      const b = max != null ? fmtMoney(max) : "–";
      addWrapped(`Värde: ${a} – ${b} kr`, 10);
    }
    if (desc) {
      const short = desc.length > 400 ? `${desc.slice(0, 400)}…` : desc;
      addWrapped(short, 10);
    }
    y += 10;
  }

  if (visibleValuations.length > maxItems) {
    addWrapped(`(Visar endast de ${maxItems} första värderingarna i PDF:en)`, 10);
  }

  doc.save(`varderingar-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
}, [visibleValuations, summary, customer]);

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
            {(() => {
              const analysis = (v as any).analysis_result ?? (v as any).analysis ?? "";
              const price = getPriceLabel(analysis);
              return (
                <>
                  <div className="text-sm font-semibold text-gray-900">{(v as any)?.title ?? `Värdering #${String(v.id)}`}</div>
                  {price && (
                    <div className="text-base font-bold text-trust-blue mt-1">{price}</div>
                  )}
                </>
              );
            })()}
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

  <div className="p-5 border rounded bg-white">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="text-lg font-bold text-gray-900">Summering</div>
        <div className="text-sm text-gray-700 mt-1">Sparade värderingar: <span className="font-semibold">{summary.total}</span></div>
        {summary.hasAnyPrice ? (
          <div className="mt-3">
            <div className="text-sm font-semibold text-gray-800">Totalt uppskattat värde</div>
            <div className="text-2xl font-extrabold text-trust-blue mt-1">
              {summary.fmt(summary.sumMin)} – {summary.fmt(summary.sumMax)} kr
            </div>
            <div className="text-xs text-gray-500 mt-1">Baserat på {summary.pricedCount} värderingar med prisdata</div>
          </div>
        ) : (
          <div className="text-sm text-gray-600 mt-3">Ingen prisdata hittades i de sparade värderingarna.</div>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleDownloadPdf}
        disabled={visibleValuations.length === 0}
        className="shrink-0"
      >
        Ladda ner PDF
      </Button>
    </div>
  </div>
  </div>
);
}, [loadingVals, visibleValuations, handleDelete, deletingValuationId, summary, handleDownloadPdf]);

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