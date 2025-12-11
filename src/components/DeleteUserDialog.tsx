// src/components/DeleteUserDialog.tsx
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
import { deleteUserGDPR } from "@/lib/gdpr";
import { AlertCircle } from "lucide-react";

interface DeleteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  onDeleteSuccess: () => void;
}

export function DeleteUserDialog({
  open,
  onOpenChange,
  userId,
  userEmail,
  onDeleteSuccess,
}: DeleteUserDialogProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const isConfirmed = confirmEmail === userEmail && reason.length > 10;

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const result = await deleteUserGDPR(userId, reason);

      if (result.success) {
        toast({
          title: "Användare raderad",
          description: `${userEmail} och all relaterad data har raderats (GDPR-compliant).`,
          variant: "default",
        });
        onDeleteSuccess();
        onOpenChange(false);
      } else {
        toast({
          title: "Fel vid borttagning",
          description: result.error || "Okänt fel",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Fel",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Radera användare (GDPR)</DialogTitle>
          <DialogDescription>
            Detta raderar användaren och ALL relaterad data permanent.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>OBS!</strong> Denna åtgärd kan INTE ångras. All data raderas
            permanent.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div>
            <Label>Användaremail att radera</Label>
            <Input
              value={userEmail}
              disabled
              className="bg-gray-100"
            />
          </div>

          <div>
            <Label>Bekräfta email (skriv in for att konfirmera)</Label>
            <Input
              placeholder="Skriv in emailadressen här"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
            />
          </div>

          <div>
            <Label>Anledning till borttagning (minst 10 tecken)</Label>
            <Textarea
              placeholder="T.ex. 'Användare begärt GDPR-rättighet: rätten att bli glömd'"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-20"
            />
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
          >
            {isLoading ? "Raderar..." : "Radera permanent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
