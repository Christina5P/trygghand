// src/components/customer/ValuationManager.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useCustomerData } from "@/hooks/useCustomerData";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import ValueEstimator from "@/components/ValueEstimator";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { getCleanDescription, getPriceLabel, getPriceRange } from "@/utils";
import type { Customer, Valuation } from "@/types";
import { jsPDF } from "jspdf";
import { supabase, isUnauthorizedError, tryRefreshSession } from "@/lib/supabase";
import { Archive, BadgeDollarSign, Gift, Trash2 } from "lucide-react";


interface ValuationManagerProps {
  valuations: Valuation[];
  onDataUpdated: () => Promise<void>;
  customerId?: string;
  showShareToggle?: boolean;
  estimatorMode?: "customer" | "admin";
  customers?: Customer[];
  titleText?: string;
}

type Disposition = "sell" | "donate" | "keep" | "discard";

const getValuationObjectLabel = (analysis: unknown): string | null => {
  if (!analysis) return null;
  const pick = (data: any) => {
    const raw = data?.foremal_beskrivning ?? data?.analysis_result?.foremal_beskrivning;
    return typeof raw === "string" && raw.trim() ? raw.trim() : null;
  };

  if (typeof analysis === "string") {
    try {
      const parsed = JSON.parse(analysis);
      return pick(parsed);
    } catch {
      return null;
    }
  }

  return pick(analysis as any);
};

const DISPOSITION_OPTIONS: Array<{
  key: Disposition;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: "sell", label: "Sälj", Icon: BadgeDollarSign },
  { key: "donate", label: "Skänk", Icon: Gift },
  { key: "keep", label: "Behåll / magasinera", Icon: Archive },
  { key: "discard", label: "Släng", Icon: Trash2 },
];
  
