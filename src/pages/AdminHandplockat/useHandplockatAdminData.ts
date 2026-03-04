import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export function useHandplockatAdminData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpi, setKpi] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [purchaseInterests, setPurchaseInterests] = useState<any[]>([]);
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

        const { data: contactData, error: contactError } = await supabase
          .from("contact_requests")
          .select("id, firstname, lastname, name, email, phone, message, created_at")
          .order("created_at", { ascending: false })
          .limit(150);
        if (contactError) throw contactError;

        if (!isMounted) return;

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const openOrderListingIds = new Set(
          (ordersData ?? [])
            .filter(
              (order) =>
                order?.listing_id &&
                ["pending", "reserved"].includes(String(order.status)) &&
                ["direct_buy", null, undefined].includes(order.order_type)
            )
            .map((order) => String(order.listing_id))
        );

        const normalizedListings = (listingsData ?? []).map((listing) => {
          if (openOrderListingIds.has(String(listing.id)) && listing.status === "available") {
            return { ...listing, status: "reserved" };
          }
          return listing;
        });

        setKpi({
          draft:           normalizedListings.filter((l) => l.status === "draft").length ?? 0,
          available:       normalizedListings.filter((l) => l.status === "available").length ?? 0,
          reserved:        normalizedListings.filter((l) => l.status === "reserved").length ?? 0,
          sold:            normalizedListings.filter((l) => l.status === "sold").length ?? 0,
          reservations_7d: normalizedListings.filter((l) =>
            l.status === "reserved" &&
            new Date(l.updated_at ?? l.created_at) >= sevenDaysAgo
          ).length ?? 0,
          sold_sum_30d: normalizedListings
            ?.filter((l) =>
              l.status === "sold" &&
              new Date(l.updated_at ?? l.created_at) >= thirtyDaysAgo
            )
            .reduce((sum, l) => sum + (l.price_sek ?? 0), 0) ?? 0,
        });

        setListings(normalizedListings);
        setOrders(ordersData ?? []);
        setPurchaseInterests(
          (contactData ?? []).filter((row) =>
            String(row?.message || "").includes("[Köpintresse Handplockat]")
          )
        );
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

  return { loading, error, kpi, listings, orders, purchaseInterests, reload };
}