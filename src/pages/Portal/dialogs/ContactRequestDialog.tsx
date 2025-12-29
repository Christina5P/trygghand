import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
          status: editingContact.status,
          updated_at: new Date().toISOString(),
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
            <Label htmlFor="status">Status</Label>
            <Select
              value={editingContact.status || "new"}
              onValueChange={(value) => setEditingContact((prev) => ({ ...prev, status: value as ContactRequest['status'] }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Välj status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Ny</SelectItem>
                <SelectItem value="contacted">Kontaktad</SelectItem>
                <SelectItem value="closed">Avbruten</SelectItem>
              </SelectContent>
            </Select>
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
            disabled={isConverting}
            className="bg-trust-green hover:bg-trust-green/90"
          >
            {isConverting
              ? "Konverterar..."
              : "Konvertera till Kund"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContactRequestDialog;
