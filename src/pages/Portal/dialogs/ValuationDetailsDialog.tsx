import React, { useMemo } from "react";
import type { Valuation, Customer } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ValuationDetailsDialogProps {
  valuation: Valuation | null;
  customers: Customer[];
  open: boolean;          // gör den krävd nu
  onClose: () => void;
}

const ValuationDetailsDialog: React.FC<ValuationDetailsDialogProps> = ({
  valuation,
  customers,
  open,
  onClose,
}) => {
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

  const foremalBeskrivning =
    parsedAnalysis?.foremal_beskrivning ??
    "AI:n kunde inte generera en beskrivning för denna värdering.";
  const motivering =
    parsedAnalysis?.motivering ??
    "AI:n returnerade ingen motivering för denna värdering.";

  if (!valuation) return null;

  const customer =
    customers.find((c) => c.id === valuation.customer_id) ?? null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Värdering #{valuation.id}</DialogTitle>
          <DialogDescription>
            {customer ? `Kund: ${customer.name}` : "Gästvärdering"}
          </DialogDescription>
        </DialogHeader>

        {/* Bild */}
        {valuation.image_urls && valuation.image_urls.length > 0 && (
          <img
            src={valuation.image_urls[0]}
            alt={`val-${valuation.id}-img`}
            className="w-full max-h-64 object-contain rounded-md border mb-4"
          />
        )}

        {/* Motivering */}
        <section className="mb-4">
          <h3 className="font-semibold mb-1">Motivering</h3>
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {motivering}
          </p>
        </section>

        {/* Föremålsbeskrivning */}
        <section>
          <h3 className="font-semibold mb-1">Föremålsbeskrivning</h3>
          <p className="whitespace-pre-wrap text-sm text-gray-700">
            {foremalBeskrivning}
          </p>
        </section>
      </DialogContent>
    </Dialog>
  );
};

export default ValuationDetailsDialog
