import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { ContactRequest } from "./AdminPortal";
import { useToast } from "@/hooks/use-toast";

interface ContactRequestDialogProps {
  request: ContactRequest;
  onClose: () => void;
  onUpdated: () => void;
}

const statusOptions = ["new", "contacted", "quoted", "converted", "closed"];

const ContactRequestDialog: React.FC<ContactRequestDialogProps> = ({ request, onClose, onUpdated }) => {
  const { toast } = useToast();
  const [status, setStatus] = useState(request.status);
  const [adminNotes, setAdminNotes] = useState(request.admin_notes ?? "");
  const [saving, setSaving] = useState(false);

  const saveChanges = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("contact_requests")
        .update({ status, admin_notes: adminNotes })
        .eq("id", request.id);
      if (error) throw error;
      toast({ title: "Uppdaterad", description: "Kontaktförfrågan uppdaterad." });
      onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: "Fel", description: "Kunde inte uppdatera.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kontaktförfrågan: {request.name}</DialogTitle>
          <DialogDescription>
            E-post: {request.email} <br />
            Skapad: {request.created_at ? new Date(request.created_at).toLocaleString("sv-SE") : "-"}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Meddelande</label>
            <Textarea value={request.message} readOnly className="bg-gray-100" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border rounded px-2 py-1"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Admin-anteckningar</label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Skriv anteckningar..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>Avbryt</Button>
            <Button onClick={saveChanges} disabled={saving}>
              {saving ? "Sparar..." : "Spara"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactRequestDialog;
