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
import SubscriptionCancellationsView from "./views/SubscriptionCancellationsView";
import ContactRequestDialog from "./dialogs/ContactRequestDialog";
import ValuationManager from "@/components/ValuationManager";
import ValuationsView from "./views/ValuationsView"; 
import ValuationDetailsDialog from "./dialogs/ValuationDetailsDialog";
import { FullmaktManagement } from "./views/FullmaktManagement";
import CustomerManagement from "./views/CustomerManagement";
import ArchivedCustomersList from "./views/ArchivedCustomersList";
import CreateCustomerForm from "@/components/CreateCustomerForm";
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
  customer?: Customer;
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
    cancellations = [],
    loading,
    fetchAll,
    fetchValuations,   
  } = useAdminData();


  // MODAL STATE
  const [mainTab, setMainTab] = useState<
    "cases" | "subscriptions" | "valuations" | "customers" | "contact_requests" | "customer_management" | "new" | "saved"
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
  const FULLMAKT_BUCKET = "fullmakts-filer";

  const handleDownloadTemplate = async (storagePath: string) => {
    try {
      // Öppna externa länkar direkt
      if (/^https?:\/\//i.test(storagePath)) {
        window.open(storagePath, "_blank");
        return;
      }

      // Generera signerad URL från rätt bucket
      const { data, error } = await supabase.storage
        .from(FULLMAKT_BUCKET)
        .createSignedUrl(storagePath, 3600);

      if (error) throw error;

      const url = (data as any)?.signedUrl || (data as any)?.signed_url;
      if (!url) throw new Error("Ingen signerad URL genererades");

      window.open(url, "_blank");
    } catch (err: any) {
      console.error("Failed to open template:", err);
      toast({ title: "Fel", description: err.message || "Kunde inte öppna mallen.", variant: "destructive" });
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
    // Räkna INTE converted kontakter
    return contactRequests.filter(
        (c) => c.status !== "converted" && (c.status === "new" || c.status === "in_progress")
    ).length;
}, [contactRequests]);

   const contactRequestList = useMemo(() => {
    return contactRequests
    .filter((c) => c.status !== "converted" && (c.status === "new" || c.status === "in_progress"))
    .map((contact) => {
      const badge = getStatusBadge(contact.status);
      // Förbättrad namnlogik
      const displayName =
        contact.name && contact.name.trim()
          ? contact.name
          : `${contact.firstname || ""} ${contact.lastname || ""}`.trim() || "Namnlös";
      return (
        <div
          key={contact.id}
          className="flex justify-between items-center p-4 bg-white border rounded-lg shadow-sm hover:shadow-md cursor-pointer transition"
          onClick={() => handleOpenContactDialog(contact)}
        >
          <div className="min-w-0 pr-4">
            <p className="text-base font-semibold truncate">{displayName}</p>
            <p className="text-sm text-gray-500 truncate">{contact.email}</p>
          </div>
          <Badge className={badge.colorClass}>
            {badge.text}
            {contact.status === "converted" && (
              <span className="ml-2 px-2 py-0.5 rounded bg-green-100 text-green-700 text-xs font-semibold">Kund</span>
            )}
          </Badge>
        </div>
      );
    });
}, [contactRequests]);

// Funktion för att konvertera kontaktförfrågan till en kund
const handleConvertContactToCustomer = useCallback(async (contact: ContactRequest) => {
  // Kombinera firstname och lastname om name inte finns
  const fullName = contact.name || `${(contact as any).firstname || ''} ${(contact as any).lastname || ''}`.trim();
  
  if (!fullName) {
    toast({ title: "Fel", description: "Kontaktförfrågan saknar namn.", variant: "destructive" });
    return;
  }
  
  if (!contact.email || !contact.email.trim()) {
    toast({ title: "Fel", description: "Kontaktförfrågan saknar e-postadress.", variant: "destructive" });
    return;
  }
  
  if (!window.confirm(`Konvertera ${fullName} till kund?`)) return;

  setSelectedContact(null);
  
  try {
    const { data, error: functionError } = await supabase.functions.invoke("convert-contact-to-customer", {
      body: {
        email: contact.email.trim(),
        fullName: fullName,
        phone: (contact as any).phone || null,
        contactId: contact.id,
      },
    });

    if (functionError) throw functionError;
    if (!data?.ok) {
      console.error("Function response:", data);
      throw new Error(data?.message || "Edge Function failed");
    }

    const createdCustomer = data?.customer as Customer | undefined;

    toast({
      title: "Konvertering slutförd!",
      description: `${fullName} är nu kund. Mail med lösenord har skickats (om leveransen lyckas).`,
      duration: 8000,
    });

    await fetchData();

    if (createdCustomer) {
      setMainTab("customers");
      setSelectedCustomer(createdCustomer);
    }
  } catch (err: any) {
    console.error("Konvertering misslyckades:", err);
    toast({ title: "Fel", description: err.message, variant: "destructive" });
  }
  }, [fetchData, toast, setMainTab]);

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

    
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-100">
          <Tidio />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
       
