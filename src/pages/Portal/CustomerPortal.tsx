// src/pages/Portal/CustomerPortal.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"; // Import för Fullmakt Dialog
import CollapsibleCard from "@/components/ui/CollapsibleCard"; // Se till att denna komponent finns
import ValuationManager from "@/components/ValuationManager"; // Se till att denna komponent finns
import KeyReceiptDialog from "@/pages/Portal/dialogs/KeyReceiptDialog";
import { PortalStats } from '@/pages/Portal/PortalStats'; // Se till att denna komponent finns
import Tidio from "@/components/Tidio"; // Se till att denna komponent finns    
import { CaseCommentsThread } from "./components/cases/CaseCommentsThread";
import { CaseDocumentsSection, type CaseDocument } from "./components/cases/CaseDocumentsSection";
import { SubscriptionCancellationsView } from "./views/SubscriptionCancellationsView";

import {
  MessageSquare,
    MessageCircle,
  Calendar,
  MapPin,
  DollarSign,
  Loader2,
  User,
  FileText, // Lade till för Fullmakt
    KeyRound,
  Briefcase, // Lade till för ärendeikon
} from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import type { Customer, Case, Comment, Valuation, FullmaktDocument, SubscriptionCancellation, Subscription } from '@/types'; // Importera dina typer
import { ChangePasswordSection } from "./components/ChangePasswordSection";
import { isMissingColumnError, isUnauthorizedError, tryRefreshSession } from "@/lib/supabase";
import { useNotifications } from "@/hooks/useNotifications";
import { getNotificationDescription } from "@/lib/notifications";
import PushNotificationToggle from "@/components/PushNotificationToggle";

import type { Dispatch, SetStateAction } from "react";

type GdprRequestLite = {
    id: string;
    status: "ready" | "delivered";
    expires_at: string | null;
    created_at: string | null;
};
 
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

type CustomerPortalProps = {
  customer: Customer;
  fullmaktTemplates?: { id: string; name: string; storage_path: string }[];
  handleDownloadTemplate?: (path: string) => Promise<void>;
};

