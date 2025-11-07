// src/components/admin/AdminPortal.tsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogOut, X, MessageSquare } from "lucide-react";
import NewCaseForm from "../NewCaseForm";
import CustomerDialog from "../CustomerDialog";
import Tidio from "@/components/Tidio";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ContactRequestDialog from "../ContactRequestDialog"; // justera sökväg om du använder alias
import type { Customer, Case, ServiceType, ContactRequest, Subscription, Valuation } from '../../types'; 
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import ValueEstimator from "@/components/ValueEstimator";



// --- Status kundförfrågan ---
const getStatusBadge = (status?: string) => {
  const normalized = (status ?? '').toLowerCase().trim();
  switch(normalized){
    case 'new': case 'ny': case 'nytt': return { text: 'Ny', colorClass: 'bg-blue-500 hover:bg-blue-600 text-white' };
    case 'contacted': case 'kontaktad': return { text: 'Kontaktad', colorClass: 'bg-yellow-500 hover:bg-yellow-600 text-black' };
    case 'declined': case 'avböjd': return { text: 'Avböjd', colorClass: 'bg-gray-600 hover:bg-gray-700 text-white' };
    case 'converted': case 'kund': return { text: 'Kund', colorClass: 'bg-green-500 hover:bg-green-600 text-white' };
    //case 'closed': case 'stängd': return { text: 'Stängd', colorClass: 'bg-gray-600 hover:bg-gray-700 text-white' };
    // legacy / other cases (keep existing mappings)
    case 'pending': case 'in_progress': case 'pågående': return { text: 'Pågående', colorClass: 'bg-yellow-500 hover:bg-yellow-600 text-black' };
    case 'completed': case 'avslutat': return { text: 'Avslutat', colorClass: 'bg-green-500 hover:bg-green-600 text-white' };
    case 'waiting': case 'väntar': return { text: 'Väntar', colorClass: 'bg-red-500 hover:bg-red-600 text-white' };
    case 'cancelled': case 'avbrutet': return { text: 'Avbrutet', colorClass: 'bg-gray-600 hover:bg-gray-700 text-white' };
    default: return { text: status ?? 'Okänd', colorClass: 'bg-gray-400 hover:bg-gray-500 text-white' };
  }
};

