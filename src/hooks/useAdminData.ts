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
        .select("*, service_type:service_type_id(*)")
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
      const { data, error } = await supabase.from("customers").select("*").order("name", { ascending: true });
      if (error) throw error;
      setCustomers(data ?? []);
    } catch (err: any) {
      console.error("fetchCustomers error", err);
      setCustomers([]);
    }
  }, []);

  const fetchContactRequests = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("contact_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setContactRequests(data ?? []);
    } catch (err: any) {
      console.error("fetchContactRequests error", err);
      setContactRequests([]);
    }
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("subscriptions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setSubscriptions(data ?? []);
    } catch (err: any) {
      console.error("fetchSubscriptions error", err);
      setSubscriptions([]);
    }
  }, []);

  const fetchValuations = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("valuations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setValuations(data ?? []);
    } catch (err: any) {
      console.error("fetchValuations error", err);
      setValuations([]);
    }
  }, []);

  const fetchCancellations = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("subscription_cancellations").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setCancellations(data ?? []);
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