<div className="w-full bg-gradient-to-r from-blue-50 to-white border-t border-blue-100">
  <div className="max-w-6xl mx-auto px-4 py-2 text-sm text-gray-700">
    Tips: Använd våra färdiga mallar för snabbare hantering — klicka på "Hämta fullmaktsmallar".
  </div>
</div>

<div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-center gap-3">
  <Button
    onClick={() => setTemplatesDialogOpen(true)}
    className="bg-gradient-to-r from-trust-blue to-blue-500 text-white px-4 py-2 rounded-full shadow-md hover:translate-y-[-1px] transition"
  >
    <FileText className="w-4 h-4 mr-2" />
    Hämta fullmaktsmallar
  </Button>
  <Button
    variant="outline"
    className="border-blue-200 text-blue-700 bg-white/70 hover:bg-white"
    onClick={() => window.open("https://supabase.com/dashboard/project/laexmlqsqgeujcvysqoz/storage/files/buckets/fullmakts-filer", "_blank")}
  >
    Öppna mall-bibliotek
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
                 { id: "1", name: "Fullmakt - Apoteksärenden", storage_path: "fullmaktsmallar/Apoteksarenden Fullmakt.pdf" },
                 { id: "2", name: "Fullmakt - Tele2", storage_path: "fullmaktsmallar/Tele2 Fullmakt.pdf" }
               ]).map(t => (
                 <div key={t.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm flex items-center justify-between">
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
                  <TabsList className="w-full bg-slate-200/80 shadow-sm rounded-lg p-1 flex flex-wrap gap-1 border border-slate-200">
                      <TabsTrigger className="w-1/3 sm:flex-1 sm:basis-0 min-w-0 text-center px-2 py-2 text-sm sm:text-base overflow-hidden whitespace-nowrap text-ellipsis" value="cases">
                          Ärenden ({cases.length})
                      </TabsTrigger>
                      {/* Abonnemang */}
                      <TabsTrigger className="w-1/3 sm:flex-1 sm:basis-0 min-w-0 text-center px-2 py-2 text-sm sm:text-base overflow-hidden whitespace-nowrap text-ellipsis" value="subscriptions">
                          Abonnemang ({cancellations.length})
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

          {/* Abonnemang / Uppsägningar */}
          <TabsContent value="subscriptions">
            <SubscriptionCancellationsView
              subscriptions={subscriptions}
              customers={customers}
              onDataUpdated={fetchData}
            />
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
            <div className="space-y-8">
              {/* Aktiva kunder */}
              <div>
                <div className="grid gap-8 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <h3 className="text-lg font-semibold mb-4">Hantera Kundstatus</h3>
                    <CustomerManagement customers={customers} onDataUpdated={fetchData} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Skapa Ny Kund</h3>
                    <CreateCustomerForm onCustomerCreated={fetchData} />
                  </div>
                </div>
              </div>

              {/* Arkiverade kunder */}
              <div className="border-t pt-8">
                <h3 className="text-lg font-semibold mb-4">Arkiverade Kunder</h3>
                <ArchivedCustomersList onDataUpdated={fetchData} />
              </div>
            </div>
          </TabsContent>

          {/* Kontaktförfrågningar */}
                  <TabsContent value="contact_requests">
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {contactRequestList}
                      </div>
                  </TabsContent>
              </Tabs>
          </div>          {/* 1. Kunddialog (CustomersDialog) */}
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

