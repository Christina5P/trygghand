// src/pages/Portal/views/CasesView.tsx
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import NewCaseForm from "./NewCaseForm"; // Importera din NewCaseForm

// Importera dina typer
import type { Case, Customer, Comment, ServiceType } from "@/types";

interface CasesViewProps {
  cases: Case[];
  customers: Customer[]; // För att skicka till NewCaseForm
  onDataUpdated: () => Promise<void> | void;
}

// --- Hjälpfunktioner för status (kopierade från CustomerPortal) ---
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

const CasesView: React.FC<CasesViewProps> = ({ cases, customers, onDataUpdated }) => {
  const { user } = useAuth(); // Används för att skicka till NewCaseForm som default adminId
  const [isNewCaseDialogOpen, setIsNewCaseDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [caseComments, setCaseComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  // Hämtar kommentarer för ett ärende, anropas från NewCaseForm
  const fetchCaseComments = useCallback(async (caseId: string) => {
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("case_comments")
        .select(`*, author:customers(name)`) // Anpassa denna join vid behov för admin-namn
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

  const handleOpenNewCaseDialog = () => {
    setEditingCase(null); // Nollställ för nytt ärende
    setCaseComments([]); // Rensa kommentarer
    setIsNewCaseDialogOpen(true);
  };

  const handleEditCase = (caseItem: Case) => {
    setEditingCase(caseItem);
    setIsNewCaseDialogOpen(true);
    // Ladda kommentarer när ett ärende öppnas för redigering
    if (caseItem.id) {
        fetchCaseComments(caseItem.id);
    }
  };

  const handleCaseFormClose = async () => {
    setIsNewCaseDialogOpen(false);
    setEditingCase(null); // Rensa det ärende som redigerades
    setCaseComments([]); // Rensa kommentarerna
    await onDataUpdated(); // Ladda om alla ärenden
  };

  // Om du vill visa laddningsstatus för huvudvyerna
  if (!cases || !customers) { // Enkel check, kan vara mer detaljerad
    return (
      <div className="flex justify-center items-center min-h-[200px] bg-white rounded-lg shadow-md p-6">
        <Loader2 className="h-8 w-8 animate-spin text-trust-blue mr-2" />
        <p className="text-xl text-gray-700">Laddar ärenden...</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Ärendehantering</h2>
        <Button onClick={handleOpenNewCaseDialog} className="bg-trust-blue hover:bg-trust-blue/90">
          <Plus className="mr-2 h-4 w-4" /> Nytt Ärende
        </Button>
      </div>

      <Dialog open={isNewCaseDialogOpen} onOpenChange={setIsNewCaseDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCase ? "Redigera Ärende" : "Skapa Nytt Ärende"}</DialogTitle>
          </DialogHeader>
          <NewCaseForm
            customers={customers}
            defaultCustomerId={editingCase?.customer_id || null}
            onCaseSaved={handleCaseFormClose}
            onCancel={handleCaseFormClose}
            caseToEdit={editingCase}
            caseComments={caseComments}
            fetchCaseComments={fetchCaseComments}
          />
        </DialogContent>
      </Dialog>

      {cases.length === 0 ? (
        <p className="text-center text-gray-500 py-8">Inga ärenden hittades.</p>
      ) : (
        <div className="grid gap-4 mt-4">
          {cases.map((caseItem) => (
            <Card key={caseItem.id} className="relative hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{caseItem.title}</h3>
                  <Badge className={`${getStatusColor(caseItem.status)} text-sm`}>
                    {getStatusText(caseItem.status)}
                  </Badge>
                </div>
                <p className="text-sm text-gray-700 mb-2 line-clamp-2">{caseItem.description}</p>
                <p className="text-xs text-gray-500">
                  Kund: {customers.find(c => c.id === caseItem.customer_id)?.name || "Okänd"} |
                  {/* Tjänst: {caseItem.service_type?.name || "Okänd"} | */}
                  Skapat: {caseItem.created_at ? format(new Date(caseItem.created_at), "dd MMM yyyy", { locale: sv }) : "N/A"}
                  {caseItem.scheduled_date && ` | Schemalagt: ${format(new Date(caseItem.scheduled_date), "dd MMM yyyy", { locale: sv })}`}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditCase(caseItem)}
                  className="absolute bottom-2 right-2 text-trust-blue hover:bg-trust-blue/10"
                >
                  <Edit className="h-4 w-4 mr-1" /> Redigera
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default CasesView;