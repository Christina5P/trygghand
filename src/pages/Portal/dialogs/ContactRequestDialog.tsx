import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { ContactRequest } from '@/types'; 

type ContactRequestDialogProps = {
  contact: ContactRequest;
  onClose: () => void;
  onUpdate?: () => Promise<void>;
  onConvert?: (contact: ContactRequest) => Promise<void>;
};

const ContactRequestDialog: React.FC<ContactRequestDialogProps> = ({ contact, onClose, onUpdate, onConvert }) => {
  const { toast } = useToast();
  // default to DB-canonical "new" when missing
  const [status, setStatus] = useState<string>(contact.status ?? "new");
  const [notes, setNotes] = useState(contact.admin_notes ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("contact_requests")
        .update({ status, admin_notes: notes })
        .eq("id", contact.id);

      if (error) throw error;

      toast({ title: "Uppdaterad", description: "Kontaktförfrågan uppdaterades." });
      if (onUpdate) onUpdate();
      onClose();
    } catch (err) {
      console.error(err);
      toast({ title: "Fel", description: "Kunde inte uppdatera kontaktförfrågan.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleConvert = async () => {
    if (!onConvert) return;
    await onConvert(contact);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kontaktförfrågan</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm text-gray-700 space-y-1">
            <p><strong>Namn:</strong> {contact.name}</p>
            <p><strong>Email:</strong> {contact.email}</p>
            {contact.phone && <p><strong>Telefon:</strong> {contact.phone}</p>}
            {contact.company && <p><strong>Företag:</strong> {contact.company}</p>}
            {contact.address && <p><strong>Adress:</strong> {contact.address}</p>}
            {contact.city && <p><strong>Stad:</strong> {contact.city}</p>}
            {contact.postal_code && <p><strong>Postnummer:</strong> {contact.postal_code}</p>}
            {contact.service_type && <p><strong>Tjänst:</strong> {contact.service_type}</p>}
            <p><strong>Meddelande:</strong></p>
            <p className="whitespace-pre-wrap bg-gray-50 p-2 rounded">{contact.message}</p>
            {contact.created_at && (
              <p className="text-xs text-gray-500 mt-2">
                Skickad: {new Date(contact.created_at).toLocaleString("sv-SE")}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            {/* Values must match DB constraint; labels shown in Swedish */}
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              <option value="new">Ny</option>
              <option value="in_progress">Kontaktad / Pågående</option>
              <option value="completed">Avslutad</option>
              <option value="cancelled">Stängd</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Anteckningar (intern)</label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Skriv interna anteckningar här..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex gap-2 justify-end pt-3">
            {typeof onConvert === "function" && (
              <Button
                variant="outline"
                onClick={handleConvert}
              >
                Konvertera till kund
              </Button>
            )}
            <Button onClick={handleSave} disabled={saving}>{saving ? "Sparar..." : "Spara"}</Button>
            <Button variant="ghost" onClick={onClose}>Stäng</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactRequestDialog;
