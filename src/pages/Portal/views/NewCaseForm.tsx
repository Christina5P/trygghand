// src/pages/Portal/views/NewCaseForm.tsx

import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { CaseCommentsThread } from "../components/cases/CaseCommentsThread";
import { CaseDocumentsSection, type CaseDocument } from "../components/cases/CaseDocumentsSection";
// Se till att dessa typer finns och importeras korrekt i din Typescript-struktur
import type { Customer, Case, Comment } from "../../../types";
//import { saveCaseComment } from "@/services/caseCommentService";

// --- Interface Definitions ---

// src/pages/Portal/views/NewCaseForm.tsx

// Definierad här för att lösa "Cannot find name 'NewCaseFormProps'"
interface NewCaseFormProps {
    customers: Customer[];
    defaultCustomerId?: string | null;
    onCaseSaved?: () => Promise<void> | void;
    onCancel?: () => void;
    caseToEdit?: Case | null; // <-- Använd din centrala "Case" typ här
    caseComments?: Comment[]; // <-- Använd din centrala "Comment" typ här
    fetchCaseComments?: (caseId: string) => Promise<void>;
}


// --- Helper Functions ---

// Matcha DB CHECK constraint för cases.status
const ALLOWED_CASE_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];

const formatISODateOnly = (iso?: string | null) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    // Returnera YYYY-MM-DD strängen
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
};

// --- Component ---

