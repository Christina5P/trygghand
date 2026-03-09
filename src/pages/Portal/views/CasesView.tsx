// src/pages/Portal/views/CasesView.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit, Upload } from "lucide-react";
import { ConversationCard } from "@/pages/Portal/components/shared/ConversationCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import NewCaseForm from "./NewCaseForm"; // Importera din NewCaseForm

// Importera dina typer
import type { Case, Customer, Comment, ServiceType } from "@/types";

interface CasesViewProps {
  cases: Case[];
  casesForCount?: Case[];
  customers: Customer[]; // För att skicka till NewCaseForm
  onDataUpdated: () => Promise<void> | void;
  onOpenCase?: (c: Case) => void;
  onUnreadCasesChange?: (count: number) => void;
  onActiveCasesCountChange?: (count: number) => void;
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

const statusOptions = [
  { value: "pending", label: "Väntar" },
  { value: "in_progress", label: "Pågår" },
  { value: "completed", label: "Klar" },
  { value: "cancelled", label: "Avbruten" },
];

const CasesView: React.FC<CasesViewProps> = ({
  cases,
  casesForCount,
  customers,
  onDataUpdated,
  onOpenCase,
  onUnreadCasesChange,
  onActiveCasesCountChange,
}) => {
  const { user } = useAuth(); // Används för att skicka till NewCaseForm som default adminId
  const { markNotificationsReadForRef } = useNotifications();
  const [isNewCaseDialogOpen, setIsNewCaseDialogOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [caseComments, setCaseComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [caseCommentsCounts, setCaseCommentsCounts] = useState<Record<string, number>>({});
  const [latestCustomerCommentAt, setLatestCustomerCommentAt] = useState<Record<string, string>>({});
  const [localReadAtByCaseId, setLocalReadAtByCaseId] = useState<Record<string, { admin_last_read_at?: string; customer_last_read_at?: string }>>({});
  const [archivedCustomerMap, setArchivedCustomerMap] = useState<Record<string, string>>({});
  const [showArchivedCases, setShowArchivedCases] = useState(false);
  const archivedCasesAutoOpened = useRef(false);
  // Guard: track which editingCase.id has already had notifications marked read
  // so that comment-refresh fetches don't re-fire the mark after the first time.
  const notifMarkedForCaseRef = useRef<string | null>(null);

  const toMs = (iso?: string | null) => {
    const parsed = iso ? Date.parse(iso) : NaN;
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const markCaseAsRead = useCallback(
    (caseId: string) => {
      if (!user?.id) return;
      const nowIso = new Date().toISOString();
      setLocalReadAtByCaseId((prev) => ({
        ...prev,
        [caseId]: {
          ...(prev[caseId] ?? {}),
          admin_last_read_at: nowIso,
        },
      }));
      // Write admin_last_read_at to DB so customer can see "Läst" on their own messages.
      supabase.functions.invoke("mark-case-as-read", { body: { case_id: caseId } }).catch(() => {});
    },
    [user?.id]
  );

  const hasUnread = useCallback(
    (caseItem: Case) => {
      if (!user?.id) return false;
      try {
        const myLastReadAt = localReadAtByCaseId[caseItem.id]?.admin_last_read_at ?? caseItem.admin_last_read_at;
        const latestAt = latestCustomerCommentAt[caseItem.id];
        return toMs(latestAt) > toMs(myLastReadAt);
      } catch {
        return false;
      }
    },
    [latestCustomerCommentAt, localReadAtByCaseId, user?.id]
  );

  const unreadCasesCount = React.useMemo(() => {
    if (!cases?.length) return 0;
    return cases.reduce((acc, caseItem) => (hasUnread(caseItem) ? acc + 1 : acc), 0);
  }, [cases, hasUnread]);

  useEffect(() => {
    onUnreadCasesChange?.(unreadCasesCount);
  }, [onUnreadCasesChange, unreadCasesCount]);

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

  const fetchCaseCommentsCount = useCallback(async (caseId: string) => {
    try {
      const { count, error } = await supabase
        .from("case_comments")
        .select("*", { count: "exact", head: true })
        .eq("case_id", caseId);

      if (error) throw error;
      setCaseCommentsCounts(prev => ({ ...prev, [caseId]: count || 0 }));
    } catch (err) {
      console.error("Error fetching case comments count:", err);
      setCaseCommentsCounts(prev => ({ ...prev, [caseId]: 0 }));
    }
  }, []);

  const fetchLatestCustomerComment = useCallback(async (caseId: string) => {
    try {
      const { data, error } = await supabase
        .from("case_comments")
        .select("created_at")
        .eq("case_id", caseId)
        .eq("author_type", "customer")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      const createdAt = (data as any)?.[0]?.created_at as string | undefined;
      setLatestCustomerCommentAt((prev) => ({
        ...prev,
        [caseId]: createdAt || "",
      }));
    } catch (err) {
      console.error("Error fetching latest customer comment:", err);
      setLatestCustomerCommentAt((prev) => ({ ...prev, [caseId]: "" }));
    }
  }, []);

  const handleOpenNewCaseDialog = () => {
    setEditingCase(null); // Nollställ för nytt ärende
    setCaseComments([]); // Rensa kommentarer
    setIsNewCaseDialogOpen(true);
  };

  // Mark notifications as read only after the dialog is open and comments have loaded.
  // Using a ref prevents re-firing on subsequent comment refreshes.
  useEffect(() => {
    if (!editingCase?.id || loadingComments) return;
    if (notifMarkedForCaseRef.current === editingCase.id) return;
    notifMarkedForCaseRef.current = editingCase.id;
    markNotificationsReadForRef(editingCase.id);
  }, [editingCase?.id, loadingComments, markNotificationsReadForRef]);

  const handleEditCase = (caseItem: Case) => {
    setEditingCase(caseItem);
    setIsNewCaseDialogOpen(true);
    notifMarkedForCaseRef.current = null; // reset so the new case triggers the effect
    // Ladda kommentarer när ett ärende öppnas för redigering
    if (caseItem.id) {
        fetchCaseComments(caseItem.id);
        markCaseAsRead(caseItem.id);
        // markNotificationsReadForRef moved to useEffect above (fires after comments load)
    }
   // Notify parent (AdminPortal) so it can show full case dialog/details
   onOpenCase?.(caseItem);
  };

  const handleCaseFormClose = async () => {
    setIsNewCaseDialogOpen(false);
    setEditingCase(null); // Rensa det ärende som redigerades
    setCaseComments([]); // Rensa kommentarerna
    await onDataUpdated(); // Ladda om alla ärenden
  };

  const handleStatusChange = async (caseId: string, newStatus: string) => {
    try {
      const { error } = await supabase.functions.invoke("admin-set-case-status", {
        body: { case_id: caseId, status: newStatus },
      });

      if (error) throw error;
      await onDataUpdated();
    } catch (err) {
      console.error("Error updating case status:", err);
    }
  };

  useEffect(() => {
    if (cases.length > 0) {
      cases.forEach(caseItem => {
        if (caseItem.id) {
          fetchCaseCommentsCount(caseItem.id);
          fetchLatestCustomerComment(caseItem.id);
        }
      });
    }
  }, [cases, fetchCaseCommentsCount, fetchLatestCustomerComment]);

  const countCasesSource = casesForCount ?? cases;

  useEffect(() => {
    const missingIds = Array.from(
      new Set(
        countCasesSource
          .map((caseItem) => caseItem.customer_id)
          .filter((id): id is string => Boolean(id) && !customers.find((c) => c.id === id))
          .filter((id) => !archivedCustomerMap[id])
      )
    );

    if (missingIds.length === 0) return;

    const fetchArchivedNames = async () => {
      try {
        const { data, error } = await supabase
          .from("archived_customers")
          .select("id, name")
          .in("id", missingIds);

        if (error) throw error;

        const nextMap = { ...archivedCustomerMap };
        (data ?? []).forEach((row: any) => {
          if (row?.id && row?.name) nextMap[row.id] = row.name;
        });
        setArchivedCustomerMap(nextMap);
      } catch (err) {
        console.error("Error fetching archived customers:", err);
      }
    };

    void fetchArchivedNames();
  }, [countCasesSource, customers, archivedCustomerMap]);

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return "Okänd";
    const activeName = customers.find((c) => c.id === customerId)?.name;
    return activeName || archivedCustomerMap[customerId] || "Okänd";
  };

  const isArchivedCustomer = (customerId: string | null) => {
    if (!customerId) return false;
    return Boolean(archivedCustomerMap[customerId]);
  };

  const activeCases = cases.filter((caseItem) => !isArchivedCustomer(caseItem.customer_id ?? null));
  const archivedCases = cases.filter((caseItem) => isArchivedCustomer(caseItem.customer_id ?? null));
  const activeCasesCount = countCasesSource.filter((caseItem) => !isArchivedCustomer(caseItem.customer_id ?? null)).length;

  useEffect(() => {
    if (!archivedCasesAutoOpened.current && archivedCases.length > 0) {
      archivedCasesAutoOpened.current = true;
      setShowArchivedCases(true);
    }
  }, [archivedCases.length]);

  useEffect(() => {
    onActiveCasesCountChange?.(activeCasesCount);
  }, [activeCasesCount, onActiveCasesCountChange]);

  const renderCaseCard = (caseItem: Case) => {
    const totalCount = caseCommentsCounts[caseItem.id] || 0;
    const unread = hasUnread(caseItem);

    const statusSlot = (
      <div
        className={`rounded transition-colors ${getStatusColor(caseItem.status)}`}
        style={{ minWidth: 96, minHeight: 28, display: "flex", alignItems: "center" }}
      >
        <Select defaultValue={caseItem.status} onValueChange={(s) => handleStatusChange(caseItem.id, s)}>
          <SelectTrigger className="min-w-[88px] w-24 sm:w-28 h-7 bg-transparent border-none shadow-none focus:ring-0 focus:outline-none text-[11px] sm:text-xs px-1 leading-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );

    const actionsSlot = (
      <Button
        variant="ghost"
        size="icon"
        title="Ta bort ärende"
        className="p-1 h-7 w-7 text-gray-400 hover:text-red-600 hover:bg-red-50 border border-gray-200"
        onClick={async (e) => {
          e.stopPropagation();
          if (!window.confirm("Är du säker på att du vill ta bort detta ärende?")) return;
          try {
            const userId = user?.id;
            if (!userId) throw new Error("Ingen användare inloggad");
            const { error } = await supabase.functions.invoke("admin-soft-delete-case", {
              body: { case_id: caseItem.id, user_id: userId },
            });
            if (error) throw error;
            await onDataUpdated();
          } catch (err: any) {
            alert("Kunde inte ta bort ärendet: " + (err?.message || err));
          }
        }}
      >
        <span className="sr-only">Ta bort</span>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </Button>
    );

    const subtitle = [
      `Kund: ${getCustomerName(caseItem.customer_id ?? null)}`,
      `Skapat: ${caseItem.created_at ? format(new Date(caseItem.created_at), "dd MMM yyyy", { locale: sv }) : "N/A"}`,
      caseItem.scheduled_date ? `Schemalagt: ${format(new Date(caseItem.scheduled_date), "dd MMM yyyy", { locale: sv })}` : null,
    ].filter(Boolean).join(" | ");

    return (
      <ConversationCard
        key={caseItem.id}
        title={caseItem.title ?? ""}
        subtitle={subtitle}
        unread={unread}
        readStatusLabel={unread ? "Oläst" : "Läst"}
        commentCount={totalCount}
        statusSlot={statusSlot}
        actionsSlot={actionsSlot}
        onClick={() => handleEditCase(caseItem)}
      />
    );
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-2xl font-bold">Ärendehantering</h2>
        <Button
          onClick={handleOpenNewCaseDialog}
          className="bg-trust-blue hover:bg-trust-blue/90 w-full sm:w-auto h-9 text-sm px-3"
        >
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
        <div className="space-y-6 mt-4">
          <div>
            {activeCases.length === 0 ? (
              <p className="text-center text-gray-500 py-6">Inga aktiva ärenden.</p>
            ) : (
              <div className="grid gap-4">
                {activeCases.map((caseItem) => renderCaseCard(caseItem))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Button
              variant="ghost"
              className="text-sm text-gray-600"
              onClick={() => setShowArchivedCases((v) => !v)}
            >
              {showArchivedCases ? "Fäll ihop" : "Visa"} arkiverade ärenden ({archivedCases.length})
            </Button>
            {showArchivedCases && (
              archivedCases.length === 0 ? (
                <p className="text-center text-gray-500 py-4">Inga arkiverade ärenden.</p>
              ) : (
                <div className="grid gap-4">
                  {archivedCases.map((caseItem) => renderCaseCard(caseItem))}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CasesView;