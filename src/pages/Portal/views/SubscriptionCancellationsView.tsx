import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import type { CancellationStatus, Customer, Subscription, SubscriptionCancellation } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, PlusCircle, UploadCloud } from "lucide-react";
import { SubscriptionCancellationCard } from "@/pages/Portal/components/subscriptions/SubscriptionCancellationCard";
import { SubscriptionCancellationDetailDialog } from "@/pages/Portal/components/subscriptions/SubscriptionCancellationDetailDialog";

const noticeOptions = ["Ingen", "1 mån", "3 mån", "Datum"];

const newCancellationSchema = z.object({
  customer_id: z.string().min(1, "Välj kund"),
  provider_choice: z.string().min(1, "Välj leverantör"),
  provider_custom: z.string().optional().nullable(),
  service_type: z.string().min(1, "Välj typ"),
  service_type_custom: z.string().optional().nullable(),
  notice_period: z.string().optional().nullable(),
  last_due_date: z.string().optional().nullable(),
  provider_contact: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  files: z.any().optional(),
});

type NewCancellationValues = z.infer<typeof newCancellationSchema>;

interface Props {
  customers: Customer[];
  subscriptions: Subscription[];
  cancellations: SubscriptionCancellation[];
  onDataUpdated: () => Promise<void>;
  showProviderFilter?: boolean;
  /** Called after a cancellation is marked read — use to sync the parent portal's notification hook state. */
  onNotificationsRead?: (refId: string) => void;
}

