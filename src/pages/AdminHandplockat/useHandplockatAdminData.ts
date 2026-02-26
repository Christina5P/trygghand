import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function useHandplockatAdminData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpi, setKpi] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // KPI
        const { data: kpiData, error: kpiError } = await supabase.rpc("handplockat_admin_kpi");
        if (kpiError) throw kpiError;
        // Listings
        const { data: listingsData, error: listingsError } = await supabase
          .from("handplockat_listings")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (listingsError) throw listingsError;
        // Orders
        const { data: ordersData, error: ordersError } = await supabase
          .from("handplockat_orders")
          .select("*, listing:handplockat_listings(*)")
          .order("created_at", { ascending: false })
          .limit(50);
        if (ordersError) throw ordersError;
        if (!isMounted) return;
        setKpi(kpiData);
        setListings(listingsData);
        setOrders(ordersData);
      } catch (err: any) {
        setError(err.message || "Kunde inte hämta data");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    return () => {
      isMounted = false;
    };
  }, []);

  return { loading, error, kpi, listings, orders };
}