// --- ADMIN PORTAL ---
const AdminPortal: React.FC = () => {
  const { customer, signOut } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);

  // DATA STATES
  const [cases, setCases] = useState<Case[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [loadingVals, setLoadingVals] = useState(false);
  const [caseComments, setCaseComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  // DIALOG STATES
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showCaseDialog, setShowCaseDialog] = useState(false);
  const [showEditInOverlay, setShowEditInOverlay] = useState(false);
  const [showNewCase, setShowNewCase] = useState(false);
  const [newCaseForCustomerId, setNewCaseForCustomerId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactRequest | null>(null);

  
  // EDIT CASE state (EN implementation)
  const [editCaseId, setEditCaseId] = useState<string | null>(null);
  const [editCase, setEditCase] = useState<Case | null>(null);

  // Öppna ärendet för redigering + ladda kommentarstråd
  const openCaseForEdit = async (c: Case) => {
    console.log('[AdminPortal] openCaseForEdit called id=', c?.id);
    setEditCaseId(c.id);
    setEditCase(c);
    setNewCaseForCustomerId(c.customer_id ?? null);
    try {
      if (c.id) await fetchCaseComments(c.id);
    } catch (err) {
      console.error("Failed to fetch comments before opening edit:", err);
    }
    setSelectedCase(c);
    setSelectedCaseId(c.id);
    setShowNewCase(true);
  };

  // Öppna dialog för att visa ärende och kommentarer
  const openCaseDialog = (c: Case) => {
    setSelectedCase(c);
    setSelectedCaseId(c.id);
    fetchCaseComments(c.id);
    setShowCaseDialog(true);
    setShowEditInOverlay(false);
  };
  const closeCaseDialog = () => {
    setShowCaseDialog(false);
    setSelectedCase(null);
    setEditCaseId(null);
  };

  // State för att skicka meddelande till kund (dialog)
  const [showCustomerMessageDialog, setShowCustomerMessageDialog] = useState(false);
  const [customerMessageText, setCustomerMessageText] = useState<string>("");

  // TAB STATE
    const [mainTab, setMainTab] = useState<"cases" | "subscriptions" | "valuations" | "customers" | "contact_requests" | "new" | "saved">("cases");

  // Map för snabb uppslagning av kunder
  const customerMap = useMemo(() => customers.reduce((acc, c) => { acc[c.id] = c; return acc; }, {} as Record<string, Customer>), [customers]);

  // Derived aktuell vald kund från id (kan vara null)
  const selectedCustomer = selectedCustomerId ? customerMap[selectedCustomerId] : null;

  // --- FETCH FUNCTIONS ---
  const fetchCustomers = useCallback(async () => {
    const { data, error } = await supabase.from("customers").select("*").order("name", { ascending: false });
    if (error) console.error(error); else setCustomers(data || []);
  }, []);

  const fetchCases = useCallback(async () => {
    const { data, error } = await supabase.from("cases").select("*, service_type:service_type_id(*)").order("created_at", { ascending: false });
    if (error) console.error(error); else setCases(data || []);
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    const { data, error } = await supabase.from("subscriptions").select("*").order("created_at", { ascending: false });
    if (error) console.error(error); else setSubscriptions(data || []);
  }, []);

  // Hämta alla värderingar

  const fetchAllValuations = useCallback(async () => {
    const { data, error } = await supabase.from("valuations").select("*").order("created_at", { ascending: false });
    if (error) console.error(error); else setValuations(data || []);
  }, []);

// Värderingsfunktionen

    const fetchCustomerValuations = async () => {
      if (!customer?.id) return;
      setLoadingVals(true);
      try {
        const { data, error } = await supabase
          .from("valuations")
          .select("*")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false });
  
        if (error) throw error;
        setValuations(data || []);
      } catch (error) {
        console.error("Error fetching valuations:", error);
        setValuations([]);
        toast({
          title: "Fel",
          description: "Kunde inte hämta värderingar",
          variant: "destructive",
        });
      } finally {
        setLoadingVals(false);
      }
    };
  
    // Ta bort en värdering 
        const deleteValuation = async (id: string | number) => {
          if (!window.confirm("Vill du verkligen ta bort denna värdering?")) return;
          setLoadingVals(true);
          try {
            // pass the id as-is (string or number) to Supabase; normalization is done for local state filtering
            const { error } = await supabase.from("valuations").delete().eq("id", id);
            if (error) throw error;
            // Normalize both sides to string to avoid comparing incompatible types (number vs string)
            setValuations((prev) => prev.filter((v) => String(v.id) !== String(id)));
            toast({ title: "Raderad", description: `Värdering #${String(id)} togs bort.` });
          } catch (err: any) {
            console.error("Delete valuation error:", err);
            toast({ title: "Fel", description: String(err?.message ?? err), variant: "destructive" });
          } finally {
            setLoadingVals(false);
          }
        };
  

  const fetchContactRequests = useCallback(async () => {
    const { data, error } = await supabase.from("contact_requests").select("*").order("created_at", { ascending: false });
    if (error) console.error(error); else setContactRequests(data || []);
  }, []);

  const fetchCaseComments = async (caseId: string) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("case_comments")
        .select(`
          *,
          author:customers(name)
        `)
        .eq("case_id", caseId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setCaseComments(data || []);
    } catch (err) {
      console.error("Error fetching comments:", err);
      setCaseComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !selectedCase) return;
    try {
      const { error } = await supabase
        .from("case_comments")
        .insert({
          case_id: selectedCase.id,
          author_id: null,
          author_type: "admin",
          content: newComment.trim(),
        });

      if (error) throw error;
      setNewComment("");
      await fetchCaseComments(selectedCase.id);
      toast({ title: "Kommentar tillagd", description: "Kommentaren har skickats" });
    } catch (err: any) {
      console.error("Error adding comment:", err);
      toast({ title: "Fel", description: "Kunde inte skicka kommentar", variant: "destructive" });
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchCustomers(), fetchCases(), fetchSubscriptions(), fetchAllValuations(), fetchContactRequests()]);
      setLoading(false);
    };
    fetchAll();
  }, [fetchCustomers, fetchCases, fetchSubscriptions, fetchAllValuations, fetchContactRequests]);

  // --- NEW CASE ---
  const openNewCaseForm = (customerId?: string) => {
    setMainTab("cases");
    setEditCaseId(null);
    setEditCase(null);
    setSelectedCase(null);
    setSelectedCaseId(null);
    setCaseComments([]);
    setNewCaseForCustomerId(customerId ?? null);
    setShowNewCase(true);
  };
  const closeNewCaseForm = () => { setShowNewCase(false); setNewCaseForCustomerId(null); setEditCaseId(null); setEditCase(null); setSelectedCase(null); setSelectedCaseId(null); setCaseComments([]); };

  const handleNewCaseFromCustomer = (customerId: string) => { openNewCaseForm(customerId); };

  // --- STATUS UPDATES ---
  const updateCaseStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("cases").update({ status }).eq("id", id);
    if (error) toast({ title: "Fel", description: "Kunde inte uppdatera status", variant: "destructive" });
    else fetchCases();
  };
  const updateSubscriptionStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("subscriptions").update({ status }).eq("id", id);
    if (error) toast({ title: "Fel", description: "Kunde inte uppdatera abonnemang", variant: "destructive" });
    else fetchSubscriptions();
  };
  const updateContactRequestStatus = async (id: string, status?: string) => {
    const { error } = await supabase.from("contact_requests").update({ status }).eq("id", id);
    if (error) toast({ title: "Fel", description: "Kunde inte uppdatera kontakt", variant: "destructive" });
    else fetchContactRequests();
  };

  const openCustomerMessageDialog = (customerId?: string) => {
    if (customerId) setSelectedCustomerId(customerId);
    setCustomerMessageText("");
    setShowCustomerMessageDialog(true);
  };
  const closeCustomerMessageDialog = () => {
    setShowCustomerMessageDialog(false);
    setCustomerMessageText("");
  };

  const handleSendCustomerMessage = async () => {
    if (!selectedCustomerId) {
      toast({ title: "Fel", description: "Ingen kund vald", variant: "destructive" });
      return;
    }
    if (!customerMessageText.trim()) {
      toast({ title: "Fel", description: "Meddelandet får inte vara tomt", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("customer_comments").insert({
      customer_id: selectedCustomerId,
      comment: customerMessageText.trim(),
      created_at: new Date().toISOString(),
    });
    if (error) {
      toast({ title: "Fel", description: "Kunde inte skicka meddelande", variant: "destructive" });
      return;
    }
    toast({ title: "Skickat", description: "Meddelandet skickades till kunden." });
    closeCustomerMessageDialog();
  };

  const openContactDialog = (c: ContactRequest) => {
    setSelectedContact(c);
    setShowContactDialog(true);
  };
  const closeContactDialog = () => {
    setShowContactDialog(false);
    setSelectedContact(null);
  };

  useEffect(() => {
    if (showCustomerDialog) console.log('[AdminPortal] showCustomerDialog for selectedCustomerId=', selectedCustomerId);
  }, [showCustomerDialog, selectedCustomerId]);

  // --- KONVERTERA KONTAKT TILL KUND (insert -> delete contact row) ---
  const convertContactToCustomer = async (c: ContactRequest) => {
    try {
      console.log("[AdminPortal] convertContactToCustomer", c.id);
      // Build payload mapping contact fields to customers table
      const payload: any = {
        name: ( (c as any).name ) || `${(c as any).firstname ?? ""} ${(c as any).lastname ?? ""}`.trim() || '',
        email: (c as any).email ?? null,
        phone: (c as any).phone ?? null,
        address: (c as any).address ?? null,
        personal_number: (c as any).personal_number ?? null,
        created_at: new Date().toISOString(),
        // optional: source_contact_id to trace origin (if you add column to customers)
        // source_contact_id: c.id,
      };

      const { data: newCustomer, error: insertErr } = await supabase
        .from("customers")
        .insert([payload])
        .select()
        .single();

      if (insertErr) {
        console.error("Failed to create customer from contact:", insertErr);
        toast({ title: "Fel", description: "Kunde inte skapa kund", variant: "destructive" });
        return;
      }

      // Remove the contact request row after successful creation
      const { error: deleteErr } = await supabase
        .from("contact_requests")
        .delete()
        .eq("id", c.id);

      if (deleteErr) {
        console.error("Failed to delete contact request after conversion:", deleteErr);
        // Not fatal for customer creation, but inform admin
        toast({ title: "Varning", description: "Kunden skapades men kontakten kunde inte tas bort.", variant: "default" });
      } else {
        // Refresh contact list
        await fetchContactRequests();
      }

      toast({ title: "Konverterad", description: "Kontakt konverterad till kund" });
      await fetchCustomers();

      if (newCustomer?.id) {
        setSelectedCustomerId(newCustomer.id);
        setShowCustomerDialog(true);
      }
    } catch (err) {
      console.error("convertContactToCustomer error:", err);
      toast({ title: "Fel", description: "Konvertering misslyckades", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Tidio />

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">Admin Portal</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-700">Inloggad som: {customer?.email ?? "Ingen inloggad"}</span>
            <Button onClick={signOut} size="sm" variant="ghost">
              <LogOut className="w-4 h-4 mr-2" /> Logga ut
            </Button>
          </div>
        </div>
        </header>
        
          {/*VÄRDERINGSFUNKTION */}
                    
                    {mainTab === "new" ? (
                      <div className="mb-6">
                        <ValueEstimator
                          customerId={customer?.id}
                          onSaved={() => {
                            setMainTab("valuations");
                            fetchAllValuations();
                          }}
                          onOpenSaved={() => {
                            setMainTab("valuations");
                            fetchAllValuations();
                          }}
                          onNew={() => {
                            setMainTab("new");
                          }}
                        />
                      </div>
                    ) : (
                      <div className="mb-6">
                        <div className="mb-3">
                          <Button onClick={() => setMainTab("new")} variant="outline" size="sm">
                            Tillbaka
                          </Button>
                        </div>
                        {loadingVals ? (
                           <p className="text-warm-gray">Laddar sparade värderingar…</p>
                         ) : valuations.length === 0 ? (
                           <p className="text-warm-gray">Inga sparade värderingar.</p>
                         ) : (
                           <div className="grid gap-4">
                             {valuations.map((v) => (
                               <div key={String(v.id)} className="p-4 border rounded bg-white">
                                 <div className="flex items-start gap-4">
                                   <div className="flex-shrink-0">
                                     <button
                                       onClick={() => deleteValuation(v.id)}
                                       className="text-gray-400 hover:text-red-600"
                                       title="Ta bort värdering"
                                     >
                                       <X className="w-4 h-4" />
                                     </button>
                                   </div>
            
                                   <div className="flex-1">
                                     <div className="text-sm font-medium">Värdering #{String(v.id)}</div>
                                     <div className="text-xs text-gray-500">
                                       {v.created_at ? new Date(v.created_at).toLocaleString("sv-SE") : ""}
                                     </div>
                                     <div className="mt-2 flex items-center gap-4">
                                       {v.image_urls && v.image_urls.length > 0 ? (
                                         <img src={v.image_urls[0]} alt={`val-${v.id}-img`} className="w-16 h-16 object-cover rounded-md border" />
                                       ) : (
                                         <div className="w-16 h-16 bg-gray-50 rounded-md flex items-center justify-center text-xs text-warm-gray">Ingen bild</div>
                                       )}
                                       <div className="text-xs text-gray-600">
                                         {(() => {
                                           const text = (v as any).analysis_result ?? (v as any).analysis ?? "";
                                           try {
                                             const parsed = typeof text === "string" ? JSON.parse(text) : text;
                                             return parsed?.foremal_beskrivning ?? parsed?.motivering ?? String(text);
                                           } catch {
                                             return String(text);
                                           }
                                         })()}
                                       </div>
                                     </div>
                                   </div>
                                 </div>
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                     )}

      {/* Huvudinnehåll */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as any)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white shadow-md rounded-lg p-1">
            <TabsTrigger value="cases">Ärenden ({cases.length})</TabsTrigger>
            <TabsTrigger value="subscriptions">Abonnemang ({subscriptions.length})</TabsTrigger>
            <TabsTrigger value="valuations">Värderingar ({valuations.length})</TabsTrigger>
            <TabsTrigger value="customers">Kunder ({customers.length})</TabsTrigger>
            <TabsTrigger value="contact_requests">Kontakt ({contactRequests.length})</TabsTrigger>
          </TabsList>

          {/* Ärenden */}
          <TabsContent value="cases">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Ärenden</h2>
              <Button type="button" onClick={(e) => { e.stopPropagation(); openNewCaseForm(); }} className="px-3 py-2 bg-blue-600 text-white rounded">Nytt ärende</Button>
            </div>
            {cases.length === 0 ? <p>Inga ärenden hittades.</p> :
              <div className="flex gap-6">
                {/* Lista (vänster) */}
                <div className="flex-1 grid gap-4">
                  {cases.map(c => {
                    const badge = getStatusBadge(c.status);
                    return (
                      <Card key={c.id} className="hover:shadow-lg cursor-pointer" onClick={() => {
                        // reuse your open/edit flow
                        setSelectedCase(c);
                        setSelectedCaseId(c.id);
                        fetchCaseComments(c.id);
                        setShowNewCase(true);
                      }}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{c.title}</h3>
                              <p className="text-sm text-gray-500">Kund: {c.customer_id ? (customerMap[c.customer_id]?.name ?? 'Okänd') : 'Okänd'}</p>
                            </div>
                            <Badge className={badge.colorClass}>{badge.text}</Badge>
                          </div>
                          <p className="text-sm mt-2 line-clamp-2">{c.description}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Sidopanel (höger) — visar selectedCase och kommentarer */}
                <div className="w-1/3">
                  {selectedCase ? (
                    <Card className="flex flex-col h-full">
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <MessageSquare className="w-5 h-5 mr-2" />
                          Kommentarer
                        </CardTitle>
                        <CardDescription>Kommunicera om ärendet: {selectedCase.title}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <div className="space-y-4 mb-6 overflow-auto flex-1">
                          {loadingComments ? (
                            <div className="text-center text-warm-gray">Laddar kommentarer...</div>
                          ) : (
                            caseComments.map((comment) => (
                              <div key={comment.id} className={`p-3 rounded-lg ${comment.author_type === "customer" ? "bg-trust-blue/10 ml-4" : "bg-gray-100 mr-4"}`}>
                                <div className="flex justify-between items-start mb-2">
                                  <span className="text-sm font-medium">
                                    {comment.author_type === "customer" ? (comment.author?.name ?? "Kund") : "Trygg Hand"}
                                  </span>
                                  <span className="text-xs text-warm-gray">
                                    {comment.created_at ? format(new Date(comment.created_at), "dd MMM HH:mm", { locale: sv }) : ""}
                                  </span>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                              </div>
                            ))
                          )}
                        </div>
                        <div className="space-y-3">
                          <Textarea placeholder="Skriv en kommentar..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="min-h-[80px]" />
                          <Button onClick={addComment} disabled={!newComment.trim() || loadingComments} className="w-full">Skicka kommentar</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="flex items-center justify-center">
                        <p className="text-warm-gray">Välj ett ärende för att se kommentarer</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            }
          </TabsContent>

          {/* Abonnemang */}
          <TabsContent value="subscriptions">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Abonnemang</h2>
            </div>
            {subscriptions.length === 0 ? <p>Inga abonnemang hittades.</p> :
              <div className="grid gap-4">
                {subscriptions.map(s => {
                  const customerName = s.customer_id ? customerMap[s.customer_id]?.name : 'Okänd kund';
                  return (
                    <Card key={s.id} className="cursor-pointer hover:shadow-lg">
                      <CardContent className="p-4 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{s.category}</p>
                            <p className="text-sm text-gray-500">Kund: {customerName}</p>
                            {s.provider && <p className="text-xs text-gray-500">Leverantör: {s.provider}</p>}
                          </div>
                          <Badge variant="secondary">{s.status}</Badge>
                        </div>
                        <Select value={s.status} onValueChange={(v) => { updateSubscriptionStatus(s.id, v); }}>
                          <SelectTrigger className="mt-2 w-[140px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Väntande</SelectItem>
                            <SelectItem value="in_progress">Pågår</SelectItem>
                            <SelectItem value="completed">Avslutad</SelectItem>
                            <SelectItem value="cancelled">Avbruten</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" onClick={() => openNewCaseForm(s.customer_id)}>Nytt ärende för kund</Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            }
          </TabsContent>

          {/* Värderingar */}
          <TabsContent value="valuations">
            <h2 className="text-2xl font-bold mb-4">Värderingar</h2>
            {valuations.length === 0 ? <p>Inga värderingar skapade ännu.</p> :
              <div className="grid gap-4">
                {valuations.map(v => {
                  const date = v.created_at ? new Date(v.created_at) : null;
                  const images = v.image_urls ?? [];
                  return (
                    <Card key={v.id} className="p-4 relative">
                      <button className="absolute top-2 right-2 text-gray-400 hover:text-red-600"><X className="w-4 h-4"/></button>
                      <p className="font-medium">{v.name || ''}</p> {/* Removed "Namnlös värdering" label per request */}
                      <p className="text-sm text-gray-500">{date ? format(date, "dd MMM yyyy HH:mm", { locale: sv }) : '—'}</p>
                      <p className="text-sm mt-1">Kund: {v.customer_name ?? 'Okänd kund'}</p>
                      {images.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {images.map((url, i) => <img key={i} src={url} alt={`Bild ${i+1}`} className="w-16 h-16 object-cover rounded-md border" />)}
                        </div>
                      )}
                      <p className="text-sm mt-2 whitespace-pre-wrap">{(v as any).analysis_result ?? (v as any).analysis ?? ''}</p>
                    </Card>
                  );
                })}
              </div>
            }
          </TabsContent>

          {/* Kunder */}
          <TabsContent value="customers">
            <h2 className="text-2xl font-bold mb-4">Kunder</h2>
            {customers.length === 0 ? <p>Inga kunder hittades.</p> :
              <div className="grid gap-4">
                {customers.map(c => (
                  <Card
                    key={c.id}
                    className="cursor-pointer hover:shadow-lg flex justify-between items-center"
                    onClick={() => { setSelectedCustomerId(c.id); setShowCustomerDialog(true); }}
                  >
                    <CardContent className="flex justify-between items-center w-full">
                      <div>
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-sm">{c.email}</p>
                        {(c as any).personal_number && <p className="text-sm">Personnummer: {(c as any).personal_number}</p>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            }
          </TabsContent>

          {/* Kontakt */}
          <TabsContent value="contact_requests">
            <h2 className="text-2xl font-bold mb-4">Kontaktförfrågningar</h2>
            {contactRequests.length === 0 ? <p>Inga kontaktförfrågningar.</p> :
              <div className="grid gap-4">
                {contactRequests.map(r => {
                  const badge = getStatusBadge(r.status);
                  return (
                   <Card
                    key={r.id}
                    className="cursor-pointer hover:shadow-lg"
                    onClick={() => openContactDialog(r)} // öppnar dialogen
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            {/* show firstname/lastname if present, else name */}
                            <p className="font-semibold">{(r as any).name ? (r as any).name : `${(r as any).firstname ?? ''} ${(r as any).lastname ?? ''}`.trim()}</p>
                            <p className="text-sm text-gray-500">{r.email ?? ''}</p>
                          </div>
                          <Badge className={badge.colorClass}>{badge.text}</Badge>
                        </div>
                        <p className="text-sm mt-2 line-clamp-2">{r.message ?? ''}</p>
                        <Select value={r.status ?? 'new'} onValueChange={(v) => { updateContactRequestStatus(r.id, v ?? 'new'); }}>
                          <SelectTrigger className="mt-2 w-[140px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">Ny</SelectItem>
                            <SelectItem value="contacted">Kontaktad</SelectItem>
                            <SelectItem value="converted">Kund</SelectItem>
                            <SelectItem value="closed">Stängd</SelectItem>
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            }
          </TabsContent>
        </Tabs>
      </div>

      {/* === DIALOGS === */}
      {showCustomerDialog && selectedCustomer && (
        <CustomerDialog
          customer={selectedCustomer}
          onClose={() => { setShowCustomerDialog(false); setSelectedCustomerId(null); }}
          onCustomerUpdated={async () => { await fetchCustomers(); setShowCustomerDialog(false); }}
          onNewCase={(customerId: string) => { handleNewCaseFromCustomer(customerId); }}
          onOpenCase={ (c: Case) => {
            // optional: open case overlay from within customer dialog
            setSelectedCase(c);
            setShowCaseDialog(true);
          }}
        />
      )}

      {/* Case overlay (visas ovanpå kunddialogen) 712-789 är utmarkerad och ska tas bort om den nya fungerar
      {showCaseDialog && selectedCase && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold">{selectedCase.title}</h3>
                <p className="text-sm text-gray-500">Kund: {selectedCase.customer_id ? (customerMap[selectedCase.customer_id]?.name ?? 'Okänd') : 'Okänd'}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => { setShowEditInOverlay(true); setEditCase(selectedCase); }}>Redigera</Button>
                <button onClick={() => {
                  closeCaseDialog();
                }} className="text-gray-500 hover:text-gray-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {showEditInOverlay && editCase ? (
              <div className="max-h-[70vh] overflow-auto">
                <NewCaseForm
                  customers={customers}
                  defaultCustomerId={editCase.customer_id ?? undefined}
                  caseToEdit={editCase}
                  caseComments={caseComments}
                  fetchCaseComments={fetchCaseComments}
                  onCaseSaved={async () => {
                    await fetchCases();
                    if (editCase.id) await fetchCaseComments(editCase.id);
                    setShowEditInOverlay(false);
                  }}
                  onCancel={() => setShowEditInOverlay(false)}
                />
              </div>
            ) : (
             <div className="max-h-[60vh] overflow-auto space-y-4">
               <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedCase.description}</p>

               <div>
                 <h4 className="font-medium mb-2">Kommentarer</h4>
                 {loadingComments ? (
                   <p className="text-sm text-gray-500">Laddar kommentarer...</p>
                 ) : caseComments.length === 0 ? (
                   <p className="text-sm text-gray-500">Inga kommentarer</p>
                 ) : (
                   <div className="space-y-3">
                     {caseComments.map((comment) => (
                       <div key={comment.id} className={`p-3 rounded-lg ${comment.author_type === "customer" ? "bg-trust-blue/10 ml-4" : "bg-gray-100 mr-4"}`}>
                         <div className="flex justify-between items-start mb-2">
                           <span className="text-sm font-medium">
                             {comment.author_type === "customer" ? (comment.author?.name ?? "Kund") : "Trygg Hand"}
                           </span>
                           <span className="text-xs text-warm-gray">
                             {comment.created_at ? format(new Date(comment.created_at), "dd MMM HH:mm", { locale: sv }) : ""}
                           </span>
                         </div>
                         <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                       </div>
                     ))}
                   </div>
                 )}
                <div className="mt-4">
                  <Textarea placeholder="Skriv en kommentar..." value={newComment} onChange={(e) => setNewComment(e.target.value)} className="min-h-[80px]" />
                  <div className="flex justify-end gap-2 mt-2">
                    <Button onClick={addComment} disabled={!newComment.trim() || loadingComments}>Skicka kommentar</Button>
                  </div>
                </div>
               </div>
             </div>
            )}
            <div className="mt-4 flex gap-2 justify-end">
              <Button variant="ghost" onClick={closeCaseDialog}>Stäng</Button>
            </div>
          </div>
        </div>
      )}
*/}

{ /*795-926 är ersatt med overlay edit case and comment  */}
<AnimatePresence>
  {showCaseDialog && selectedCase && createPortal(
    <motion.div
      key="case-dialog"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 relative"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold">{selectedCase.title}</h3>
            <p className="text-sm text-gray-500">
              Kund: {selectedCase.customer_id
                ? (customerMap[selectedCase.customer_id]?.name ?? "Okänd")
                : "Okänd"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditInOverlay(true);
                setEditCase(selectedCase);
              }}
            >
              Redigera
            </Button>
            <button
              onClick={closeCaseDialog}
              className="text-gray-500 hover:text-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        {showEditInOverlay && editCase ? (
          <div className="max-h-[70vh] overflow-auto">
            <NewCaseForm
              customers={customers}
              defaultCustomerId={editCase.customer_id ?? undefined}
              caseToEdit={editCase}
              caseComments={caseComments}
              fetchCaseComments={fetchCaseComments}
              onCaseSaved={async () => {
                await fetchCases();
                if (editCase.id) await fetchCaseComments(editCase.id);
                setShowEditInOverlay(false);
              }}
              onCancel={() => setShowEditInOverlay(false)}
            />
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-auto space-y-4">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {selectedCase.description}
            </p>

            <div>
              <h4 className="font-medium mb-2">Kommentarer</h4>
              {loadingComments ? (
                <p className="text-sm text-gray-500">Laddar kommentarer...</p>
              ) : caseComments.length === 0 ? (
                <p className="text-sm text-gray-500">Inga kommentarer</p>
              ) : (
                <div className="space-y-3">
                  {caseComments.map((comment) => (
                    <div
                      key={comment.id}
                      className={`p-3 rounded-lg ${
                        comment.author_type === "customer"
                          ? "bg-trust-blue/10 ml-4"
                          : "bg-gray-100 mr-4"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium">
                          {comment.author_type === "customer"
                            ? comment.author?.name ?? "Kund"
                            : "Trygg Hand"}
                        </span>
                        <span className="text-xs text-gray-400">
                          {comment.created_at
                            ? format(new Date(comment.created_at), "dd MMM HH:mm", { locale: sv })
                            : ""}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  ))}
                </div>
              )}
              {/* Add comment */}
              <div className="mt-4">
                <Textarea
                  placeholder="Skriv en kommentar..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="min-h-[80px]"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <Button onClick={addComment} disabled={!newComment.trim() || loadingComments}>
                    Skicka kommentar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="ghost" onClick={closeCaseDialog}>
            Stäng
          </Button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  )}
</AnimatePresence>

      {mainTab === "cases" && showNewCase && (
        <NewCaseForm 
          customers={customers}
          defaultCustomerId={newCaseForCustomerId}
          caseToEdit={editCase ?? undefined}
          caseComments={caseComments}
          fetchCaseComments={fetchCaseComments}
          onCaseSaved={async () => { await fetchCases(); closeNewCaseForm(); }}
          onCancel={closeNewCaseForm}
        />
      )}

      {showContactDialog && selectedContact && (
        <ContactRequestDialog
          contact={selectedContact as any}
          onClose={closeContactDialog}
          onUpdate={async () => { await fetchContactRequests(); closeContactDialog(); }}
          onConvert={async (contact) => {
            await convertContactToCustomer(contact);
            closeContactDialog();
          }}
        />
      )}
    </div>
  );
};

export default AdminPortal;