export function SubscriptionCancellationsView({
  customers,
  subscriptions,
  cancellations,
  onDataUpdated,
  showProviderFilter = true,
  onNotificationsRead,
}: Props) {
  void subscriptions; // keep prop stable; subscriptions may be used elsewhere later

  const { toast } = useToast();
  const { user, customer } = useAuth();
  const { markNotificationsReadForRef } = useNotifications();
  const isAdmin = customer?.is_admin === true;

  const [loading] = useState(false); // left in place (may be set by parent patterns)
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<SubscriptionCancellation | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [latestCustomerCommentAt, setLatestCustomerCommentAt] = useState<Record<string, string>>({});
  const [latestAdminCommentAt, setLatestAdminCommentAt] = useState<Record<string, string>>({});
  const [localReadAtByCancellationId, setLocalReadAtByCancellationId] = useState<
    Record<string, { admin_last_read_at?: string; customer_last_read_at?: string }>
  >({});
  const [customerOverrideByCancellationId, setCustomerOverrideByCancellationId] = useState<
    Record<string, string | null>
  >({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [archivedCustomerMap, setArchivedCustomerMap] = useState<Record<string, string>>({});
  const [showArchivedCancellations, setShowArchivedCancellations] = useState(false);

  const toMs = (iso?: string | null) => {
    const ms = iso ? Date.parse(iso) : NaN;
    return Number.isFinite(ms) ? ms : 0;
  };

  const markCancellationAsRead = async (cancellationId: string) => {
    if (!user?.id) return;
    try {
      // Call Edge Function to update DB timestamp
      await supabase.functions.invoke("mark-cancellation-as-read", {
        body: { cancellation_id: cancellationId },
      });
      // Mark related notifications as read and refresh banner.
      void markNotificationsReadForRef(cancellationId);
      // Also call the parent portal's hook instance so the banner updates immediately
      // (each useNotifications() call is its own independent state).
      onNotificationsRead?.(cancellationId);
      // Optimistic local update so unread state flips immediately even before parent refetch.
      const nowIso = new Date().toISOString();
      setLocalReadAtByCancellationId((prev) => ({
        ...prev,
        [cancellationId]: {
          ...(prev[cancellationId] ?? {}),
          ...(isAdmin
            ? { admin_last_read_at: nowIso }
            : { customer_last_read_at: nowIso }),
        },
      }));
      // In customer portal, onDataUpdated toggles loading and temporarily unmounts this view,
      // which closes the detail dialog right after opening. Keep the dialog stable.
      if (isAdmin) void onDataUpdated();
    } catch (err) {
      console.error("Failed to mark cancellation as read:", err);
    }
  };

  // Calculate unread status from DB timestamps
  const hasUnread = (cancellation: SubscriptionCancellation) => {
    if (!user?.id) return false;

    try {
      // Admin checks if customer has commented since admin last read
      // Customer checks if admin has commented since customer last read
      const myLastReadAt = isAdmin
        ? (localReadAtByCancellationId[cancellation.id]?.admin_last_read_at ?? cancellation.admin_last_read_at)
        : (localReadAtByCancellationId[cancellation.id]?.customer_last_read_at ?? cancellation.customer_last_read_at);
      
      const theirLatestCommentAt = isAdmin
        ? latestCustomerCommentAt[cancellation.id]
        : latestAdminCommentAt[cancellation.id];
      
      const myLastReadMs = toMs(myLastReadAt);
      const theirLatestMs = toMs(theirLatestCommentAt);
      const unread = theirLatestMs > 0 && theirLatestMs > myLastReadMs;

      if (selected?.id === cancellation.id) {
        console.debug("[cancellation unread debug]", {
          cancellationId: cancellation.id,
          isAdmin,
          admin_last_read_at: localReadAtByCancellationId[cancellation.id]?.admin_last_read_at ?? cancellation.admin_last_read_at ?? null,
          customer_last_read_at: localReadAtByCancellationId[cancellation.id]?.customer_last_read_at ?? cancellation.customer_last_read_at ?? null,
          latestCustomerCommentAt: latestCustomerCommentAt[cancellation.id] ?? null,
          latestAdminCommentAt: latestAdminCommentAt[cancellation.id] ?? null,
          unread,
        });
      }

      return unread;
    } catch {
      return false;
    }
  };


  const customerMap = useMemo(() => {
    const map: Record<string, Customer> = {};
    customers.forEach((c) => (map[c.id] = c));
    return map;
  }, [customers]);

  const form = useForm<NewCancellationValues>({
    resolver: zodResolver(newCancellationSchema),
    defaultValues: {
      customer_id: "",
      provider_choice: "",
      provider_custom: "",
      service_type: "",
      service_type_custom: "",
      notice_period: "",
      last_due_date: "",
      provider_contact: "",
      notes: "",
      files: undefined,
    },
  });

  useEffect(() => {
    // Provider/type options derived from existing cancellations
    const isNonEmpty = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;

    const uniqueProviders = Array.from(
      new Set((cancellations || []).map((c) => c.provider).filter(isNonEmpty))
    ).sort((a, b) => a.localeCompare(b, "sv"));

    const uniqueServiceTypes = Array.from(
      new Set((cancellations || []).map((c) => c.service_type).filter(isNonEmpty))
    ).sort((a, b) => a.localeCompare(b, "sv"));

    setProviders(uniqueProviders);
    setServiceTypes(uniqueServiceTypes);
  }, [cancellations]);

  useEffect(() => {
    const next: Record<string, number> = {};
    (cancellations || []).forEach((c) => {
      next[c.id] = commentCounts[c.id] ?? c.comment_count ?? 0;
    });
    setCommentCounts(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancellations]);

  const resetDialog = () => {
    form.reset();
    setShowDialog(false);
  };

  const onSubmit = async (values: NewCancellationValues) => {
    try {
      setSaving(true);
      const { files, notes, provider_choice, provider_custom, service_type_custom, ...rest } = values;

      const provider = provider_choice === "__other__" ? (provider_custom || "").trim() : provider_choice;
      if (!provider) {
        toast({
          title: "Saknar leverantör",
          description: "Välj leverantör eller skriv annan.",
          variant: "destructive",
        });
        return;
      }

      const serviceType = rest.service_type === "__other__" ? (service_type_custom || "").trim() : rest.service_type;
      if (!serviceType) {
        toast({ title: "Saknar typ", description: "Välj typ eller skriv annan.", variant: "destructive" });
        return;
      }

      const rpcPayload = {
        p_customer_id: rest.customer_id,
        p_last_due_date: rest.last_due_date || null,
        p_notes: notes || null,
        p_notice_period: rest.notice_period || null,
        p_provider: provider,
        p_provider_contact: (rest as any).provider_contact || null,
        p_service_type: serviceType,
      };

      const { data, error } = await supabase.functions.invoke("admin-create-subscription-cancellation", {
        body: {
          customer_id: rpcPayload.p_customer_id,
          provider: rpcPayload.p_provider,
          service_type: rpcPayload.p_service_type,
          notice_period: rpcPayload.p_notice_period,
          last_due_date: rpcPayload.p_last_due_date,
          provider_contact: rpcPayload.p_provider_contact,
          notes: rpcPayload.p_notes,
        },
      });

      if (error) throw error;

      const createdId = (data as any)?.cancellation_id;
      if (!createdId) throw new Error("Kunde inte skapa uppsägning");

      // Upload attachments (permission checked by Edge)
      const fileList = files as FileList | undefined;
      if (fileList && fileList.length > 0) {
        for (const file of Array.from(fileList)) {
          const ext = (file.name.split(".").pop() || "bin").toLowerCase();
          const { data: upData, error: upErr } = await supabase.functions.invoke("cancellation-create-document-upload", {
            body: { cancellation_id: createdId, file_ext: ext, mime_type: file.type || null },
          });
          if (upErr) throw upErr;
          if ((upData as any)?.ok !== true) throw new Error((upData as any)?.error || "Kunde inte initiera uppladdning");

          const path = (upData as any).path as string;
          const token = (upData as any).token as string;
          const { error: uploadErr } = await supabase.storage.from("abonnemang").uploadToSignedUrl(path, token, file);
          if (uploadErr) throw uploadErr;

          const { data: attachData, error: attachErr } = await supabase.functions.invoke("cancellation-attach-document", {
            body: {
              cancellation_id: createdId,
              path,
              display_name: file.name,
              mime_type: file.type || null,
              file_size: file.size,
            },
          });
          if (attachErr) throw attachErr;
          if ((attachData as any)?.ok !== true) throw new Error((attachData as any)?.error || "Kunde inte spara dokument");
        }
      }

      toast({ title: "Uppsägning registrerad", description: "Ärendet är skapat och kan följas upp." });
      await onDataUpdated();
      resetDialog();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Kunde inte skapa", description: err?.message || "Något gick fel", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (cancellationId: string, status: CancellationStatus) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase.functions.invoke("admin-set-subscription-cancellation-status", {
        body: { cancellation_id: cancellationId, status },
      });
      if (error) throw error;
      toast({ title: "Status uppdaterad" });
      await onDataUpdated();
      if (selected?.id === cancellationId) {
        setSelected({ ...selected, status });
      }
    } catch (err: any) {
      toast({ title: "Kunde inte uppdatera status", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteCancellation = async (cancellationId: string) => {
    if (!isAdmin) return;
    setDeletingId(cancellationId);
    try {
      const { data, error } = await supabase.functions.invoke("admin-soft-delete-subscription-cancellation", {
        body: { cancellation_id: cancellationId, confirm: true },
      });
      if (error) throw error;
      if ((data as any)?.ok !== true) throw new Error((data as any)?.error || "Kunde inte ta bort");

      toast({ title: "Borttaget", description: "Uppsägningen är borttagen." });
      if (selected?.id === cancellationId) setSelected(null);
      await onDataUpdated();
    } catch (err: any) {
      toast({ title: "Kunde inte ta bort", description: err?.message || "Något gick fel", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  const availableProviders = useMemo(() => {
    const set = new Set<string>();
    cancellations.forEach((c) => {
      if (c.provider) set.add(c.provider);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cancellations]);

  const effectiveCancellations = useMemo(() => {
    return cancellations.map((c) => {
      const override = customerOverrideByCancellationId[c.id];
      return override ? { ...c, customer_id: override } : c;
    });
  }, [cancellations, customerOverrideByCancellationId]);

  useEffect(() => {
    if (!selected) return;
    const next = effectiveCancellations.find((c) => c.id === selected.id);
    if (next) setSelected(next);
  }, [effectiveCancellations, selected]);

  // Fetch latest customer comment timestamp per cancellation (also counts visible comments for the card).
  useEffect(() => {
    const cancellationIds = effectiveCancellations.map((c) => c.id).filter(Boolean);
    if (cancellationIds.length === 0) {
      setLatestCustomerCommentAt({});
      return;
    }

    let isMounted = true;

    const fetchLatest = async () => {
      try {
        const { data, error } = await supabase
          .from("cancellation_comments")
          .select("cancellation_id, user_id, is_internal, created_at, deleted_at")
          .in("cancellation_id", cancellationIds)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!isMounted) return;

        const latestByCancellation: Record<string, string> = {};
        const countsByCancellation: Record<string, number> = {};
        for (const cancellation of effectiveCancellations) {
          // Find latest comment from customer (user_id matches customer_id)
          const latestCustomer = (data || []).find(
            (row: any) =>
              row?.cancellation_id === cancellation.id &&
              !row?.is_internal &&
              row?.user_id === cancellation.customer_id &&
              typeof row?.created_at === "string"
          ) as { created_at?: string } | undefined;

          latestByCancellation[cancellation.id] = latestCustomer?.created_at || "";

          // Count visible (not soft-deleted) comments for the card list.
          countsByCancellation[cancellation.id] = (data || []).filter(
            (row: any) => row?.cancellation_id === cancellation.id && !row?.deleted_at
          ).length;
        }

        setLatestCustomerCommentAt(latestByCancellation);
        // Merge counts so dialog-opened counts (onCommentCountChange) are not overwritten downward.
        setCommentCounts((prev) => {
          const next = { ...prev };
          for (const [id, count] of Object.entries(countsByCancellation)) {
            // Only update if count is strictly higher than what we already have
            // (dialog may have a more precise count from its own fetch).
            if (count > (prev[id] ?? 0)) next[id] = count;
          }
          return next;
        });
      } catch {
        if (!isMounted) return;
        setLatestCustomerCommentAt({});
      }
    };

    void fetchLatest();

    // Polling for real-time updates
    const interval = window.setInterval(() => {
      void fetchLatest();
    }, 45_000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [effectiveCancellations]);

  // Fetch latest admin comment timestamp per cancellation
  useEffect(() => {
    const cancellationIds = effectiveCancellations.map((c) => c.id).filter(Boolean);
    if (cancellationIds.length === 0) {
      setLatestAdminCommentAt({});
      return;
    }

    let isMounted = true;

    const fetchLatest = async () => {
      try {
        const { data, error } = await supabase
          .from("cancellation_comments")
          .select("cancellation_id, user_id, is_internal, created_at")
          .in("cancellation_id", cancellationIds)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!isMounted) return;

        const latestByCancellation: Record<string, string> = {};
        for (const cancellation of effectiveCancellations) {
          // Find latest comment from admin (user_id !== customer_id)
          const latestAdmin = (data || []).find(
            (row: any) =>
              row?.cancellation_id === cancellation.id &&
              row?.user_id !== cancellation.customer_id &&
              typeof row?.created_at === "string"
          ) as { created_at?: string } | undefined;

          latestByCancellation[cancellation.id] = latestAdmin?.created_at || "";
        }

        setLatestAdminCommentAt(latestByCancellation);
      } catch {
        if (!isMounted) return;
        setLatestAdminCommentAt({});
      }
    };

    void fetchLatest();

    // Polling for real-time updates
    const interval = window.setInterval(() => {
      void fetchLatest();
    }, 45_000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, [effectiveCancellations]);

  const filtered = useMemo(() => {
    return effectiveCancellations.filter((c) => {
      const providerOk = showProviderFilter
        ? providerFilter === "all"
          ? true
          : (c.provider || "") === providerFilter
        : true;
      const statusOk = statusFilter === "all" ? true : c.status === statusFilter;
      return providerOk && statusOk;
    });
  }, [effectiveCancellations, providerFilter, statusFilter, showProviderFilter]);

  useEffect(() => {
    const missingIds = Array.from(
      new Set(
        filtered
          .map((c) => c.customer_id)
          .filter((id): id is string => Boolean(id) && !customerMap[id])
          .filter((id) => !archivedCustomerMap[id])
      )
    );

    if (missingIds.length === 0) return;

    const fetchArchivedNames = async () => {
      try {
        const { data, error } = await supabase.from("archived_customers").select("id, name").in("id", missingIds);

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
  }, [filtered, customerMap, archivedCustomerMap]);

  const isArchivedCustomer = (customerId: string | null) => {
    if (!customerId) return false;
    return !Object.keys(customerMap).some((id) => String(id) === String(customerId));
  };

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return "Okänd";
    const activeCustomer = Object.entries(customerMap).find(([id]) => String(id) === String(customerId))?.[1];
    return activeCustomer?.name || archivedCustomerMap[customerId] || "Arkiverad kund";
  };

  const activeFiltered = filtered.filter((c) => !isArchivedCustomer(c.customer_id ?? null));
  const archivedFiltered = filtered.filter((c) => isArchivedCustomer(c.customer_id ?? null));

  const handleOpenCancellation = async (item: SubscriptionCancellation) => {
    setSelected(item);
    await markCancellationAsRead(item.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Uppsägningar</h2>
          <p className="text-sm text-muted-foreground">Hantera pågående uppsägningar och kommunicera med kund</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowDialog(true)}>
            <PlusCircle className="h-4 w-4 mr-2" /> Skapa nytt uppdrag
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alla status</SelectItem>
            <SelectItem value="pending">Ny</SelectItem>
            <SelectItem value="processing">Pågående</SelectItem>
            <SelectItem value="waiting_customer">Avvaktar kund</SelectItem>
            <SelectItem value="completed">Klar</SelectItem>
            <SelectItem value="cancelled">Avslutad</SelectItem>
          </SelectContent>
        </Select>

        {showProviderFilter && (
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Leverantör" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla leverantörer</SelectItem>
              {availableProviders.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Hämtar...
          </div>
        ) : (
          <>
            {activeFiltered.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">Inga aktiva matchande uppsägningar.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {activeFiltered.map((c) => {
                  const unread = hasUnread(c);
                  return (
                    <SubscriptionCancellationCard
                      key={c.id}
                      item={c}
                      customer={customerMap[c.customer_id]}
                      customerNameOverride={getCustomerName(c.customer_id ?? null)}
                      caseTypeLabel="Uppsägning"
                      commentCount={Math.max(commentCounts[c.id] ?? c.comment_count ?? 0, unread ? 1 : 0)}
                      canEditStatus={isAdmin}
                      canDelete={isAdmin}
                      isDeleting={deletingId === c.id}
                      unread={unread}
                      readStatusLabel={unread ? "Oläst" : "Läst"}
                      onOpen={() => handleOpenCancellation(c)}
                      onStatusChange={(next) => handleStatusChange(c.id, next)}
                      onDelete={() => handleDeleteCancellation(c.id)}
                    />
                  );
                })}
              </div>
            )}

            <div className="space-y-3">
              <Button
                variant="ghost"
                className="text-sm text-gray-600"
                onClick={() => setShowArchivedCancellations((v) => !v)}
              >
                {showArchivedCancellations ? "Fäll ihop" : "Visa"} arkiverade uppsägningar ({archivedFiltered.length})
              </Button>

              {showArchivedCancellations &&
                (archivedFiltered.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Inga arkiverade uppsägningar.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {archivedFiltered.map((c) => {
                      const unread = hasUnread(c);
                      return (
                        <SubscriptionCancellationCard
                          key={c.id}
                          item={c}
                          customer={customerMap[c.customer_id]}
                          customerNameOverride={getCustomerName(c.customer_id ?? null)}
                          caseTypeLabel="Uppsägning"
                          commentCount={Math.max(commentCounts[c.id] ?? c.comment_count ?? 0, unread ? 1 : 0)}
                          canEditStatus={isAdmin}
                          canDelete={isAdmin}
                          isDeleting={deletingId === c.id}
                          unread={unread}
                          readStatusLabel={unread ? "Oläst" : "Läst"}
                          onOpen={() => handleOpenCancellation(c)}
                          onStatusChange={(next) => handleStatusChange(c.id, next)}
                          onDelete={() => handleDeleteCancellation(c.id)}
                        />
                      );
                    })}
                  </div>
                ))}
            </div>
          </>
        )}
      </div>

      {/* Dialog för ny uppsägning */}
      <Dialog open={showDialog} onOpenChange={(v) => (v ? setShowDialog(true) : resetDialog())}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Skapa nytt uppdrag</DialogTitle>
            <CardDescription>Skapa ett nytt abonnemangsärende för vald kund.</CardDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kund</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Välj kund" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name || c.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="provider_choice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Leverantör</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj leverantör" />
                        </SelectTrigger>
                        <SelectContent>
                          {providers.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                          <SelectItem value="__other__">Annan leverantör</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="provider_custom"
                  render={({ field }) => {
                    const choice = form.watch("provider_choice");
                    if (choice !== "__other__") return <div />;
                    return (
                      <FormItem>
                        <FormLabel>Annan leverantör</FormLabel>
                        <FormControl>
                          <Input placeholder="Skriv leverantör" {...field} value={field.value ?? ""} maxLength={120} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="service_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Typ av abonnemang</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj typ" />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceTypes.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                          <SelectItem value="__other__">Annat / Manuell inmatning</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="service_type_custom"
                  render={({ field }) => {
                    const choice = form.watch("service_type");
                    if (choice !== "__other__") return <div />;
                    return (
                      <FormItem>
                        <FormLabel>Annan typ</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Skriv typ (t.ex. Bredband, Mobil, El)"
                            {...field}
                            value={field.value ?? ""}
                            maxLength={120}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="notice_period"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Uppsägningstid</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <SelectTrigger>
                          <SelectValue placeholder="Välj" />
                        </SelectTrigger>
                        <SelectContent>
                          {noticeOptions.map((n) => (
                            <SelectItem key={n} value={n}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="last_due_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sista förfallodatum</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="provider_contact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kontaktperson hos leverantör</FormLabel>
                      <FormControl>
                        <Input placeholder="Namn / telefon" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Noteringar till ärendet</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Övrig info till kund eller leverantör"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="files"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bilagor (faktura, fullmakt, bekräftelse)</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        multiple
                        accept="application/pdf,image/*"
                        onChange={(e) => field.onChange(e.target.files)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button variant="ghost" type="button" onClick={resetDialog}>
                  Avbryt
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UploadCloud className="h-4 w-4 mr-2" />
                  )}
                  Spara uppsägning
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <SubscriptionCancellationDetailDialog
        open={!!selected}
        onOpenChange={(v) => (!v ? setSelected(null) : null)}
        item={selected}
        customer={selected ? customerMap[selected.customer_id] : undefined}
        customerNameOverride={selected ? getCustomerName(selected.customer_id ?? null) : undefined}
        customers={customers}
        currentUserId={user?.id ?? customer?.id}
        isAdmin={isAdmin}
        onSaved={onDataUpdated}
        onCustomerChanged={(cancellationId, nextCustomerId) => {
          setCustomerOverrideByCancellationId((prev) => ({
            ...prev,
            [cancellationId]: nextCustomerId,
          }));
          if (selected?.id === cancellationId) {
            setSelected({ ...selected, customer_id: nextCustomerId || selected.customer_id });
          }
        }}
        onCommentCountChange={(cancellationId, nextCount) => {
          setCommentCounts((prev) => ({ ...prev, [cancellationId]: nextCount }));
        }}
      />
    </div>
  );
}

export default SubscriptionCancellationsView;