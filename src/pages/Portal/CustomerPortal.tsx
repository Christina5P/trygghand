import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import Tidio from "@/components/Tidio";
import ValueEstimator from "@/components/ValueEstimator";
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
  PlusCircle,
  Save,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import type { Customer, Case, CaseComment, ServiceType, ContactRequest, Subscription, Valuation } from '../../types'; 

  const CustomerPortal = () => {
  const { customer, signOut } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [comments, setComments] = useState<CaseComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [mainTab, setMainTab] = useState<"new" | "saved">("new");
  const [valuations, setValuations] = useState<any[]>([]);
  const [loadingVals, setLoadingVals] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (customer?.id) {
      setLoading(true);
      fetchCases();
    } else {
      setCases([]);
      setLoading(false);
    }
    // eslint-disable-next-line
  }, [customer?.id]);

  const fetchCases = async () => {
    if (!customer?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cases")
        .select(
          `
          *,
          service_type:service_types(name, description),
          case_subscriptions(
            *,
            subscription:subscriptions(name, provider)
          )
        `
        )
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error("Error fetching cases:", error);
      toast({
        title: "Fel",
        description: "Kunde inte hämta ärenden",
        variant: "destructive",
      });
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (caseId: string) => {
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
      setComments(data || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
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
          author_id: customer?.id,
          author_type: "customer",
          content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment("");
      fetchComments(selectedCase.id);
      toast({
        title: "Kommentar tillagd",
        description: "Din kommentar har skickats",
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Fel",
        description: "Kunde inte skicka kommentar",
        variant: "destructive",
      });
    }
  }

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

  // Ta bort en värdering (kundvy)
  const deleteValuation = async (id: number) => {
    if (!window.confirm("Vill du verkligen ta bort denna värdering?")) return;
    setLoadingVals(true);
    try {
      const { error } = await supabase.from("valuations").delete().eq("id", id);
      if (error) throw error;
      setValuations((prev) => prev.filter((v) => v.id !== id));
      toast({ title: "Raderad", description: `Värdering #${String(id)} togs bort.` });
    } catch (err: any) {
      console.error("Delete valuation error:", err);
      toast({ title: "Fel", description: String(err?.message ?? err), variant: "destructive" });
    } finally {
      setLoadingVals(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "in_progress":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Väntar";
      case "in_progress":
        return "Pågår";
      case "completed":
        return "Klar";
      case "cancelled":
        return "Avbruten";
      default:
        return status;
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-gray flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-trust-blue mx-auto mb-4"></div>
          <p className="text-warm-gray">Laddar dina ärenden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-soft-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tidio />
        {/* Header */}
        <header className="bg-white shadow-sm border-b mb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div>
                <h2 className="text-lg font-semibold text-trust-blue">
                  Trygg Hand
                </h2>
                <p className="text-sm text-warm-gray">Mina ärenden</p>
              </div>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Logga ut
              </Button>
            </div>
          </div>
        </header>

        {/*Värderingsfunktion */}
        
        {mainTab === "new" ? (
          <div className="mb-6">
            <ValueEstimator
              customerId={customer?.id}
              onSaved={() => {
                setMainTab("saved");
                fetchValuations();
              }}
              onOpenSaved={() => {
                setMainTab("saved");
                fetchValuations();
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
                               const text = v.analysis_result ?? v.analysis ?? "";
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

        {/* Layout: EstimatorCard + Cases (left) and Details (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {/* Left column: EstimatorCard and Cases */}
          <div className="lg:col-span-2 flex flex-col">
            {/* EstimatorCard removed — ValueEstimator renders the 'Värdera bilder' card itself */}

            <Card className="flex-1 flex flex-col">
              <CardHeader className="flex flex-row justify-between items-center">
                <div>
                  <CardTitle>Mina ärenden</CardTitle>
                  <CardDescription>
                    Här ser du alla dina pågående och avslutade ärenden
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="flex-1 overflow-y-auto">
                {cases.length === 0 ? (
                  <p className="text-center text-warm-gray py-8">Inga ärenden än</p>
                ) : (
                  <div className="space-y-4">
                    {cases.map((case_) => (
                      <div
                        key={case_.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedCase?.id === case_.id
                            ? "border-trust-blue bg-trust-blue/5"
                            : "border-gray-200 hover:border-trust-blue/50"
                        }`}
                        onClick={() => {
                          setSelectedCase(case_);
                          fetchComments(case_.id);
                        }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-medium">{case_.title}</h3>
                          <Badge className={getStatusColor(case_.status)}>
                            {getStatusText(case_.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-warm-gray mb-2">
                          {case_.service_type?.name}
                        </p>
                        <div className="flex items-center text-xs text-warm-gray space-x-4">
                          {case_.scheduled_date && (
                            <div className="flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              {format(
                                new Date(case_.scheduled_date),
                                "dd MMM yyyy",
                                { locale: sv }
                              )}
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
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column: Details & Comments — match height with left */}
          <div className="flex">
            {selectedCase ? (
              <Card className="flex-1 flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    Kommentarer
                  </CardTitle>
                  <CardDescription>
                    Kommunicera om ärendet: {selectedCase.title}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1 flex flex-col">
                  <div className="space-y-4 mb-6 overflow-y-auto flex-1">
                    {loadingComments ? (
                      <div className="text-center text-warm-gray">
                        Laddar kommentarer...
                      </div>
                    ) : (
                      comments.map((comment) => (
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
                                ? "Du"
                                : "Trygg Hand"}
                            </span>
                            <span className="text-xs text-warm-gray">
                              {format(new Date(comment.created_at), "dd MMM HH:mm", {
                                locale: sv,
                              })}
                            </span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-3">
                    <Textarea
                      placeholder="Skriv en kommentar..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <Button
                      onClick={addComment}
                      disabled={!newComment.trim() || loadingComments}
                      className="w-full"
                    >
                      Skicka kommentar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="flex-1 flex">
                <CardContent className="flex-1 flex items-center justify-center">
                  <p className="text-warm-gray">Välj ett ärende för att se detaljer</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerPortal;