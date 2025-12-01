import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogOut, X, MessageSquare } from "lucide-react";
import NewCaseForm from "./views/NewCaseForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Customer, ServiceType, ContactRequest, Subscription, Valuation, CustomerCase } from '@/types'; 
import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminData } from "@/hooks/useAdminData"; 
import { useCustomerData } from "@/hooks/useCustomerData"
import Tidio from "@/components/Tidio";
import CasesView from "./views/CasesView";
import CustomersDialog from "./dialogs/CustomersDialog";
import SubscriptionsView from "./views/SubscriptionsView";
import ContactRequestDialog from "./dialogs/ContactRequestDialog";
import ValuationManager from "@/components/ValuationManager";
import ValuationsView from "./views/ValuationsView"; 
import ValuationDetailsDialog from "./dialogs/ValuationDetailsDialog";
import { useNavigate } from "react-router-dom";

// Header and logout are handled inside the AdminPortal component via the `signOut` hook.

const CaseDetailsDialog: React.FC<{
  caseData: CustomerCase;
  onClose: () => void;
  onUpdate: () => Promise<void>;
  caseComments: Comment[];
  fetchCaseComments: (caseId: string) => Promise<void>;
}> = ({ caseData, onClose, onUpdate, caseComments, fetchCaseComments }) => {
  // Här skulle logiken för att visa och redigera ärendedata finnas
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ärende: {caseData.title}</DialogTitle>
          <DialogDescription>
            Redigera detaljer för ärende #{caseData.id}.
          </DialogDescription>
        </DialogHeader>
        <p>Visar detaljer för ärende...</p>
        <Button onClick={onClose}>Stäng</Button>
      </DialogContent>
    </Dialog>
  );
};


// --- ADMIN PORTAL PROPS ---
interface AdminPortalProps {
  customer: Customer;
 
}