const NewCaseForm: React.FC<NewCaseFormProps> = ({ 
  customers, 
  defaultCustomerId = null, 
  onCaseSaved, 
  onCancel, 
  caseToEdit, 
  caseComments = [], 
  fetchCaseComments 
}) => {
  const { customer: authUser } = useAuth(); 
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>(defaultCustomerId || customers[0]?.id || "");
  const [createdDate, setCreatedDate] = useState<string | null>(null); 
  const [scheduledDate, setScheduledDate] = useState<string | null>(null); 
  const [status, setStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
    const [caseDocuments, setCaseDocuments] = useState<CaseDocument[]>([]);

    const isAdmin = !!authUser?.is_admin;

    const fetchCaseDocuments = useCallback(async (caseId: string) => {
        try {
            const { data, error } = await supabase.from("cases").select("documents").eq("id", caseId).maybeSingle();
            if (error) throw error;
            const docs = (data as any)?.documents;
            setCaseDocuments(Array.isArray(docs) ? (docs as CaseDocument[]) : []);
        } catch (err) {
            console.error("Error fetching case documents:", err);
            setCaseDocuments([]);
        }
    }, []);

  useEffect(() => {
    setSelectedCustomer(defaultCustomerId || customers[0]?.id || "");
  }, [defaultCustomerId, customers]);

  // Prefill form-fields från caseToEdit
  useEffect(() => {
    if (caseToEdit) {
      setTitle(caseToEdit.title ?? "");
      setDescription(caseToEdit?.description ?? "");
      setSelectedCustomer(caseToEdit.customer_id ?? (defaultCustomerId ?? customers[0]?.id ?? ""));
      setCreatedDate(formatISODateOnly(caseToEdit.created_at ?? null));
      setScheduledDate(formatISODateOnly((caseToEdit as any).scheduled_date ?? null)); // Gissar på scheduled_date
      setStatus(caseToEdit.status ?? "pending");
            void fetchCaseDocuments(caseToEdit.id);
    } else {
      setTitle("");
      setDescription("");
      setSelectedCustomer(defaultCustomerId ?? customers[0]?.id ?? "");
      setCreatedDate(null);
      setScheduledDate(null);
      setStatus("pending");
            setCaseDocuments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [caseToEdit, fetchCaseDocuments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const custId = selectedCustomer || defaultCustomerId || authUser?.id; 
    if (!custId) {
      setMessage("Kunde inte identifiera kund.");
      return;
    }
    if (!title.trim()) {
      setMessage("Titel är obligatoriskt.");
      return;
    }

    setLoading(true);

    const created_at_iso = createdDate ? new Date(createdDate + "T00:00:00Z").toISOString() : undefined;
    const scheduled_date_iso = scheduledDate ? new Date(scheduledDate + "T00:00:00Z").toISOString() : undefined;

    const safeStatus = ALLOWED_CASE_STATUSES.includes(status) ? status : 'pending';

    const payload: Record<string, any> = {
      customer_id: custId,
      title: title.trim(),
      description: description.trim() || null,
      status: safeStatus,
    };
    
    if (created_at_iso) payload.created_at = created_at_iso;
    if (scheduled_date_iso) payload.scheduled_date = scheduled_date_iso; 

            console.debug("NewCase payload:", payload);
    try {
                const { data, error } = await supabase.functions.invoke("admin-save-case", {
                    body: {
                        case_id: caseToEdit?.id ?? null,
                        customer_id: custId,
                        title: title.trim(),
                        description: description.trim() || null,
                        status: safeStatus,
                        created_at: created_at_iso ?? null,
                        scheduled_date: scheduled_date_iso ?? null,
                    },
                });
                setLoading(false);
                if (error) {
                    console.error('Supabase Edge error:', error);
                    setMessage('Kunde inte spara ärendet: ' + error.message);
                    return;
                }
                const savedCaseId = (data as any)?.case_id;
                if (!caseToEdit && savedCaseId && fetchCaseComments) {
                    await fetchCaseComments(savedCaseId);
                }
                setMessage(caseToEdit ? 'Ärendet uppdaterades!' : 'Ärendet har skapats!');
      if (onCaseSaved) await onCaseSaved();
    } catch (err: any) {
      setLoading(false);
      setMessage('Kunde inte spara ärendet: ' + String(err?.message ?? err));
    }
  };

  return (
    <div className="p-4">
            {caseToEdit ? (
                <div className="mb-6 space-y-6">
                    <CaseCommentsThread
                        caseId={caseToEdit.id}
                        currentUserId={authUser?.id}
                        isAdmin={isAdmin}
                        comments={caseComments}
                        onRefresh={async () => {
                            if (fetchCaseComments) await fetchCaseComments(caseToEdit.id);
                        }}
                        canComment={true}
                        otherPartyLastReadAt={isAdmin ? caseToEdit.customer_last_read_at : caseToEdit.admin_last_read_at}
                    Spara ärendet först för att kunna lägga till kommentarer och dokument.
                </div>
            )}

            <h2 className="text-xl font-bold">{caseToEdit ? "Redigera Ärende" : "Skapa Nytt Ärende"}</h2>

      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Kund</label>
          <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="mt-1 block w-full border rounded p-2" required>
            <option value="" disabled>Välj kund...</option> 
            {customers.map((c: Customer) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Titel</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-2 py-1" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Beskrivning</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border rounded px-2 py-1" rows={4} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm block mb-1">Skapat (datum)</label>
            <input type="date" value={createdDate ?? ""} onChange={(e) => setCreatedDate(e.target.value || null)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-sm block mb-1">Schemalagt datum/Deadline</label>
            <input type="date" value={scheduledDate ?? ""} onChange={(e) => setScheduledDate(e.target.value || null)} className="w-full border rounded px-2 py-1" />
          </div>
        </div>

        <div>
          <label className="text-sm block mb-1">Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full border rounded px-2 py-1">
            <option value="pending">Nytt</option>
            <option value="in_progress">Pågående</option>
            <option value="completed">Avslutat</option>
            <option value="cancelled">Avbrutet</option>
          </select>
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-black-700 border rounded">Avbryt</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            {loading ? (caseToEdit ? "Sparar..." : "Skapar...") : (caseToEdit ? "Spara ändringar" : "Skapa Ärende")}
          </button>
        </div>

        {message && <div className="text-sm mt-2">{message}</div>}
      </form>
    </div>
  );
};

export default NewCaseForm;