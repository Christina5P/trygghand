import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface ContactRequestDialogProps {
  contact: {
    id: string;
    name: string;
    email: string;
    message: string;
    status: string;
  };
  onClose: () => void;
  onUpdate?: () => void;
}

const ContactRequestDialog: React.FC<ContactRequestDialogProps> = ({ contact, onClose, onUpdate }) => {
  const { toast } = useToast();
  const [status, setStatus] = useState(contact.status);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("contact_requests")
        .update({ status, admin_notes: notes })
        .eq("id", contact.id);
      if (error) throw error;
      toast({ title: "Uppdaterad", description: "Kontaktförfrågan uppdaterad." });
      if (onUpdate) onUpdate();
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kontaktförfrågan</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <p><strong>Namn:</strong> {contact.name}</p>
          <p><strong>Email:</strong> {contact.email}</p>
          <p><strong>Meddelande:</strong> {contact.message}</p>
          <label className="block">
            Status:
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full mt-1 border rounded px-2 py-1">
              <option value="new">Ny</option>
              <option value="contacted">Kontaktad</option>
              <option value="quoted">Offert</option>
              <option value="converted">Konverterad</option>
              <option value="closed">Stängd</option>
            </select>
          </label>
          <label className="block">
            Anteckningar:
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full mt-1 border rounded px-2 py-1"
            />
          </label>
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={onClose}>Avbryt</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Sparar..." : "Spara"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactRequestDialog;
