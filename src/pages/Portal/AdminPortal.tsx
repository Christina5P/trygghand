//src/pages/Portal/AdminPortal.tsx

import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import NewCaseForm from "./views/NewCaseForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter, // <- add this
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Customer, ServiceType, ContactRequest, Subscription, Valuation, CustomerCase, Comment } from '@/types'; 
import React, { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
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
import { FullmaktManagement } from "./views/FullmaktManagement";
import { useNavigate } from "react-router-dom";


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
  // ...existing props...
  isNewCaseModalOpen?: boolean;
  setIsNewCaseModalOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  templatesOpen?: boolean;
  setTemplatesOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}
 
// --- STATUS DEFINITIONS (ENSTÄLLT STÄLLE FÖR KODER, ETIKETTER OCH FÄRGER) ---
const STATUS_DEFINITIONS: { code: string; label: string; colorClass: string }[] = [
  { code: "new", label: "Ny", colorClass: "bg-yellow-100 text-yellow-800" },
  { code: "pending", label: "Väntar", colorClass: "bg-yellow-100 text-yellow-800" },
  { code: "in_progress", label: "Pågår", colorClass: "bg-blue-100 text-blue-800" },
  { code: "completed", label: "Avslutat", colorClass: "bg-green-100 text-green-800" },
  { code: "cancelled", label: "Avbruten", colorClass: "bg-red-100 text-red-800" },
  { code: "declined", label: "Avböjd", colorClass: "bg-red-100 text-red-800" },
  { code: "converted", label: "Kund", colorClass: "bg-indigo-100 text-indigo-800" },
];

const normalizeStatus = (s?: string) => (s ?? "okand").toLowerCase().trim();

const statusLabel = (code: string) => {
  if (code === "all") return "Alla";
  const def = STATUS_DEFINITIONS.find((d) => d.code === code);
  return def ? def.label : (code.charAt(0).toUpperCase() + code.slice(1));
};

const getStatusBadge = (status?: string) => {
  const code = normalizeStatus(status);
  const def = STATUS_DEFINITIONS.find((d) => d.code === code);
  if (def) return { text: def.label, colorClass: def.colorClass };
  return { text: status ?? "Okänd", colorClass: "bg-gray-400 text-white" };
};

// statusLabelMap removed — använd statusLabel(code) från STATUS_DEFINITIONS

