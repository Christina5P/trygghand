// src/hooks/usePortalStats.ts

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

interface PortalStats {
    caseProgress: number;
    subscriptionProgress: number;
    loadingStats: boolean;
}

export const usePortalStats = (): PortalStats => {
    const [caseProgress, setCaseProgress] = useState<number>(0);
    const [subscriptionProgress, setSubscriptionProgress] = useState<number>(0);
    const [loadingStats, setLoadingStats] = useState<boolean>(true);

    useEffect(() => {
        let mounted = true;
        const fetchStats = async () => {
            try {
                // 1. CASES: Räkna avslutade ärenden
                const { data: casesData, error: casesError } = await supabase
                    .from("cases")
                    .select("id,status");
                
                if (casesError) throw casesError;
                const totalCases = casesData?.length ?? 0;
                const completedCases = (casesData ?? []).filter((c: any) => {
                    // Normalisera status för jämförelse
                    const s = (c.status ?? "").toString().toLowerCase();
                    return ["completed", "avslutad", "done", "finished"].includes(s);
                }).length;
                const casePct = totalCases > 0 ? Math.round((completedCases / totalCases) * 100) : 0;

                // 2. SUBSCRIPTIONS: Räkna aktiva abonnemang
                let subsPct = 0;
                try {
                    // Försök läsa status-kolumn
                    const { data: subsData } = await supabase
                        .from("subscriptions")
                        .select("id,status");
                    
                    const totalSubs = subsData?.length ?? 0;
                    
                    const hasStatus = totalSubs > 0 && Object.prototype.hasOwnProperty.call(subsData![0], "status");
                    
                    if (hasStatus) {
                        const inactiveSubs = (subsData ?? []).filter((s: any) => {
                            const st = (s.status ?? "").toString().toLowerCase();
                            return ["cancelled", "ended", "inactive", "cancelled_by_user"].includes(st);
                        }).length;
                        const activeSubs = totalSubs - inactiveSubs;
                        subsPct = totalSubs > 0 ? Math.round((activeSubs / totalSubs) * 100) : 0;
                    } else {
                        // Fallback om status-kolumn saknas: behandla alla som 100% aktiva
                        subsPct = totalSubs > 0 ? 100 : 0;
                    }
                } catch (err: any) {
                    // Vid SQL-fel (t.ex. kolumn saknas), använd fallback
                    console.warn("Fel vid läsning av subscriptions.status — använder fallback:", err);
                    const { data: subsOnly } = await supabase.from("subscriptions").select("id");
                    subsPct = (subsOnly?.length ?? 0) > 0 ? 100 : 0;
                }

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