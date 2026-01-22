// src/hooks/useCustomerData.ts
import { useCallback, useEffect, useState } from "react";
import { isUnauthorizedError, supabase, tryRefreshSession } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { CustomerCase, Comment, Valuation } from "@/types";

export const useCustomerData = () => {
  const { customer } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState<boolean>(false);
  const [cases, setCases] = useState<CustomerCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<CustomerCase | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState<string>("");
  const [loadingComments, setLoadingComments] = useState<boolean>(false);

  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [loadingVals, setLoadingVals] = useState<boolean>(false);

  const fetchCases = useCallback(async () => {
    if (!customer?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("*, service_type:service_type_id(*)")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCases(data as CustomerCase[] ?? []);
    } catch (err) {
      console.error("fetchCases (customer) error", err);
      toast({ title: "Fel", description: "Kunde inte hämta dina ärenden.", variant: "destructive" });
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, [customer?.id, toast]);

  const fetchComments = useCallback(async (caseId: string) => {
    if (!caseId) return;
    setLoadingComments(true);
    try {
      const { data, error } = await supabase
        .from("case_comments")
        .select("*, author:customers(name)")
        .eq("case_id", caseId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      setComments(data as Comment[] ?? []);
    } catch (err) {
      console.error("fetchComments error", err);
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, []);

  const addComment = useCallback(async () => {
    if (!selectedCase?.id || !newComment.trim() || !customer?.id) return;
    setLoadingComments(true);
    try {
      const { error } = await supabase.from("case_comments").insert({
        case_id: selectedCase.id,
        author_id: customer.id,
        author_type: "customer",
        content: newComment.trim(),
      });
      if (error) throw error;
      setNewComment("");
      await fetchComments(selectedCase.id);
      toast({ title: "Skickat", description: "Din kommentar har skickats." });
    } catch (err) {
      console.error("addComment error", err);
      toast({ title: "Fel", description: "Kunde inte skicka kommentar.", variant: "destructive" });
    } finally {
      setLoadingComments(false);
    }
  }, [selectedCase?.id, newComment, customer?.id, fetchComments, toast]);

  // valuations
  const fetchValuations = useCallback(async () => {
    if (!customer?.id) return;
    setLoadingVals(true);
    try {
      const { data, error } = await supabase.rpc("customer_get_my_valuations");
      if (error) throw error;
      console.log("fetchValuations data", data);
      setValuations(data ?? []);
    } catch (err) {
      console.error("fetchValuations error", err);
      setValuations([]);
    } finally {
      setLoadingVals(false);
    }
  }, [customer?.id]);

  const deleteValuation = useCallback(async (valuationId: string) => {
    // Customer view: soft delete via Edge Function (GDPR safe)
    const run = () =>
      supabase.functions.invoke("customer-soft-delete-valuation", {
        body: { valuation_id: valuationId, confirm: true },
      });

    let { error } = await run();

    // If the session is stale/expired, Supabase can return 401/403. Try one refresh + retry.
    const status = (error as any)?.status ?? (error as any)?.context?.status;
    if (error && (isUnauthorizedError(error) || status === 401 || status === 403)) {
      const refreshed = await tryRefreshSession();
      if (refreshed) {
        ({ error } = await run());
      }
    }

    if (error) {
      const status = (error as any)?.status ?? (error as any)?.context?.status ?? null;
      let body: any = null;
      try {
        body = await (error as any)?.context?.json?.();
      } catch {
        // ignore
      }

      const message =
        typeof body?.message === "string"
          ? body.message
          : typeof body?.error === "string"
            ? body.error
            : typeof (error as any)?.message === "string"
              ? (error as any).message
              : "Kunde inte radera värderingen.";

      const wrapped = new Error(status ? `${message} (status ${status})` : message);
      (wrapped as any).status = status;
      (wrapped as any).body = body;
      (wrapped as any).cause = error;
      throw wrapped;
    }
    setValuations((p) => p.filter((v) => v.id !== valuationId));
    toast({ title: "Raderad", description: "Värdering borttagen." });
  }, [toast]);

  useEffect(() => {
    fetchCases();
    fetchValuations();
  }, [fetchCases, fetchValuations]);

  useEffect(() => {
    if (selectedCase?.id) fetchComments(selectedCase.id);
    else setComments([]);
  }, [selectedCase?.id, fetchComments]);

  return {
    loading,
    cases,
    selectedCase,
    setSelectedCase,
    comments,
    newComment,
    setNewComment,
    loadingComments,
    addComment,
    fetchCases,
    valuations,
    loadingVals,
    fetchValuations,
    deleteValuation,
  };
};

export default useCustomerData;
