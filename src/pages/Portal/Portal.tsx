import { useAuth } from "@/hooks/useAuth";
import AuthLayout from "@/pages/Portal/AuthLayout";
import CustomerPortal from "./CustomerPortal";
import AdminPortal from "./AdminPortal";
import { useEffect, useState } from "react";
import ValueEstimator from "@/components/ValueEstimator";

const Portal = () => {
  const { user, customer, loading } = useAuth();

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

  if (!user) return <AuthLayout />;

  // Kundportal
  if (customer && !customer.is_admin) {
    return <CustomerPortal />;
  }

  // Adminportal
  if (customer?.is_admin) {
    return <AdminPortal />;
  }

  return <AuthLayout />;
};

export default Portal;
