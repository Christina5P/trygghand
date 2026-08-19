// src/hooks/useAdminData.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Customer, CustomerMap, Case, ContactRequest, Subscription, SubscriptionCancellation, Valuation, ServiceType } from "@/types";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to centralize admin-side data fetching.
 * Returns arrays + helper fetch functions.
 */
export const useAdminData = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [cases, setCases] = useState<Case[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [valuations, setValuations] = useState<Valuation[]>([]);
  const [cancellations, setCancellations] = useState<SubscriptionCancellation[]>([]);

  // customerMap for quick lookup
  const customerMap = useMemo(() => {
    return customers.reduce((acc: CustomerMap, c) => {
      if (c?.id) acc[c.id] = c;
      return acc;
    }, {} as CustomerMap);
  }, [customers]);

  const fetchCases = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("*, service_type:service_type_id(*), admin_last_read_at, customer_last_read_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCases(data ?? []);
    } catch (err: any) {
      console.error("fetchCases error", err);
      toast({ title: "Fel", description: "Kunde inte hämta ärenden.", variant: "destructive" });
      setCases([]);
    }
  }, [toast]);

  const fetchCustomers = useCallback(async () => {
    try {
      // Fetch active customers only.
      // Customers that are archived/soft-deleted should not appear in the active list.
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("is_customer", true)
        .is("deleted_at", null)
        .order("name", { ascending: true });
      if (error) throw error;
      setCustomers(data ?? []);
    } catch (err: any) {
      console.error("fetchCustomers error", err);
      setCustomers([]);
    }
  }, []);

  const fetchContactRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("contact_requests")
        .select("*")
        .eq("source", "trygghand")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setContactRequests(data ?? []);
    } catch (err: any) {
      console.error("fetchContactRequests error", err);
      setContactRequests([]);
    }
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-get-subscriptions", { body: {} });
      if (error) throw error;

      if ((data as any)?.ok === false) {
        const msg = (data as any)?.message || (data as any)?.error || "Kunde inte hämta abonnemang.";
        throw new Error(msg);
      }

      const subs = ((data as any)?.subscriptions ?? []) as any[];
      const normalized: Subscription[] = subs.map((s: any) => ({
        ...s,
        id: String(s.id),
        customer_id: String(s.customer_id),
      }));

      setSubscriptions(normalized);
    } catch (err: any) {
      console.error("fetchSubscriptions error", err);
      setSubscriptions([]);
    }
  }, []);

  const fetchValuations = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-get-all-valuations", { body: {} });
      if (error) throw error;

      if ((data as any)?.ok === false) {
        const msg = (data as any)?.message || (data as any)?.error || "Kunde inte hämta värderingar.";
        throw new Error(msg);
      }

      const vals = ((data as any)?.valuations ?? []) as any[];
      const normalized: Valuation[] = vals.map((v: any) => ({
        ...v,
        id: String(v.id),
        customer_id: String(v.customer_id),
      }));

      // Add a human-friendly title/number (no migration required).
      // Numbering is per customer_id, ordered by created_at asc (fallback id asc).
      const byCustomer = new Map<string, Valuation[]>();
      for (const v of normalized) {
        const key = (v as any).customer_id == null ? "__admin_only__" : String((v as any).customer_id);
        const list = byCustomer.get(key) ?? [];
        list.push(v);
        byCustomer.set(key, list);
      }

      for (const [key, list] of byCustomer.entries()) {
        list.sort((a: any, b: any) => {
          const at = a.created_at ? new Date(a.created_at).getTime() : Number.POSITIVE_INFINITY;
          const bt = b.created_at ? new Date(b.created_at).getTime() : Number.POSITIVE_INFINITY;
          if (at !== bt) return at - bt;
          return String(a.id).localeCompare(String(b.id));
        });

        list.forEach((v: any, idx: number) => {
          const n = idx + 1;
          v.number = n;
          v.title = key === "__admin_only__" ? `Adminvärdering ${n}` : `Värdering ${n}`;
        });
      }

      setValuations(normalized);
    } catch (err: any) {
      console.error("fetchValuations error", err);
      setValuations([]);
    }
  }, []);


  const fetchCancellations = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-get-all-subscription-cancellations", { body: {} });
      if (error) throw error;

      if ((data as any)?.ok === false) {
        const msg = (data as any)?.message || (data as any)?.error || "Kunde inte hämta uppsägningar.";
        throw new Error(msg);
      }

      const items = ((data as any)?.cancellations ?? []) as any[];
      const normalized: SubscriptionCancellation[] = items.map((c: any) => ({
        ...c,
        id: String(c.id),
        customer_id: String(c.customer_id),
        subscription_id: c.subscription_id != null ? String(c.subscription_id) : null,
      }));

      setCancellations(normalized);
    } catch (err: any) {
      console.error("fetchCancellations error", err);
      setCancellations([]);
    }
  }, []);

  // fetch all
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCases(),
        fetchCustomers(),
        fetchContactRequests(),
        fetchSubscriptions(),
        fetchValuations(),
        fetchCancellations()
      ]);
    } finally {
      setLoading(false);
    }
  }, [fetchCases, fetchCustomers, fetchContactRequests, fetchSubscriptions, fetchValuations, fetchCancellations]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    loading,
    cases,
    customers,
    customerMap,
    contactRequests,
    subscriptions,
    valuations,
    cancellations,
    fetchAll,
    fetchCases,
    fetchCustomers,
    fetchContactRequests,
    fetchSubscriptions,
    fetchValuations,
    fetchCancellations,
  };
};

export default useAdminData;
