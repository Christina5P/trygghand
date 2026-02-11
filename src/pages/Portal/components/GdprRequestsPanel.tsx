import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type GdprRequest = {
  id: string;
  status: string;
  created_at: string | null;
  processed_at: string | null;
  ready_at: string | null;
  expires_at: string | null;
  export_bucket: string | null;
  export_path: string | null;
};

type GdprRequestsPanelProps = {
  customerId?: string | null;
};

export default function GdprRequestsPanel({ customerId: customerIdProp = null }: GdprRequestsPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [customerId, setCustomerId] = useState<string | null>(customerIdProp);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<GdprRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const resolveCustomerId = useCallback(async () => {
    if (customerIdProp) {
      setCustomerId(customerIdProp);
      return;
    }
    if (!user?.id) return;

    const { data, error } = await supabase
      .from("customers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("resolveCustomerId failed", error);
      setError("Kunde inte hitta kundkoppling.");
      return;
    }

    setCustomerId(data?.id ?? null);
  }, [customerIdProp, user?.id]);

  const fetchRequests = useCallback(async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("gdpr_requests")
        .select("id, status, created_at, processed_at, ready_at, expires_at, export_bucket, export_path")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests((data ?? []) as GdprRequest[]);
    } catch (err) {
      console.error("fetch gdpr requests failed", err);
      setError("Kunde inte hämta registerutdrag.");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void resolveCustomerId();
  }, [resolveCustomerId]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const handleCreate = async () => {
    if (!user?.id || !customerId) {
      toast({ title: "Saknar kund", description: "Kunde inte skapa begäran.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("gdpr_requests").insert({
        customer_id: customerId,
        requested_by: user.id,
        status: "requested",
      });
      if (error) throw error;

      toast({ title: "Begäran skapad", description: "Vi behandlar din begäran." });
      await fetchRequests();
    } catch (err) {
      console.error("gdpr request insert failed", err);
      toast({ title: "Fel", description: "Kunde inte skapa begäran.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (request: GdprRequest) => {
    try {
      const { data, error } = await supabase.functions.invoke("gdpr-export", {
        body: { request_id: request.id, action: "download" },
      });
      if (error) throw error;
      if (!(data as any)?.signed_url) throw new Error("Saknar signed URL");

      window.open((data as any).signed_url, "_blank", "noopener,noreferrer");
      await fetchRequests();
    } catch (err) {
      console.error("gdpr download failed", err);
      toast({ title: "Fel", description: "Kunde inte skapa nedladdningslänk.", variant: "destructive" });
    }
  };

  const rows = useMemo(() => requests, [requests]);
  const statusBadgeClass = (status: string) => {
    switch (status) {
      case "requested":
        return "bg-slate-100 text-slate-700";
      case "processing":
        return "bg-yellow-100 text-yellow-800";
      case "ready":
        return "bg-green-100 text-green-800";
      case "delivered":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-200 text-slate-700";
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-trust-blue">Begär registerutdrag (GDPR)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleCreate} disabled={submitting || !customerId}>
            Begär registerutdrag (GDPR)
          </Button>
          {loading && <div className="text-sm text-muted-foreground">Laddar...</div>}
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}

        {rows.length === 0 && !loading && (
          <div className="text-sm text-muted-foreground">Inga registerutdrag hittades.</div>
        )}

        <div className="space-y-2">
          {rows.map((req) => (
            <div key={req.id} className="rounded border px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge className={statusBadgeClass(req.status)}>{req.status}</Badge>
                </div>
                {req.status === "ready" && req.export_bucket && req.export_path && (
                  <Button size="sm" variant="secondary" onClick={() => handleDownload(req)}>
                    Ladda ner
                  </Button>
                )}
                {req.status === "delivered" && (
                  <div className="text-xs text-muted-foreground">Levererad</div>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Skapad: {req.created_at ? new Date(req.created_at).toLocaleString("sv-SE") : "-"}
                {req.processed_at ? ` · Behandlad: ${new Date(req.processed_at).toLocaleString("sv-SE")}` : ""}
                {req.ready_at ? ` · Redo: ${new Date(req.ready_at).toLocaleString("sv-SE")}` : ""}
                {req.expires_at ? ` · Gäller till: ${new Date(req.expires_at).toLocaleString("sv-SE")}` : ""}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
