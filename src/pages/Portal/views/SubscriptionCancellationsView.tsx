import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
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
}

export function SubscriptionCancellationsView({ customers, subscriptions, cancellations, onDataUpdated }: Props) {
  const { toast } = useToast();
  const { user, customer } = useAuth();
  const isAdmin = customer?.is_admin === true;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<SubscriptionCancellation | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [customerOverrideByCancellationId, setCustomerOverrideByCancellationId] = useState<Record<string, string | null>>({});

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
    // IMPORTANT: customer/admin UI should derive provider/type options ONLY from
    // existing subscription_cancellations, since the subscriptions table may be
    // incomplete or blocked by RLS/schema drift.
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
        toast({ title: "Saknar leverantör", description: "Välj leverantör eller skriv annan.", variant: "destructive" });
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

  const availableProviders = useMemo(() => {
    const set = new Set<string>();
    cancellations.forEach((c) => {
      if (c.provider) set.add(c.provider);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cancellations]);

  const filtered = useMemo(() => {
    return cancellations.filter((c) => {
      const providerOk = providerFilter === "all" ? true : (c.provider || "") === providerFilter;
      const statusOk = statusFilter === "all" ? true : c.status === statusFilter;
      return providerOk && statusOk;
    });
  }, [cancellations, providerFilter, statusFilter]);

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
      </div>

      <div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Hämtar...</div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Inga matchande uppsägningar.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => {
              const effectiveCustomerId = customerOverrideByCancellationId[c.id] ?? c.customer_id;

              return (
                <SubscriptionCancellationCard
                  key={c.id}
                  item={c}
                  customer={customerMap[effectiveCustomerId]}
                  caseTypeLabel="Uppsägning"
                  commentCount={commentCounts[c.id] ?? c.comment_count ?? 0}
                  canEditStatus={isAdmin}
                  onOpen={() => setSelected(c)}
                  onStatusChange={(next) => handleStatusChange(c.id, next)}
                />
              );
            })}
          </div>
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
                        <SelectTrigger><SelectValue placeholder="Välj leverantör" /></SelectTrigger>
                        <SelectContent>
                          {providers.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
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
                        <SelectTrigger><SelectValue placeholder="Välj typ" /></SelectTrigger>
                        <SelectContent>
                          {serviceTypes.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
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
                          <Input placeholder="Skriv typ (t.ex. Bredband, Mobil, El)" {...field} value={field.value ?? ""} maxLength={120} />
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
                        <SelectTrigger><SelectValue placeholder="Välj" /></SelectTrigger>
                        <SelectContent>
                          {noticeOptions.map((n) => (
                            <SelectItem key={n} value={n}>{n}</SelectItem>
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
                      <Textarea rows={3} placeholder="Övrig info till kund eller leverantör" {...field} value={field.value ?? ""} />
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
                <Button variant="ghost" type="button" onClick={resetDialog}>Avbryt</Button>
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UploadCloud className="h-4 w-4 mr-2" />}
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
        customers={customers}
        currentUserId={user?.id}
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