// --- Status kundförfrågan ---
const getStatusBadge = (status?: string) => {
  const normalized = (status ?? '').toLowerCase().trim();
  switch(normalized){
    case 'new': case 'ny': case 'nytt': return { text: 'Ny', colorClass: 'bg-blue-500 hover:bg-blue-600 text-white' };
    case 'contacted': case 'kontaktad': 
    case 'in_progress': case 'pågående': return { text: 'Pågående', colorClass: 'bg-yellow-500 hover:bg-yellow-600 text-black' };
    case 'completed': case 'avslutat': return { text: 'Avslutat', colorClass: 'bg-green-500 hover:bg-green-600 text-white' };
    case 'converted': case 'kund': return { text: 'Kund', colorClass: 'bg-green-700 hover:bg-green-800 text-white' };
    case 'cancelled': case 'avbrutet': 
    case 'declined': case 'avböjd': return { text: 'Stängd', colorClass: 'bg-gray-600 hover:bg-gray-700 text-white' };
    default: return { text: status ?? 'Okänd', colorClass: 'bg-gray-400 hover:bg-gray-500 text-white' };
  }
};
const AdminPortal: React.FC<AdminPortalProps> = ({ customer }) => {
  const { signOut } = useAuth();
  const { toast } = useToast();

  const {
    cases = [],
    subscriptions = [],
    valuations = [],
    customers = [],
    contactRequests = [],
    loading,
    fetchAll,
    fetchValuations,   // <-- lägg till dessa två
  } = useAdminData();


  // MODAL STATE
  const [mainTab, setMainTab] = useState<
    "cases" | "subscriptions" | "valuations" | "customers" | "contact_requests" | "new" | "saved"
  >("cases");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactRequest | null>(null);
  const [selectedCase, setSelectedCase] = useState<CustomerCase | null>(null);
  const [selectedValuation, setSelectedValuation] = useState<Valuation | null>(null);

  const [isNewCaseModalOpen, setIsNewCaseModalOpen] = useState(false);
  const [newCaseCustomerId, setNewCaseCustomerId] = useState<string | undefined>(undefined);
  

  // Kommentarer för det valda ärendet
  const [caseComments, setCaseComments] = useState<Comment[]>([]);
  const [loadingCaseComments, setLoadingCaseComments] = useState(false);

  const fetchCaseComments = async (caseId: string) => {
    setLoadingCaseComments(true);
    try {
      const { data, error } = await supabase
        .from("case_comments")
        .select("*, author:customers(name)")
        .eq("case_id", caseId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setCaseComments((data as Comment[]) || []);
    } catch (err) {
      console.error("Could not fetch case comments:", err);
      setCaseComments([]);
    } finally {
      setLoadingCaseComments(false);
    }
  };

  // När ett ärende väljs, hämta kommentarer
  useEffect(() => {
    if (selectedCase?.id) fetchCaseComments(selectedCase.id);
  }, [selectedCase]);

  // --- ÅTGÄRDSLOGIK ---

  const handleOpenCustomerDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const handleOpenContactDialog = (contact: ContactRequest) => {
    setSelectedContact(contact);
  };

  const handleOpenValuationDialog = (valuation: Valuation) => {
    setSelectedValuation(valuation);
  };

  const handleDeleteValuation = async (id: string) => {
    const { error } = await supabase
      .from("valuations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      toast({
        title: "Fel",
        description: "Kunde inte ta bort värdering.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Raderad",
      description: "Värdering borttagen.",
    });

    // uppdatera listan
    await fetchValuations();
  };

  const fetchData = async () => {
    await fetchAll();
  };

  // ... dina övriga callbacks: handleConvertContactToCustomer, handleNewCaseFromCustomerDialog, osv.
  // se till att de ligger INNAN "if (loading)" och det sista return.

  const contactRequestList = useMemo(() => {
  return contactRequests
    .filter((c) => c.status === "new" || c.status === "in_progress")
    .map((contact) => {
      const badge = getStatusBadge(contact.status);
      return (
        <div
          key={contact.id}
          className="flex justify-between items-center p-4 bg-white border rounded-lg shadow-sm hover:shadow-md cursor-pointer transition"
          onClick={() => handleOpenContactDialog(contact)}
        >
          <div className="min-w-0 pr-4">
            <p className="text-base font-semibold truncate">{contact.name}</p>
            <p className="text-sm text-gray-500 truncate">{contact.email}</p>
          </div>
          <Badge className={badge.colorClass}>{badge.text}</Badge>
        </div>
      );
    });
}, [contactRequests]);


  const customerList = useMemo(() => {
    return customers.map((c) => (
      <div
        key={c.id}
        className="flex justify-between items-center p-4 bg-white border rounded-lg shadow-sm hover:shadow-md cursor-pointer transition"
        onClick={() => handleOpenCustomerDialog(c)}
      >
        <div className="min-w-0 pr-4">
          <p className="text-base font-semibold truncate">{c.name}</p>
          <p className="text-sm text-gray-500 truncate">{c.email}</p>
        </div>
        <Badge variant="secondary" className="bg-gray-200 text-gray-800">
          Kund
        </Badge>
      </div>
    ));
  }, [customers]);

// Funktion för att konvertera kontaktförfrågan till en kund
const handleConvertContactToCustomer = useCallback(async (contact: ContactRequest) => {
  // ERSÄTT 'window.confirm' med en custom modal/dialog för att följa strikta riktlinjer
  // För detta exempel använder vi alert/confirm för att vara runnable, men det bör ersättas.
  if (!window.confirm(`Är du säker på att du vill konvertera ${contact.name} till en ny kund?`)) return;

  setSelectedContact(null);
  
  try {
    // 1. Skapa en ny kund i databasen
    const newCustomerPayload = {
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      personal_number: null,
    };

    const { data: newCustomer, error: customerError } = await supabase
      .from("customers")
      .insert([newCustomerPayload])
      .select()
      .single();

    if (customerError) throw customerError;

    // 2. Uppdatera status på kontaktförfrågan till ett värde som DB tillåter
    const { error: updateError } = await supabase
      .from("contact_requests")
      .update({
        status: "completed", // <- ändrad från 'converted'
        admin_notes: `KONVERTERAD TILL KUND (ID: ${newCustomer.id}). Föregående anteckningar: ${
          contact.admin_notes || ""
        }`,
      })
      .eq("id", contact.id);

    if (updateError) throw updateError;

    toast({
      title: "Konverterad!",
      description: `${contact.name} är nu registrerad som kund.`,
    });

    // 3. Ladda om all admin data för att uppdatera listorna
    await fetchData();

      // 4. Öppna den nya kundens dialog för snabb åtkomst/skapande av ärende
      setSelectedCustomer(newCustomer as Customer);

    } catch (err: any) {
      console.error("Konvertering misslyckades:", err);
      toast({ title: "Fel vid konvertering", description: err.message, variant: "destructive" });
    }
  }, [fetchData, toast]);

  // Funktion för att skapa nytt ärende (öppnar NewCaseForm)
  const handleNewCaseFromCustomerDialog = (customerId: string) => {
    setNewCaseCustomerId(customerId);
    setIsNewCaseModalOpen(true);
  };
  
  // Funktion för att öppna ett befintligt ärende
  // KORRIGERING: Använder CustomerCase istället för Case
  const handleOpenCaseFromCustomerDialog = (c: CustomerCase) => {
    setSelectedCase(c);
    setSelectedCustomer(null); // Stäng kunddialogen när ärendet öppnas
  };
  
  if (loading) {
      return <div className="min-h-screen bg-gray-50 p-8 text-center">Laddar adminportal...</div>;
  }

  return (

    
      <div className="min-h-screen bg-gray-50">
          <Tidio />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

             {/* Visa värderings-översikt ovanför tabbarna */}
             <div className="mb-6">
               <ValuationManager valuations={valuations} onDataUpdated={fetchData} />
             </div>
              <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)} className="space-y-6">
                  <TabsList className="w-full bg-white shadow-md rounded-lg p-1 flex flex-wrap gap-1">
                      <TabsTrigger className="w-1/3 sm:flex-1 sm:basis-0 min-w-0 text-center px-2 py-2 text-sm sm:text-base overflow-hidden whitespace-nowrap text-ellipsis" value="cases">
                          Ärenden ({cases.length})
                      </TabsTrigger>
                      {/* LÄGG TILL: Abonnemang */}
                      <TabsTrigger className="w-1/3 sm:flex-1 sm:basis-0 min-w-0 text-center px-2 py-2 text-sm sm:text-base overflow-hidden whitespace-nowrap text-ellipsis" value="subscriptions">
                          Abonnemang ({subscriptions.length})
                      </TabsTrigger>
                      {/* LÄGG TILL: Värderingar */}
                      <TabsTrigger className="w-1/3 sm:flex-1 sm:basis-0 min-w-0 text-center px-2 py-2 text-sm sm:text-base overflow-hidden whitespace-nowrap text-ellipsis" value="valuations">
                          Värderingar ({valuations.length})
                      </TabsTrigger>
                      <TabsTrigger className="w-1/3 sm:flex-1 sm:basis-0 min-w-0 text-center px-2 py-2 text-sm sm:text-base overflow-hidden whitespace-nowrap text-ellipsis" value="customers">
                          Kunder ({customers.length})
                      </TabsTrigger>
                      <TabsTrigger className="w-1/3 sm:flex-1 sm:basis-0 min-w-0 text-center px-2 py-2 text-sm sm:text-base overflow-hidden whitespace-nowrap text-ellipsis" value="contact_requests">
                          Kontakt ({contactRequests.length})
                      </TabsTrigger>
                  </TabsList>

          {/* Ärenden */}
                  <TabsContent value="cases">
    <CasesView 
        cases={cases} 
        customers={customers} 
        
        // NY RAD SOM MÅSTE LÄGGAS TILL:
        onDataUpdated={fetchData} 
    />
