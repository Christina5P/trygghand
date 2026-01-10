// src/components/GDPRDeleteUserDialog.tsx
/**
 * Admin-gränssnitt för GDPR-borttagning av användare
 * 
 * Säkerhet:
 * - Kräver bekräftelse via email-inmatning
 * - Kräver bekräftelse via email-inmatning
 * - Utför en soft delete (återställbar)
 * - Inga fritextfält skickas i request body
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
import { useAuth } from "@/hooks/useAuth";
import { AlertCircle, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Customer } from "@/types";

interface GDPRDeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer;
  onDeleteSuccess: () => void;
}

export function GDPRDeleteUserDialog({
  open,
  onOpenChange,
  customer,
  onDeleteSuccess,
}: GDPRDeleteUserDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Null-check: Stäng om customer är null
  if (!customer) {
    return null;
  }

  // Validering: Email måste matcha (endast lokalt, skickas ej)
  const isConfirmed = confirmEmail === customer.email;

  const handleDelete = async () => {
    if (!user?.id) {
      toast({
        title: "Fel",
        description: "Du måste vara inloggad som admin",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.functions.invoke("admin-soft-delete-customer", {
        body: { customer_id: customer.id, confirm: true },
      });

      if (error) throw error;

      toast({
        title: "✓ Kund avaktiverad",
        description: `${customer.email} har avaktiverats (soft delete).`,
        variant: "default",
      });
      onDeleteSuccess();
      onOpenChange(false);
      setConfirmEmail("");
    } catch (error: any) {
      toast({
        title: "Fel vid borttagning",
        description: error.message || "Okänt fel",
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
            Avaktivera kund (GDPR)
          </DialogTitle>
          <DialogDescription>
            Denna åtgärd avaktiverar kunden via soft delete och kan återställas.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>VARNING:</strong> Kunden {customer.email} kommer att avaktiveras:
            <ul className="mt-2 ml-4 list-disc text-sm">
              <li>Portalinlogg kan blockeras</li>
              <li>Åtgärden loggas för compliance</li>
            </ul>
            <p className="mt-3">Denna åtgärd loggades för compliance.</p>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label className="font-semibold">Användarens email (bekräftelse)</Label>
            <Input
              value={customer.email}
              disabled
              className="bg-gray-100 text-gray-600 cursor-not-allowed"
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
              className={confirmEmail === customer.email ? "border-green-500" : ""}
            />
            {confirmEmail === customer.email && (
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
            {isLoading ? "Avaktiverar..." : "Avaktivera"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
