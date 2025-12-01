// src/pages/Portal/CustomerPortal.tsx
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"; // Import för Fullmakt Dialog
import CollapsibleCard from "@/components/ui/CollapsibleCard"; // Se till att denna komponent finns
import ValuationManager from "@/components/ValuationManager"; // Se till att denna komponent finns
import { PortalStats } from '@/pages/Portal/PortalStats'; // Se till att denna komponent finns
import Tidio from "@/components/Tidio"; // Se till att denna komponent finns

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
import type { Customer, Case, Comment, Valuation } from '@/types'; // Importera dina typer

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

const CustomerPortal: React.FC<{ customer: Customer }> = ({ customer }) => {
    const { user } = useAuth(); // Används för auth.uid() vid kommentarer
    const { toast } = useToast();

    // --- State för kundinformation ---
    const [editingCustomer, setEditingCustomer] = useState<Customer>(customer);
    const [loadingSave, setLoadingSave] = useState(false);

    // --- State för Ärendehantering ---
    const [cases, setCases] = useState<Case[]>([]);
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [loadingCases, setLoadingCases] = useState(true);
    const [loadingComments, setLoadingComments] = useState(false);
    const [addingComment, setAddingComment] = useState(false);

    // --- State för Värderingshantering ---
    const [valuations, setValuations] = useState<Valuation[]>([]);
    const [loadingValuations, setLoadingValuations] = useState(true);
    
    // --- State för Fullmakt ---
    const [isFullmaktDialogOpen, setIsFullmaktDialogOpen] = useState(false);

    // --- Uppdatera state när customer prop ändras ---
    useEffect(() => {
        setEditingCustomer(customer);
        if (customer.id) {
            fetchCases();
            fetchValuations();
        } else {
            setLoadingCases(false);
            setLoadingValuations(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // --- Lägg till kommentar ---
    const handleAddComment = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation(); // VÄLDIGT VIKTIGT: Förhindrar att klicket når Card-komponenten och stänger den.

        if (!newComment.trim() || !selectedCase || !user?.id) {
            toast({ title: "Fel", description: "Vänligen skriv en kommentar och se till att ett ärende är valt och du är inloggad.", variant: "destructive" });
            return;
        }
        setAddingComment(true);
        try {
            const { error } = await supabase.from("case_comments").insert({
        case_id: selectedCase.id,
        author_id: user.id, 
        customer_id: customer.id, 
        author_type: "customer", // <--- MÅSTE VARA "customer" HÄR
        content: newComment.trim(),
    });

            if (error) throw error;
            setNewComment("");
            await fetchComments(selectedCase.id);
            toast({ title: "Kommentar tillagd", description: "Din kommentar har skickats" });
        } catch (err) {
            console.error("Error adding comment:", err);
            toast({ title: "Fel", description: "Kunde inte skicka kommentar", variant: "destructive" });
        } finally {
            setAddingComment(false);
        }
    };
    
    // --- Hämta Värderingar ---
    const fetchValuations = useCallback(async () => {
        if (!customer?.id) return;
        setLoadingValuations(true);
        try {
            const { data, error } = await supabase
                .from("valuations")
                .select("*")
                .eq("customer_id", customer.id)
                .order("created_at", { ascending: false });
            if (error) throw error;
            setValuations(data as Valuation[] || []);
        } catch (err) {
            console.error("Error fetching valuations:", err);
            toast({ title: "Fel", description: "Kunde inte hämta värderingar", variant: "destructive" });
        } finally {
            setLoadingValuations(false);
        }
    }, [customer?.id, toast]);

    // --- Uppdatera kundinformation ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditingCustomer(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleUpdateCustomer = async () => {
        if (!editingCustomer.id) return;
        setLoadingSave(true);
        try {
            const { error } = await supabase
                .from("customers")
                .update({
                    name: editingCustomer.name,
                    email: editingCustomer.email,
                    phone: editingCustomer.phone,
                    personal_number: editingCustomer.personal_number,
                })
                .eq("id", editingCustomer.id); // Uppdaterar endast sin egen rad

            if (error) throw error;
            toast({ title: "Uppdaterad", description: "Dina uppgifter har sparats och syns i Adminportalen." });
        } catch (err) {
            console.error("Error updating customer:", err);
            toast({ title: "Fel", description: "Kunde inte uppdatera dina uppgifter.", variant: "destructive" });
        } finally {
            setLoadingSave(false);
        }
    };

    // --- Ladda kommentarer när ärende väljs ---
    useEffect(() => {
        if (selectedCase?.id) {
            fetchComments(selectedCase.id);
        } else {
            setComments([]);
        }
    }, [selectedCase?.id, fetchComments]);
    
    
    return (
        <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* 1. Portal Stats (Krav: Status på ärenden) */}
                <Card className="shadow-lg">
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
                                                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-2 flex flex-col">
                                                    {loadingComments ? (
                                                        <p className="text-center text-gray-500">Laddar kommentarer...</p>
                                                    ) : comments.length === 0 ? (
                                                        <p className="text-gray-500 text-sm italic">Inga kommentarer ännu. Skriv den första!</p>
                                                    ) : (
                                                        comments.map((comment) => (
                                                            <div
                                                                key={comment.id}
                                                                // Kundkommentarer till höger, Admin till vänster
                                                                className={`p-3 rounded-lg text-sm ${comment.author_type === "customer" ? "bg-blue-100 self-end" : "bg-gray-100 self-start"}`}
                                                                style={{ maxWidth: '80%' }}
                                                            >
                                                                <div className="font-medium text-xs">
                                                                    {comment.author_type === "customer" ? "Du" : (comment.author?.name || "Trygg Hand")}
                                                                    <span className="text-xs text-gray-500 ml-2">
                                                                        {format(new Date(comment.created_at!), "dd MMM HH:mm", { locale: sv })}
                                                                    </span>
                                                                </div>
                                                                <p className="text-gray-800">{comment.content}</p>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>

                                                {/* Ny kommentar-formulär */}
                                                <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <Textarea
                                                        placeholder="Skriv din kommentar här..."
                                                        value={newComment}
                                                        onChange={(e) => setNewComment(e.target.value)}
                                                        rows={3}
                                                        className="resize-none"
                                                        disabled={addingComment}
                                                    />
                                                    <Button
                                                        onClick={handleAddComment}
                                                        disabled={!newComment.trim() || addingComment}
                                                        className="self-end bg-trust-blue hover:bg-trust-blue/90"
                                                    >
                                                        {addingComment ? (
                                                            <>
                                                                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Skickar...
                                                            </>
                                                        ) : (
                                                            "Skicka kommentar"
                                                        )}
                                                    </Button>
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
                    defaultOpen
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
                        <Button onClick={handleUpdateCustomer} disabled={loadingSave} className="w-full bg-trust-blue hover:bg-trust-blue/90">
                            {loadingSave ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Spara Ändringar"}
                        </Button>
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
                        {/* HÄR ska innehållet från din FullmaktDialog.tsx (om den är avsedd för kund) ligga */}
                        <div className="p-4 border rounded-md bg-gray-50">
                            <p className="text-gray-700 mb-4">Här visas en lista över fullmakter och andra viktiga dokument som rör dina ärenden hos oss. Du kan ladda upp nya dokument eller ladda ner befintliga.</p>
                            {/* Exempel: En lista med dummy-dokument */}
                            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-800">
                                <li>Fullmakt - [Ditt namn] (datum) <Button variant="link" size="sm">Ladda ner</Button></li>
                                <li>Uppdragsavtal - [Ditt namn] (2022-11-01) <Button variant="link" size="sm">Ladda ner</Button></li>
                                <li>[Här kan du lägga till en uppladdningskomponent]</li>
                            </ul>
                            <div className="mt-4 flex justify-end">
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