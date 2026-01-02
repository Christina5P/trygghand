// src/components/GDPRDeleteUserDialog.tsx
/**
 * Admin-gränssnitt för GDPR-borttagning av användare
 * 
 * Säkerhet:
 * - Kräver bekräftelse via email-inmatning
 * - Kräver anledning (minst 20 tecken för att förhindra oavsiktlig borttagning)
 * - Anropar server-side API (aldrig direkt från frontend)
 * - Visar varning om permanent radering
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
import { Textarea } from "@/components/ui/textarea";
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
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Null-check: Stäng om customer är null
  if (!customer) {
    return null;
  }

  // Validering: Email måste matcha + anledning minst 20 tecken
  const isConfirmed =
    confirmEmail === customer.email &&
    reason.length >= 20;

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
      // Anropa RPC med endast p_customer_id och p_reason
      const { error } = await supabase.rpc("admin_delete_customer_permanently", {
        p_customer_id: customer.id,
        p_reason: reason
      });

      if (error) throw error;

      toast({
        title: "✓ Användare raderad",
        description: `${customer.email} och all relaterad data har raderats permanent enligt GDPR.`,
        variant: "default",
      });
      onDeleteSuccess();
      onOpenChange(false);
      setConfirmEmail("");
      setReason("");
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
            Radera användare (GDPR)
          </DialogTitle>
          <DialogDescription>
            Denna åtgärd raderar användaren och ALL relaterad data permanent
            och kan INTE ångras.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>VARNING:</strong> All data för {customer.email} kommer att
            raderas permanent:
            <ul className="mt-2 ml-4 list-disc text-sm">
              <li>Ärenden och kommentarer</li>
              <li>Prenumerationer och avslut</li>
              <li>Fullmakter</li>
              <li>Kontaktuppgifter</li>
              <li>Auth-konto</li>
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

          <div>
            <Label htmlFor="reason" className="font-semibold">
              Anledning till radering (minst 20 tecken)
            </Label>
            <Textarea
              id="reason"
              placeholder="T.ex. 'Användare begärt GDPR-rättighet: rätten att bli glömd enligt artikel 17 i GDPR'"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-24 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              {reason.length}/20 tecken (minimum)
            </p>
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
            {isLoading ? "Raderar..." : "Radera permanent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