const CustomerPortal: React.FC<CustomerPortalProps> = ({ customer, fullmaktTemplates = [], handleDownloadTemplate }) => {
  const [templatesOpen, setTemplatesOpen] = useState(false);
        const { unread, unreadCount } = useNotifications();

    const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);

  // example controlled state — adapt to your actual state variable
  const [editingCustomer, setEditingCustomer] = useState<Customer>(customer);

  useEffect(() => {
    setEditingCustomer(customer);
  }, [customer]);

  // Generic input change handler for inputs/textarea/select
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name } = target;
    let value: any;

    if (target.type === "checkbox") value = (target as HTMLInputElement).checked;
    else if (target.type === "file") value = (target as HTMLInputElement).files?.[0];
    else value = target.value;

    setEditingCustomer((prev) => ({ ...((prev as unknown) as any), [name]: value }) as Customer);
  };

  // Call this to persist updates to customer profile
  const handleUpdateCustomer = async (updates?: Partial<Customer>) => {
    if (!customer?.id) return;
    const payload = updates ? ({ ...editingCustomer, ...updates } as Customer) : editingCustomer;
    setLoadingSave(true);
    try {
      console.log("Updating customer:", payload);
      
      const { error } = await supabase
        .from("customers")
        .update({
          name: payload.name,
          email: payload.email || null,
          phone: payload.phone || null,
          personal_number: payload.personal_number || null,
        })
        .eq("id", customer.id);
      
      if (error) throw error;
      
      // Update local state
      setEditingCustomer(payload);
      
      toast({ title: "Sparat", description: "Dina ändringar har sparats." });
    } catch (err) {
      console.error("Failed to update customer", err);
      toast({ title: "Kunde inte spara", description: (err as any)?.message || "Något gick fel", variant: "destructive" });
    } finally {
      setLoadingSave(false);
    }
  };

    const { user } = useAuth(); // Används för auth.uid() vid kommentarer
    const { toast } = useToast();

    const handleUnauthorized = useCallback(async () => {
        // Try to refresh once; if it fails, force a clean re-login.
        const refreshed = await tryRefreshSession();
        if (refreshed) return true;

        try {
            await supabase.auth.signOut();
        } catch {
            // ignore
        }
        toast({
            title: "Sessionen har gått ut",
            description: "Logga in igen för att fortsätta.",
            variant: "destructive",
        });
        window.location.href = "/portal";
        return false;
    }, [toast]);

    // --- State för kundinformation ---
    const [loadingSave, setLoadingSave] = useState(false);

    // --- State för Ärendehantering ---
    const [cases, setCases] = useState<Case[]>([]);
    const [selectedCase, setSelectedCase] = useState<Case | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loadingCases, setLoadingCases] = useState(true);
    const [loadingComments, setLoadingComments] = useState(false);
    const [caseCommentsCounts, setCaseCommentsCounts] = useState<Record<string, number>>({});
    const [caseDocuments, setCaseDocuments] = useState<CaseDocument[]>([]);
    const [loadingCaseDocuments, setLoadingCaseDocuments] = useState(false);

    // UI-only: olästa meddelanden ("nya sedan senaste öppning")
    const [unreadTick, setUnreadTick] = useState(0);

    const casesByIdRef = useRef<Map<string, Case>>(new Map());
    const selectedCaseIdRef = useRef<string | null>(null);

    // --- State för Värderingshantering ---
    const [valuations, setValuations] = useState<Valuation[]>([]);
    const [loadingValuations, setLoadingValuations] = useState(true);

    // --- State för Uppsägningar ---
    const [cancellations, setCancellations] = useState<SubscriptionCancellation[]>([]);
    const [loadingCancellations, setLoadingCancellations] = useState(true);
    
    // --- State för Fullmakt ---
    const [isFullmaktDialogOpen, setIsFullmaktDialogOpen] = useState(false);
    const [documents, setDocuments] = useState<FullmaktDocument[]>([]);
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [gdprRequest, setGdprRequest] = useState<GdprRequestLite | null>(null);
    const [gdprDownloadBusy, setGdprDownloadBusy] = useState(false);
    
    useEffect(() => {
        setEditingCustomer(customer);
        if (customer.id) {
            fetchCases();
            fetchValuations();
            fetchCancellations();
        } else {
            setLoadingCases(false);
            setLoadingValuations(false);
            setLoadingCancellations(false);
        }
    }, [customer.id]);

    const fetchLatestGdprRequest = useCallback(async () => {
        if (!customer?.id) return;
        try {
            const nowIso = new Date().toISOString();
            const { data, error } = await supabase
                .from("gdpr_requests")
                .select("id, status, expires_at, created_at")
                .eq("customer_id", customer.id)
                .in("status", ["ready", "delivered"])
                .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
                .order("created_at", { ascending: false })
                .limit(1);

            if (error) throw error;
            const row = Array.isArray(data) ? (data[0] as GdprRequestLite | undefined) : undefined;
            setGdprRequest(row ?? null);
        } catch (err) {
            console.error("fetch gdpr request failed", err);
            setGdprRequest(null);
        }
    }, [customer?.id]);

    useEffect(() => {
        const map = new Map<string, Case>();
        for (const c of cases) {
            if (c?.id) map.set(c.id, c);
        }
        casesByIdRef.current = map;
    }, [cases]);

    useEffect(() => {
        selectedCaseIdRef.current = selectedCase?.id || null;
    }, [selectedCase?.id]);

    const fetchCaseCommentsCount = useCallback(async (caseId: string) => {
        try {
            const { count, error } = await supabase
                .from("case_comments")
                .select("*", { count: "exact", head: true })
                .eq("case_id", caseId)
                .is("deleted_at", null);
            if (error) throw error;
            setCaseCommentsCounts((prev) => ({ ...prev, [caseId]: count || 0 }));
        } catch (err) {
            console.error("Error fetching case comments count:", err);
            setCaseCommentsCounts((prev) => ({ ...prev, [caseId]: 0 }));
        }
    }, []);

    useEffect(() => {
        if (cases.length > 0) {
            cases.forEach((c) => {
                if (c?.id) fetchCaseCommentsCount(c.id);
            });
        }
    }, [cases, fetchCaseCommentsCount]);

    const storageUserId = customer?.id ?? user?.id ?? "";

    const lastReadCountKey = useCallback(
        (caseId: string) => `customerPortal:lastReadCount:${storageUserId}:${caseId}`,
        [storageUserId]
    );

    const getUnreadCount = useCallback(
        (caseId: string) => {
            void unreadTick;
            if (!storageUserId) return 0;
            try {
                const totalCount = caseCommentsCounts[caseId] || 0;
                const raw = window.localStorage.getItem(lastReadCountKey(caseId));
                const lastReadCount = Number.parseInt(raw || "0", 10);
                if (!Number.isFinite(lastReadCount) || lastReadCount < 0) return totalCount;
                return Math.max(0, totalCount - lastReadCount);
            } catch {
                return 0;
            }
        },
        [unreadTick, lastReadCountKey, caseCommentsCounts, storageUserId]
    );

    const markCaseAsRead = useCallback(
        (caseId: string, totalOverride?: number) => {
            if (!storageUserId) return;
            try {
                const total = totalOverride ?? (caseCommentsCounts[caseId] || 0);
                window.localStorage.setItem(lastReadCountKey(caseId), String(total));
                setUnreadTick((t) => t + 1);
            } catch {
                // ignore
            }
        },
        [lastReadCountKey, caseCommentsCounts, storageUserId]
    );

    useEffect(() => {
        if (!cases.length) return;
        const caseIdFromUrl = new URLSearchParams(window.location.search).get("caseId");
        if (!caseIdFromUrl) return;
        const match = cases.find((item) => item.id === caseIdFromUrl);
        if (!match) return;
        setSelectedCase(match);
        markCaseAsRead(match.id);
    }, [cases, markCaseAsRead]);

        const unreadCaseMessagesCount = useMemo(() => {
                if (!cases?.length) return 0;
                return cases.reduce((acc, caseItem) => acc + getUnreadCount(caseItem.id), 0);
        }, [cases, getUnreadCount]);
        const notificationDescriptions = useMemo(
            () => unread.map((notification) => getNotificationDescription(notification)),
            [unread]
        );
        const messageDescription = useMemo(() => {
            if (unreadCaseMessagesCount <= 0) return null;
            if (unreadCaseMessagesCount === 1) return "Nytt meddelande i ett ärende.";
            return `Nya meddelanden i ${unreadCaseMessagesCount} ärenden.`;
        }, [unreadCaseMessagesCount]);
        const bannerDescriptions = useMemo(() => {
            const items: string[] = [];
            if (messageDescription) items.push(messageDescription);
            for (const text of notificationDescriptions) {
                if (items.length >= 3) break;
                items.push(text);
            }
            return items;
        }, [messageDescription, notificationDescriptions]);
        const totalUnread = unreadCount + unreadCaseMessagesCount;
        const extraUnreadCount = Math.max(0, totalUnread - bannerDescriptions.length);

    useEffect(() => {
        // Realtime notiser för nya kommentarer i kundens ärenden
        if (!customer?.id) return;

        const channel = supabase
            .channel(`case_comments_customer_${customer.id}`)
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "case_comments" },
                (payload) => {
                    const row = payload.new as any;
                    const caseId = row?.case_id as string | undefined;
                    if (!caseId) return;

                    const caseItem = casesByIdRef.current.get(caseId);

                    const currentId = user?.id ?? customer?.id;

                    setCaseCommentsCounts((prev) => {
                        const nextCount = (prev[caseId] ?? 0) + 1;

                        // Notifiera inte på egna kommentarer (och markera ej som oläst)
                        if (row?.author_id && currentId && row.author_id === currentId) {
                            markCaseAsRead(caseId, nextCount);
                            return { ...prev, [caseId]: nextCount };
                        }

                        // Om kunden redan har ärendet öppet räknas detta som läst direkt.
                        if (selectedCaseIdRef.current === caseId) {
                            markCaseAsRead(caseId, nextCount);
                        }

                        return { ...prev, [caseId]: nextCount };
                    });

                    toast({
                        title: "Nytt meddelande",
                        description: caseItem
                            ? `Nytt meddelande i ärendet: ${caseItem.title}`
                            : "Nytt meddelande i ett ärende",
                    });
                }
            )
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "case_comments" },
                (payload) => {
                    const row = payload.new as any;
                    const caseId = row?.case_id as string | undefined;
                    if (!caseId) return;
                    if (row?.deleted_at) {
                        fetchCaseCommentsCount(caseId);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [customer?.id, toast, user?.id, markCaseAsRead, fetchCaseCommentsCount]);

    // --- Hämta Ärenden ---
    const fetchCases = useCallback(async () => {
        if (!customer?.id) return;
        setLoadingCases(true);
        const run = () =>
            supabase
                .from("cases")
                .select("*, service_type:service_type_id(name, description)")
                .eq("customer_id", customer.id)
                .is("deleted_at", null)
                .order("created_at", { ascending: false });

        try {
            let { data, error } = await run();
            if (error && isUnauthorizedError(error)) {
                const ok = await handleUnauthorized();
                if (ok) ({ data, error } = await run());
            }
            if (error) throw error;
            setCases((data as Case[]) || []);
        } catch (err) {
            console.error("Error fetching cases:", err);
            toast({
                title: "Fel",
                description: "Kunde inte hämta ärenden",
                variant: "destructive",
            });
        } finally {
            setLoadingCases(false);
        }
    }, [customer?.id, toast, handleUnauthorized]);

    useEffect(() => {
        void fetchLatestGdprRequest();
    }, [fetchLatestGdprRequest]);

    useEffect(() => {
        const interval = window.setInterval(() => {
            void fetchLatestGdprRequest();
        }, 20000);
        const onFocus = () => void fetchLatestGdprRequest();
        window.addEventListener("focus", onFocus);
        return () => {
            window.clearInterval(interval);
            window.removeEventListener("focus", onFocus);
        };
    }, [fetchLatestGdprRequest]);

    const handleDownloadGdprReport = async () => {
        if (!gdprRequest?.id) return;
        setGdprDownloadBusy(true);
        try {
            const { data, error } = await supabase.functions.invoke("gdpr-export", {
                body: { action: "download", request_id: gdprRequest.id },
            });
            if (error) throw error;
            const signedUrl = (data as any)?.signed_url || (data as any)?.signedUrl;
            if (!signedUrl) throw new Error("Saknar signed URL");
            window.open(signedUrl, "_blank", "noopener,noreferrer");
            await fetchLatestGdprRequest();
        } catch (err) {
            console.error("gdpr download failed", err);
            toast({ title: "Fel", description: "Kunde inte ladda ner utdraget.", variant: "destructive" });
        } finally {
            setGdprDownloadBusy(false);
        }
    };

    // --- Hämta Kommentarer ---
    const fetchComments = useCallback(async (caseId: string) => {
        setLoadingComments(true);
        try {
            const { data, error } = await supabase
                .from("case_comments")
                .select(`*, author:customers(name)`) // Joina med kunder för att få namn
                .eq("case_id", caseId)
                .is("deleted_at", null)
                .order("created_at", { ascending: true });

            if (error) throw error;
            const list = (data as Comment[]) || [];
            setComments(list);
            setCaseCommentsCounts((prev) => ({ ...prev, [caseId]: list.length }));
        } catch (err) {
            console.error("Error fetching comments:", err);
            setComments([]);
        } finally {
            setLoadingComments(false);
        }
    }, []);

    const fetchCaseDocuments = useCallback(async (caseId: string) => {
        setLoadingCaseDocuments(true);
        try {
            const run = () =>
                supabase.functions.invoke("case-list-documents", {
                    body: { case_id: caseId },
                });

            let { data, error } = await run();
            if (error && isUnauthorizedError(error)) {
                const ok = await handleUnauthorized();
                if (ok) ({ data, error } = await run());
            }
            if (error) throw error;
            if ((data as any)?.ok !== true) throw new Error((data as any)?.error || "Kunde inte hämta dokument");

            const docs = (data as any)?.documents;
            setCaseDocuments(Array.isArray(docs) ? (docs as CaseDocument[]) : []);
        } catch (err) {
            console.error("Error fetching case documents:", err);
            setCaseDocuments([]);
        } finally {
            setLoadingCaseDocuments(false);
        }
    }, [handleUnauthorized]);
    
    // --- Hämta Värderingar ---
    const fetchValuations = useCallback(async () => {
        if (!customer?.id) return;
        setLoadingValuations(true);
        try {
            const { data, error } = await supabase.rpc("customer_get_my_valuations");
            if (error) throw error;
            setValuations(data as Valuation[] || []);
        } catch (err) {
            console.error("Error fetching valuations:", err);
            toast({ title: "Fel", description: "Kunde inte hämta värderingar", variant: "destructive" });
        } finally {
            setLoadingValuations(false);
        }
    }, [customer?.id, toast]);

    // --- Hämta Uppsägningar ---
    const fetchCancellations = useCallback(async () => {
        if (!customer?.id) return;
        setLoadingCancellations(true);
        try {
            const run = () =>
                supabase
                    .from("subscription_cancellations")
                    .select("*")
                    .eq("customer_id", customer.id)
                    .order("created_at", { ascending: false });

            let { data, error } = await run();
            if (error && isUnauthorizedError(error)) {
                const ok = await handleUnauthorized();
                if (ok) ({ data, error } = await run());
            }

            if (error) throw error;
            const mapped = (data || []).map((c: any) => ({
                ...c,
                id: String(c.id),
                customer_id: c.customer_id != null ? String(c.customer_id) : c.customer_id,
                subscription_id: c.subscription_id != null ? String(c.subscription_id) : null,
            }));
            setCancellations(mapped as SubscriptionCancellation[]);
        } catch (err) {
            console.error("Error fetching cancellations:", err);
            toast({ title: "Fel", description: "Kunde inte hämta uppsägningar", variant: "destructive" });
            setCancellations([]);
        } finally {
            setLoadingCancellations(false);
        }
    }, [customer?.id, handleUnauthorized, toast]);

    // --- Hämta fullmakter för kund ---
    const fetchDocuments = useCallback(async () => {
        setLoadingDocuments(true);
        try {
            const runUser = () => supabase.auth.getUser();
            let { data: authData, error: authError } = await runUser();
            if ((authError || !authData.user) && isUnauthorizedError(authError)) {
                const ok = await handleUnauthorized();
                if (ok) ({ data: authData, error: authError } = await runUser());
            }
            if (authError || !authData.user) throw authError || new Error('Ingen användare');
            const userId = authData.user.id;

            const run = () =>
                supabase
                    .from('fullmakter')
                    .select('id, fullmaktsgivare, file_name, dokument_url, created_at')
                    .eq('fullmaktsgivare', userId)
                    .is('deleted_at', null)
                    .order('created_at', { ascending: false });

            let { data, error } = await run();
            if (error && isUnauthorizedError(error)) {
                const ok = await handleUnauthorized();
                if (ok) ({ data, error } = await run());
            }

            // Backward-compat: production might not have soft-delete columns yet.
            if (error && isMissingColumnError(error, "deleted_at")) {
                const runNoSoftDelete = () =>
                    supabase
                        .from('fullmakter')
                        .select('id, fullmaktsgivare, file_name, dokument_url, created_at')
                        .eq('fullmaktsgivare', userId)
                        .order('created_at', { ascending: false });

                ({ data, error } = await runNoSoftDelete());
            }
            if (error) throw error;
            const mapped: FullmaktDocument[] = (data || []).map((d: any) => ({
                id: d.id,
                customer_id: d.fullmaktsgivare,
                file_name: d.file_name,
                storage_path: d.dokument_url,
                created_at: d.created_at,
            }));
            setDocuments(mapped);
        } catch (err) {
            console.error('Kunde inte hämta fullmakter:', err);
            toast({ title: 'Fel', description: 'Kunde inte ladda fullmakter.', variant: 'destructive' });
            setDocuments([]);
        } finally {
            setLoadingDocuments(false);
        }
    }, [toast, handleUnauthorized]);

    // Hämta dokument när dialog öppnas
    useEffect(() => {
        if (isFullmaktDialogOpen) fetchDocuments();
    }, [isFullmaktDialogOpen, fetchDocuments]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setSelectedFile(e.target.files[0]);
    };

    const handleUploadFullmakt = async () => {
        if (!selectedFile) {
            toast({ title: 'Varning', description: 'Välj en fil att ladda upp.', variant: 'destructive' });
            return;
        }
        setUploading(true);
        try {
            const ext = (selectedFile.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';

            // 1) Ask Edge Function for signed upload token + path
            const runCreate = () =>
                supabase.functions.invoke('fullmakt-create-upload', {
                    body: { file_ext: ext, mime_type: selectedFile.type || null },
                });

            let { data, error } = await runCreate();
            if (error && isUnauthorizedError(error)) {
                const ok = await handleUnauthorized();
                if (ok) ({ data, error } = await runCreate());
            }
            if (error) throw error;
            if (!(data as any)?.ok) throw new Error((data as any)?.error || 'Kunde inte initiera uppladdning');

            const path = (data as any).path as string;
            const token = (data as any).token as string;

            // 2) Upload to signed URL
            const { error: upErr } = await supabase.storage
                .from('fullmakts-filer')
                .uploadToSignedUrl(path, token, selectedFile);
            if (upErr && isUnauthorizedError(upErr)) {
                const ok = await handleUnauthorized();
                if (ok) {
                    const { error: upErr2 } = await supabase.storage
                        .from('fullmakts-filer')
                        .uploadToSignedUrl(path, token, selectedFile);
                    if (upErr2) throw upErr2;
                } else {
                    throw upErr;
                }
            } else if (upErr) {
                throw upErr;
            }

            // 3) Attach document row in DB (server-side)
            const runAttach = () =>
                supabase.functions.invoke('fullmakt-attach', {
                    body: {
                        path,
                        file_name: selectedFile.name,
                        fullmaktstyp: 'uppladdning',
                        file_type: selectedFile.type || null,
                        file_size: selectedFile.size,
                    },
                });

            let { data: attachData, error: attachErr } = await runAttach();
            if (attachErr && isUnauthorizedError(attachErr)) {
                const ok = await handleUnauthorized();
                if (ok) ({ data: attachData, error: attachErr } = await runAttach());
            }
            if (attachErr) throw attachErr;
            if ((attachData as any)?.ok !== true) throw new Error((attachData as any)?.error || 'Kunde inte spara dokument');

            toast({ title: 'Uppladdning klar', description: `${selectedFile.name} sparad.`, variant: 'default' });
            setSelectedFile(null);
            await fetchDocuments();
        } catch (err) {
            console.error('Uppladdning/DB-fel:', err);
            toast({ title: 'Fel', description: 'Kunde inte ladda upp fil eller spara referens.', variant: 'destructive' });
        } finally {
            setUploading(false);
        }
    };

    const handleDownload = async (doc: FullmaktDocument) => {
        if (!doc?.storage_path) {
            toast({ title: 'Fel', description: 'Ingen sökväg för dokumentet.', variant: 'destructive' });
            return;
        }
        try {
            const popup = window.open("about:blank", "_blank", "noopener,noreferrer");
            const res = await fetch(`/api/templates/download?path=${encodeURIComponent(doc.storage_path)}`);
            if (!res.ok) throw new Error(`Kunde inte hämta filen (${res.status})`);

            const blob = await res.blob();
            const objectUrl = URL.createObjectURL(blob);

            if (popup && !popup.closed) {
                popup.location.href = objectUrl;
            } else {
                window.open(objectUrl, '_blank', 'noopener,noreferrer');
            }

            setTimeout(() => {
                try {
                    URL.revokeObjectURL(objectUrl);
                } catch {
                    // ignore
                }
            }, 60_000);
        } catch (err) {
            console.error('Nedladdning misslyckades:', err);
            toast({ title: 'Fel', description: 'Kunde inte skapa nedladdningslänk.', variant: 'destructive' });
        }
    };

    const handleDeleteDocument = async (doc: FullmaktDocument) => {
        if (!doc?.id) {
            toast({ title: 'Fel', description: 'Saknar dokument-id.', variant: 'destructive' });
            return;
        }

        if (!confirm('Vill du ta bort detta dokument?')) return;

        setDeletingDocumentId(doc.id);
        try {
            const runUser = () => supabase.auth.getUser();
            let { data: authData, error: authError } = await runUser();
            if ((authError || !authData.user) && isUnauthorizedError(authError)) {
                const ok = await handleUnauthorized();
                if (ok) ({ data: authData, error: authError } = await runUser());
            }
            if (authError || !authData.user) throw authError || new Error('Ingen användare');
            const userId = authData.user.id;

            // Soft delete in DB (customer should NOT physically delete the file in Storage).
            const now = new Date().toISOString();
            const runUpdate = () =>
                supabase
                    .from('fullmakter')
                    .update({ deleted_at: now, deleted_by: userId })
                    .eq('id', doc.id)
                    .eq('fullmaktsgivare', userId)
                    .is('deleted_at', null);

            let { error: dbError } = await runUpdate();
            if (dbError && isUnauthorizedError(dbError)) {
                const ok = await handleUnauthorized();
                if (ok) ({ error: dbError } = await runUpdate());
            }

            if (dbError && (isMissingColumnError(dbError, "deleted_at") || isMissingColumnError(dbError, "deleted_by"))) {
                toast({
                    title: 'Soft delete saknas',
                    description: 'Kör SQL-scriptet supabase/scripts/add_fullmakter_soft_delete_columns.sql i Supabase för att aktivera borttagning.',
                    variant: 'destructive',
                });
                return;
            }
            if (dbError) throw dbError;

            setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
            toast({ title: 'Borttaget', description: 'Dokumentet är borttaget för dig.' });
        } catch (err) {
            console.error('Borttagning misslyckades:', err);
            toast({ title: 'Fel', description: 'Kunde inte ta bort dokumentet.', variant: 'destructive' });
        } finally {
            setDeletingDocumentId(null);
        }
    };

    // --- Ladda kommentarer när ärende väljs ---
    useEffect(() => {
        if (selectedCase?.id) {
            fetchComments(selectedCase.id);
            fetchCaseDocuments(selectedCase.id);
        } else {
            setComments([]);
            setCaseDocuments([]);
        }
    }, [selectedCase?.id, fetchComments, fetchCaseDocuments]);
    
    return (

        <div className="min-h-screen bg-gray-50 p-6 sm:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                                {totalUnread > 0 && (
                                        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                                                <div>
                                                    Du har <span className="font-semibold">{totalUnread}</span> nya notiser.
                                                </div>
                                                {bannerDescriptions.length > 0 && (
                                                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-blue-900">
                                                        {bannerDescriptions.map((text, idx) => (
                                                            <li key={`${idx}-${text}`} className="leading-snug">
                                                                {text}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                                {extraUnreadCount > 0 && (
                                                    <div className="mt-1 text-xs text-blue-700">+ {extraUnreadCount} till</div>
                                                )}
                                        </div>
                                )}
                {/* 1. Portal Stats (Krav: Status på ärenden) */}
                <Card className="shadow-lg bg-gradient-to-br from-sky-50 to-white">
                    <CardHeader>
                        <CardTitle className="text-2xl font-bold text-trust-blue">Din Översikt</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
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
              {/* Knapp före tips-texten */}
              <div className="mt-4">
                <div className="flex justify-center mb-4">
                  <Button
                    onClick={() => setTemplatesOpen(true)}
                    className="bg-gradient-to-r from-trust-blue to-blue-500 text-white px-4 py-2 rounded-full shadow-md hover:scale-102 transform transition"
                  >
                    Hämta fullmaktsmallar
                  </Button>
                </div>
              </div>

              {/* Tip: flyttat ovanför fullmakt-cardet så den syns bättre */}
              <div className="w-full bg-gradient-to-r from-blue-50 to-white border-t border-blue-100">
                <div className="max-w-4xl mx-auto px-4 py-2 text-sm text-gray-600">
                  Tips: Använd våra färdiga mallar för snabbare hantering — klicka på "Hämta fullmaktsmallar".
                </div>
              </div>
                  <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen}>
                                                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle>Fullmaktsmallar</DialogTitle>
                                                        </DialogHeader>
                                                        <div className="p-4 space-y-4">
                                                            <p className="text-sm text-gray-600">Välj en mall för att ladda ner. Mallarna öppnas i ny flik.</p>
                                                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                                                <p className="text-sm text-yellow-800">
                                                                    <strong>Obs:</strong> Vissa mallar kan vara under utveckling och inte tillgängliga än.
                                                                </p>
                                                            </div>
                                                            <div className="grid grid-cols-1 gap-3">
                                                                {(fullmaktTemplates.length ? fullmaktTemplates : [
                                                                    { id: "1", name: "Fullmakt - Enkel mall (PDF)", storage_path: "templates/fullmaktenkel.pdf" }
                                                                ]).map(t => (
                                                                    <div key={t.id} className="bg-white p-3 rounded shadow flex items-center justify-between">
                                                                        <div>
                                                                            <div className="font-medium">{t.name}</div>
                                                                            <div className="text-xs text-gray-500">{t.storage_path}</div>
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <Button size="sm" variant="ghost" onClick={() => handleDownloadTemplate?.(t.storage_path)}>Förhandsgranska</Button>
                                                                            <Button size="sm" onClick={() => handleDownloadTemplate?.(t.storage_path)}>Hämta</Button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <DialogFooter>
                                                            <Button variant="secondary" onClick={() => setTemplatesOpen(false)}>Stäng</Button>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
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
                            {cases.map((caseItem) => {
                                const unread = getUnreadCount(caseItem.id);
                                const totalCount = caseCommentsCounts[caseItem.id] || 0;

                                return (
                                    <Card
                                        key={caseItem.id}
                                        className={`relative cursor-pointer hover:shadow-md transition-shadow ${selectedCase?.id === caseItem.id ? "border-2 border-trust-blue bg-blue-50" : "border-gray-200"}`}
                                        onClick={() => {
                                            const next = selectedCase?.id === caseItem.id ? null : caseItem;
                                            setSelectedCase(next); // Stäng/öppna
                                            if (next) {
                                                markCaseAsRead(caseItem.id);
                                            }
                                        }}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2 gap-3">
                                                <div className="min-w-0">
                                                    <h3 className="font-semibold text-lg truncate">{caseItem.title}</h3>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <div
                                                        className={`flex items-center gap-1 text-sm ${
                                                            unread > 0
                                                                ? "bg-orange-200 text-orange-900 px-2 py-0.5 rounded-full font-bold animate-pulse"
                                                                : "text-gray-600"
                                                        }`}
                                                        aria-label="Antal meddelanden"
                                                    >
                                                        <MessageCircle className="h-4 w-4" />
                                                        <span>{totalCount}</span>
                                                    </div>
                                                    <Badge className={`${getStatusColor(caseItem.status)} text-sm`}>
                                                        {getStatusText(caseItem.status)}
                                                    </Badge>
                                                </div>
                                            </div>

                                            {selectedCase?.id === caseItem.id && (
                                                <div className="mt-4 pt-4 border-t border-gray-200">
                                                    {/* Ärendeinformation */}
                                                    <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-700 mb-4">
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

                                                    <div className="space-y-6" onClick={(e) => e.stopPropagation()}>
                                                        {loadingComments && (
                                                            <div className="text-sm text-muted-foreground">Laddar kommentarer…</div>
                                                        )}
                                                        <CaseCommentsThread
                                                            caseId={caseItem.id}
                                                            currentUserId={user?.id}
                                                            isAdmin={false}
                                                            comments={comments}
                                                            onRefresh={async () => {
                                                                await fetchComments(caseItem.id);
                                                            }}
                                                            canComment={true}
                                                        />

                                                        {loadingCaseDocuments ? (
                                                            <div className="text-sm text-muted-foreground">Laddar dokument…</div>
                                                        ) : (
                                                            <CaseDocumentsSection
                                                                caseId={caseItem.id}
                                                                documents={caseDocuments}
                                                                canUpload={true}
                                                                showDeletedToggle={false}
                                                                onRefresh={async () => {
                                                                    await fetchCaseDocuments(caseItem.id);
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </CollapsibleCard>

                {/* Uppsägningar */}
                <CollapsibleCard
                    defaultOpen={false}
                    title={
                        <div className="flex items-center">
                            <Briefcase className="w-5 h-5 mr-2 text-gray-600" />
                            <span className="font-bold text-lg">Mina Uppsägningar</span>
                        </div>
                    }
                    className="shadow-lg"
                >
                    {loadingCancellations ? (
                        <div className="flex justify-center items-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-trust-blue" />
                            <p className="text-sm text-gray-600 ml-2">Laddar uppsägningar...</p>
                        </div>
                    ) : cancellations.length === 0 ? (
                        <p className="text-center text-gray-500 py-6">Inga uppsägningar hittades.</p>
                    ) : (
                        <SubscriptionCancellationsView
                            subscriptions={[] as Subscription[]}
                            customers={[customer]}
                            cancellations={cancellations}
                            onDataUpdated={fetchCancellations}
                            showProviderFilter={false}
                        />
                    )}
                </CollapsibleCard>


                {/* Nyckelkvittens (kundsignering) */}
                <CollapsibleCard
                    defaultOpen={false}
                    title={
                        <div className="flex items-center">
                            <KeyRound className="w-5 h-5 mr-2 text-gray-600" />
                            <span className="font-bold text-lg">Nyckelkvittens</span>
                        </div>
                    }
                    className="shadow-lg"
                >
                    <KeyReceiptDialog mode="customer" />
                </CollapsibleCard>

                {/* Kubikmätaren-knapp under Nyckelkvittens */}
                <div className="flex justify-center my-6">
                    <Button
                        className="bg-gradient-to-r from-trust-green to-trust-green-light text-white px-4 py-2 rounded-full shadow-md hover:translate-y-[-1px] transition"
                        onClick={() => window.location.assign('/portal/cube-planner')}
                    >
                        <span role="img" aria-label="cube">📦</span> Kubikräknare för flyttplanering
                    </Button>
                </div>

                {/* Handplockat-länk efter kubikräknaren */}
                <div className="flex justify-center my-6">
                    <Button
                        className="bg-gradient-to-r from-yellow-400 to-yellow-300 text-black px-4 py-2 rounded-full shadow-md hover:translate-y-[-1px] transition"
                        onClick={() => window.location.assign('/handplockat')}
                    >
                        <span role="img" aria-label="hand">🤲</span> Handplockat – Köp & sälj
                    </Button>
                </div>

                 {/* 3. Kundinformation (Krav: Kund ska kunna redigera sin information) */}
                <CollapsibleCard
                    defaultOpen={false}
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
                        <Button
                          onClick={() => handleUpdateCustomer()}
                          disabled={loadingSave}
                          className="w-full bg-trust-blue hover:bg-trust-blue/90"
                        >
                          {loadingSave ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Spara"}
                        </Button>

                        {/* Ändra lösenord-sektion */}
                        <div className="border-t pt-4 mt-4">
                          <h4 className="font-semibold mb-3">Ändra lösenord</h4>
                          <ChangePasswordSection />
                        </div>

                                                <div className="border-t pt-4 mt-4">
                                                    <PushNotificationToggle />
                                                </div>

                                                <div className="border-t pt-4 mt-4">
                                                    <h4 className="font-semibold mb-2">Registerutdrag (GDPR)</h4>
                                                    <p className="text-sm text-gray-600">
                                                        När du begär ett registerutdrag tar vi fram en sammanställning av dina personuppgifter.
                                                        När utdraget är klart kan du ladda ner det här. Av säkerhetsskäl är länken tidsbegränsad.
                                                    </p>
                                                    {gdprRequest && (
                                                        <div className="mt-3">
                                                            <Button
                                                                size="sm"
                                                                variant="secondary"
                                                                disabled={gdprDownloadBusy}
                                                                onClick={handleDownloadGdprReport}
                                                            >
                                                                {gdprDownloadBusy
                                                                    ? "Hämtar..."
                                                                    : gdprRequest.status === "delivered"
                                                                    ? "Ladda ner registerutdrag igen"
                                                                    : "Ladda ner registerutdrag"}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
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
                        <div className="p-4 border rounded-md bg-gray-50 space-y-4">
                            <p className="text-gray-700">Här visas fullmakter och dokument kopplade till dina ärenden. </p>

                            <div className="border rounded p-4 bg-white">
                                <h4 className="font-semibold mb-2">Ladda upp ny fullmakt</h4>
                                <div className="flex items-center gap-2">
                                    <Input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} />
                                    <Button onClick={handleUploadFullmakt} disabled={!selectedFile || uploading} className="bg-trust-blue hover:bg-trust-blue/90">
                                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ladda upp'}
                                    </Button>
                                </div>
                                {selectedFile && <p className="text-sm text-gray-600 mt-2">Vald fil: {selectedFile.name}</p>}
                            </div>

                            <div>
                                <h4 className="font-semibold mb-2">Befintliga dokument</h4>
                                {loadingDocuments ? (
                                    <div className="text-sm text-gray-500">Laddar dokument...</div>
                                ) : documents.length === 0 ? (
                                    <div className="text-sm text-gray-500">Inga dokument hittades.</div>
                                ) : (
                                    <ul className="space-y-2">
                                        {documents.map((doc) => (
                                            <li key={doc.id} className="flex items-center justify-between bg-white p-3 rounded shadow-sm">
                                                <div>
                                                    <div className="font-medium truncate max-w-[320px]">{doc.file_name}</div>
                                                    <div className="text-xs text-gray-500">Uppladdad: {doc.created_at ? format(new Date(doc.created_at), 'dd MMM yyyy', { locale: sv }) : ''}</div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleDownload(doc)}>Ladda ner</Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        disabled={deletingDocumentId === doc.id}
                                                        onClick={() => handleDeleteDocument(doc)}
                                                    >
                                                        {deletingDocumentId === doc.id ? 'Tar bort…' : 'Ta bort'}
                                                    </Button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <div className="flex justify-end">
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