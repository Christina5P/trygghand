// src/pages/Portal/views/NewCaseForm.tsx

import React, { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { CaseCommentsThread } from "../components/cases/CaseCommentsThread";
import {
  CaseDocumentsSection,
  type CaseDocument,
} from "../components/cases/CaseDocumentsSection";
import type { Customer, Case, Comment } from "../../../types";

interface NewCaseFormProps {
  customers: Customer[];
  defaultCustomerId?: string | null;
  onCaseSaved?: () => Promise<void> | void;
  onCancel?: () => void;
  caseToEdit?: Case | null;
  caseComments?: Comment[];
  fetchCaseComments?: (caseId: string) => Promise<void>;
}

const ALLOWED_CASE_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
];

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

const NewCaseForm: React.FC<NewCaseFormProps> = ({
  customers,
  defaultCustomerId = null,
  onCaseSaved,
  onCancel,
  caseToEdit,
  caseComments = [],
  fetchCaseComments,
}) => {
  const { customer: authUser, user: authUserSession } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<string>(
    defaultCustomerId || customers[0]?.id || ""
  );
  const [createdDate, setCreatedDate] = useState<string | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("pending");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [caseDocuments, setCaseDocuments] = useState<CaseDocument[]>([]);
  const [liveReadAt, setLiveReadAt] = useState<{
    admin_last_read_at?: string | null;
    customer_last_read_at?: string | null;
  }>({});

  const isAdmin = true;

  const fetchCaseDocuments = useCallback(async (caseId: string) => {
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("documents")
        .eq("id", caseId)
        .maybeSingle();

      if (error) throw error;

      const docs = (data as any)?.documents;
      setCaseDocuments(Array.isArray(docs) ? (docs as CaseDocument[]) : []);
    } catch (err) {
      console.error("Error fetching case documents:", err);
      setCaseDocuments([]);
    }
  }, []);

  const fetchCaseReadAt = useCallback(async (caseId: string) => {
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("admin_last_read_at, customer_last_read_at")
        .eq("id", caseId)
        .maybeSingle();

      if (error) throw error;

      setLiveReadAt({
        admin_last_read_at: (data as any)?.admin_last_read_at ?? null,
        customer_last_read_at: (data as any)?.customer_last_read_at ?? null,
      });
    } catch (err) {
      console.error("Error fetching case read timestamps:", err);
      setLiveReadAt({});
    }
  }, []);

  useEffect(() => {
    setSelectedCustomer(defaultCustomerId || customers[0]?.id || "");
  }, [defaultCustomerId, customers]);

  useEffect(() => {
    if (caseToEdit) {
      setTitle(caseToEdit.title ?? "");
      setDescription(caseToEdit.description ?? "");
      setSelectedCustomer(
        caseToEdit.customer_id ?? defaultCustomerId ?? customers[0]?.id ?? ""
      );
      setCreatedDate(formatISODateOnly(caseToEdit.created_at ?? null));
      setScheduledDate(formatISODateOnly((caseToEdit as any).scheduled_date ?? null));
      setStatus(caseToEdit.status ?? "pending");
      setLiveReadAt({
        admin_last_read_at: caseToEdit.admin_last_read_at ?? null,
        customer_last_read_at: caseToEdit.customer_last_read_at ?? null,
      });
      void fetchCaseDocuments(caseToEdit.id);
      void fetchCaseReadAt(caseToEdit.id);
    } else {
      setTitle("");
      setDescription("");
      setSelectedCustomer(defaultCustomerId ?? customers[0]?.id ?? "");
      setCreatedDate(null);
      setScheduledDate(null);
      setStatus("pending");
      setCaseDocuments([]);
      setLiveReadAt({});
    }
  }, [caseToEdit, defaultCustomerId, customers, fetchCaseDocuments, fetchCaseReadAt]);

  useEffect(() => {
    if (!caseToEdit?.id) return;

    const markAsRead = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("mark-case-as-read", {
          body: { case_id: caseToEdit.id },
        });

        if (error || (data as any)?.ok !== true) return;

        const nowIso = new Date().toISOString();
        setLiveReadAt((prev) => ({
          ...prev,
          admin_last_read_at: nowIso,
        }));

        await fetchCaseReadAt(caseToEdit.id);
      } catch {
        // ignore temporary read-state errors
      }
    };

    void markAsRead();
  }, [caseToEdit?.id, fetchCaseReadAt]);

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

    const created_at_iso = createdDate
      ? new Date(createdDate + "T00:00:00Z").toISOString()
      : undefined;

    const scheduled_date_iso = scheduledDate
      ? new Date(scheduledDate + "T00:00:00Z").toISOString()
      : undefined;

    const safeStatus = ALLOWED_CASE_STATUSES.includes(status) ? status : "pending";

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
        console.error("Supabase Edge error:", error);
        setMessage("Kunde inte spara ärendet: " + error.message);
        return;
      }

      const savedCaseId = (data as any)?.case_id;
      if (!caseToEdit && savedCaseId && fetchCaseComments) {
        await fetchCaseComments(savedCaseId);
      }

      setMessage(caseToEdit ? "Ärendet uppdaterades!" : "Ärendet har skapats!");

      if (onCaseSaved) await onCaseSaved();
    } catch (err: any) {
      setLoading(false);
      setMessage("Kunde inte spara ärendet: " + String(err?.message ?? err));
    }
  };

  return (
    <div className="p-4">
      {caseToEdit ? (
        <div className="mb-6 space-y-6">
          <CaseCommentsThread
            caseId={caseToEdit.id}
            currentUserId={authUserSession?.id}
            isAdmin={isAdmin}
            caseCustomerId={caseToEdit.customer_id}
            otherPartyLastReadAt={
              isAdmin
                ? liveReadAt.customer_last_read_at ?? caseToEdit.customer_last_read_at ?? null
                : liveReadAt.admin_last_read_at ?? caseToEdit.admin_last_read_at ?? null
            }
            comments={caseComments}
            onRefresh={async () => {
              if (fetchCaseComments) await fetchCaseComments(caseToEdit.id);
              await fetchCaseReadAt(caseToEdit.id);
            }}
            canComment={true}
          />

          <CaseDocumentsSection
            caseId={caseToEdit.id}
            documents={caseDocuments}
            canUpload={true}
            onRefresh={async () => {
              await fetchCaseDocuments(caseToEdit.id);
            }}
          />
        </div>
      ) : (
        <div className="mb-4 text-sm text-muted-foreground">
          Spara ärendet först för att kunna lägga till kommentarer och dokument.
        </div>
      )}

      <h2 className="text-xl font-bold">
        {caseToEdit ? "Redigera Ärende" : "Skapa Nytt Ärende"}
      </h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Kund</label>
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="mt-1 block w-full rounded border p-2"
            required
          >
            <option value="" disabled>
              Välj kund...
            </option>
            {customers.map((c: Customer) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Titel</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded border p-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Beskrivning</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full rounded border p-2"
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Skapat datum</label>
          <input
            type="date"
            value={createdDate ?? ""}
            onChange={(e) => setCreatedDate(e.target.value || null)}
            className="mt-1 block w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Planerat datum</label>
          <input
            type="date"
            value={scheduledDate ?? ""}
            onChange={(e) => setScheduledDate(e.target.value || null)}
            className="mt-1 block w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-1 block w-full rounded border p-2"
          >
            <option value="pending">Väntande</option>
            <option value="in_progress">Pågående</option>
            <option value="completed">Avslutat</option>
            <option value="cancelled">Avbrutet</option>
          </select>
        </div>

        <div className="flex justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border px-4 py-2 text-black-700"
          >
            Avbryt
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
          >
            {loading
              ? caseToEdit
                ? "Sparar..."
                : "Skapar..."
              : caseToEdit
                ? "Spara ändringar"
                : "Skapa Ärende"}
          </button>
        </div>

        {message && <div className="mt-2 text-sm">{message}</div>}
      </form>
    </div>
  );
};

export default NewCaseForm;