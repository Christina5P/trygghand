import React, { useMemo, useState } from "react";
import type { Valuation, Customer } from "@/types";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { getCleanDescription } from "@/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface ValuationDetailsDialogProps {
  valuation: Valuation | null;
  customers: Customer[];
  open: boolean;          // gör den krävd nu
  onClose: () => void;
  onDataUpdated?: () => Promise<void>;
}

const ValuationDetailsDialog: React.FC<ValuationDetailsDialogProps> = ({
  valuation,
  customers,
  open,
  onClose,
  onDataUpdated,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("__keep__");
  const [saving, setSaving] = useState(false);

  const parsedAnalysis = useMemo(() => {
    if (!valuation) return null;

    const raw =
      (valuation as any).analysis_result ??
      (valuation as any).analysis ??
      null;

    if (!raw) return null;

    try {
      return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  }, [valuation]);

  const getPriceDisplay = (): string | null => {
    if (!valuation) return null;
    const rawPrice = (valuation as any).price ?? parsedAnalysis?.varde_min_sek ?? null;
    const rawMax = parsedAnalysis?.varde_max_sek ?? null;
    const fmt = (n: number) => new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(n) + " kr";
    if (rawPrice && rawMax) return `${fmt(Number(rawPrice))} - ${fmt(Number(rawMax))}`;
    if (rawPrice) return fmt(Number(rawPrice));
    return null;
  };

  if (!valuation) return null;

  const customer =
    customers.find((c) => c.id === valuation.customer_id) ?? null;

  const handleShare = async () => {
    if (!valuation) return;
    if (selectedCustomerId === "__keep__") return;

    setSaving(true);
    try {
      const payload = {
        p_valuation_id: valuation.id,
        p_customer_id: selectedCustomerId === "__admin_only__" ? null : selectedCustomerId,
      };

      const { error } = await supabase.rpc("admin_set_valuation_customer", payload);
      if (error) throw error;

      if (onDataUpdated) await onDataUpdated();
      onClose();
    } catch (e) {
      console.error("admin_set_valuation_customer failed", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{(valuation as any)?.title ?? `Värdering #${valuation.id}`}</DialogTitle>
          <DialogDescription>
            {customer ? `Kund: ${customer.name}` : "Gästvärdering"}
            {getPriceDisplay() && (
              <div className="text-sm text-black mt-1">{getPriceDisplay()}</div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Välj kund (eller admin-only)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__keep__">Behåll nuvarande</SelectItem>
              <SelectItem value="__admin_only__">Admin-only (ingen kund)</SelectItem>
              {customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleShare} disabled={saving || selectedCustomerId === "__keep__"}>
            Spara
          </Button>
        </div>

        {/* Bild */}
        {valuation.image_urls && valuation.image_urls.length > 0 && (
          <img
            src={valuation.image_urls[0]}
            alt={`val-${valuation.id}-img`}
            className="w-full max-h-64 object-contain rounded-md border mb-4"
          />
        )}

        {/* Beskrivning från analys */}
        <section>
          <h3 className="font-semibold mb-1">Beskrivning</h3>
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {getCleanDescription((valuation as any).analysis_result ?? (valuation as any).analysis ?? "") || "Ingen beskrivning tillgänglig."}
          </p>
        </section>
      </DialogContent>
    </Dialog>
  );
};

export default ValuationDetailsDialog
