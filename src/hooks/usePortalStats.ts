import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface PortalStats {
  caseProgress: number;
  subscriptionProgress: number;
  loadingStats: boolean;
}

export const usePortalStats = (): PortalStats => {
  const [caseProgress, setCaseProgress] = useState(0);
  const [subscriptionProgress, setSubscriptionProgress] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) throw new Error("Not authenticated");

        // 1. CASES – endast kundens ärenden
        const { data: casesData, error: casesError } = await supabase
          .from("cases")
          .select("status")
          .eq("customer_id", user.id);

        if (casesError) throw casesError;

        const totalCases = casesData?.length ?? 0;
        const completedCases = (casesData ?? []).filter((c: any) => {
          const s = (c.status ?? "").toString().toLowerCase();
          return ["completed", "avslutad", "done", "finished"].includes(s);
        }).length;

        const casePct =
          totalCases > 0
            ? Math.round((completedCases / totalCases) * 100)
            : 0;

        // 2. CANCELLATIONS – endast kundens uppsägningar
        const { data: cancData, error: cancError } = await supabase
          .from("subscription_cancellations")
          .select("status")
          .eq("customer_id", user.id);

        if (cancError) throw cancError;

        const totalCanc = cancData?.length ?? 0;
        const completedCanc = (cancData ?? []).filter((c: any) => {
          const s = (c.status ?? "").toString().toLowerCase();
          return ["completed", "cancelled"].includes(s);
        }).length;

        const subsPct =
          totalCanc > 0
            ? Math.round((completedCanc / totalCanc) * 100)
            : 0;

        if (!mounted) return;

        setCaseProgress(casePct);
        setSubscriptionProgress(subsPct);
      } catch (err) {
        console.error("Error fetching portal stats:", err);
      } finally {
        if (mounted) setLoadingStats(false);
      }
    };

    fetchStats();
    return () => {
      mounted = false;
    };
  }, []);

  return {
    caseProgress,
    subscriptionProgress,
    loadingStats,
  };
};
