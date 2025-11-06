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
import type { Customer, Case, ServiceType, ContactRequest, Subscription, Valuation } from '../../types'; // <-- add this (adjust path if you use aliases)

// --- Hjälpfunktion ---
const getStatusBadge = (status: string) => {
  const normalized = (status || '').toLowerCase().trim();
  switch(normalized){
    case 'pending': case 'nytt': return { text: 'Nytt', colorClass: 'bg-blue-500 hover:bg-blue-600 text-white' };
    case 'in_progress': case 'pågående': return { text: 'Pågående', colorClass: 'bg-yellow-500 hover:bg-yellow-600 text-black' };
    case 'completed': case 'avslutat': return { text: 'Avslutat', colorClass: 'bg-green-500 hover:bg-green-600 text-white' };
    case 'waiting': case 'väntar': return { text: 'Väntar', colorClass: 'bg-red-500 hover:bg-red-600 text-white' };
    case 'cancelled': return { text: 'Avbrutet', colorClass: 'bg-gray-600 hover:bg-gray-700 text-white' };
    default: return { text: status || 'Okänd', colorClass: 'bg-gray-400 hover:bg-gray-500 text-white' };
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
  // Kommentarstråd för valt ärende (samma tabell som i CustomerPortal)
  const [caseComments, setCaseComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  // DIALOG STATES
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null); // behåll om du behöver referens
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showCaseDialog, setShowCaseDialog] = useState(false);
  const [showEditInOverlay, setShowEditInOverlay] = useState(false);
  const [showNewCase, setShowNewCase] = useState(false);
  const [newCaseForCustomerId, setNewCaseForCustomerId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);

  // EDIT CASE state (EN implementation)
  const [editCaseId, setEditCaseId] = useState<string | null>(null);
  const [editCase, setEditCase] = useState<Case | null>(null);

  // Öppna ett ärende för redigering + ladda kommentarstråd
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
    setSelectedCaseId(null);
    setCaseComments([]);
    setShowEditInOverlay(false);
  };

  // State för att skicka meddelande till kund (dialog)
  const [showCustomerMessageDialog, setShowCustomerMessageDialog] = useState(false);
  const [customerMessageText, setCustomerMessageText] = useState<string>("");

  // TAB STATE
  const [mainTab, setMainTab] = useState<"cases" | "subscriptions" | "valuations" | "customers" | "contact_requests">("cases");

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

  const fetchValuations = useCallback(async () => {
    const { data, error } = await supabase.from("valuations").select("*").order("created_at", { ascending: false });
    if (error) console.error(error); else setValuations(data || []);
  }, []);

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
      await Promise.all([fetchCustomers(), fetchCases(), fetchSubscriptions(), fetchValuations(), fetchContactRequests()]);
      setLoading(false);
    };
    fetchAll();
  }, [fetchCustomers, fetchCases, fetchSubscriptions, fetchValuations, fetchContactRequests]);

  // --- NEW CASE ---
  // Öppna nytt ärende — rensa edit/state så formuläret verkligen blir CREATE (inte edit)
  const openNewCaseForm = (customerId?: string) => {
    console.log("[AdminPortal] openNewCaseForm called, customerId=", customerId);
    // säkerställ att vi står i Ärenden-fliken
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
    // inget automatiskt case-comments-upprop här (det är en annan tabell). Om du vill ladda något, kalla explicit.
  };

  useEffect(() => {
    if (showCustomerDialog) console.log('[AdminPortal] showCustomerDialog for selectedCustomerId=', selectedCustomerId);
  }, [showCustomerDialog, selectedCustomerId]);

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
                      <Card key={c.id} className="hover:shadow-lg cursor-pointer" onClick={() => openCaseForEdit(c)}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{c.title}</h3>
                              <p className="text-sm text-gray-500">Kund: {c.customer_id ? (customerMap[c.customer_id]?.name ?? 'Okänd') : 'Okänd'}</p>
                            </div>
                            <Badge className={badge.colorClass}>{badge.text}</Badge>
                          </div>
                          <p className="text-sm mt-2 line-clamp-2">{c.description}</p>
                          {/* Om du har knappar inuti kort som ska hantera egna handlingar, lägg på
                              onClick={(e) => { e.stopPropagation(); // egen handling }} för att inte trigga kort‑click */}
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
                  return (
                    <Card key={v.id} className="p-4 relative">
                      <button className="absolute top-2 right-2 text-gray-400 hover:text-red-600"><X className="w-4 h-4"/></button>
                      <p className="font-medium">{v.name || 'Namnlös värdering'}</p>
                      <p className="text-sm text-gray-500">{date ? format(date, "dd MMM yyyy HH:mm", { locale: sv }) : '—'}</p>
                      <p className="text-sm mt-1">Kund: {v.customer_name}</p>
                      {v.image_urls.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {v.image_urls.map((url, i) => <img key={i} src={url} alt={`Bild ${i+1}`} className="w-16 h-16 object-cover rounded-md border" />)}
                        </div>
                      )}
                      <p className="text-sm mt-2 whitespace-pre-wrap">{v.analysis}</p>
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
                        {c.personal_number && <p className="text-sm">Personnummer: {c.personal_number}</p>}
                      </div>
                      {/* Ärendeknappen borttagen */}
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
                    <Card key={r.id} className="cursor-pointer hover:shadow-lg">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{r.name}</p>
                            <p className="text-sm text-gray-500">{r.email}</p>
                          </div>
                          <Badge className={badge.colorClass}>{badge.text}</Badge>
                        </div>
                        <p className="text-sm mt-2 line-clamp-2">{r.message}</p>
                        <Select value={r.status} onValueChange={(v) => { updateContactRequestStatus(r.id, v ?? ''); }}>
                          <SelectTrigger className="mt-2 w-[140px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Väntande</SelectItem>
                            <SelectItem value="in_progress">Pågår</SelectItem>
                            <SelectItem value="completed">Avslutad</SelectItem>
                            <SelectItem value="cancelled">Avbruten</SelectItem>
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
          onOpenCase={openCaseDialog}   // öppna ärende som overlay ovanpå kundkortet
        />
      )}

      {/* Case overlay (visas ovanpå kunddialogen) */}
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
                <button onClick={closeCaseDialog} className="text-gray-500 hover:text-gray-800">
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
                    // uppdatera kommentarer och view
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
    </div>
  );
};

export default AdminPortal;
