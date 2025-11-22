import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import Tidio from "@/components/Tidio";
import ValueEstimator from "@/components/ValueEstimator";
import CollapsibleCard from "@/components/ui/CollapsibleCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  LogOut,
  MessageSquare,
  Calendar,
  MapPin,
  DollarSign,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import type { Customer, Case, CaseComment, Valuation } from '../../types';

const CustomerPortal: React.FC = () => {
  const { customer, signOut } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [comments, setComments] = useState<CaseComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [mainTab, setMainTab] = useState<"new" | "saved">("new");
  // valuations kan ha fält som inte finns i Valuation-typ; använd any[] för flexibilitet
  const [valuations, setValuations] = useState<any[]>([]);
  const [loadingVals, setLoadingVals] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (customer?.id) fetchCases();
    else setLoading(false);
    // eslint-disable-next-line
  }, [customer?.id]);

  const fetchCases = async () => {
    if (!customer?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cases")
        .select(
          `*,
          service_type:service_types(name, description),
          case_subscriptions(
            *,
            subscription:subscriptions(name, provider)
          )`
        )
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (err) {
      console.error("Error fetching cases:", err);
      toast({ title: "Fel", description: "Kunde inte hämta ärenden", variant: "destructive" });
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  // caseId kan vara string eller number; supabase accepterar båda
  const fetchComments = async (caseId: string | number) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("case_comments")
        .select(`*, author:customers(name)`)
        .eq("case_id", caseId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error("Error fetching comments:", err);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !selectedCase) return;
    try {
      const { error } = await supabase.from("case_comments").insert({
        case_id: selectedCase.id,
        author_id: customer?.id,
        author_type: "customer",
        content: newComment.trim(),
      });
      if (error) throw error;
      setNewComment("");
      // Reload comments for the selected case
      await fetchComments(selectedCase.id as string | number);
      toast({ title: "Kommentar tillagd", description: "Din kommentar har skickats" });
    } catch (err) {
      console.error("Error adding comment:", err);
      toast({ title: "Fel", description: "Kunde inte skicka kommentar", variant: "destructive" });
    }
  };

  const fetchValuations = async () => {
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
    } catch (err) {
      console.error("Error fetching valuations:", err);
      setValuations([]);
      toast({ title: "Fel", description: "Kunde inte hämta värderingar", variant: "destructive" });
    } finally {
      setLoadingVals(false);
    }
  };

  const deleteValuation = async (id: string | number) => {
    if (!window.confirm("Vill du verkligen ta bort denna värdering?")) return;
    setLoadingVals(true);
    try {
      const { error } = await supabase.from("valuations").delete().eq("id", id);
      if (error) throw error;
      // jämför som sträng för att undvika string/number mismatch
      setValuations((prev) => prev.filter((v) => String(v.id) !== String(id)));
      toast({ title: "Raderad", description: `Värdering #${String(id)} togs bort.` });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Fel", description: String(err?.message ?? err), variant: "destructive" });
    } finally {
      setLoadingVals(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "in_progress": return "bg-blue-500";
      case "completed": return "bg-green-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-500";
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

  const handleSignOut = async () => {
    try { await signOut(); } catch (err) { console.error(err); }
    finally { window.location.href = "/"; }
  };

  // Prepare saved valuations render content to avoid nested inline ternaries in JSX
  const savedValsContent = useMemo(() => {
    if (loadingVals) {
      return <p className="text-warm-gray">Laddar sparade värderingar…</p>;
    }
    if (!loadingVals && valuations.length === 0) {
      return <p className="text-warm-gray">Inga sparade värderingar.</p>;
    }
    return (
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
                      // använd any-säker åtkomst så kompilatorn inte klagar om ditt Valuation-interface saknar fältet
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
    );
  }, [loadingVals, valuations]);

  if (loading) return (
    <div className="min-h-screen bg-soft-gray flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-trust-blue mx-auto mb-4"></div>
        <p className="text-warm-gray">Laddar dina ärenden...</p>
      </div>
    </div>
  );

  return (
    <div className="bg-soft-gray min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-trust-blue">Välkommen {customer?.name}</h2>
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-2" /> Logga ut
          </Button>
        </header>

        {/* Värdebedömningsverktyg: Collapsible */}
        <div className="mb-6">
          <CollapsibleCard
            defaultOpen
            title={
              <div className="flex flex-col">
                <span className="font-bold text-lg">Värdebedömningsverktyg</span>
                <span className="text-sm text-gray-600">
                  Hjälpmedel för att uppskatta värdet på dina bilder och föremål.
                </span>
              </div>
            }
          >
            <ValueEstimator
              customerId={customer?.id}
              onSaved={() => { setMainTab("saved"); fetchValuations(); }}
              onOpenSaved={() => { setMainTab("saved"); fetchValuations(); }}
              onNew={() => { setMainTab("new"); }}
            />
          </CollapsibleCard>
        </div>

        {/* Sparade värderingar */}
        {mainTab === "saved" && (
          <div className="mb-6">
            <div className="mb-3">
              <Button onClick={() => setMainTab("new")} variant="outline" size="sm">
                Tillbaka
              </Button>
            </div>
            {savedValsContent}
          </div>
        )}

        {/* Layout: Mina ärenden (collapsible) */}
        <div className="lg:col-span-2 flex flex-col mb-6">
          <CollapsibleCard
            defaultOpen
            title={
              <div className="flex flex-col">
                <span className="font-bold text-lg">Mina ärenden</span>
                <span className="text-sm text-gray-600">Alla pågående och avslutade ärenden</span>
              </div>
            }
          >
            <div className="flex-1 overflow-y-auto">
              {cases.length === 0 ? (
                <p className="text-center text-warm-gray py-8">Inga ärenden än</p>
              ) : (
                <div className="space-y-4">
                  {cases.map((case_) => {
                    const isSelected = selectedCase && String(selectedCase.id) === String(case_.id);
                    return (
                      <div
                        key={String(case_.id)}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? "border-trust-blue bg-trust-blue/5" : "border-gray-200 hover:border-trust-blue/50"
                        }`}
                        onClick={() => {
                          setSelectedCase(case_);
                          fetchComments(case_.id as string | number);
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium">{case_.title}</h3>
                          <Badge className={getStatusColor(case_.status)}>
                            {getStatusText(case_.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-warm-gray mb-2">{(case_ as any).service_type?.name}</p>
                        <div className="flex items-center text-xs text-warm-gray space-x-4">
                          {case_.scheduled_date && (
                            <div className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {format(new Date(case_.scheduled_date), "dd MMM yyyy", { locale: sv })}
                            </div>
                          )}
                          {case_.address && (
                            <div className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {case_.address}
                            </div>
                          )}
                          {case_.total_price && (
                            <div className="flex items-center">
                              <DollarSign className="w-3 h-3 mr-1" />
                              {case_.total_price} kr
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </CollapsibleCard>
        </div>

        {/* Kommentarer (collapsible) */}
        <div className="flex">
          {selectedCase ? (
            <CollapsibleCard
              defaultOpen
              title={
                <div className="flex flex-col">
                  <span className="font-bold text-lg flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Kommentarer
                  </span>
                  <span className="text-sm text-gray-600">
                    Kommunicera om ärendet: {selectedCase.title}
                  </span>
                </div>
              }
            >
              <div className="flex-1 flex flex-col">
                <div className="space-y-4 mb-6 overflow-y-auto flex-1">
                  {loadingComments ? (
                    <div className="text-center text-warm-gray">Laddar kommentarer...</div>
                  ) : (
                    comments.map((comment) => (
                      <div
                        key={String(comment.id)}
                        className={`p-3 rounded-lg ${
                          comment.author_type === "customer" ? "bg-trust-blue/10 ml-4" : "bg-gray-100 mr-4"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-medium">
                            {comment.author_type === "customer" ? "Du" : "Trygg Hand"}
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
              </div>
            </CollapsibleCard>
          ) : (
            <Card className="flex-1 flex">
              <CardContent className="flex-1 flex items-center justify-center">
                <p className="text-warm-gray">Välj ett ärende för att se detaljer</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tidio-widget */}
        <div className="fixed bottom-4 right-4 z-50 pointer-events-auto"><Tidio/></div>
      </div>
    </div>
  );
};

export default CustomerPortal;
