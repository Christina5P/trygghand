import { useAuth } from '@/hooks/useAuth'
import AuthLayout from './AuthLayout'
import Auth from './Auth'
import CustomerPortal from './CustomerPortal'
import AdminPortal from './AdminPortal'
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-500",
  cancelled: "bg-gray-500",
};

const statusLabels: Record<string, string> = {
  pending: "Väntar",
  in_progress: "Pågår",
  completed: "Avslutad",
  cancelled: "Avbruten",
};

const Portal = () => {
  const { user, customer, loading } = useAuth();

  // Räkna riktiga värden: hämta status för ärenden/abonnemang och beräkna %
  const [caseProgress, setCaseProgress] = useState<number>(0);
  const [subscriptionProgress, setSubscriptionProgress] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        // CASES: hämta status/created_at och räkna avslutade
        const { data: casesData, error: casesError } = await supabase
          .from("cases")
          .select("id,status,created_at");
        if (casesError) throw casesError;
        const totalCases = casesData?.length ?? 0;
        const completedCases = (casesData ?? []).filter((c: any) => {
          const s = (c.status ?? "").toString().toLowerCase();
          return ["completed", "avslutad", "done", "finished"].includes(s);
        }).length;
        const casePct = totalCases > 0 ? Math.round((completedCases / totalCases) * 100) : 0;

        // SUBSCRIPTIONS: försök använda status om kolumn finns, annars fallback -> räkna som "skapade/aktiva"
        let subsPct = 0;
        try {
          // Försök läsa status-kolumn (kan ge 42703 om kolumn saknas)
          const { data: subsData, error: subsError } = await supabase
            .from("subscriptions")
            .select("id,status,created_at");
          if (subsError) throw subsError;

          // Om posten innehåller statusfält, beräkna andel aktiva
          const hasStatus = (subsData && subsData.length > 0 && Object.prototype.hasOwnProperty.call(subsData[0], "status"));
          if (hasStatus) {
            const totalSubs = subsData.length;
            const inactiveSubs = (subsData ?? []).filter((s: any) => {
              const st = (s.status ?? "").toString().toLowerCase();
              return ["cancelled", "ended", "inactive", "cancelled_by_user"].includes(st);
            }).length;
            const activeSubs = totalSubs - inactiveSubs;
            subsPct = totalSubs > 0 ? Math.round((activeSubs / totalSubs) * 100) : 0;
          } else {
            // Ingen status-kolumn: behandla alla som "skapade/aktiva" (100% om det finns abonnemang)
            const { data: subsOnly, error: subsOnlyErr } = await supabase.from("subscriptions").select("id");
            if (!subsOnlyErr) {
              subsPct = (subsOnly?.length ?? 0) > 0 ? 100 : 0;
            } else {
              subsPct = 0;
            }
          }
        } catch (err: any) {
          // Fallback vid SQL-fel (t.ex. column does not exist)
          console.warn("Fel vid läsning av subscriptions.status — använder fallback:", err);
          const { data: subsOnly } = await supabase.from("subscriptions").select("id");
          subsPct = (subsOnly?.length ?? 0) > 0 ? 100 : 0;
        }

        if (!mounted) return;
        setCaseProgress(casePct);
        setSubscriptionProgress(subsPct);
      } catch (err) {
        console.error("Error fetching portal stats:", err);
      }
    };
    fetchStats();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-soft-gray flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-trust-blue mx-auto mb-4"></div>
          <p className="text-warm-gray">Laddar...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthLayout />;
  }

  // Snyggt diagram högst upp på kundportalen
  if (!customer?.is_admin) {
    return (
      <div className="max-w-3xl mx-auto py-8">
        {/* Välkomsttext */}
        <div className="mb-2">
          <h2 className="text-xl font-semibold text-trust-blue">Trygg Hand</h2>
        <p className="text-lg text-warm-gray font-medium">
  Välkommen {customer?.name ?? "Ny användare"}
</p>


        </div>
        {/* Rubrik och logga ut-knapp */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Kundportal</h1>
       
        </div>
        {/* Ringar/diagram */}
        <div className="flex gap-8 justify-center mb-8">
          <div className="flex flex-col items-center">
            <div style={{ width: 80 }}>
              <CircularProgressbar
                value={caseProgress}
                text={`${caseProgress}%`}
                styles={{
                  path: { stroke: "#22c55e" }, // Tailwind green-500
                  text: { fill: "#22c55e", fontSize: '18px' },
                  trail: { stroke: "#e5e7eb" }, // Tailwind gray-200
                }}
              />
            </div>
            <span className="mt-2 text-sm text-warm-gray">Ärenden klara</span>
          </div>
          <div className="flex flex-col items-center">
            <div style={{ width: 80 }}>
              <CircularProgressbar
                value={subscriptionProgress}
                text={`${subscriptionProgress}%`}
                styles={{
                  path: { stroke: "#22c55e" },
                  text: { fill: "#22c55e", fontSize: '18px' },
                  trail: { stroke: "#e5e7eb" },
                }}
              />
            </div>
            <span className="mt-2 text-sm text-warm-gray">Abonnemang klara</span>
          </div>
        </div>
        {/* Dina ärendekort */}
        <CustomerPortal />
      </div>
    );
  }

  // Adminportal som vanligt
  return <AdminPortal />;
};

export default Portal;