</TabsContent>

          {/* Abonnemang */}
          <TabsContent value="subscriptions">
    <SubscriptionsView subscriptions={subscriptions} onDataUpdated={fetchData} />
</TabsContent>

          {/* NY FLIK: Värderingar (visar den nya ValuationsView-komponenten) */}
          <TabsContent value="valuations">
            {/* SKICKAR MED DEN NYA FUNKTIONEN */}
            <ValuationsView 
              valuations={valuations} 
              onDataUpdated={fetchData} 
              customers={customers} 
              onOpenDetails={handleOpenValuationDialog}
              onDelete={handleDeleteValuation} // NYTT PROP
            />
          </TabsContent>
          
          {/* Kunder */}
                  <TabsContent value="customers">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {customerList}
                      </div>
                  </TabsContent>

          {/* Kontaktförfrågningar */}
                  <TabsContent value="contact_requests">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {contactRequestList}
                      </div>
                  </TabsContent>
              </Tabs>
          </div>
    
          {/* 1. Kunddialog (CustomersDialog) */}
          {selectedCustomer && (
              <CustomersDialog
                customer={selectedCustomer!}
                onClose={() => setSelectedCustomer(null)}
                onCustomerUpdated={fetchData} 
                onNewCase={handleNewCaseFromCustomerDialog} 
                //onOpenCase={handleOpenCaseFromCustomerDialog} 
              />
          )}
          
          {/* 3. Värderingslista (ValuationDetailsDialog) */}
            {selectedValuation && (
            <ValuationDetailsDialog
              valuation={selectedValuation}
              customers={customers}
              open={true}
              onClose={() => setSelectedValuation(null)}
            />
          )}

          {/* 2. Kontaktförfrågandialog (ContactRequestDialog) */}
          {selectedContact && (
              <ContactRequestDialog
                contact={selectedContact!}
                onClose={() => setSelectedContact(null)}
                onUpdate={fetchData} 
                onConvert={handleConvertContactToCustomer} 
              />
          )}
          
          {/* 3. Skapa nytt ärende (NewCaseForm) */}
          {isNewCaseModalOpen && (
              <NewCaseForm
                  customers={customers} 
                  defaultCustomerId={newCaseCustomerId} 
                  onCancel={() => { setIsNewCaseModalOpen(false); setNewCaseCustomerId(undefined); }} 
                  onCaseSaved={fetchData} 
              />
          )}
          
         </div>
 
  );
};

export default AdminPortal;