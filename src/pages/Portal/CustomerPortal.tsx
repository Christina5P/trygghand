// src/pages/Portal/CustomerPortal.tsx
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"; // Import för Fullmakt Dialog
import CollapsibleCard from "@/components/ui/CollapsibleCard"; // Se till att denna komponent finns
import ValuationManager from "@/components/ValuationManager"; // Se till att denna komponent finns
import { PortalStats } from '@/pages/Portal/PortalStats'; // Se till att denna komponent finns
import Tidio from "@/components/Tidio"; // Se till att denna komponent finns    
import { CaseCommentsThread } from "./components/cases/CaseCommentsThread";
import { CaseDocumentsSection, type CaseDocument } from "./components/cases/CaseDocumentsSection";

import {
  MessageSquare,
  Calendar,
  MapPin,
  DollarSign,
  Loader2,
  User,
  FileText, // Lade till för Fullmakt
  Briefcase, // Lade till för ärendeikon
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import type { Customer, Case, Comment, Valuation, FullmaktDocument } from '@/types'; // Importera dina typer
import { ChangePasswordSection } from "./components/ChangePasswordSection";

import type { Dispatch, SetStateAction } from "react";
 
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

type CustomerPortalProps = {
  customer: Customer;
  fullmaktTemplates?: { id: string; name: string; storage_path: string }[];
  handleDownloadTemplate?: (path: string) => Promise<void>;
};

const CustomerPortal: React.FC<CustomerPortalProps> = ({ customer, fullmaktTemplates = [], handleDownloadTemplate }) => {
  const [templatesOpen, setTemplatesOpen] = useState(false);

    const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  // example controlled state — adapt to your actual state variable
  const [editingCustomer, setEditingCustomer] = useState<Customer>(customer);

  useEffect(() => {
    setEditingCustomer(customer);
  }, [customer]);

  // Generic input change handler for inputs/textarea/select
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name } = target;
    let value: any;

    if (target.type === "checkbox") value = (target as HTMLInputElement).checked;
    else if (target.type === "file") value = (target as HTMLInputElement).files?.[0];
    else value = target.value;

    setEditingCustomer((prev) => ({ ...((prev as unknown) as any), [name]: value }) as Customer);
  };

  // Call this to persist updates (replace with your real API / supabase call)
  const handleUpdateCustomer = async (updates?: Partial<Customer>) => {
    const payload = updates ? ({ ...editingCustomer, ...updates } as Customer) : editingCustomer;
    try {
           console.log("Updating customer:", payload);
      // reflect successful update locally
      setEditingCustomer(payload);
    } catch (err) {
      console.error("Failed to update customer", err);
      // optionally show toast/error UI
    }
  };

    const { user } = useAuth(); // Används för auth.uid() vid kommentarer
    const { toast } = useToast();

    // --- State för kundinformation ---
    const [loadingSave, setLoadingSave] = useState(false);

    // --- State för Ärendehantering ---
    const [cases, setCases] = useState<Case[]>([]);
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loadingCases, setLoadingCases] = useState(true);
    const [loadingComments, setLoadingComments] = useState(false);
    const [caseDocuments, setCaseDocuments] = useState<CaseDocument[]>([]);
    const [loadingCaseDocuments, setLoadingCaseDocuments] = useState(false);

    // --- State för Värderingshantering ---
    const [valuations, setValuations] = useState<Valuation[]>([]);
    const [loadingValuations, setLoadingValuations] = useState(true);
    
    // --- State för Fullmakt ---
    const [isFullmaktDialogOpen, setIsFullmaktDialogOpen] = useState(false);
    const [documents, setDocuments] = useState<FullmaktDocument[]>([]);
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    
    useEffect(() => {
        setEditingCustomer(customer);
        if (customer.id) {
            fetchCases();
            fetchValuations();
        } else {
            setLoadingCases(false);
            setLoadingValuations(false);
        }
    }, [customer.id]);

    // --- Hämta Ärenden ---
    const fetchCases = useCallback(async () => {
        if (!customer?.id) return;
        setLoadingCases(true);
        try {
            const { data, error } = await supabase
                .from("cases")
                .select(`*, service_type:service_type_id(name, description)`)
                .eq("customer_id", customer.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setCases(data as Case[] || []);
        } catch (err) {
            console.error("Error fetching cases:", err);
            toast({ title: "Fel", description: "Kunde inte hämta ärenden", variant: "destructive" });
        } finally {
            setLoadingCases(false);
        }
    }, [customer?.id, toast]);

    // --- Hämta Kommentarer ---
    const fetchComments = useCallback(async (caseId: string) => {
        setLoadingComments(true);
        try {
            const { data, error } = await supabase
                .from("case_comments")
                .select(`*, author:customers(name)`) // Joina med kunder för att få namn
                .eq("case_id", caseId)
                .order("created_at", { ascending: true });

            if (error) throw error;
            setComments(data as Comment[] || []);
        } catch (err) {
            console.error("Error fetching comments:", err);
            setComments([]);
        } finally {
            setLoadingComments(false);
        }
    }, []);

    const fetchCaseDocuments = useCallback(async (caseId: string) => {
        setLoadingCaseDocuments(true);
        try {
            const { data, error } = await supabase.functions.invoke("case-list-documents", {
                body: { case_id: caseId },
            });
            if (error) throw error;
            if ((data as any)?.ok !== true) throw new Error((data as any)?.error || "Kunde inte hämta dokument");

            const docs = (data as any)?.documents;
            setCaseDocuments(Array.isArray(docs) ? (docs as CaseDocument[]) : []);
        } catch (err) {
            console.error("Error fetching case documents:", err);
            setCaseDocuments([]);
        } finally {
            setLoadingCaseDocuments(false);
        }
    }, []);
    
    // --- Hämta Värderingar ---
    const fetchValuations = useCallback(async () => {
        if (!customer?.id) return;
        setLoadingValuations(true);
        try {
            const { data, error } = await supabase.rpc("customer_get_my_valuations");
            if (error) throw error;
            setValuations(data as Valuation[] || []);
        } catch (err) {
            console.error("Error fetching valuations:", err);
            toast({ title: "Fel", description: "Kunde inte hämta värderingar", variant: "destructive" });
        } finally {
            setLoadingValuations(false);
        }
    }, [customer?.id, toast]);

    // --- Hämta fullmakter för kund ---
    const fetchDocuments = useCallback(async () => {
        setLoadingDocuments(true);
        try {
            const { data: authData, error: authError } = await supabase.auth.getUser();
            if (authError || !authData.user) throw authError || new Error('Ingen användare');
            const userId = authData.user.id;

            const { data, error } = await supabase
                .from('fullmakter')
                .select('id, fullmaktsgivare, file_name, dokument_url, created_at')
                .eq('fullmaktsgivare', userId)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;
            const mapped: FullmaktDocument[] = (data || []).map((d: any) => ({
                id: d.id,
                customer_id: d.fullmaktsgivare,
                file_name: d.file_name,
                storage_path: d.dokument_url,
                created_at: d.created_at,
            }));
            setDocuments(mapped);
        } catch (err) {
            console.error('Kunde inte hämta fullmakter:', err);
            toast({ title: 'Fel', description: 'Kunde inte ladda fullmakter.', variant: 'destructive' });
            setDocuments([]);
        } finally {
            setLoadingDocuments(false);
        }
    }, [toast]);

    // Hämta dokument när dialog öppnas
    useEffect(() => {
        if (isFullmaktDialogOpen) fetchDocuments();
    }, [isFullmaktDialogOpen, fetchDocuments]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
    };

    const handleUploadFullmakt = async () => {
        if (!selectedFile) {
            toast({ title: 'Varning', description: 'Välj en fil att ladda upp.', variant: 'destructive' });
            return;
        }
        setUploading(true);
        try {
            const ext = (selectedFile.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';

            // 1) Ask Edge Function for signed upload token + path
            const { data, error } = await supabase.functions.invoke('fullmakt-create-upload', {
                body: { file_ext: ext, mime_type: selectedFile.type || null },
            });
            if (error) throw error;
            if (!(data as any)?.ok) throw new Error((data as any)?.error || 'Kunde inte initiera uppladdning');

            const path = (data as any).path as string;
            const token = (data as any).token as string;

            // 2) Upload to signed URL
            const { error: upErr } = await supabase.storage
                .from('fullmakts-filer')
                .uploadToSignedUrl(path, token, selectedFile);
            if (upErr) throw upErr;

            // 3) Attach document row in DB (server-side)
            const { data: attachData, error: attachErr } = await supabase.functions.invoke('fullmakt-attach', {
                body: { path, file_name: selectedFile.name, fullmaktstyp: 'uppladdning' },
            });
            if (attachErr) throw attachErr;
            if ((attachData as any)?.ok !== true) throw new Error((attachData as any)?.error || 'Kunde inte spara dokument');

            toast({ title: 'Uppladdning klar', description: `${selectedFile.name} sparad.`, variant: 'default' });
            setSelectedFile(null);
            await fetchDocuments();
        } catch (err) {
            console.error('Uppladdning/DB-fel:', err);
            toast({ title: 'Fel', description: 'Kunde inte ladda upp fil eller spara referens.', variant: 'destructive' });
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (doc: FullmaktDocument) => {
        if (!doc?.storage_path) {
            toast({ title: 'Fel', description: 'Ingen sökväg för dokumentet.', variant: 'destructive' });
            return;
        }
        try {
            const { data, error } = await supabase.storage
                .from('fullmakts-filer')
                .createSignedUrl(doc.storage_path, 60);
            if (error) throw error;
            const url = (data as any)?.signedUrl ?? (data as any)?.signed_url;
            if (!url) throw new Error('Ingen giltig länk');
            window.open(url, '_blank');
        } catch (err) {
            console.error('Nedladdning misslyckades:', err);
            toast({ title: 'Fel', description: 'Kunde inte skapa nedladdningslänk.', variant: 'destructive' });
        }
    };

    const handleDeleteDocument = async (doc: FullmaktDocument) => {
        if (!doc?.id) {
            toast({ title: 'Fel', description: 'Saknar dokument-id.', variant: 'destructive' });
            return;
        }

        if (!confirm('Vill du ta bort detta dokument?')) return;

        setDeletingDocumentId(doc.id);
        try {
            const { data: authData, error: authError } = await supabase.auth.getUser();
            if (authError || !authData.user) throw authError || new Error('Ingen användare');
            const userId = authData.user.id;

            // Soft delete in DB (customer should NOT physically delete the file in Storage).
            const now = new Date().toISOString();
            const { error: dbError } = await supabase
                .from('fullmakter')
                .update({ deleted_at: now, deleted_by: userId })
                .eq('id', doc.id)
                .eq('fullmaktsgivare', userId)
                .is('deleted_at', null);
            if (dbError) throw dbError;

            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
            toast({ title: 'Borttaget', description: 'Dokumentet är borttaget för dig.' });
        } catch (err) {
            console.error('Borttagning misslyckades:', err);
            toast({ title: 'Fel', description: 'Kunde inte ta bort dokumentet.', variant: 'destructive' });
        } finally {
            setDeletingDocumentId(null);
        }
    };

    // --- Ladda kommentarer när ärende väljs ---
    useEffect(() => {
        if (selectedCase?.id) {
            fetchComments(selectedCase.id);
            fetchCaseDocuments(selectedCase.id);
        } else {
            setComments([]);
            setCaseDocuments([]);
        }
    }, [selectedCase?.id, fetchComments, fetchCaseDocuments]);
    
    return (
        <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* 1. Portal Stats (Krav: Status på ärenden) */}
                <Card className="shadow-lg bg-gradient-to-br from-sky-50 to-white">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-trust-blue">Din Översikt</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        {/* Notera: PortalStats är oftast för admin. Om du vill visa kundens unika stats här,
                            behöver PortalStats anpassas för att ta emot customer.id och filtrera,
                            eller så kan du bygga en enklare vy här. För nu antar vi att PortalStats kan visa relevanta kunddata. */}
                        <PortalStats />
                    </CardContent>
                </Card>

                {/* 2. Värderingshantering (Krav: Verktyget ska ligga ovanför ärenden) */}
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-trust-blue">Mina Värderingar</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ValuationManager valuations={valuations} onDataUpdated={fetchValuations} customerId={customer.id} />

                                             

                                            
                    </CardContent>
                </Card>

                               {/* 4. Mina Fullmakter (NY SEKTION för kunden) */}
              {/* Knapp före tips-texten */}
              <div className="mt-4">
                <div className="flex justify-center mb-4">
                  <Button
                    onClick={() => setTemplatesOpen(true)}
                    className="bg-gradient-to-r from-trust-blue to-blue-500 text-white px-4 py-2 rounded-full shadow-md hover:scale-102 transform transition"
                  >
                    Hämta fullmaktsmallar
                  </Button>
                </div>
              </div>

              {/* Tip: flyttat ovanför fullmakt-cardet så den syns bättre */}
              <div className="w-full bg-gradient-to-r from-blue-50 to-white border-t border-blue-100">
                <div className="max-w-4xl mx-auto px-4 py-2 text-sm text-gray-600">
                  Tips: Använd våra färdiga mallar för snabbare hantering — klicka på "Hämta fullmaktsmallar".
                </div>
              </div>
                  <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
                                                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle>Fullmaktsmallar</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="p-4 space-y-4">
                                                            <p className="text-sm text-gray-600">Välj en mall för att ladda ner. Mallarna öppnas i ny flik.</p>
                                                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                                                <p className="text-sm text-yellow-800">
                                                                    <strong>Obs:</strong> Vissa mallar kan vara under utveckling och inte tillgängliga än.
                                                                </p>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-3">
                                                                {(fullmaktTemplates.length ? fullmaktTemplates : [
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
                                                            <Button variant="secondary" onClick={() => setTemplatesOpen(false)}>Stäng</Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                 <CollapsibleCard
                     title={
                         <div className="flex items-center">
                             <FileText className="w-5 h-5 mr-2 text-gray-600" />
                             <span className="font-bold text-lg">Fullmakter</span>
                         </div>
                     }
                     className="shadow-lg"
                 >
                     <div className="pt-2">
                          <Button onClick={() => setIsFullmaktDialogOpen(true)} className="bg-trust-blue hover:bg-trust-blue/90">
                             Mina Fullmakter / Dokument
                          </Button>
                          <p className="text-sm text-gray-600 mt-2">Här kan du se och ladda upp fullmakter.</p>
                     </div>
                 </CollapsibleCard>



                {/* 5. Ärendehantering (Krav: Fällbara kort, ingen Nytt ärende-knapp) */}
                <CollapsibleCard
                    defaultOpen
                    title={
                        <div className="flex items-center">
                            <Briefcase className="w-5 h-5 mr-2 text-gray-600" />
                            <span className="font-bold text-lg">Mina Ärenden</span>
                        </div>
                    }
                    className="shadow-lg"
                >
                    {loadingCases ? (
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-trust-blue" />
                            <p className="text-xl text-gray-700 ml-2">Laddar ärenden...</p>
                        </div>
                    ) : cases.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">Inga ärenden hittades.</p>
                    ) : (
                        <div className="grid gap-4 mt-4">
                            {cases.map((caseItem) => (
                                <Card
                                    key={caseItem.id}
                                    className={`cursor-pointer hover:shadow-md transition-shadow ${selectedCase?.id === caseItem.id ? "border-2 border-trust-blue bg-blue-50" : "border-gray-200"}`}
                                    onClick={() => setSelectedCase(selectedCase?.id === caseItem.id ? null : caseItem)} // Stäng/öppna
                                >
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className="font-semibold text-lg">{caseItem.title}</h3>
                                            <Badge className={`${getStatusColor(caseItem.status)} text-sm`}>
                                                {getStatusText(caseItem.status)}
                                            </Badge>
                                        </div>
                                        {selectedCase?.id === caseItem.id && (
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                                {/* Ärendeinformation */}
                                                <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-700 mb-4">
                                                    <p className="flex items-center"><Briefcase className="w-4 h-4 mr-2" /> <strong>Tjänst:</strong> {caseItem.service_type?.name || "Okänd"}</p>
                                                    {caseItem.scheduled_date && (
                                                        <p className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> <strong>Schemalagt:</strong> {format(new Date(caseItem.scheduled_date), "dd MMM yyyy", { locale: sv })}</p>
                                                    )}
                                                    {caseItem.address && (
                                                        <p className="flex items-center"><MapPin className="w-4 h-4 mr-2" /> <strong>Adress:</strong> {caseItem.address}</p>
                                                    )}
                                                    
                                                    <p className="col-span-2 text-gray-600 mt-2 whitespace-pre-wrap">{caseItem.description}</p>
                                                </div>

                                                {/* Kommentarer */}
                                                <h4 className="font-semibold text-md mb-3 flex items-center">
                                                    <MessageSquare className="w-4 h-4 mr-2 text-gray-600" /> Kommunikationshistorik
                                                </h4>

                                                <div className="space-y-6" onClick={(e) => e.stopPropagation()}>
                                                    {loadingComments && (
                                                        <div className="text-sm text-muted-foreground">Laddar kommentarer…</div>
                                                    )}
                                                    <CaseCommentsThread
                                                        caseId={caseItem.id}
                                                        currentUserId={user?.id}
                                                        isAdmin={false}
                                                        comments={comments}
                                                        onRefresh={async () => {
                                                            await fetchComments(caseItem.id);
                                                        }}
                                                        canComment={true}
                                                    />

                                                    {loadingCaseDocuments ? (
                                                        <div className="text-sm text-muted-foreground">Laddar dokument…</div>
                                                    ) : (
                                                        <CaseDocumentsSection
                                                            caseId={caseItem.id}
                                                            documents={caseDocuments}
                                                            canUpload={true}
                                                            onRefresh={async () => {
                                                                await fetchCaseDocuments(caseItem.id);
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            </div>

                                            
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CollapsibleCard>

                 {/* 3. Kundinformation (Krav: Kund ska kunna redigera sin information) */}
                <CollapsibleCard
                    defaultOpen={false}
                    title={
                        <div className="flex items-center">
                            <User className="w-5 h-5 mr-2 text-gray-600" />
                            <span className="font-bold text-lg">Mina Uppgifter</span>
                        </div>
                    }
                    className="shadow-lg"
                >
                    <div className="space-y-4 pt-2">
                        <div>
                            <Label htmlFor="name">Namn</Label>
                            <Input id="name" name="name" value={editingCustomer.name} onChange={handleInputChange} />
                        </div>
                        <div>
                            <Label htmlFor="email">E-post</Label>
                            <Input id="email" name="email" value={editingCustomer.email || ""} onChange={handleInputChange} />
                        </div>
                        <div>
                            <Label htmlFor="phone">Telefon</Label>
                            <Input id="phone" name="phone" value={editingCustomer.phone || ""} onChange={handleInputChange} />
                        </div>
                        <div>
                            <Label htmlFor="personal_number">Personnummer</Label>
                            <Input id="personal_number" name="personal_number" value={editingCustomer.personal_number || ""} onChange={handleInputChange} />
                        </div>
                        <Button
                          onClick={() => handleUpdateCustomer()}
                          disabled={loadingSave}
                          className="w-full bg-trust-blue hover:bg-trust-blue/90"
                        >
                          {loadingSave ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Spara"}
                        </Button>

                        {/* Ändra lösenord-sektion */}
                        <div className="border-t pt-4 mt-4">
                          <h4 className="font-semibold mb-3">Ändra lösenord</h4>
                          <ChangePasswordSection />
                        </div>
                    </div>
                </CollapsibleCard>


            </div>
            
            {/* Fullmakt Dialog för Kunden */}
            {isFullmaktDialogOpen && (
                <Dialog open={true} onOpenChange={setIsFullmaktDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Mina Fullmakter och Dokument</DialogTitle>
                        </DialogHeader>
                        <div className="p-4 border rounded-md bg-gray-50 space-y-4">
                            <p className="text-gray-700">Här visas fullmakter och dokument kopplade till dina ärenden. </p>

                            <div className="border rounded p-4 bg-white">
                                <h4 className="font-semibold mb-2">Ladda upp ny fullmakt</h4>
                                <div className="flex items-center gap-2">
                                    <Input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
                                    <Button onClick={handleUploadFullmakt} disabled={!selectedFile || uploading} className="bg-trust-blue hover:bg-trust-blue/90">
                                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ladda upp'}
                                    </Button>
                                </div>
                                {selectedFile && <p className="text-sm text-gray-600 mt-2">Vald fil: {selectedFile.name}</p>}
                            </div>

                            <div>
                                <h4 className="font-semibold mb-2">Befintliga dokument</h4>
                                {loadingDocuments ? (
                                    <div className="text-sm text-gray-500">Laddar dokument...</div>
                                ) : documents.length === 0 ? (
                                    <div className="text-sm text-gray-500">Inga dokument hittades.</div>
                                ) : (
                                    <ul className="space-y-2">
                                        {documents.map((doc) => (
                                            <li key={doc.id} className="flex items-center justify-between bg-white p-3 rounded shadow-sm">
                                                <div>
                                                    <div className="font-medium truncate max-w-[320px]">{doc.file_name}</div>
                                                    <div className="text-xs text-gray-500">Uppladdad: {doc.created_at ? format(new Date(doc.created_at), 'dd MMM yyyy', { locale: sv }) : ''}</div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>Ladda ner</Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        disabled={deletingDocumentId === doc.id}
                                                        onClick={() => handleDeleteDocument(doc)}
                                                    >
                                                        {deletingDocumentId === doc.id ? 'Tar bort…' : 'Ta bort'}
                                                    </Button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="flex justify-end">
                                <Button variant="secondary" onClick={() => setIsFullmaktDialogOpen(false)}>Stäng</Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

            {/* 6. Tidio */}
            <div className="fixed bottom-4 right-4 z-50 pointer-events-auto">
                <Tidio/>
            </div>
        </div>
    );
};

export default CustomerPortal;