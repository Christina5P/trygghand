import { useAuth } from '@/hooks/useAuth'
import AuthLayout from '@/components/auth/AuthLayout'
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

  // Exempeldata – byt ut mot din egen logik!
  const caseProgress = 75; // t.ex. 75% av ärenden klara
  const subscriptionProgress = 40; // t.ex. 40% av abonnemang klara

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