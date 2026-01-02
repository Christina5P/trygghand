import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { CancellationComment, CancellationStatus, Customer, Subscription, SubscriptionCancellation } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { Eye, Loader2, MessageCircle, PlusCircle, UploadCloud, X, Check } from "lucide-react";

// Färgpalett matchad mot ärendehanteringens badges
const statusOptions: { value: CancellationStatus; label: string; color: string }[] = [
  { value: "pending", label: "Inväntar start", color: "bg-yellow-100 text-yellow-800" },
  { value: "processing", label: "Pågående", color: "bg-blue-100 text-blue-800" },
  { value: "waiting_customer", label: "Väntar kund", color: "bg-indigo-100 text-indigo-800" },
  { value: "cancelled", label: "Avbruten", color: "bg-red-100 text-red-800" },
  { value: "completed", label: "Klar", color: "bg-green-100 text-green-800" },
];

const providerOptions = ["Telia", "Telenor", "E.ON", "Vattenfall", "Comviq", "Tre", "Bredbandsbolaget", "Annat"];
const serviceTypeOptions = ["Mobil", "Bredband", "El", "Hemtjänst", "Övrigt"];
const noticeOptions = ["Ingen", "1 mån", "3 mån", "Datum"];

const newCancellationSchema = z.object({
  customer_id: z.string().min(1, "Välj kund"),
  subscription_id: z.string().optional().nullable(),
  custom_service_name: z.string().optional().nullable(),
  provider: z.string().min(1, "Ange leverantör"),
  service_type: z.string().min(1, "Välj typ"),
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
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<SubscriptionCancellation | null>(null);
  type EditableCancellation = Partial<SubscriptionCancellation> & { notes?: string | null };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValues, setEditingValues] = useState<EditableCancellation>({});
  const [comments, setComments] = useState<CancellationComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [showDialog, setShowDialog] = useState(false);

  const customerMap = useMemo(() => {
    const map: Record<string, Customer> = {};
    customers.forEach((c) => (map[c.id] = c));
    return map;
  }, [customers]);

  const form = useForm<NewCancellationValues>({
    resolver: zodResolver(newCancellationSchema),
    defaultValues: {
      customer_id: "",
      subscription_id: null,
      custom_service_name: "",
      provider: "",
      service_type: "",
      notice_period: "",
      last_due_date: "",
      provider_contact: "",
      notes: "",
      files: undefined,
    },
  });

  const FileLink = ({ filePath, fileName }: { filePath: string; fileName: string }) => {
    const [signedUrl, setSignedUrl] = useState<string>("");
    const [loading, setLoading] = useState(false);

    const handleClick = async (e: React.MouseEvent) => {
      e.preventDefault();
      if (signedUrl) {
        window.open(signedUrl, "_blank");
        return;
      }
      setLoading(true);
      try {
        // createSignedUrl returnerar { signedUrl: string }
        const { data, error } = await supabase.storage
          .from("abonnemang")
          .createSignedUrl(filePath, 3600);
        
        if (error) {
          console.error("Supabase error:", error);
          throw new Error(error.message || "Kunde inte generera signerad URL");
        }
        
        // Hämta URL från data-objektet (Supabase SDK v2 returnerar { signedUrl })
        const url = data?.signedUrl;
        
        if (!url) {
          console.error("Ingen URL i svar:", data);
          throw new Error("Ingen länk genererad - kontrollera filsökvägen");
        }
        
        setSignedUrl(url);
        window.open(url, "_blank");
      } catch (err: any) {
        console.error("File link error details:", {
          message: err.message,
          error: err,
          filePath,
        });
        toast({ 
          title: "Kunde inte öppna fil", 
          description: err.message || "Okänt fel", 
          variant: "destructive" 
        });
      } finally {
        setLoading(false);
      }
    };

    return (
      <button onClick={handleClick} className="text-trust-blue underline hover:opacity-70" disabled={loading}>
        {loading ? "Laddar..." : fileName}
      </button>
    );
  };

  const fetchComments = async (cancellationId: string) => {
    const { data, error } = await supabase
      .from("cancellation_comments")
      .select("*")
      .eq("cancellation_id", cancellationId)
      .order("created_at", { ascending: true });

    if (!error && data) setComments(data as CancellationComment[]);
  };

  const resetDialog = () => {
    form.reset();
    setShowDialog(false);
    setSelected(null);
    setComments([]);
    setCommentText("");
  };

  const uploadFiles = async (customerId: string, cancellationId: string, fileList?: FileList): Promise<string[]> => {
    if (!fileList || fileList.length === 0) return [];
    const uploaded: string[] = [];
    
    // Hämta kundnamn för mappsökväg
    const customer = customerMap[customerId];
    const customerFolder = customer?.name ? customer.name.replace(/\s+/g, "_") : customerId;
    
    // Hämta kort customer ID (första 8 tecknen)
    const customerIdShort = customerId.slice(0, 8);
    
    for (const file of Array.from(fileList)) {
      // Generera renare filnamn: customer_serviceType_originalNamn
      const originalName = file.name.replace(/\.[^/.]+$/, ""); // ta bort extension
      const ext = file.name.split(".").pop() || "pdf";
      
      // Skapa semantiskt namn: a1b2c3d4_dokumenttyp.pdf
      const semanticName = `${customerIdShort}_${originalName.replace(/\s+/g, "_")}.${ext}`;
      const path = `${customerFolder}/${semanticName}`;
      
      const { error } = await supabase.storage.from("abonnemang").upload(path, file, { upsert: true });
      if (error) throw error;
      
      // Spara bara sökvägen (signed URL genereras vid visning)
      uploaded.push(path);
    }
    return uploaded;
  };

  const onSubmit = async (values: NewCancellationValues) => {
    try {
      setSaving(true);
      const { files, notes, ...rest } = values;
      const rpcPayload = {
        p_custom_service_name: rest.custom_service_name || null,
        p_customer_id: rest.customer_id,
        p_last_due_date: rest.last_due_date || null,
        p_notes: notes || null,
        p_notice_period: rest.notice_period || null,
        p_provider: rest.provider,
        p_provider_contact: (rest as any).provider_contact || null,
        p_service_type: rest.service_type,
        p_subscription_id: rest.subscription_id
      };

      const { data: createdId, error } = await supabase.rpc("admin_create_subscription_cancellation", rpcPayload);

      if (error) throw error;

      const uploaded = await uploadFiles(rest.customer_id, createdId, files as FileList | undefined);
      if (uploaded.length > 0) {
        await supabase
          .from("subscription_cancellations")
          .update({ documents: uploaded })
          .eq("id", createdId);
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

  const handleOpenDetails = async (item: SubscriptionCancellation) => {
    setSelected(item);
    await fetchComments(item.id);
  };

  const handleEditStart = (item: SubscriptionCancellation) => {
    setEditingId(item.id);
    setEditingValues(item);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingValues({});
  };

  const handleEditSave = async (id: string) => {
    try {
      const updatePayload = Object.fromEntries(
        Object.entries(editingValues).filter(([key]) => 
          ["provider", "service_type", "notice_period", "last_due_date", "provider_contact", "custom_service_name", "notes", "status"].includes(key)
        )
      );
      
      const { error } = await supabase
        .from("subscription_cancellations")
        .update(updatePayload)
        .eq("id", id);
      
      if (error) throw error;
      toast({ title: "Uppdaterat" });
      setEditingId(null);
      setEditingValues({});
      await onDataUpdated();
    } catch (err: any) {
      toast({ title: "Kunde inte spara", description: err.message, variant: "destructive" });
    }
  };

  const handleStatusChange = async (cancellationId: string, status: CancellationStatus) => {
    try {
      const { error } = await supabase
        .from("subscription_cancellations")
        .update({ status })
        .eq("id", cancellationId);
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

  const handleAddComment = async () => {
    if (!selected || !commentText.trim()) return;
    const payload = {
      cancellation_id: selected.id,
      message: commentText.trim(),
      user_id: user?.id ?? "00000000-0000-0000-0000-000000000000",
      is_internal: false,
    };
    const { error } = await supabase.from("cancellation_comments").insert([payload]);
    if (error) {
      toast({ title: "Kunde inte spara kommentar", description: error.message, variant: "destructive" });
      return;
    }
    setCommentText("");
    await fetchComments(selected.id);
  };

  const renderStatusBadge = (status: CancellationStatus) => {
    const found = statusOptions.find((s) => s.value === status);
    if (!found) return <Badge variant="outline">{status}</Badge>;
    return <Badge className={found.color}>{found.label}</Badge>;
  };

  const subscriptionOptions = useMemo(() => {
    const grouped: Record<string, Subscription[]> = {};
    subscriptions.forEach((s) => {
      if (!grouped[s.customer_id]) grouped[s.customer_id] = [];
      grouped[s.customer_id].push(s);
    });
    return grouped;
  }, [subscriptions]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold">Uppsägningar</h2>
          <p className="text-sm text-muted-foreground">Hantera pågående uppsägningar och kommunicera med kund</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <PlusCircle className="h-4 w-4 mr-2" /> Registrera ny uppsägning
        </Button>
      </div>

      <div>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Hämtar...</div>
        ) : cancellations.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Inga uppsägningar registrerade ännu.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cancellations.map((c) => {
              const isEditing = editingId === c.id;
              const vals = isEditing ? editingValues : c;
              
              return (
                <Card key={c.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {isEditing ? (
                          <Input
                            value={vals.provider || ""}
                            onChange={(e) => setEditingValues({ ...editingValues, provider: e.target.value })}
                            placeholder="Leverantör"
                            className="mb-2"
                          />
                        ) : (
                          <>
                            <CardTitle className="text-base cursor-pointer hover:text-blue-600" onClick={() => handleEditStart(c)}>
                              {c.provider || "Abonnemang"}
                            </CardTitle>
                            <CardDescription className="cursor-pointer hover:text-blue-600" onClick={() => handleEditStart(c)}>
                              {c.custom_service_name || c.service_type || "-"}
                            </CardDescription>
                          </>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEditSave(c.id)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleEditCancel}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {renderStatusBadge(c.status)}
                          <Select defaultValue={c.status} onValueChange={(s) => handleStatusChange(c.id, s as CancellationStatus)}>
                            <SelectTrigger className="w-32 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusOptions.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-2 text-sm">
                    {isEditing && (
                      <>
                        <Input
                          value={vals.custom_service_name || ""}
                          onChange={(e) => setEditingValues({ ...editingValues, custom_service_name: e.target.value })}
                          placeholder="Tjänstnamn"
                        />
                        <Select value={vals.service_type || ""} onValueChange={(v) => setEditingValues({ ...editingValues, service_type: v })}>
                          <SelectTrigger><SelectValue placeholder="Typ av abonnemang" /></SelectTrigger>
                          <SelectContent>
                            {serviceTypeOptions.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={vals.notice_period || ""}
                          onChange={(e) => setEditingValues({ ...editingValues, notice_period: e.target.value })}
                          placeholder="Uppsägningstid"
                        />
                        <Input
                          type="date"
                          value={vals.last_due_date || ""}
                          onChange={(e) => setEditingValues({ ...editingValues, last_due_date: e.target.value })}
                        />
                        <Input
                          value={vals.provider_contact || ""}
                          onChange={(e) => setEditingValues({ ...editingValues, provider_contact: e.target.value })}
                          placeholder="Kontaktperson"
                        />
                        <Textarea
                          value={vals.notes || ""}
                          onChange={(e) => setEditingValues({ ...editingValues, notes: e.target.value })}
                          placeholder="Noteringar"
                          className="min-h-[60px]"
                        />
                      </>
                    )}
                    
                    {!isEditing && (
                      <>
                        <div>
                          <span className="text-muted-foreground">Kund:</span> {customerMap[c.customer_id]?.name || customerMap[c.customer_id]?.email || "Okänd"}
                        </div>
                        {c.notice_period && (
                          <div>
                            <span className="text-muted-foreground">Uppsägningstid:</span> {c.notice_period}
                          </div>
                        )}
                        {c.last_due_date && (
                          <div>
                            <span className="text-muted-foreground">Förfaller:</span> {format(new Date(c.last_due_date), "yyyy-MM-dd")}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          Skapad: {c.created_at ? format(new Date(c.created_at), "yyyy-MM-dd") : "-"}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => handleOpenDetails(c)}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" /> Visa detaljer
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Dialog för ny uppsägning */}
      <Dialog open={showDialog} onOpenChange={(v) => (v ? setShowDialog(true) : resetDialog())}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrera ny uppsägning</DialogTitle>
            <CardDescription>Fyll i detaljerna för uppsägningen</CardDescription>
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
                  name="subscription_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tjänst</FormLabel>
                      <Select
                        onValueChange={(val) => field.onChange(val === "manual" ? null : val)}
                        value={field.value ?? ""}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Välj befintligt abonnemang eller Annat" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manual">Annat / Manuell inmatning</SelectItem>
                          {(subscriptionOptions[form.watch("customer_id") || ""] || []).map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name || s.plan || s.provider || "Abonnemang"}
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
                  name="custom_service_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Annat (tjänstnamn)</FormLabel>
                      <FormControl>
                          <Input placeholder="Tele2 mobil, Elavtal etc" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Leverantör</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Välj leverantör" /></SelectTrigger>
                        <SelectContent>
                          {providerOptions.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
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
                          {serviceTypeOptions.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
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

      {/* Detaljvy */}
      <Dialog open={!!selected} onOpenChange={(v) => (!v ? setSelected(null) : null)}>
        <DialogContent className="max-w-3xl">
          {selected && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle>{selected.provider || "Uppsägning"}</DialogTitle>
                <CardDescription>{selected.custom_service_name || selected.service_type}</CardDescription>
              </DialogHeader>

              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <div><Label>Status</Label><div className="mt-1 flex items-center gap-2">{renderStatusBadge(selected.status)}
                  <Select defaultValue={selected.status} onValueChange={(v) => handleStatusChange(selected.id, v as CancellationStatus)}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div></div>
                <div><Label>Kund</Label><div className="mt-1">{customerMap[selected.customer_id]?.name || customerMap[selected.customer_id]?.email}</div></div>
                <div><Label>Uppsägningstid</Label><div className="mt-1">{selected.notice_period || "-"}</div></div>
                <div><Label>Sista förfallodatum</Label><div className="mt-1">{selected.last_due_date || "-"}</div></div>
                    <div><Label>Kontaktperson</Label><div className="mt-1">{(selected as any).provider_contact || (selected as any).contact_person || "-"}</div></div>
                <div><Label>Bilagor</Label><div className="mt-1 space-y-1">
                  {(selected.documents || []).length === 0 && <span className="text-muted-foreground">Inga bilagor</span>}
                  {(selected.documents || []).map((path) => (
                    <FileLink key={path} filePath={path} fileName={path.split("/").pop() || path} />
                  ))}
                </div></div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center gap-2 font-medium"><UploadCloud className="h-4 w-4" /> Lägg till filer</div>
                <div>
                  <input
                    type="file"
                    multiple
                    accept="application/pdf,image/*"
                    onChange={async (e) => {
                      if (selected && e.target.files) {
                        setSaving(true);
                        try {
                          const newFiles = await uploadFiles(selected.customer_id, selected.id, e.target.files);
                          const updatedDocs = [...(selected.documents || []), ...newFiles];
                          const { error } = await supabase
                            .from("subscription_cancellations")
                            .update({ documents: updatedDocs })
                            .eq("id", selected.id);
                          if (error) throw error;
                          toast({ title: "Filer uppladdade" });
                          await onDataUpdated();
                          setSelected({ ...selected, documents: updatedDocs });
                        } catch (err: any) {
                          toast({ title: "Kunde inte ladda upp", description: err.message, variant: "destructive" });
                        } finally {
                          setSaving(false);
                        }
                      }
                    }}
                    disabled={saving}
                    className="block w-full text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center gap-2 font-medium"><MessageCircle className="h-4 w-4" /> Kommunikation</div>
                <div className="max-h-64 overflow-y-auto rounded border p-3 space-y-3 bg-muted/50">
                  {comments.length === 0 && <div className="text-sm text-muted-foreground">Inga kommentarer ännu.</div>}
                  {comments.map((c) => (
                    <div key={c.id} className="text-sm">
                      <div className="font-medium">{c.user_id ? c.user_id.slice(0, 8) : "Användare"} <span className="text-muted-foreground text-xs">{c.created_at ? format(new Date(c.created_at), "yyyy-MM-dd HH:mm") : ""}</span></div>
                      <div>{c.message}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Skriv meddelande till kund"
                    className="min-h-[80px]"
                  />
                  <Button onClick={handleAddComment} disabled={!commentText.trim()}>
                    Skicka
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SubscriptionCancellationsView;