export const ValuationManager: React.FC<ValuationManagerProps> = ({
  valuations,
  onDataUpdated,
  showShareToggle = true,
  estimatorMode = "customer",
  customers = [],
  titleText,
}) => {
const { customer } = useAuth();
const isAdmin = Boolean(customer?.is_admin);
const { toast } = useToast();
const {
loadingVals,
deleteValuation,
} = useCustomerData();

const [dispositions, setDispositions] = useState<Record<string, Disposition | undefined>>({});
const [sharedById, setSharedById] = useState<Record<string, boolean>>({});
const [savedFilter, setSavedFilter] = useState<Disposition | "all">("all");

useEffect(() => {
  const next: Record<string, Disposition> = {};
  const nextShared: Record<string, boolean> = {};
  for (const v of valuations ?? []) {
    const code = (v as any)?.disposition_code as Disposition | undefined;
    if (v?.id && code) next[String(v.id)] = code;
    if (v?.id && (v as any)?.shared_with_admin !== undefined) {
      nextShared[String(v.id)] = Boolean((v as any)?.shared_with_admin);
    }
  }
  setDispositions(next);
  setSharedById((prev) => ({ ...prev, ...nextShared }));
}, [valuations]);

const setDisposition = useCallback(async (valuationId: string, next: Disposition) => {
  if (!valuationId) return;
  setDispositions((prev) => ({ ...(prev as any), [valuationId]: next }));

  // Personal data; stored for service delivery (contract).
  const run = () =>
    supabase
      .from("valuations")
      .update({ disposition_code: next })
      .eq("id", valuationId);

  let { error } = await run();
  if (error && isUnauthorizedError(error)) {
    const refreshed = await tryRefreshSession();
    if (refreshed) ({ error } = await run());
  }
  if (error) {
    toast({ title: "Kunde inte spara", description: "Valet kunde inte sparas.", variant: "destructive" });
  }
}, [toast]);

const setSharedWithAdmin = useCallback(async (valuationId: string, next: boolean) => {
  if (!valuationId) return;
  const previous = sharedById[valuationId] ?? true;
  setSharedById((prev) => ({ ...prev, [valuationId]: next }));

  // Personal data; stored for service delivery (contract).
  const run = () =>
    supabase
      .from("valuations")
      .update({ shared_with_admin: next })
      .eq("id", valuationId);

  let { error } = await run();
  if (error && isUnauthorizedError(error)) {
    const refreshed = await tryRefreshSession();
    if (refreshed) ({ error } = await run());
  }
  if (error) {
    setSharedById((prev) => ({ ...prev, [valuationId]: previous }));
    toast({ title: "Kunde inte spara", description: "Delning kunde inte uppdateras.", variant: "destructive" });
    return;
  }

  await onDataUpdated();
}, [onDataUpdated, sharedById, toast]);

const [deletingValuationId, setDeletingValuationId] = useState<string | null>(null);

const [mainTab, setMainTab] = useState<"new" | "saved">("new");
const [newEstimatorKey, setNewEstimatorKey] = useState(0);

const visibleValuations = useMemo(() => {
  // If the backend includes soft-delete metadata, hide deleted rows.
  // This keeps the UI consistent even if the caller passes through deleted rows.
  return (valuations ?? []).filter((v) => !(v as any)?.deleted_at);
}, [valuations]);

const filteredValuations = useMemo(() => {
  if (savedFilter === "all") return visibleValuations;
  return visibleValuations.filter((v) => dispositions[String(v.id)] === savedFilter);
}, [visibleValuations, dispositions, savedFilter]);

const summaryAll = useMemo(() => {
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

const summaryFiltered = useMemo(() => {
  const fmt = (n: number) => new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n);
  const total = filteredValuations.length;

  let pricedCount = 0;
  let sumMin = 0;
  let sumMax = 0;

  for (const v of filteredValuations) {
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
}, [filteredValuations]);

const handleDownloadPdf = useCallback(() => {
  if (!filteredValuations || filteredValuations.length === 0) return;

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
  const activeFilterLabel =
    savedFilter === "all"
      ? null
      : (DISPOSITION_OPTIONS.find((o) => o.key === savedFilter)?.label ?? "Filter");

  addWrapped(
    activeFilterLabel
      ? `Totalt i filter (${activeFilterLabel}): ${summaryFiltered.total}`
      : `Totalt sparade värderingar: ${summaryFiltered.total}`,
    12
  );
  if (savedFilter !== "all") {
    addWrapped(`Totalt alla sparade (oavsett filter): ${summaryAll.total}`, 10);
  }

  if (summaryFiltered.hasAnyPrice) {
    addWrapped(
      `Summa uppskattat värde: ${summaryFiltered.fmt(summaryFiltered.sumMin)} – ${summaryFiltered.fmt(summaryFiltered.sumMax)} kr (baserat på ${summaryFiltered.pricedCount} värderingar)`,
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
  for (const v of filteredValuations.slice(0, maxItems)) {
    const titleBase = (v as any)?.title ?? `Värdering #${String(v.id)}`;
    const created = v.created_at ? format(new Date(v.created_at), "yyyy-MM-dd", { locale: sv }) : "";
    const analysis = (v as any).analysis_result ?? (v as any).analysis ?? "";
    const objectLabel = getValuationObjectLabel(analysis);
    const title = objectLabel ? `${titleBase} – ${objectLabel}` : titleBase;

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

  if (filteredValuations.length > maxItems) {
    addWrapped(`(Visar endast de ${maxItems} första värderingarna i PDF:en)`, 10);
  }

  const suffix =
    savedFilter === "all"
      ? "alla"
      : String(savedFilter).replace(/[^a-z0-9_-]/gi, "");
  doc.save(`varderingar-${suffix}-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
}, [filteredValuations, summaryAll, summaryFiltered, customer, savedFilter]);

const handleDelete = useCallback(
  async (valuationId: string) => {
    if (!valuationId) return;
    setDeletingValuationId(valuationId);
    try {
      if (isAdmin) {
        const run = () =>
          supabase.functions.invoke("admin-soft-delete-valuation", {
            body: { valuation_id: valuationId, confirm: true },
          });

        let { error } = await run();

        const status = (error as any)?.status ?? (error as any)?.context?.status;
        if (error && (isUnauthorizedError(error) || status === 401 || status === 403)) {
          const refreshed = await tryRefreshSession();
          if (refreshed) ({ error } = await run());
        }

        if (error) throw error;
      } else {
        await deleteValuation(valuationId);
      }
      await onDataUpdated();
    } catch (err) {
      console.error("delete valuation failed", err);
      toast({
        title: "Fel",
        description: typeof (err as any)?.message === "string" ? (err as any).message : "Kunde inte radera värderingen.",
        variant: "destructive",
      });
    } finally {
      setDeletingValuationId(null);
    }
  },
  [deleteValuation, onDataUpdated, toast, isAdmin]
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

  <div className="flex flex-wrap items-center justify-center gap-2">
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={savedFilter}
      onValueChange={(v) => setSavedFilter((v || "all") as Disposition | "all")}
      className="flex flex-wrap justify-center gap-1 rounded-xl border border-border/50 bg-muted/40 p-1"
    >
      <ToggleGroupItem
        value="all"
        className="rounded-lg px-3 bg-background/40 hover:bg-background/60 data-[state=on]:bg-background data-[state=on]:shadow-sm"
      >
        Alla
      </ToggleGroupItem>
      {DISPOSITION_OPTIONS.map((opt) => (
        <ToggleGroupItem
          key={opt.key}
          value={opt.key}
          className={
            opt.key === "discard"
              ? "rounded-lg px-3 bg-background/40 hover:bg-background/60 text-foreground data-[state=on]:bg-destructive/10 data-[state=on]:shadow-sm"
              : "rounded-lg px-3 bg-background/40 hover:bg-background/60 data-[state=on]:bg-background data-[state=on]:shadow-sm"
          }
        >
          <opt.Icon className={opt.key === "discard" ? "h-4 w-4 text-destructive/80" : "h-4 w-4 text-muted-foreground"} />
          <span>{opt.label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  </div>

{filteredValuations.map((v: Valuation) => (
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
                  <div className="text-sm font-semibold text-gray-900">
                    {(() => {
                      const base = (v as any)?.title ?? `Värdering #${String(v.id)}`;
                      const label = getValuationObjectLabel(analysis);
                      return label ? `${base} – ${label}` : base;
                    })()}
                  </div>
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

            <div className="mt-3">
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                value={dispositions[String(v.id)] ?? ""}
                onValueChange={(val) => {
                  if (!val) return;
                  setDisposition(String(v.id), val as Disposition);
                }}
                className="flex flex-wrap gap-1 rounded-xl border border-border/50 bg-muted/30 p-1"
              >
                {DISPOSITION_OPTIONS.map((opt) => (
                  <ToggleGroupItem
                    key={opt.key}
                    value={opt.key}
                    className={
                      opt.key === "discard"
                        ? "rounded-lg px-3 bg-background/40 hover:bg-background/60 text-foreground data-[state=on]:bg-destructive/10 data-[state=on]:shadow-sm"
                        : "rounded-lg px-3 bg-background/40 hover:bg-background/60 data-[state=on]:bg-background data-[state=on]:shadow-sm"
                    }
                  >
                    <opt.Icon className={opt.key === "discard" ? "h-4 w-4 text-destructive/80" : "h-4 w-4 text-muted-foreground"} />
                    <span>{opt.label}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {showShareToggle && (
              <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                <Switch
                  checked={sharedById[String(v.id)] ?? true}
                  onCheckedChange={(checked) => {
                    void setSharedWithAdmin(String(v.id), checked);
                  }}
                />
                <span>Dela med admin</span>
              </div>
            )}

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
        <div className="text-sm text-gray-700 mt-1">
          Sparade värderingar{savedFilter === "all" ? "" : " (i filter)"}: <span className="font-semibold">{summaryFiltered.total}</span>
        </div>
        {savedFilter !== "all" && (
          <div className="text-xs text-gray-500 mt-1">Totalt alla sparade: {summaryAll.total}</div>
        )}
        {summaryFiltered.hasAnyPrice ? (
          <div className="mt-3">
            <div className="text-sm font-semibold text-gray-800">Totalt uppskattat värde</div>
            <div className="text-2xl font-extrabold text-trust-blue mt-1">
              {summaryFiltered.fmt(summaryFiltered.sumMin)} – {summaryFiltered.fmt(summaryFiltered.sumMax)} kr
            </div>
            <div className="text-xs text-gray-500 mt-1">Baserat på {summaryFiltered.pricedCount} värderingar med prisdata</div>
          </div>
        ) : (
          <div className="text-sm text-gray-600 mt-3">Ingen prisdata hittades i de sparade värderingarna.</div>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={handleDownloadPdf}
        disabled={filteredValuations.length === 0}
        className="shrink-0"
      >
        Ladda ner PDF
      </Button>
    </div>
  </div>
  </div>
);
}, [loadingVals, visibleValuations, filteredValuations, savedFilter, dispositions, setDisposition, handleDelete, deletingValuationId, summaryAll, summaryFiltered, handleDownloadPdf]);

return (
<div className="mb-6">
<CollapsibleCard
defaultOpen={!isAdmin}
title={
<div className="flex flex-col">
<span className="font-bold text-lg">{titleText ?? "Värdebedömningsverktyg"}</span>
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
        mode={estimatorMode}
        customers={customers}
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