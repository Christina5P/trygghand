import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { ContactRequest } from '@/types'; 

interface ContactRequestDialogProps {
  contact: ContactRequest;
  onClose: () => void;
  onUpdate: () => void;
  onConvert: (contact: ContactRequest) => Promise<void>;
}

const ContactRequestDialog: React.FC<ContactRequestDialogProps> = ({
  contact,
  onClose,
  onUpdate,
  onConvert,
}) => {
  // Kombinera namn om det saknas i contact.name
  const initialName = useMemo(() => {
    if (contact.name && contact.name.trim()) return contact.name;
    const fn = contact.firstname || "";
    const ln = contact.lastname || "";
    return `${fn} ${ln}`.trim();
  }, [contact]);

  const [editingContact, setEditingContact] = useState({
    ...contact,
    name: contact.name && contact.name.trim() ? contact.name : initialName,
  });
  const [isConverting, setIsConverting] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditingContact((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    // Mandatory: name och phone
    if (!editingContact.name || !editingContact.name.trim()) {
      toast({ title: "Fel", description: "Namn är obligatoriskt.", variant: "destructive" });
      return false;
    }
    if (!editingContact.phone || !editingContact.phone.trim()) {
      toast({ title: "Fel", description: "Telefonnummer är obligatoriskt.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSaveChanges = async () => {
    if (!validateForm()) return;
    
    try {
      const { error } = await supabase
        .from("contact_requests")
        .update({
          name: editingContact.name,
          phone: editingContact.phone,
          email: editingContact.email || null,
          message: editingContact.message,
        })
        .eq("id", editingContact.id);

      if (error) throw error;
      toast({ title: "Uppdaterad", description: "Kontaktförfrågan sparad." });
      onUpdate();
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      toast({ title: "Fel", description: "Kunde inte spara ändringar.", variant: "destructive" });
    }
  };

  const handleConvert = async () => {
    if (!validateForm()) return;
    setIsConverting(true);
    try {
      await onConvert(editingContact);
    } finally {
      setIsConverting(false);
      onClose();
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Kontaktförfrågan
            {editingContact.status === "converted" && (
              <span className="ml-2 px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold align-middle">
                Konverterad till kund
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Namn (Mandatory) */}
          <div>
            <Label htmlFor="name">Namn *</Label>
            <Input
              id="name"
              name="name"
              value={editingContact.name || ""}
              onChange={handleInputChange}
              placeholder="Ange namn"
              required
            />
          </div>

          {/* Telefon (Mandatory) */}
          <div>
            <Label htmlFor="phone">Telefon *</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={editingContact.phone || ""}
              onChange={handleInputChange}
              placeholder="Ange telefonnummer"
              required
            />
          </div>

          {/* E-post (Valfritt) */}
          <div>
            <Label htmlFor="email">E-post (valfritt)</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={editingContact.email || ""}
              onChange={handleInputChange}
              placeholder="E-postadress (valfritt)"
            />
          </div>

          {/* Meddelande */}
          <div>
            <Label htmlFor="message">Meddelande</Label>
            <Textarea
              id="message"
              name="message"
              value={editingContact.message || ""}
              onChange={handleInputChange}
              placeholder="Beskrivning av tjänstintresse"
              rows={3}
            />
          </div>

          {/* Status */}
          <div>
            <Label>Status</Label>
            <p className={`text-sm ${editingContact.status === "converted" ? "text-green-700 font-semibold" : "text-gray-500"}`}>
              {editingContact.status === "converted" ? "Konverterad till kund" : editingContact.status}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Avbryt
          </Button>
          <Button onClick={handleSaveChanges} className="bg-trust-blue hover:bg-trust-blue/90">
            Spara
          </Button>
          <Button
            onClick={handleConvert}
            disabled={isConverting || editingContact.status === "converted"}
            className="bg-trust-green hover:bg-trust-green/90"
          >
            {editingContact.status === "converted"
              ? "Redan konverterad"
              : isConverting
                ? "Konverterar..."
                : "Konvertera till Kund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContactRequestDialog;
