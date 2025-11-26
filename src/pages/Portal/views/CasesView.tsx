// src/pages/Portal/views/CasesView.tsx

import React, { useState, useRef, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import NewCaseForm from "./NewCaseForm";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import type { CustomerCase, Customer, Comment } from '@/types';
// import type { Database } from '@/database-types'; 

// --- Hjälpfunktion för statusbadge ---
const getStatusBadge = (status?: string) => {
    const normalized = (status ?? '').toLowerCase().trim();
    switch(normalized){
        case 'pending': case 'nytt': return { text: 'Nytt', colorClass: 'bg-yellow-500 hover:bg-yellow-600 text-black' };
        case 'in_progress': case 'pågående': return { text: 'Pågående', colorClass: 'bg-blue-500 hover:bg-blue-600 text-white' };
        case 'completed': case 'avslutat': return { text: 'Avslutat', colorClass: 'bg-green-500 hover:bg-green-600 text-white' };
        case 'cancelled': case 'avbrutet': return { text: 'Avbrutet', colorClass: 'bg-gray-600 hover:bg-gray-700 text-white' };
        default: return { text: status ?? 'Okänd', colorClass: 'bg-gray-400 hover:bg-gray-500 text-white' };
    }
};

interface CasesViewProps {
    cases: CustomerCase[]; 
    customers: Customer[];
    onOpenCase: (c: CustomerCase) => void;
    onOpenCustomer: (cust: Customer) => void;
    onDataUpdated: () => Promise<void> | void; 
}

const CasesView: React.FC<CasesViewProps> = ({ 
    cases, 
    customers, 
    onOpenCase, 
    onOpenCustomer, 
    onDataUpdated
}) => {
    const { toast } = useToast();

    // --- State ---
    const [showNewCase, setShowNewCase] = useState(false);
    const [selectedCase, setSelectedCase] = useState<CustomerCase | null>(null);
    const [newCaseForCustomerId, setNewCaseForCustomerId] = useState<string | null>(null);
    const [caseComments, setCaseComments] = useState<Comment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const newCaseRef = useRef<HTMLDivElement | null>(null);
    
    // Create a map for quick customer lookup
    const customerMap = useMemo(() => {
        const map: Record<string, Customer> = {};
        customers.forEach((cust) => {
            if (cust.id) map[cust.id] = cust;
        });
        return map;
    }, [customers]);

    // --- Funktion för att hämta kommentarer (Återskapad och Korrigerad) ---
    const fetchCaseComments = useCallback(async (caseId: string) => {
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
            // Lösning för ParserError/Type-konflikten med dubbelkonvertering
            setCaseComments((data as unknown as Comment[]) || []); 
        } catch (err) {
            console.error("Error fetching comments:", err);
            setCaseComments([]);
        } finally {
            setLoadingComments(false);
        }
    }, []); 

    // --- Öppna formulär för redigering ---
    const openCaseForEdit = async (c: CustomerCase) => {
        setSelectedCase(c);
        setNewCaseForCustomerId(c.customer_id ?? null);
        setCaseComments([]); 
        
        if (typeof c.id === 'string' && c.id.length > 0) {
            await fetchCaseComments(c.id);
        }
        setShowNewCase(true);
    };

    // --- Öppna nytt ärende-formulär ---
    const openNewCaseForm = (customerId?: string) => {
        setSelectedCase(null);
        setCaseComments([]);
        setNewCaseForCustomerId(customerId ?? null);
        setShowNewCase(true);
    };
    
    // --- Stäng formulär ---
    const closeNewCaseForm = () => { 
        setShowNewCase(false); 
        setSelectedCase(null); 
        setNewCaseForCustomerId(null); 
        setCaseComments([]); 
    };

   const normalizedComments = useMemo(() => {
        return caseComments.map(c => ({
         ...c,
         content: c.content ?? "",
         })) as Comment[]; 
    }, [caseComments]);

    return ( 
        <div className="p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Ärenden</h2>
                <Button
                    type="button"
                    onClick={() => openNewCaseForm()}
                    className="bg-blue-600 text-white"
                >
                    Nytt ärende
                </Button>
            </div>
            
            {/* Nytt / Redigera ärende */}
            {showNewCase && (
                <div ref={newCaseRef} className="my-6 p-4 border rounded-lg bg-white shadow-lg relative">
                    <Button 
                        onClick={closeNewCaseForm} 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                        aria-label="Stäng formulär"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                  <NewCaseForm 
                        customers={customers}
                        caseToEdit={selectedCase}
                        defaultCustomerId={newCaseForCustomerId}
                        onCaseSaved={async () => {
                            await onDataUpdated(); 
                            closeNewCaseForm();
                        }}
                        onCancel={closeNewCaseForm} 
                        caseComments={normalizedComments} 
                        fetchCaseComments={(fetchCaseComments as any)}
                    />
                </div>
            )}

            {/* Lista över ärenden */}
            {cases.length === 0 ? (
                <p>Inga ärenden hittades.</p>
            ) : (
                <div className="grid gap-4 mt-6">
                    {cases.map(c => {
                        const badge = getStatusBadge(c.status);
                        const isSelectedForEdit = selectedCase && selectedCase.id === c.id;

                        return (
                            <Card 
                                key={c.id} 
                                className={`hover:shadow-lg cursor-pointer ${isSelectedForEdit ? 'border-blue-500 ring-2 ring-blue-500' : ''}`} 
                                onClick={() => openCaseForEdit(c)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start">
                                          <div>
                                            <h3 className="font-semibold">{c.title}</h3>
                                            <p className="text-sm text-gray-500">
                                                Kund: {c.customer_id ? (customerMap?.[c.customer_id]?.name ?? 'Okänd') : 'Okänd'}
                                            </p>
                                        </div>
                                        <Badge className={badge.colorClass}>{badge.text}</Badge>
                                    </div>
                                    <p className="text-sm mt-2 line-clamp-2">{c.description}</p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CasesView;