// src/components/GDPRDeleteUserDialog.tsx
/**
 * Admin-gränssnitt för GDPR-borttagning av kund
 *
 * Säkerhet:
 * - Kräver manuell email-bekräftelse (endast lokalt)
 * - Skickar ENDAST customerId till backend
 * - GDPR-radering utförs via Netlify Function
 * - Inga hemligheter eller fritextfält i request body
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Trash2 } from "lucide-react";
import type { Customer } from "@/types";

interface GDPRDeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onDeleteSuccess: () => void;
}

export function GDPRDeleteUserDialog({
  open,
  onOpenChange,
  customer,
  onDeleteSuccess,
}: GDPRDeleteUserDialogProps) {
  const { toast } = useToast();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!customer) return null;

  const isConfirmed = confirmEmail === customer.email;

  const handleDelete = async () => {
    if (!isConfirmed || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch("/.netlify/functions/gdpr-delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: customer.id, // ENDA datan som skickas
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "GDPR-radering misslyckades");
      }

      toast({
        title: "✓ Kund raderad (GDPR)",
        description: `${customer.email} har raderats permanent.`,
      });

      onDeleteSuccess();
      onOpenChange(false);
      setConfirmEmail("");
    } catch (error: any) {
      toast({
        title: "Fel vid GDPR-borttagning",
        description: error.message || "Okänt fel uppstod",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Radera kund (GDPR)
          </DialogTitle>
          <DialogDescription>
            Denna åtgärd raderar kundens personuppgifter permanent enligt GDPR.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>VARNING:</strong> Kunden {customer.email} kommer att raderas:
            <ul className="mt-2 ml-4 list-disc text-sm">
              <li>All persondata tas bort</li>
              <li>Åtgärden kan inte ångras</li>
              <li>Raderingen loggas för compliance</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label className="font-semibold">Användarens email</Label>
            <Input
              value={customer.email}
              disabled
              className="bg-gray-100 text-gray-600"
            />
          </div>

          <div>
            <Label htmlFor="confirm-email" className="font-semibold">
              Skriv in emailen för att bekräfta
            </Label>
            <Input
              id="confirm-email"
              placeholder={customer.email}
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              className={isConfirmed ? "border-green-500" : ""}
            />
            {isConfirmed && (
              <p className="text-xs text-green-600 mt-1">✓ Email bekräftad</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Avbryt
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || isLoading}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isLoading ? "Raderar..." : "Radera (GDPR)"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
