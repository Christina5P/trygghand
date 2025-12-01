// src/pages/Portal/dialogs/CustomersDialog.tsx
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Edit } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import NewCaseForm from "../views/NewCaseForm";
import type { Customer, Case, ServiceType, Comment } from "@/types"; // Använder alias för typer


// --- Hjälpfunktioner för status ---
const getStatusColor = (status: string) => {
  switch (status) {
    case "pending": return "bg-yellow-500 text-black";
    case "in_progress": return "bg-blue-500 text-white";
    case "completed": return "bg-green-500 text-white";
    case "cancelled": return "bg-red-500 text-white";
    default: return "bg-gray-500 text-white";
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case "pending": return "Väntar";
    case "in_progress": return "Pågår";
    case "completed": return "Klar";
    case "cancelled": return "Avbruten";
    default: return status;
  }
};

interface CustomersDialogProps {
  customer: Customer | null;
  onClose: () => void;
  onCustomerUpdated: () => Promise<void> | void;
  // Lägg till de saknade propsen HÄR:
  onNewCase: (customerId: string) => void; // <--- Lägg till denna
  onOpenCase?: (c: Case) => void;   // <--- Lägg till denna
}

const CustomersDialog: React.FC<CustomersDialogProps> = ({ customer, onClose, onCustomerUpdated }) => {
  const { toast } = useToast();
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [customerCases, setCustomerCases] = useState<Case[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);

  const [isNewCaseDialogOpen, setIsNewCaseDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [caseComments, setCaseComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isFullmaktDialogOpen, setIsFullmaktDialogOpen] = useState(false); // NY state för Fullmakt


  useEffect(() => {
    setEditingCustomer(customer);
    if (customer?.id) {
      fetchCustomerCases(customer.id);
    } else {
      setCustomerCases([]);
    }
  }, [customer]);


  const fetchCustomerCases = useCallback(async (customerId: string) => {
    setLoadingCases(true);
    try {
      const { data, error } = await supabase
        .from("cases")
        .select(`*, service_type:service_type_id(name, description)`)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomerCases(data as Case[] || []);
    } catch (err) {
      console.error("Error fetching customer cases:", err);
      toast({ title: "Fel", description: "Kunde inte hämta kundens ärenden", variant: "destructive" });
      setCustomerCases([]);
    } finally {
      setLoadingCases(false);
    }
  }, [toast]);

  // Hämtar kommentarer för ett ärende, anropas från NewCaseForm
  const fetchCaseComments = useCallback(async (caseId: string) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("case_comments")
        .select(`*`) 
        .eq("case_id", caseId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setCaseComments(data as Comment[] || []);
    } catch (err) {
      console.error("Error fetching case comments:", err);
      setCaseComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingCustomer) {
      setEditingCustomer({ ...editingCustomer, [e.target.name]: e.target.value });
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("customers")
        .update({
          name: editingCustomer.name,
          email: editingCustomer.email,
          phone: editingCustomer.phone,
          personal_number: editingCustomer.personal_number,
        })
        .eq("id", editingCustomer.id);

      if (error) throw error;
      toast({ title: "Kund uppdaterad", description: "Kundinformationen har sparats." });
      await onCustomerUpdated();
    } catch (err) {
      console.error("Error updating customer:", err);
      toast({ title: "Fel", description: "Kunde inte uppdatera kund.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNewCaseForCustomer = () => {
    setEditingCase(null); // För att skapa ett nytt ärende
    setCaseComments([]); // Rensa kommentarer
    setIsNewCaseDialogOpen(true);
  };

  const handleEditCustomerCase = (caseItem: Case) => {
    setEditingCase(caseItem); // För att redigera befintligt ärende
    setIsNewCaseDialogOpen(true);
    if (caseItem.id) {
        fetchCaseComments(caseItem.id);
    }
  };

  

  const handleCaseFormClose = async () => {
    setIsNewCaseDialogOpen(false);
    setEditingCase(null);
    setCaseComments([]);
    if (customer?.id) {
      await fetchCustomerCases(customer.id); // Ladda om kundens ärenden
    }
  };

  if (!editingCustomer) return null;

  return (
    <Dialog open={!!customer} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-trust-blue">
            Kundinformation för {editingCustomer.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Namn</Label>
            <Input id="name" name="name" value={editingCustomer.name} onChange={handleInputChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">E-post</Label>
            <Input id="email" name="email" value={editingCustomer.email || ""} onChange={handleInputChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phone" className="text-right">Telefon</Label>
            <Input id="phone" name="phone" value={editingCustomer.phone || ""} onChange={handleInputChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="personal_number" className="text-right">Personnummer</Label>
            <Input id="personal_number" name="personal_number" value={editingCustomer.personal_number || ""} onChange={handleInputChange} className="col-span-3" />
          </div>

          <Button onClick={handleUpdateCustomer} disabled={loading} className="w-full bg-trust-blue hover:bg-trust-blue/90 mt-4">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Spara Kundinformation
          </Button>

          {/* Ärenden för denna kund */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Kundens Ärenden</h3>
              <Button onClick={handleOpenNewCaseForCustomer} size="sm" className="bg-trust-blue hover:bg-trust-blue/90">
                <Plus className="mr-2 h-4 w-4" /> Nytt Ärende för Kund
              </Button>
            </div>

            <Dialog open={isNewCaseDialogOpen} onOpenChange={setIsNewCaseDialogOpen}>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingCase ? "Redigera Ärende" : `Skapa Nytt Ärende för ${editingCustomer.name}`}</DialogTitle>
                </DialogHeader>
                <NewCaseForm
                  customers={[editingCustomer]} // Skickar bara den här kunden till formuläret
                  defaultCustomerId={editingCustomer.id}
                  onCaseSaved={handleCaseFormClose}
                  onCancel={handleCaseFormClose}
                  caseToEdit={editingCase}
                  caseComments={caseComments}
                  fetchCaseComments={fetchCaseComments}
                />
              </DialogContent>
            </Dialog>

            {loadingCases ? (
              <p className="text-center text-gray-500">Laddar ärenden...</p>
            ) : customerCases.length === 0 ? (
              <p className="text-center text-gray-500 py-4">Inga ärenden för denna kund.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center mt-4"> 
                        {/* Fullmakt knapp (Krav: På kundkortet ska det finnas en fullmaktknapp) */}
                        <Button 
                            onClick={() => setIsFullmaktDialogOpen(true)}
                            variant="outline"
                            className="text-gray-700 border-gray-300 hover:bg-gray-100"
                        >
                            Visa Fullmakter
                        </Button>
                        <Button onClick={handleUpdateCustomer} disabled={loading} className="bg-trust-blue hover:bg-trust-blue/90 w-1/2">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Spara Kundinformation
                        </Button>
                    </div>
                {customerCases.map((caseItem) => (
                  <div key={caseItem.id} className="border rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <div className="font-semibold">{caseItem.title}</div>
                      <p className="text-sm text-gray-600">{caseItem.service_type?.name || "Okänd tjänst"}</p>
                      <p className="text-xs text-gray-500">
                        Skapat: {caseItem.created_at ? format(new Date(caseItem.created_at), "dd MMM yyyy", { locale: sv }) : "N/A"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={`${getStatusColor(caseItem.status)} text-sm`}>
                        {getStatusText(caseItem.status)}
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => handleEditCustomerCase(caseItem)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>Stäng</Button>
        </DialogFooter>
      </DialogContent>
      {/* Inbäddad Fullmakt Dialog */}
            {isFullmaktDialogOpen && (
                <Dialog open={true} onOpenChange={setIsFullmaktDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Fullmakter för {editingCustomer.name}</DialogTitle>
                        </DialogHeader>
                        {/* HÄR ska innehållet från din FullmaktDialog.tsx ligga */}
                        <p className="text-gray-600">Här kan du se och hantera kundens uppladdade fullmakter.</p>
                        <Button onClick={() => setIsFullmaktDialogOpen(false)}>Stäng</Button>
                    </DialogContent>
                </Dialog>
            )}
    </Dialog>
  );
};

export default CustomersDialog;