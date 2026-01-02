//src/pages/Portal/dialogs/CustomersDialog.tsx  
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Edit, Upload, FileText, Download, FileWarning } from "lucide-react"; // Lade till FileWarning
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import NewCaseForm from "../views/NewCaseForm";
import type { Customer, Case, ServiceType, Comment, FullmaktDocument } from "@/types"; // Använder alias för typer
import { FullmaktManagement } from "../views/FullmaktManagement";

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
  onNewCase: (customerId: string) => void; 
  onOpenCase?: (c: Case) => void; 
}

const CustomersDialog: React.FC<CustomersDialogProps> = ({ customer, onClose, onCustomerUpdated, onOpenCase = () => {} }) => {
  const { toast } = useToast();
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [customerCases, setCustomerCases] = useState<Case[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);

  const [isNewCaseDialogOpen, setIsNewCaseDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [isFullmaktManagementOpen, setIsFullmaktManagementOpen] = useState(false);
  const [caseComments, setCaseComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [isFullmaktDialogOpen, setIsFullmaktDialogOpen] = useState(false); 
 
  // NYTT STATE FÖR FULLMAKT HANTERING
  const [documents, setDocuments] = useState<FullmaktDocument[]>([]); 
  const [loadingDocuments, setLoadingDocuments] = useState(true); 
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckLoading, setAdminCheckLoading] = useState(true);
  const [deletingCustomer, setDeletingCustomer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  // --- NY FUNKTION: HÄMTA FULLMAKTER ---
  const fetchDocuments = useCallback(async (customerId: string) => {
    setLoadingDocuments(true);
    try {
      const { data, error } = await supabase
        .from("fullmakter")
        .select("id, fullmaktsgivare, file_name, dokument_url, created_at")
        .eq("fullmaktsgivare", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mappedData: FullmaktDocument[] = (data || []).map((doc: any) => ({
        id: doc.id,
        customer_id: doc.fullmaktsgivare,
        file_name: doc.file_name,
        // dokument_url måste innehålla sökväg i bucket: e.g. "fullmakter/kund/<id>/fil.pdf"
        storage_path: doc.dokument_url,
        created_at: doc.created_at,
      }));

      setDocuments(mappedData);
    } catch (err) {
      console.error("Kunde inte hämta fullmakter:", err);
      toast({ title: "Fel vid hämtning", description: "Kunde inte ladda listan över fullmakter.", variant: "destructive" });
      setDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  }, [toast]);

  // --- NY FUNKTION: LADDA NER FULLMAKT ---
  const handleDownload = async (document: FullmaktDocument) => {
    try {
      const pathInBucket = document.storage_path;
      if (!pathInBucket) throw new Error("Inget dokument_url satt för detta dokument.");

      const { data, error } = await supabase.storage
        .from("fullmakts-filer")
        .createSignedUrl(pathInBucket, 60);

      if (error) throw error;

      // Supabase returns signedUrl (case-sensitive)
      const url = (data as any)?.signedUrl ?? (data as any)?.signed_url ?? (data as any)?.signedURL;
      if (!url) throw new Error("Kunde inte generera en giltig nedladdningslänk.");

      window.open(url, "_blank");
    } catch (err) {
      console.error("Nedladdning misslyckades:", err);
      toast({ title: "Fel vid nedladdning", description: "Kunde inte ladda ner filen. Kontrollera behörigheter och att dokument_url är korrekt.", variant: "destructive" });
    }
  };

  // Flytta uppfetchCustomerCases så den är definierad innan useEffect använder den
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

  // användning av fetchCustomerCases i useEffect kräver att funktionen är deklarerad ovan
  useEffect(() => {
    setEditingCustomer(customer);
    if (customer?.id) {
      fetchCustomerCases(customer.id);
      fetchDocuments(customer.id); // *** FIX: Hämtar fullmakter vid öppning/kundbyte ***
    } else {
      setCustomerCases([]);
      setDocuments([]); // Rensa fullmakter om ingen kund vald
    }
  }, [customer, fetchCustomerCases, fetchDocuments]); // Lade till fetchDocuments i beroendelistan

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

  // FIX: Korrigera adminrättighetskontroll för att matcha CustomerManagement
  const checkAdminRights = useCallback(async () => {
    setAdminCheckLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) {
        setIsAdmin(false);
        return;
      }

      // Använd samma logik som CustomerManagement
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin');

      const isAdminResult = Array.isArray(data) && data.length > 0 && !error;
      setIsAdmin(isAdminResult);
    } catch (err) {
      console.error('Fel vid kontroll av adminrättigheter:', err);
      setIsAdmin(false);
    } finally {
      setAdminCheckLoading(false);
    }
  }, []);

  // FIX: UPPDATERA KUND MED RPC-FUNKTION SOM BYPASSAR RLS
  const handleUpdateCustomer = async () => {
    if (!editingCustomer?.id || !isAdmin) {
      toast({
        title: "Åtkomst nekad",
        description: "Du behöver adminrättigheter för att uppdatera kunder.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Kontrollera om personnummer ändrats - använd särskild funktion för GDPR-compliance
      const currentCustomer = customer; // Ursprungliga värden
      const personalNumberChanged = currentCustomer?.personal_number !== editingCustomer.personal_number;

      if (personalNumberChanged && editingCustomer.personal_number) {
        // Använd särskild funktion för personnummer med audit logging
        await supabase.rpc('safe_update_personal_number', {
          p_customer_id: editingCustomer.id,
          p_personal_number: editingCustomer.personal_number,
          p_reason: 'Updated via admin interface',
        });
      }

      // Uppdatera andra fält (exklusive personnummer som redan hanterats)
      await supabase.rpc('safe_update_customer', {
        p_customer_id: editingCustomer.id,
        p_name: editingCustomer.name,
        p_email: editingCustomer.email || null,
        p_phone: editingCustomer.phone,
        p_personal_number: personalNumberChanged ? null : editingCustomer.personal_number, // null om redan uppdaterad
      });

      toast({ title: "Kund uppdaterad", description: "Kundinformationen har sparats med full audit trail." });
      await onCustomerUpdated();
    } catch (err: any) {
      console.error("Error updating customer:", err);
      toast({ title: "Fel", description: err.message || "Kunde inte uppdatera kund.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // NY FUNKTION: TOGGLE AKTIVERING/DEAKTIVERING MED RPC
  const handleToggleActive = async () => {
    if (!editingCustomer?.id || !isAdmin) {
      toast({
        title: "Åtkomst nekad",
        description: "Du behöver adminrättigheter för att aktivera/deaktivera kunder.",
        variant: "destructive",
      });
      return;
    }

    setTogglingActive(true);
    try {
      const newActive = !(editingCustomer.active ?? true); // Default till true om undefined

      // Använd RPC som bypassar RLS
      const { error } = await supabase.rpc('safe_toggle_customer_active', {
        p_customer_id: editingCustomer.id,
      });

      if (error) throw error;

      toast({
        title: "Status uppdaterad",
        description: `Kunden är nu ${newActive ? 'aktiv' : 'inaktiv'}.`,
      });

      // Uppdatera lokal state
      setEditingCustomer({ ...editingCustomer, active: newActive });
      await onCustomerUpdated();
    } catch (err: any) {
      console.error("Fel vid toggle av kundstatus:", err);
      toast({
        title: "Fel",
        description: err.message || "Kunde inte uppdatera kundstatus.",
        variant: "destructive",
      });
    }
    setTogglingActive(false);
  };

  // NY FUNKTION: RADERA KUND MED DIREKT DELETE
  const handleDeleteCustomer = async () => {
    if (!editingCustomer?.id || !isAdmin) {
      toast({
        title: "Åtkomst nekad",
        description: "Du behöver adminrättigheter för att radera kunder.",
        variant: "destructive",
      });
      return;
    }

    setDeletingCustomer(true);
    try {
      // Radera kund
      await supabase.rpc('delete_customer', {
        p_customer_id: editingCustomer.id,
      });

      toast({
        title: "Kund raderad",
        description: `Kunden ${editingCustomer.name} har tagits bort.`,
      });

      // Stäng dialogen och refresh listan
      onClose();
      await onCustomerUpdated();
    } catch (err: any) {
      console.error("Fel vid radering av kund:", err);
      toast({
        title: "Fel",
        description: err.message || "Kunde inte radera kunden.",
        variant: "destructive",
      });
    }
    setDeletingCustomer(false);
    setShowDeleteConfirm(false);
  };

  // UPPDATERA useEffect FÖR ATT KONTROLLERA ADMIN VID ÖPPNING
  useEffect(() => {
    setEditingCustomer(customer);
    if (customer?.id) {
      fetchCustomerCases(customer.id);
      fetchDocuments(customer.id);
    } else {
      setCustomerCases([]);
      setDocuments([]);
    }
    // Kontrollera adminrättigheter
    checkAdminRights();
  }, [customer, fetchCustomerCases, fetchDocuments, checkAdminRights]);

  const handleOpenNewCaseForCustomer = () => {
    setEditingCase(null); 
    setCaseComments([]); 
    setIsNewCaseDialogOpen(true);
  };

  const handleEditCustomerCase = (caseItem: Case) => {
    setEditingCase(caseItem); 
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
      await fetchCustomerCases(customer.id); 
    }
  };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadFullmakt = async () => {
    if (!selectedFile || !editingCustomer?.id) {
      toast({ title: "Varning", description: "Välj en fil att ladda upp.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const fileExtension = selectedFile.name.split('.').pop();
    
    // Sökväg inne i bucket (ingen 'documents/' prefix)
    const pathPrefix = `fullmakter/kund/${editingCustomer.id}/`;
    const safeFileName = selectedFile.name.replace(/[^a-z0-9.]/gi, '_');
    const fileName = `${safeFileName}_${Date.now()}.${fileExtension}`;
    const storagePath = `${pathPrefix}${fileName}`; // path in bucket

    try {
      // Ladda upp till rätt bucket
      const { error: uploadError } = await supabase.storage
        .from('fullmakts-filer') // rätt bucket
        .upload(storagePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Spara referens i databasen i kolumnen dokument_url
      const { data: userData } = await supabase.auth.getUser();
      const uploaderId = (userData as any)?.user?.id ?? null;
      // Fallback: om ingen uploader finns, använd kundens id som placeholder (justera vid behov)
      const fullmakthavareId = uploaderId ?? editingCustomer.id;
      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      const { error: dbError } = await supabase
        .from("fullmakter")
        .insert([{
          fullmaktsgivare: editingCustomer.id,
          fullmakthavare: fullmakthavareId,
          file_name: selectedFile.name,
         dokument_url: storagePath,
        }]);
 
       if (dbError) {
         console.error("DB insert error:", dbError);
         throw dbError;
       }


      toast({ title: "Uppladdning klar", description: `Fullmakt '${selectedFile.name}' har sparats.`, variant: "default" });
      setSelectedFile(null); // Rensa vald fil
      
      if (editingCustomer.id) {
        fetchDocuments(editingCustomer.id); // *** FIX: Uppdatera listan efter uppladdning ***
      }

    } catch (err) {
      console.error("Uppladdning/DB-fel:", err);
      toast({ title: "Fel vid uppladdning", description: "Kunde inte ladda upp filen eller spara referens.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // Placeholder för Fullmaktsmall
  const handleTemplateDownload = () => {
    toast({ title: "Mall", description: "Genererar/hämtar generell fullmaktsmall...", variant: "default" });
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
          {/* Kundinformation formulär */}
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

          {/* Spara Kundinformation (Outline) */}
          <Button 
            onClick={handleUpdateCustomer} 
            disabled={loading || !isAdmin || adminCheckLoading} 
            variant="outline"
            className="w-full mt-4 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Spara Kundinformation
          </Button>

          {/* NY KNAPP: Aktivera/Deaktivera Kund (Endast för admin) */}
          {isAdmin && (
            <Button 
              onClick={handleToggleActive} 
              disabled={togglingActive} 
              variant={editingCustomer.active ? "destructive" : "default"}
              className="w-full mt-2"
            >
              {togglingActive ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingCustomer.active ? "Deaktivera Kund" : "Aktivera Kund"}
            </Button>
          )}

          {/* NY KNAPP: Radera Kund (Endast för admin, röd) */}
          {isAdmin && (
            <Button 
              onClick={() => setShowDeleteConfirm(true)} 
              disabled={deletingCustomer} 
              variant="destructive"
              className="w-full mt-2"
            >
              {deletingCustomer ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Radera Kund
            </Button>
          )}

          {/* BEKRÄFTELSEDIALOG FÖR RADERING */}
          {showDeleteConfirm && (
            <Dialog open={true} onOpenChange={setShowDeleteConfirm}>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle>Bekräfta radering</DialogTitle>
                </DialogHeader>
                <p>Är du säker på att du vill radera kunden "{editingCustomer?.name}"? Detta kan inte ångras.</p>
                <DialogFooter>
                  <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Avbryt</Button>
                  <Button variant="destructive" onClick={handleDeleteCustomer} disabled={deletingCustomer}>
                    {deletingCustomer ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Radera
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

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
                  customers={[editingCustomer]} 
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
                <div className="flex justify-between items-center mt-4 mb-4"> 
                        {/* Fullmakt knapp (Blå) */}
                        <Button 
                            onClick={() => setIsFullmaktDialogOpen(true)}
                            className="bg-trust-blue hover:bg-trust-blue/90"
                        >
                            Visa Fullmakter
                        </Button>
                      </div>
             
                {customerCases.map((caseItem) => (
                  <div 
                    key={caseItem.id} 
                    className="border rounded-lg p-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => handleEditCustomerCase(caseItem)} 
                  >
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
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation(); 
                          handleEditCustomerCase(caseItem); 
                        }}
                      >
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
            {isFullmaktDialogOpen && editingCustomer && (
                <Dialog open={true} onOpenChange={setIsFullmaktDialogOpen}>
                    <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader>
                            {/* FIX: Använder editingCustomer.name */}
                            <DialogTitle>Fullmaktshantering för {editingCustomer.name}</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* 1. Fullmaktsmall */}
                            <div className="border rounded-lg p-4 bg-gray-50">
                                <h4 className="font-semibold mb-2 flex items-center">
                                    <FileText className="h-5 w-5 mr-2 text-trust-blue" /> Mall Fullmakt
                                </h4>
                                <p className="text-sm text-gray-600 mb-3">Hämta en mall för Fullmakt eller skapa en ny baserat på den.</p>
                                <Button 
                                    onClick={handleTemplateDownload}
                                    variant="outline"
                                    className="w-full text-trust-blue border-trust-blue hover:bg-trust-blue/10"
                                >
                                    <Download className="h-4 w-4 mr-2" /> Hämta Mall
                                </Button>
                            </div>

                            {/* 2. Uppladdning av Fullmakt */}
                            <div className="border rounded-lg p-4 bg-white shadow-sm">
                                <h4 className="font-semibold mb-3">Ladda upp signerad Fullmakt</h4>
                                <div className="flex items-center space-x-2">
                                    <Input 
                                        id="fullmakt-upload" 
                                        type="file" 
                                        onChange={handleFileChange}
                                        accept=".pdf,.doc,.docx"
                                        className="flex-1"
                                    />
                                    <Button 
                                        onClick={handleUploadFullmakt} 
                                        disabled={!selectedFile || uploading} 
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                    </Button>
                                </div>
                                {selectedFile && (
                                    <p className="text-sm mt-2 text-gray-500">Vald fil: {selectedFile.name}</p>
                                )}
                            </div>

                            
                {/* 3. Befintliga Fullmakter (Lista med logik) */}
                <div>
                    {/* FIX: Använder editingCustomer.name */}
                    <h4 className="font-semibold mb-3">Befintliga fullmakter för {editingCustomer.name}</h4>
                    
                    {loadingDocuments ? ( // FIX: Använder loadingDocuments
                        <div className="border rounded-lg p-4 text-center text-gray-500 italic flex justify-center items-center">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Laddar dokument...
                        </div>
                    ) : documents.length === 0 ? ( // FIX: Använder documents
                        <div className="border rounded-lg p-4 text-center text-gray-500 italic">
                            Inga fullmakter hittades för denna kund.
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {documents.map((doc: FullmaktDocument) => ( // FIX: Lade till FullmaktDocument typ
                                <div 
                                    key={doc.id} 
                                    className="flex justify-between items-center border p-3 rounded-lg bg-white hover:bg-gray-50 transition"
                                >
                                    <div>
                                        <p className="font-medium truncate max-w-[200px]">{doc.file_name}</p>
                                        <p className="text-xs text-gray-500">
                                            Uppladdad: {format(new Date(doc.created_at), "dd MMM yyyy", { locale: sv })}
                                        </p>
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleDownload(doc)} // FIX: Använder handleDownload
                                        className="text-trust-blue border-trust-blue hover:bg-trust-blue hover:text-white"
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

                        <DialogFooter>
                            <Button variant="secondary" onClick={() => setIsFullmaktDialogOpen(false)}>Stäng</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
    </Dialog>
  );
};

export default CustomersDialog;