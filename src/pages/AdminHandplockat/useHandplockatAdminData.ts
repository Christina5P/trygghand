import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export function useHandplockatAdminData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpi, setKpi] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const { data: listingsData, error: listingsError } = await supabase
          .from("handplockat_listings")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (listingsError) throw listingsError;

        const { data: ordersData, error: ordersError } = await supabase
          .from("handplockat_orders")
          .select("*, listing:handplockat_listings(*)")
          .order("created_at", { ascending: false })
          .limit(50);
        if (ordersError) throw ordersError;

        if (!isMounted) return;

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        setKpi({
          available:       listingsData?.filter((l) => l.status === "available").length ?? 0,
          reserved:        listingsData?.filter((l) => l.status === "reserved").length ?? 0,
          sold:            listingsData?.filter((l) => l.status === "sold").length ?? 0,
          reservations_7d: listingsData?.filter((l) =>
            l.status === "reserved" &&
            new Date(l.updated_at ?? l.created_at) >= sevenDaysAgo
          ).length ?? 0,
          sold_sum_30d: listingsData
            ?.filter((l) =>
              l.status === "sold" &&
              new Date(l.updated_at ?? l.created_at) >= thirtyDaysAgo
            )
            .reduce((sum, l) => sum + (l.price_sek ?? 0), 0) ?? 0,
        });

        setListings(listingsData ?? []);
        setOrders(ordersData ?? []);
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || "Kunde inte hämta data");
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchData();
    return () => { isMounted = false; };
  }, [tick]);

  return { loading, error, kpi, listings, orders, reload };
}