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
import ValueEstimator from '@/components/ValueEstimator';
import { Link } from "react-router-dom";

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
  const [showEstimator, setShowEstimator] = useState(false);

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

  // Visa kundportal för icke-admin
  if (!customer?.is_admin) {
    const customerId = customer?.id ?? user?.id;
    return (
      <div className="max-w-3xl mx-auto py-8">
        <div className="mb-2">
          <h2 className="text-xl font-semibold text-trust-blue">Trygg Hand</h2>
          <p className="text-lg text-warm-gray font-medium">
            Välkommen {customer?.name ?? user?.user_metadata?.full_name ?? user?.email ?? "Ny användare"}
          </p>
        </div>

        {/* Knapp för att öppna ValueEstimator */}
        <div className="mb-4">
          <button
            onClick={() => setShowEstimator(true)}
            className="px-4 py-2 bg-trust-blue text-white rounded"
          >
            Värdera bilder
          </button>
        </div>

        {showEstimator && customerId && (
          <div className="mt-4">
            <ValueEstimator
              {...({ customerId, onClose: () => setShowEstimator(false) } as any)}
            />
          </div>
        )}

        {/* Resten av kundportalen */}
        <CustomerPortal />

        {/* Portal actions / buttons */}
        <div className="mt-6">
          <Link
            to="/vardering-ai"
            className="block bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg hover:bg-purple-700 transition"
          >
            Starta AI-värdering
          </Link>
        </div>
      </div>
    );
  }

  // Adminportal som vanligt
  return <AdminPortal />;
};

export default Portal;