const AdminPortal: React.FC<AdminPortalProps> = ({
  customer,
  // ...existing props...
  templatesOpen,
  setTemplatesOpen,
  isNewCaseModalOpen = false,
  setIsNewCaseModalOpen = () => {},
}) => {
   const { signOut } = useAuth();
   const { toast } = useToast();

  // Lokal fallback om parent inte skickar ned kontroll för templates-dialogen
  const [localTemplatesOpen, setLocalTemplatesOpen] = useState(false);
  const templatesDialogOpen = templatesOpen ?? localTemplatesOpen;
  const setTemplatesDialogOpen = setTemplatesOpen ?? setLocalTemplatesOpen;
 
  const {
    cases = [],
    subscriptions = [],
    valuations = [],
    customers = [],
    contactRequests = [],
    loading,
    fetchAll,
    fetchValuations,   
  } = useAdminData();


  // MODAL STATE
  const [mainTab, setMainTab] = useState<
    "cases" | "subscriptions" | "valuations" | "customers" | "contact_requests" | "new" | "saved"
  >("cases");
  // Statusfilter för ärenden — använder normalizeStatus + STATUS_DEFINITIONS
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const statusOptions = useMemo(() => {
    const opts = Array.from(new Set((cases || []).map((c) => normalizeStatus(c.status))));
    // behåll ordning enligt STATUS_DEFINITIONS där möjligt
    const ordered = STATUS_DEFINITIONS.map((d) => d.code).filter((c) => opts.includes(c));
    // lägg till övriga okända koder sist
    const rest = opts.filter((o) => !ordered.includes(o));
    return ["all", ...ordered, ...rest];
  }, [cases]);

  const filteredCases = useMemo(() => {
    if (statusFilter === "all") return cases;
    return (cases || []).filter((c) => normalizeStatus(c.status) === statusFilter);
  }, [cases, statusFilter]);

  // Fullmakt templates (previously undefined) and helper to open/download them
  type FullmaktTemplate = { id: string; name: string; storage_path: string };
  const [fullmaktTemplates, setFullmaktTemplates] = useState<FullmaktTemplate[] | null>(null);

  const handleDownloadTemplate = async (storagePath: string) => {
    try {
      // Attempt to open the provided path; if it's not an absolute URL it will open relative to the app.
      const url = storagePath.startsWith("http") ? storagePath : storagePath;
      window.open(url, "_blank");
    } catch (err) {
      console.error("Failed to open template:", err);
      toast({ title: "Fel", description: "Kunde inte öppna mallen.", variant: "destructive" });
    }
  };
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactRequest | null>(null);
  const [selectedCase, setSelectedCase] = useState<CustomerCase | null>(null);
  const [selectedValuation, setSelectedValuation] = useState<Valuation | null>(null);

  // ID för kund som används när ett nytt ärende skapas från kunddialogen
  const [newCaseCustomerId, setNewCaseCustomerId] = useState<string | undefined>(undefined);

  // Use: setIsNewCaseModalOpen(true) to open, setIsNewCaseModalOpen(false) to close
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

  const activeContactCount = useMemo(() => {
    
    return contactRequests.filter(
        (c) => c.status === "new" || c.status === "in_progress"
    ).length;
}, [contactRequests]);

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
        status: "completed", 
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
  
 {/* NY DIALOG FÖR FULLMAKTSMALLAR & ADMIN ARKIV */} 
const [isGeneralFullmaktDialogOpen, setIsGeneralFullmaktDialogOpen] = useState(false);

// ... i din render-funktion:
<Button onClick={() => setIsGeneralFullmaktDialogOpen(true)}>
    <FileText className="mr-2 h-4 w-4" /> Hantera Fullmaktsmallar & Admin Arkiv
</Button>

{isGeneralFullmaktDialogOpen && (
    <Dialog open={true} onOpenChange={setIsGeneralFullmaktDialogOpen}>
        <FullmaktManagement onClose={() => setIsGeneralFullmaktDialogOpen(false)} />
    </Dialog>
)}

  return (

    
      <div className="min-h-screen bg-gray-50">
          <Tidio />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
       
<div className="w-full bg-gradient-to-r from-blue-50 to-white border-t border-blue-100">
  <div className="max-w-6xl mx-auto px-4 py-2 text-sm text-gray-600">
    Tips: Använd våra färdiga mallar för snabbare hantering — klicka på "Hämta fullmaktsmallar".
  </div>
</div>

<div className="max-w-6xl mx-auto px-4 py-4 flex justify-center">
  <Button
    onClick={() => setTemplatesDialogOpen(true)}
    className="bg-gradient-to-r from-trust-blue to-blue-500 text-white px-4 py-2 rounded-full shadow-md hover:scale-102 transform transition"
  >
    <FileText className="w-4 h-4 mr-2" />
    Hämta fullmaktsmallar
  </Button>
</div>
 
 {/* Templates dialog */}
  <Dialog open={templatesDialogOpen} onOpenChange={setTemplatesDialogOpen}>
   <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
     <DialogHeader>
       <DialogTitle>Fullmaktsmallar</DialogTitle>
     </DialogHeader>
     <div className="p-4 space-y-4">
       <p className="text-sm text-gray-600">Välj en mall för att ladda ner. Mallarna öppnas i ny flik.</p>
       <div className="grid grid-cols-1 gap-3">
         {(fullmaktTemplates && fullmaktTemplates.length ? fullmaktTemplates : [
           { id: "1", name: "Fullmakt - Enkel mall (PDF)", storage_path: "templates/fullmaktenkel.pdf" }
         ]).map(t => (
           <div key={t.id} className="bg-white p-3 rounded shadow flex items-center justify-between">
             <div>
               <div className="font-medium">{t.name}</div>
               <div className="text-xs text-gray-500">{t.storage_path}</div>
             </div>
             <div className="flex gap-2">
               <Button size="sm" variant="ghost" onClick={() => handleDownloadTemplate?.(t.storage_path)}>Förhandsgranska</Button>
               <Button size="sm" onClick={() => handleDownloadTemplate?.(t.storage_path)}>Hämta</Button>
             </div>
           </div>
         ))}
       </div>
     </div>
     <DialogFooter>
      <Button variant="secondary" onClick={() => setTemplatesDialogOpen(false)}>Stäng</Button>
     </DialogFooter>
   </DialogContent>
 </Dialog>
 
             {/* Visa värderings-översikt ovanför tabbarna */}
             <div className="mb-6">
               <ValuationManager valuations={valuations} onDataUpdated={fetchData} />
             </div>

              <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)} className="space-y-6">
                  <TabsList className="w-full bg-white shadow-md rounded-lg p-1 flex flex-wrap gap-1">
                      <TabsTrigger className="w-1/3 sm:flex-1 sm:basis-0 min-w-0 text-center px-2 py-2 text-sm sm:text-base overflow-hidden whitespace-nowrap text-ellipsis" value="cases">
                          Ärenden ({cases.length})
                      </TabsTrigger>
                      {/* Abonnemang */}
                      <TabsTrigger className="w-1/3 sm:flex-1 sm:basis-0 min-w-0 text-center px-2 py-2 text-sm sm:text-base overflow-hidden whitespace-nowrap text-ellipsis" value="subscriptions">
                          Abonnemang ({subscriptions.length})
                      </TabsTrigger>
                      {/* Värderingar */}
                      <TabsTrigger className="w-1/3 sm:flex-1 sm:basis-0 min-w-0 text-center px-2 py-2 text-sm sm:text-base overflow-hidden whitespace-nowrap text-ellipsis" value="valuations">
                          Värderingar ({valuations.length})
                      </TabsTrigger>
                      <TabsTrigger className="w-1/3 sm:flex-1 sm:basis-0 min-w-0 text-center px-2 py-2 text-sm sm:text-base overflow-hidden whitespace-nowrap text-ellipsis" value="customers">
                          Kunder ({customers.length})
                      </TabsTrigger>
                      <TabsTrigger className="w-1/3 sm:flex-1 sm:basis-0 min-w-0 text-center px-2 py-2 text-sm sm:text-base overflow-hidden whitespace-nowrap text-ellipsis" value="contact_requests">
                          Kontakt ({activeContactCount})
                      </TabsTrigger>
                  </TabsList>
           

          {/* Ärenden */}
                  <TabsContent value="cases">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div className="text-sm text-gray-600">Filtrera ärenden:</div>
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{statusLabel("all")}</SelectItem>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <CasesView
              cases={filteredCases}
              customers={customers}
              onDataUpdated={fetchData}
             onOpenCase={(c) => setSelectedCase(c)}
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
                onOpenCase={selectedCase ? () => {} : undefined }
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

          {/* 2. Kontaktförfrågnandialog (ContactRequestDialog) */}
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
 
          {isGeneralFullmaktDialogOpen && (
 
              <Dialog open={true} onOpenChange={setIsGeneralFullmaktDialogOpen}>
 
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
 
                      <FullmaktManagement onClose={() => setIsGeneralFullmaktDialogOpen(false)} />
 
                  </DialogContent>
 
              </Dialog>
 
          )}
 
          </div>
 
  );
};
 
export default AdminPortal;