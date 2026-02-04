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
import KeyReceiptDialog from "@/components/KeyReceiptDialog";
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
  { code: "closed", label: "Avbruten", colorClass: "bg-red-100 text-red-800" },
  { code: "declined", label: "Avböjd", colorClass: "bg-red-100 text-red-800" },
  { code: "converted", label: "Kund", colorClass: "bg-indigo-100 text-indigo-800" },
  { code: "contacted", label: "Kontaktad", colorClass: "bg-blue-100 text-blue-800" },
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
  const { signOut, user } = useAuth();
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
  const [unreadCaseCount, setUnreadCaseCount] = useState(0);
  const hasUnreadMessages = unreadCaseCount > 0;
  const adminBannerText = useMemo(() => {
    if (!hasUnreadMessages) return "";
    if (unreadCaseCount === 1) return "Nytt kundmeddelande i ett ärende.";
    return `Nya kundmeddelanden i ${unreadCaseCount} ärenden.`;
  }, [hasUnreadMessages, unreadCaseCount]);

  console.log("Customers in AdminPortal:", customers); // TEMP LOG


  // MODAL STATE
  const [mainTab, setMainTab] = useState<
    "cases" | "subscriptions" | "valuations" | "customers" | "contact_requests" | "key_receipts" | "customer_management" | "new" | "saved"
  >("cases");
  // Statusfilter för ärenden — använder normalizeStatus + STATUS_DEFINITIONS
  const [statusFilter, setStatusFilter] = useState<string>("all");
  // Statusfilter för kontaktförfrågningar
  const [contactStatusFilter, setContactStatusFilter] = useState<string>("all");

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

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const res = await fetch(`/api/templates/list?prefix=${encodeURIComponent("fullmaktsmallar")}`);
        if (!res.ok) throw new Error(`templates-list failed (${res.status})`);
        const payload = (await res.json()) as any;
        const files = (payload?.templates ?? []) as Array<{ name: string; storage_path: string }>;

        const templates = files.map((file, index) => ({
          id: (index + 1).toString(),
          name: (file.name || '').replace(/\.pdf$/i, '').replace(/_/g, ' '),
          storage_path: file.storage_path
        }));
        // Add the external link
        templates.push({
          id: (templates.length + 1).toString(),
          name: "Telia - webbsida för fullmakter",
          storage_path: "https://www.telia.se/mitt-telia/mitt-konto/fullmakter"
        });
        setFullmaktTemplates(templates);
      } catch (err) {
        console.error('Failed to fetch templates:', err);
        // Fallback to hardcoded
        setFullmaktTemplates([
          { id: "1", name: "Fullmakt - Apoteksärenden", storage_path: "fullmaktsmallar/Apoteksarenden Fullmakt.pdf" },
          { id: "2", name: "Fullmakt - Tele2", storage_path: "fullmaktsmallar/Tele2 Fullmakt.pdf" },
          { id: "3", name: "Telia - webbsida för fullmakter", storage_path: "https://www.telia.se/mitt-telia/mitt-konto/fullmakter" }
        ]);
      }
    };
    fetchTemplates();
  }, []);

  const handlePreviewTemplate = async (storagePath: string) => {
    // iOS/PWA kan blockera window.open om den sker efter await.
    // Lösning: öppna en tom flik direkt (user gesture) och navigera sen.
    const openBlankTab = () => window.open("about:blank", "_blank", "noopener,noreferrer");
    let popup: Window | null = null;
    try {
      // Öppna externa länkar direkt
      if (/^https?:\/\//i.test(storagePath)) {
        window.open(storagePath, "_blank", "noopener,noreferrer");
        return;
      }

      popup = openBlankTab();

      const apiRes = await fetch(`/api/templates/download?path=${encodeURIComponent(storagePath)}`);
      if (!apiRes.ok) throw new Error(`templates-download failed (${apiRes.status})`);
      const data = (await apiRes.json()) as any;
      const url = data?.signedUrl || data?.signed_url;
      if (!url) throw new Error("Ingen signerad URL genererades");

      if (popup && !popup.closed) {
        popup.location.href = url;
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err: any) {
      try {
        if (popup && !popup.closed) popup.close();
      } catch {
        // ignore
      }
      console.error("Failed to open template:", err);
      // Handle specific storage errors
      if (err.message?.includes('Object not found') || err.message?.includes('not found') || err.message?.includes('Kunde inte hämta mall')) {
        toast({
          title: "Mall inte tillgänglig",
          description: "Denna mall finns inte tillgänglig för tillfället. Kontakta administratören.",
          variant: "destructive"
        });
        return;
      }
      toast({ title: "Fel", description: err.message || "Kunde inte öppna mallen.", variant: "destructive" });
    }
  };

  const handleDownloadTemplateFile = async (storagePath: string, filename?: string) => {
    try {
      // För externa länkar finns inget att "ladda ner" kontrollerat här.
      if (/^https?:\/\//i.test(storagePath)) {
        window.open(storagePath, "_blank", "noopener,noreferrer");
        return;
      }

      const apiRes = await fetch(`/api/templates/download?path=${encodeURIComponent(storagePath)}`);
      if (!apiRes.ok) throw new Error(`templates-download failed (${apiRes.status})`);
      const data = (await apiRes.json()) as any;
      const url = data?.signedUrl || data?.signed_url;
      if (!url) throw new Error("Ingen signerad URL genererades");

      const fileRes = await fetch(url);
      if (!fileRes.ok) throw new Error("Kunde inte hämta filen för nedladdning");

      const blob = await fileRes.blob();
      const objectUrl = URL.createObjectURL(blob);

      const nameFromPath = storagePath.split("/").pop() || "mall.pdf";
      const safeName = (filename ? `${filename}` : nameFromPath).trim();
      const downloadName = /\.pdf$/i.test(safeName) ? safeName : `${safeName}.pdf`;

      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = downloadName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err: any) {
      console.error("Failed to download template:", err);
      toast({ title: "Fel", description: err.message || "Kunde inte ladda ner mallen.", variant: "destructive" });
    }
  };
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactRequest | null>(null);
  const [selectedCase, setSelectedCase] = useState<CustomerCase | null>(null);
  const [selectedValuation, setSelectedValuation] = useState<Valuation | null>(null);
  const [adminValuations, setAdminValuations] = useState<Valuation[]>([]);

  // Admin: customer selection for key receipts
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("__none__");

  const selectedCustomerIdForKeyReceipt = useMemo(() => {
    if (selectedCustomerId === "__none__") return null;
    if (selectedCustomerId === "__admin_only__") return null;
    return selectedCustomerId;
  }, [selectedCustomerId]);

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

  const handleDeleteValuation = async (valuationId: string) => {
    console.log("DELETE valuationId:", valuationId, typeof valuationId);

    const { error } = await supabase.functions.invoke("admin-soft-delete-valuation", {
      body: { valuation_id: valuationId, confirm: true },
    });
    if (error) throw error;
    // uppdatera listan
    await fetchValuations();
  };

  const fetchData = async () => {
    await fetchAll();
  };

  const fetchAdminValuations = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("customer_get_my_valuations");
      if (error) throw error;
      setAdminValuations((data as Valuation[]) || []);
    } catch (err) {
      console.error("Admin fetch valuations failed:", err);
      toast({ title: "Fel", description: "Kunde inte hämta dina värderingar.", variant: "destructive" });
      setAdminValuations([]);
    }
  }, [toast]);

  useEffect(() => {
    fetchAdminValuations();
  }, [fetchAdminValuations]);

  const activeContactCount = useMemo(() => {
    // Räkna kontakter baserat på valt filter
    if (contactStatusFilter === "all") {
      return contactRequests.filter((c) => c.status !== "converted").length;
    }
    return contactRequests.filter((c) => c.status === contactStatusFilter).length;
  }, [contactRequests, contactStatusFilter]);

   const contactRequestList = useMemo(() => {
    // Filtrera kontakter baserat på valt filter
    let filtered = contactRequests;
    if (contactStatusFilter !== "all") {
      filtered = contactRequests.filter((c) => c.status === contactStatusFilter);
    } else {
      // För "all" exkludera converted
      filtered = contactRequests.filter((c) => c.status !== "converted");
    }
    return filtered
      .sort((a, b) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime())
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
  
  // E-post är nu frivillig - ta bort denna kontroll
  // if (!contact.email || !contact.email.trim()) {
  //   toast({ title: "Fel", description: "Kontaktförfrågan saknar e-postadress.", variant: "destructive" });
  //   return;
  // }
  
  if (!window.confirm(`Konvertera ${fullName} till kund?`)) return;

  setSelectedContact(null);
  
  try {
    const { data, error } = await supabase.functions.invoke("convert-contact-to-customer", {
      body: { contact_request_id: contact.id, confirm: true },
    });

    if (error) throw error;

    const customerId = (data as any)?.customer_id;
    if (!customerId) throw new Error("Kunde inte skapa kund");

    const passwordSent = (data as any)?.password_sent === true;
    const authCreated = (data as any)?.auth_created === true;

    // Hämta kunden separat om UI behöver data
    const { data: customer } = await supabase
      .from("customers")
      .select("id, name, email, phone")
      .eq("id", customerId)
      .single();

    toast({
      title: "Konvertering slutförd!",
      description: contact.email && contact.email.trim()
        ? (passwordSent
            ? `${fullName} är nu kund. Mail med lösenord har skickats (om leveransen lyckas).`
            : `${fullName} är nu kund. Inloggning är aktiverad, men inget lösenords-mail skickades.`)
        : (authCreated
            ? `${fullName} är nu kund utan e-post. Inloggning sker via SMS-kod på telefonnumret.`
            : `${fullName} är nu kund utan e-post. Ingen inloggning är möjlig förrän uppgifter kompletteras.`),
      duration: 8000,
    });

    await fetchData();

    if (customer) {
      setMainTab("customers");
      setSelectedCustomer(customer);
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

	  
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-100 via-white to-slate-100 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        {hasUnreadMessages && (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
              <div>
                Du har <span className="font-semibold">{unreadCaseCount}</span> nya meddelanden.
              </div>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-blue-900">
                <li className="leading-snug">{adminBannerText}</li>
              </ul>
            </div>
          </div>
        )}

        {/* Notis-badge/list borttagen */}
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
  <Button
    onClick={() => window.location.assign("/portal/admin/cube-planner")}
    className="bg-gradient-to-r from-trust-green to-trust-green-light text-white px-4 py-2 rounded-full shadow-md hover:translate-y-[-1px] transition"
  >
    Kubikmätaren
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
       <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
         <p className="text-sm text-yellow-800">
           <strong>Obs:</strong> Vissa mallar kan vara under utveckling och inte tillgängliga än. Kontakta administratören om en mall inte kan laddas ner.
         </p>
       </div>
      <div className="grid grid-cols-1 gap-3">
               {(fullmaktTemplates && fullmaktTemplates.length ? fullmaktTemplates : [
                 { id: "1", name: "Fullmakt - Apoteksärenden", storage_path: "fullmaktsmallar/Apoteksarenden Fullmakt.pdf" },
                 { id: "2", name: "Fullmakt - Tele2", storage_path: "fullmaktsmallar/Tele2 Fullmakt.pdf" },
                 { id: "3", name: "Telia - webbsida för fullmakter", storage_path: "https://www.telia.se/mitt-telia/mitt-konto/fullmakter" }
               ]).map(t => (
                 <div key={t.id} className="bg-white p-3 rounded border border-slate-200 shadow-sm flex items-center justify-between">
                   <div>
                     <div className="font-medium">{t.name}</div>
                     <div className="text-xs text-gray-500">{t.storage_path}</div>
                   </div>
                   <div className="flex gap-2">
                     <Button size="sm" variant="ghost" onClick={() => handlePreviewTemplate?.(t.storage_path)}>Förhandsgranska</Button>
                     <Button size="sm" onClick={() => handleDownloadTemplateFile?.(t.storage_path, t.name)}>Hämta</Button>
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
 
             {/* Admin: värdebedömningsverktyg ska ligga ovanför tabbarna */}
             <div className="mb-6">
               <ValuationManager
                 valuations={adminValuations}
                 onDataUpdated={fetchAdminValuations}
                 showShareToggle={false}
                 estimatorMode="admin"
                 customers={customers}
                 titleText="Värdebedömning"
               />
             </div>

             <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)} className="space-y-6">
                  {/* Mobil: dropdown istället för trånga tabbar */}
                  <div className="md:hidden">
                    <Select value={mainTab} onValueChange={(v) => setMainTab(v as any)}>
                      <SelectTrigger className="w-full bg-slate-200/80 border-slate-200">
                        <SelectValue placeholder="Välj vy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cases">Ärenden ({cases.length})</SelectItem>
                        <SelectItem value="subscriptions">Uppsägningar ({cancellations.length})</SelectItem>
                        <SelectItem value="valuations">Värderingar ({valuations.length})</SelectItem>
                        <SelectItem value="customers">Kunder ({customers.length})</SelectItem>
              <SelectItem value="key_receipts">Nyckelkvittens</SelectItem>
                        <SelectItem value="contact_requests">Kontakt ({activeContactCount})</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Desktop/tablet: tabbar */}
          <TabsList className="hidden md:flex min-w-[900px] w-auto bg-slate-200/80 shadow-sm rounded-lg p-1 flex-wrap gap-1 border border-slate-200 overflow-x-auto">
                    <TabsTrigger className="flex-1 basis-0 min-w-0 text-center px-2 py-2 text-sm lg:text-base overflow-hidden whitespace-nowrap text-ellipsis" value="cases">
                      Ärenden ({cases.length})
                    </TabsTrigger>
                    <TabsTrigger className="flex-1 basis-0 min-w-0 text-center px-2 py-2 text-sm lg:text-base overflow-hidden whitespace-nowrap text-ellipsis" value="subscriptions">
                      Uppsägningar ({cancellations.length})
                    </TabsTrigger>
                    <TabsTrigger className="flex-1 basis-0 min-w-0 text-center px-2 py-2 text-sm lg:text-base overflow-hidden whitespace-nowrap text-ellipsis" value="valuations">
                      Värderingar ({valuations.length})
                    </TabsTrigger>
                    <TabsTrigger className="flex-1 basis-0 min-w-0 text-center px-2 py-2 text-sm lg:text-base overflow-hidden whitespace-nowrap text-ellipsis" value="customers">
                      Kunder ({customers.length})
                    </TabsTrigger>
          <TabsTrigger className="flex-1 basis-0 min-w-0 text-center px-2 py-2 text-sm lg:text-base overflow-hidden whitespace-nowrap text-ellipsis" value="key_receipts">
            Nyckelkvittens
          </TabsTrigger>
                    <TabsTrigger className="flex-1 basis-0 min-w-0 text-center px-2 py-2 text-sm lg:text-base overflow-hidden whitespace-nowrap text-ellipsis" value="contact_requests">
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
              onUnreadCasesChange={setUnreadCaseCount}
            />
          </TabsContent>

          {/* Abonnemang / Uppsägningar */}
          <TabsContent value="subscriptions">
            <SubscriptionCancellationsView
              subscriptions={subscriptions}
              customers={customers}
              cancellations={cancellations}
              onDataUpdated={fetchData}
            />
          </TabsContent>

         {/* NY FLIK: Värderingar */}
         <TabsContent value="valuations">
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
                    <h3 className="text-lg font-semibold mb-4">Kundstatus</h3>
                    <CustomerManagement customers={customers} onDataUpdated={fetchData} onOpenCustomer={handleOpenCustomerDialog} />
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
                <ArchivedCustomersList onDataUpdated={fetchData} onOpenCustomer={handleOpenCustomerDialog} />
              </div>
            </div>
          </TabsContent>

          {/* Nyckelkvittens (Admin) */}
          <TabsContent value="key_receipts">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-trust-blue">Nyckelkvittens</CardTitle>
                <CardDescription>Skapa nyckelkvittens för vald kund (eller admin-only).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-w-xl">
                  <Label>Välj kund</Label>
                  <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Välj kund" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Välj kund…</SelectItem>
                      <SelectItem value="__admin_only__">Admin-only (ingen kund)</SelectItem>
                      {(customers || []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name || (c as any).email || c.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedCustomerId === "__none__" ? (
                  <div className="text-sm text-slate-700">Välj kund för att skapa nyckelkvittens</div>
                ) : (
                  <KeyReceiptDialog
                    mode="admin"
                    customerId={selectedCustomerIdForKeyReceipt}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Kontaktförfrågningar */}
                  <TabsContent value="contact_requests">
                    <div className="mb-4">
                      <Select value={contactStatusFilter} onValueChange={setContactStatusFilter}>
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Välj status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Alla</SelectItem>
                          <SelectItem value="new">Nya</SelectItem>
                          <SelectItem value="contacted">Kontaktade</SelectItem>
                          <SelectItem value="closed">Avbrutna</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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

