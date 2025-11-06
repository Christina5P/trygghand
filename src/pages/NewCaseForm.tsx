import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button, Textarea } from "@/components/ui"; // Justera importvägen efter din projektstruktur

interface Customer { id: string; name: string; }
// Lägg till enkel Case-typ så TS vet vad caseToEdit innehåller
interface Case {
  id: string;
  title?: string;
  description?: string | null;
  customer_id?: string | null;
  created_at?: string | null;
  deadline?: string | null;
  status?: string | null;
}

interface NewCaseFormProps {
  customers: Customer[];
  defaultCustomerId?: string | null;
  onCaseSaved?: () => Promise<void> | void;
  onCancel?: () => void;
  caseToEdit?: Case | undefined;
  // Kommentarer för ärendet (valfritt) och funk för att ladda dem
  caseComments?: { id: number; content: string; author_type?: string; created_at?: string; author?: { name?: string } }[];
  fetchCaseComments?: (caseId: string) => Promise<void>;
}

// Matcha DB CHECK constraint för cases.status
const ALLOWED_CASE_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];

// hjälpfunktion: iso timestamp -> YYYY-MM-DD (säkrare än att kalla extern function)
const formatISODateOnly = (iso?: string | null) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
};

const NewCaseForm: React.FC<NewCaseFormProps> = ({ customers, defaultCustomerId = null, onCaseSaved, onCancel, caseToEdit, caseComments = [], fetchCaseComments }) => {
  const { customer } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>(defaultCustomerId || customers[0]?.id || "");
  const [createdDate, setCreatedDate] = useState<string | null>(null); // YYYY-MM-DD
  const [deadlineDate, setDeadlineDate] = useState<string | null>(null); // YYYY-MM-DD
  const [status, setStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [localNewComment, setLocalNewComment] = useState("");
  const [localLoadingComments, setLocalLoadingComments] = useState(false);

  useEffect(() => {
    setSelectedCustomer(defaultCustomerId || customers[0]?.id || "");
  }, [defaultCustomerId, customers]);

  // Prefill form-fields från caseToEdit (om satt) — använder title/description/selectedCustomer state (ingen editedDraft)
  useEffect(() => {
    if (caseToEdit) {
      setTitle(caseToEdit.title ?? "");
      // Behåll tom sträng från DB (empty string räknas som giltigt) -> använd ??
      setDescription(caseToEdit?.description ?? "");
      setSelectedCustomer(caseToEdit.customer_id ?? (defaultCustomerId ?? customers[0]?.id ?? ""));
      setCreatedDate(formatISODateOnly(caseToEdit.created_at ?? null));
      setDeadlineDate(formatISODateOnly(caseToEdit.deadline ?? null));
      setStatus(caseToEdit.status ?? "pending");
    } else {
      setTitle("");
      setDescription("");
      setSelectedCustomer(defaultCustomerId ?? customers[0]?.id ?? "");
      setCreatedDate(null);
      setDeadlineDate(null);
      setStatus("pending");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const custId = selectedCustomer || customer?.id;
    if (!custId) {
      setMessage("Välj kund eller logga in.");
      return;
    }
    if (!title.trim()) {
      setMessage("Titel är obligatoriskt.");
      return;
    }

    setLoading(true);

    // konvertera date-only till ISO (00:00 UTC) för DB om du behöver timestamp
    const created_at_iso = createdDate ? new Date(createdDate + "T00:00:00Z").toISOString() : undefined;
    const scheduled_date_iso = deadlineDate ? new Date(deadlineDate + "T00:00:00Z").toISOString() : undefined;

    // säkerställ att vi skickar ett statusvärde som matchar DB-constraint
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
      if (caseToEdit && caseToEdit.id) {
        // UPDATE existing case — lägg till edited_at
        payload.edited_at = new Date().toISOString();
        const { data, error } = await supabase.from('cases').update(payload).eq('id', caseToEdit.id).select().maybeSingle();
        setLoading(false);
        if (error) {
          console.error('Supabase update error:', error);
          setMessage('Kunde inte uppdatera ärendet: ' + error.message);
          return;
        }
        setMessage('Ärendet uppdaterades!');
      } else {
        // INSERT new case
        const { data, error } = await supabase.from('cases').insert(payload).select().maybeSingle();
        setLoading(false);
        if (error) {
          console.error('Supabase insert error:', error);
          setMessage('Kunde inte skapa ärende: ' + error.message);
          return;
        }
        setMessage('Ärendet har skapats!');
      }
      if (onCaseSaved) await onCaseSaved();
    } catch (err: any) {
      setLoading(false);
      setMessage('Kunde inte spara ärendet: ' + String(err?.message ?? err));
    }
  };

  const addCaseComment = async () => {
    if (!caseToEdit?.id || !localNewComment.trim()) return;
    try {
      setLocalLoadingComments(true);
      const { error } = await supabase.from("case_comments").insert({
        case_id: caseToEdit.id,
        author_id: null,
        author_type: "admin",
        content: localNewComment.trim(),
      });
      if (error) throw error;
      setLocalNewComment("");
      if (fetchCaseComments) await fetchCaseComments(caseToEdit.id);
    } catch (err) {
      console.error("Error adding comment:", err);
    } finally {
      setLocalLoadingComments(false);
    }
  };

  return (
    <div className="p-4">
      {/* Kommentarstråd (om caseToEdit) */}
      {caseToEdit && (
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Kommentarer</h3>
          <div className="space-y-3 max-h-48 overflow-auto mb-2">
            {caseComments.length === 0 ? <div className="text-sm text-gray-500">Ingen tidigare konversation.</div> :
              caseComments.map(cm => (
                <div key={cm.id} className={`p-2 rounded ${cm.author_type === "customer" ? "bg-trust-blue/10" : "bg-gray-100"}`}>
                  <div className="text-xs text-gray-500 mb-1">{cm.author_type === "customer" ? (cm.author?.name ?? "Kund") : "Trygg Hand"} • {cm.created_at ? new Date(cm.created_at).toLocaleString() : ""}</div>
                  <div className="text-sm whitespace-pre-wrap">{cm.content}</div>
                </div>
              ))
            }
          </div>
          <div className="flex gap-2">
            <Textarea value={localNewComment} onChange={(e) => setLocalNewComment(e.target.value)} placeholder="Skriv kommentar..." />
            <Button onClick={addCaseComment} disabled={!localNewComment.trim() || localLoadingComments}>Skicka</Button>
          </div>
        </div>
      )}
      <h2 className="text-xl font-bold">{caseToEdit ? "Redigera Ärende" : "Skapa Nytt Ärende"}</h2>

      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Kund</label>
          <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)} className="mt-1 block w-full border rounded p-2" required>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
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

        {/* Tjänstyp borttagen */}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-sm block mb-1">Skapat (datum)</label>
            <input type="date" value={createdDate ?? ""} onChange={(e) => setCreatedDate(e.target.value || null)} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label className="text-sm block mb-1">Deadline</label>
            <input type="date" value={deadlineDate ?? ""} onChange={(e) => setDeadlineDate(e.target.value || null)} className="w-full border rounded px-2 py-1" />
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
          <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-700 border rounded">Avbryt</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
            {loading ? (caseToEdit ? "Sparar..." : "Skapar...") : (caseToEdit ? "Spara ändringar" : "Skapa Ärende")}
          </button>
        </div>

        {message && <div className="text-sm mt-2">{message}</div>}
      </form>
    </div>
  );
};

export default NewCaseForm;