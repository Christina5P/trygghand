// src/components/admin/ValuationsView.tsx
import React, { useMemo, useEffect, useState } from "react";
import type { Valuation, Customer } from "@/types";
import { supabase } from "@/lib/supabase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SignedStorageImage from "@/components/SignedStorageImage";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { getCleanDescription, getPriceLabel, getPriceRange } from "@/utils";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { jsPDF } from "jspdf";
import { Archive, BadgeDollarSign, Gift, Trash2 } from "lucide-react";




interface ValuationsViewProps {
  valuations: Valuation[];
  customers: Customer[];
  onDataUpdated: () => Promise<void>;
  onOpenDetails: (valuation: Valuation) => void;
  onDelete: (valuationId: string) => Promise<void> | void;
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
  { key: "keep", label: "Behåll", Icon: Archive },
  { key: "discard", label: "Släng", Icon: Trash2 },
];

const ValuationsView: React.FC<ValuationsViewProps> = ({
  valuations,
  customers,
  onDataUpdated,
  onOpenDetails,
  onDelete,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all");
  const [selectedDisposition, setSelectedDisposition] = useState<Disposition | "all">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [archivedCustomerMap, setArchivedCustomerMap] = useState<Record<string, string>>({});
  const [showArchivedValuations, setShowArchivedValuations] = useState(false);

  useEffect(() => {
    if (valuations && valuations.length > 0) {
      console.debug("ValuationsView sample valuation:", valuations[0]);
    } else {
      console.debug("ValuationsView: no valuations available");
    }
  }, [valuations]);

  useEffect(() => {
    const missingIds = Array.from(
      new Set(
        valuations
          .map((v) => v.customer_id)
          .filter((id): id is string => Boolean(id) && !customers.find((c) => c.id === id))
          .filter((id) => !archivedCustomerMap[id])
      )
    );

    if (missingIds.length === 0) return;

    const fetchArchivedNames = async () => {
      try {
        const { data, error } = await supabase
          .from("archived_customers")
          .select("id, name")
          .in("id", missingIds);

        if (error) throw error;

        const nextMap = { ...archivedCustomerMap };
        (data ?? []).forEach((row: any) => {
          if (row?.id && row?.name) nextMap[row.id] = row.name;
        });
        setArchivedCustomerMap(nextMap);
      } catch (err) {
        console.error("Error fetching archived customers:", err);
      }
    };

    void fetchArchivedNames();
  }, [valuations, customers, archivedCustomerMap]);
  const filteredValuations = useMemo(() => {
    // admin-get-all-valuations already enforces shared_with_admin = true
    // keep rows even if the field is missing in the payload
    const shared = valuations.filter((v) => v.shared_with_admin !== false);
    const byCustomer = selectedCustomerId === "all"
      ? shared
      : shared.filter((v) => v.customer_id === selectedCustomerId);
    if (selectedDisposition === "all") return byCustomer;
    return byCustomer.filter((v) => v.disposition_code === selectedDisposition);
  }, [valuations, selectedCustomerId, selectedDisposition]);

  const getCustomerName = (customerId: string | null): string => {
    if (!customerId) return "Gästvärdering";
    const customer = customers.find((c) => c.id === customerId);
    if (customer) return customer.name;
    if (archivedCustomerMap[customerId]) return archivedCustomerMap[customerId];
    return `Okänd Kund (${customerId.substring(0, 4)}...)`;
  };

  const isArchivedCustomer = (customerId: string | null) => {
    if (!customerId) return false;
    return Boolean(archivedCustomerMap[customerId]);
  };

  const activeFilteredValuations = filteredValuations.filter((v) => !isArchivedCustomer(v.customer_id ?? null));
  const archivedFilteredValuations = filteredValuations.filter((v) => isArchivedCustomer(v.customer_id ?? null));

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(price) + " kr";

  const getPriceDisplay = (v: Valuation): string | null => {
    return getPriceLabel((v as any).analysis_result ?? (v as any).analysis ?? "");
  };

  const summary = useMemo(() => {
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

    return { total, pricedCount, sumMin, sumMax, fmt };
  }, [filteredValuations]);

  const handleDownloadPdf = () => {
    if (filteredValuations.length === 0) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 48;
    const contentWidth = pageWidth - margin * 2;

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

    doc.setFontSize(18);
    doc.text("Värderingar – sammanställning", margin, y);
    y += 26;

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Genererad: ${nowLabel}`, margin, y);
    y += 16;

    doc.setTextColor(0);
    y += 6;
    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;

    addWrapped(`Totalt i filter: ${summary.total}`, 12);
    if (summary.pricedCount > 0) {
      addWrapped(
        `Summa uppskattat värde: ${summary.fmt(summary.sumMin)} – ${summary.fmt(summary.sumMax)} kr (baserat på ${summary.pricedCount} värderingar)`,
        12
      );
    }
    y += 10;
    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 18;

    addWrapped("Detaljer", 13);
    y += 6;

    for (const v of filteredValuations.slice(0, 200)) {
      const analysis = (v as any).analysis_result ?? (v as any).analysis ?? "";
      const base = (v as any)?.title ?? `Värdering #${v.id}`;
      const objectLabel = getValuationObjectLabel(analysis);
      const title = objectLabel ? `${base} – ${objectLabel}` : base;
      const created = v.created_at ? format(new Date(v.created_at), "yyyy-MM-dd", { locale: sv }) : "";
      const priceLabel = getPriceLabel(analysis);

      addWrapped(`${created}  ${title}`, 11);
      if (priceLabel) addWrapped(priceLabel, 10);
      y += 8;
    }

    doc.save(`varderingar-admin-${format(new Date(), "yyyyMMdd-HHmm")}.pdf`);
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
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Kund:</label>
          <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
            <SelectTrigger className="w-44 sm:w-64 h-8 sm:h-9 text-xs sm:text-sm">
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
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Kategori:</label>
          <Select value={selectedDisposition} onValueChange={(v) => setSelectedDisposition(v as Disposition | "all")}>
            <SelectTrigger className="w-36 sm:w-48 h-8 sm:h-9 text-xs sm:text-sm">
              <SelectValue placeholder="Alla" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla</SelectItem>
              {DISPOSITION_OPTIONS.map((opt) => (
                <SelectItem key={opt.key} value={opt.key}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="secondary" onClick={handleDownloadPdf} className="h-8 sm:h-9 text-xs sm:text-sm px-3 sm:px-4">
          Spara PDF
        </Button>
      </div>

      {activeFilteredValuations.length === 0 ? (
        <Card className="p-6 text-center">
          <CardTitle className="text-base">Inga aktiva värderingar hittades</CardTitle>
          <CardDescription className="mt-2">
            Prova att ändra filtren eller visa arkiverade värderingar.
          </CardDescription>
        </Card>
      ) : (
        activeFilteredValuations.map((v) => (
          <Card key={v.id} className="hover:shadow-md transition">
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start p-3 sm:p-4">
              {/* Bild – liten och avlång */}
              {v.image_urls && v.image_urls.length > 0 && (
                <SignedStorageImage
                  bucket="images"
                  path={v.image_urls[0]}
                  alt={`val-${v.id}-img`}
                  className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-md border flex-shrink-0"
                />
              )}

              {/* Textdel */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium break-words">
                      {(() => {
                        const analysis = (v as any).analysis_result ?? (v as any).analysis ?? "";
                        const base = (v as any)?.title ?? `Värdering #${v.id}`;
                        const label = getValuationObjectLabel(analysis);
                        return label ? `${base} – ${label}` : base;
                      })()}
                    </div>
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
                  <Badge className="hidden sm:inline-flex bg-blue-100 text-blue-800 hover:bg-blue-200">
                    {getCustomerName(v.customer_id)}
                  </Badge>
                </div>

                {v.disposition_code && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                    {(() => {
                      const opt = DISPOSITION_OPTIONS.find((o) => o.key === v.disposition_code);
                      if (!opt) return null;
                      const Icon = opt.Icon;
                      return (
                        <>
                          <Icon className="h-4 w-4" />
                          <span>{opt.label}</span>
                        </>
                      );
                    })()}
                  </div>
                )}

                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs sm:text-sm"
                    onClick={() => onOpenDetails(v)}
                  >
                    Visa detaljer
                  </Button>
                  {/* Skapa annons-länken visas alltid i admins lista, och i användarens egna värderingar (eller admins egna) */}
                  <a
                    href={`/portal/handplockat/skapa?valuation=${v.id}`}
                    className="inline-flex items-center justify-center rounded-md border border-primary bg-white text-primary px-3 h-8 text-xs sm:text-sm font-medium hover:bg-primary/10 transition"
                  >
                    Skapa annons
                  </a>
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
        ))
      )}

      <div className="space-y-3">
        <Button
          variant="ghost"
          className="text-sm text-gray-600"
          onClick={() => setShowArchivedValuations((v) => !v)}
        >
          {showArchivedValuations ? "Fäll ihop" : "Visa"} arkiverade värderingar ({archivedFilteredValuations.length})
        </Button>
        {showArchivedValuations && (
          archivedFilteredValuations.length === 0 ? (
            <Card className="p-6 text-center">
              <CardTitle className="text-base">Inga arkiverade värderingar</CardTitle>
              <CardDescription className="mt-2">Det finns inga arkiverade värderingar för de valda filtren.</CardDescription>
            </Card>
          ) : (
            archivedFilteredValuations.map((v) => (
              <Card key={v.id} className="hover:shadow-md transition">
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start p-3 sm:p-4">
                  {v.image_urls && v.image_urls.length > 0 && (
                    <SignedStorageImage
                      bucket="images"
                      path={v.image_urls[0]}
                      alt={`val-${v.id}-img`}
                      className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-md border flex-shrink-0"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium break-words">
                          {(() => {
                            const analysis = (v as any).analysis_result ?? (v as any).analysis ?? "";
                            const base = (v as any)?.title ?? `Värdering #${v.id}`;
                            const label = getValuationObjectLabel(analysis);
                            return label ? `${base} – ${label}` : base;
                          })()}
                        </div>
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
                      <Badge className="hidden sm:inline-flex bg-blue-100 text-blue-800 hover:bg-blue-200">
                        {getCustomerName(v.customer_id)}
                      </Badge>
                    </div>

                    {v.disposition_code && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                        {(() => {
                          const opt = DISPOSITION_OPTIONS.find((o) => o.key === v.disposition_code);
                          if (!opt) return null;
                          const Icon = opt.Icon;
                          return (
                            <>
                              <Icon className="h-4 w-4" />
                              <span>{opt.label}</span>
                            </>
                          );
                        })()}
                      </div>
                    )}

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs sm:text-sm"
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
            ))
          )
        )}
      </div>

      <div className="text-center pt-4">
        <Button
          onClick={async () => {
            setIsRefreshing(true);
            try {
              await onDataUpdated();
            } finally {
              setIsRefreshing(false);
            }
          }}
          variant="secondary"
          disabled={isRefreshing}
          className="h-8 sm:h-9 text-xs sm:text-sm px-3 sm:px-4"
        >
          {isRefreshing ? "Uppdaterar…" : "Uppdatera Värderingsdata"}
        </Button>
      </div>
    </div>
  );
};

export default ValuationsView;
