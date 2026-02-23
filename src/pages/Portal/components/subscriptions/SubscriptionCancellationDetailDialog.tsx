import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import type { CancellationComment, CancellationStatus, Customer, SubscriptionCancellation } from "@/types";
import { CancellationStatusBadge, CancellationStatusSelect } from "./status";
import { ProviderField, formatProviderValue, parseProviderValue, type ProviderValue } from "./providerField";
import { CancellationCommentsThread } from "./CancellationCommentsThread";
import { CancellationDocumentsSection } from "./CancellationDocumentsSection";
import type { CancellationDocuments, SubscriptionCancellationDraft } from "./types";

function toDraft(item: SubscriptionCancellation): SubscriptionCancellationDraft {
  return {
    customer_id: item.customer_id ?? null,
    provider: item.provider ?? null,
    service_type: item.service_type ?? null,
    custom_service_name: item.custom_service_name ?? null,
    notice_period: item.notice_period ?? null,
    last_due_date: item.last_due_date ?? null,
    provider_contact: item.provider_contact ?? null,
    notes: item.notes ?? null,
    status: item.status,
  };
}

export function SubscriptionCancellationDetailDialog({
  open,
  onOpenChange,
  item,
  customer,
  customers,
  customerNameOverride,
  currentUserId,
  isAdmin,
  onSaved,
  onCustomerChanged,
  onCommentCountChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: SubscriptionCancellation | null;
  customer: Customer | undefined;
  customers: Customer[];
  customerNameOverride?: string;
  currentUserId: string | null | undefined;
  isAdmin: boolean;
  onSaved: () => Promise<void>;
  onCustomerChanged?: (cancellationId: string, nextCustomerId: string | null) => void;
  onCommentCountChange?: (cancellationId: string, nextCount: number) => void;
}) {
  const { toast } = useToast();
  const [draft, setDraft] = useState<SubscriptionCancellationDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [providerValue, setProviderValue] = useState<ProviderValue>({ kind: "preset", value: "Telia" });
  const [comments, setComments] = useState<CancellationComment[]>([]);
  const [documents, setDocuments] = useState<CancellationDocuments>([]);

  const selectedCustomer = useMemo(() => {
    if (!draft?.customer_id) return customer;
    return customers.find((c) => c.id === draft.customer_id) || customer;
  }, [customers, customer, draft?.customer_id]);

  const customerName = customerNameOverride || selectedCustomer?.name || selectedCustomer?.email || "Kund";

  const canComment = useMemo(() => {
    if (!item) return false;
    if (isAdmin) return true;
    return !!currentUserId && item.customer_id === currentUserId;
  }, [item, isAdmin, currentUserId]);

  const canUploadDocs = canComment;

  const refreshComments = async () => {
    if (!item) return;
    const { data, error } = await supabase
      .from("cancellation_comments")
      .select("*")
      .eq("cancellation_id", item.id)
      .order("created_at", { ascending: true });
    if (!error && data) {
      const next = data as any as CancellationComment[];
      setComments(next);
      const visibleCount = next.filter((c) => !c.deleted_at).length;
      onCommentCountChange?.(item.id, visibleCount);
    }
  };

  useEffect(() => {
    if (!item || !open) return;
    setDraft(toDraft(item));
    setProviderValue(parseProviderValue(item.provider));
    setDocuments(((item.documents as any) ?? []) as CancellationDocuments);
    void refreshComments();
  }, [item, open]);

  const isDirty = useMemo(() => {
    if (!item || !draft) return false;
    const base = toDraft(item);
    const provider = formatProviderValue(providerValue);
    return (
      (base.customer_id ?? "") !== (draft.customer_id ?? "") ||
      base.status !== draft.status ||
      (base.provider ?? "") !== provider ||
      (base.service_type ?? "") !== (draft.service_type ?? "") ||
      (base.custom_service_name ?? "") !== (draft.custom_service_name ?? "") ||
      (base.notice_period ?? "") !== (draft.notice_period ?? "") ||
      (base.last_due_date ?? "") !== (draft.last_due_date ?? "") ||
      (base.provider_contact ?? "") !== (draft.provider_contact ?? "") ||
      (base.notes ?? "") !== (draft.notes ?? "")
    );
  }, [item, draft, providerValue]);

  const save = async () => {
    if (!item || !draft) return;
    if (!isAdmin) return;

    const provider = formatProviderValue(providerValue).trim();
    if (!provider) {
      toast({ title: "Saknar leverantör", description: "Välj en leverantör.", variant: "destructive" });
      return;
    }

    // Confirm on close-ish statuses
    if (item.status !== draft.status && (draft.status === "cancelled" || draft.status === "completed")) {
      const ok = window.confirm("Är du säker på att du vill markera ärendet som avslutat?");
      if (!ok) return;
    }

    setSaving(true);
    try {
      const payload = {
        cancellation_id: item.id,
        customer_id: draft.customer_id ?? null,
        provider,
        service_type: draft.service_type ?? null,
        custom_service_name: draft.custom_service_name ?? null,
        notice_period: draft.notice_period ?? null,
        last_due_date: draft.last_due_date ?? null,
        provider_contact: draft.provider_contact ?? null,
        notes: draft.notes ?? null,
        status: draft.status as CancellationStatus,
      };

      const { data, error } = await supabase.functions.invoke("admin-update-subscription-cancellation", { body: payload });
      if (error) throw error;
      if ((data as any)?.ok !== true) throw new Error((data as any)?.error || "Kunde inte spara");

      toast({ title: "Sparat", description: "Ändringarna är sparade." });
      onCustomerChanged?.(item.id, draft.customer_id ?? null);
      await onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Kunde inte spara", description: err?.message || "Något gick fel", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (!item) return;
    setDraft(toDraft(item));
    setProviderValue(parseProviderValue(item.provider));
    setDocuments(((item.documents as any) ?? []) as CancellationDocuments);
  };

  if (!item || !draft) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{customerName} · {item.custom_service_name || item.service_type || "Abonnemang"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2 flex-1 min-h-0 overflow-y-auto pr-1">
          <div className="space-y-4">
            <div className="rounded border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">Översikt</div>
                <div className="flex items-center gap-2">
                  <CancellationStatusBadge status={item.status} />
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Kund</span>
                  {isAdmin ? (
                    <select
                      className="border rounded px-2 py-1 text-sm bg-white max-w-[220px]"
                      value={draft.customer_id ?? ""}
                      onChange={(e) => setDraft({ ...draft, customer_id: e.target.value || null })}
                    >
                      <option value="">Ingen kund</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name || c.email || c.id}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="truncate">{customerName}</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Status</span>
                  <div>
                    <CancellationStatusSelect
                      value={draft.status}
                      onChange={(v) => setDraft({ ...draft, status: v })}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded border p-4 space-y-3">
              <div className="font-medium">Uppgifter</div>

              <ProviderField value={providerValue} onChange={setProviderValue} disabled={!isAdmin} />

              <div className="space-y-2">
                <Label>Abonnemangstyp</Label>
                <Input
                  value={draft.service_type ?? ""}
                  onChange={(e) => setDraft({ ...draft, service_type: e.target.value })}
                  placeholder="Mobil, Bredband, El ..."
                  disabled={!isAdmin}
                  maxLength={120}
                />
              </div>

              <div className="space-y-2">
                <Label>Annat (tjänstnamn)</Label>
                <Input
                  value={draft.custom_service_name ?? ""}
                  onChange={(e) => setDraft({ ...draft, custom_service_name: e.target.value })}
                  placeholder="Tele2 mobil, Elavtal ..."
                  disabled={!isAdmin}
                  maxLength={200}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Uppsägningstid</Label>
                  <Input
                    value={draft.notice_period ?? ""}
                    onChange={(e) => setDraft({ ...draft, notice_period: e.target.value })}
                    placeholder="1 mån, 3 mån ..."
                    disabled={!isAdmin}
                    maxLength={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sista förfallodatum</Label>
                  <Input
                    type="date"
                    value={(draft.last_due_date ?? "").slice(0, 10)}
                    onChange={(e) => setDraft({ ...draft, last_due_date: e.target.value || null })}
                    disabled={!isAdmin}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Kontaktperson hos leverantör</Label>
                <Input
                  value={draft.provider_contact ?? ""}
                  onChange={(e) => setDraft({ ...draft, provider_contact: e.target.value })}
                  placeholder="Namn / telefon"
                  disabled={!isAdmin}
                  maxLength={2000}
                />
              </div>

              <div className="space-y-2">
                <Label>Kommentarer / anteckningar</Label>
                <Textarea
                  value={draft.notes ?? ""}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder="Interna anteckningar"
                  disabled={!isAdmin}
                  maxLength={2000}
                  className="min-h-[90px]"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded border p-4">
              <CancellationDocumentsSection
                cancellationId={item.id}
                customerId={item.customer_id}
                documents={documents}
                canUpload={canUploadDocs}
                onDocumentsChanged={(next) => setDocuments(next)}
              />
            </div>

            <div className="rounded border p-4">
              <CancellationCommentsThread
                cancellationId={item.id}
                customerId={item.customer_id}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                comments={comments}
                onRefresh={refreshComments}
                canComment={canComment}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button type="button" variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>
            Stäng
          </Button>
          {isAdmin && (
            <>
              <Button type="button" variant="ghost" onClick={reset} disabled={!isDirty || saving}>
                Återställ
              </Button>
              <Button type="button" onClick={save} disabled={!isDirty || saving}>
                Spara
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
