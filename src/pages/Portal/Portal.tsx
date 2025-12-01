// src/Portal.tsx 

import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from "react-router-dom";
import AuthLayout from './AuthLayout' // visa inloggningsrutan
import type { Customer } from '@/types';
// Importen av Auth används sällan direkt; AuthLayout hanterar det oftast
import Auth from './Auth' 
import CustomerPortal from './CustomerPortal'
import AdminPortal from './AdminPortal'
import { useEffect, useState } from "react";
import { Phone, Mail, User, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PortalStats } from '@/pages/Portal/PortalStats';
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import NewCaseForm from "./views/NewCaseForm";

// Importera dina nya vyer och dialoger
import CasesView from "./views/CasesView";
import CustomersDialog from "./dialogs/CustomersDialog"; // Din dialog

// Importera dina typer
//import type { CustomerCase, Customer, Comment } from '@/types';
// OBS! Dessa används ej i den städade versionen av Portal.tsx, men behåll dem om de används någon annanstans.
// const statusColors: Record<string, string> = { ... };
// const statusLabels: Record<string, string> = { ... };



interface HeaderProps {
  customer?: Customer;
  signOut: () => Promise<void> | void;
  showSignOut?: boolean;
}
 
 const Header: React.FC<HeaderProps> = ({ customer, signOut, showSignOut = true }) => {
  const auth = useAuth();
  // navigate tas bort här så Header inte styr routing

  const effectiveSignOut = async () => {
    try {
      // Anropa prop först om den finns, annars fallback till auth.signOut
      if (signOut) {
        await signOut();
      } else if (auth?.signOut) {
        await auth.signOut();
      } else {
        await supabase.auth.signOut();
      }
      // OBS: navigering sker i Portal.handleSignOut — ta inte navigate("/login") här
    } catch (err) {
      console.error("Sign out failed", err);
    }
  };

  return (
    <header className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <User className="h-5 w-5" />
        <span>{customer?.name ?? "Användare"}</span>
      </div>
      {showSignOut && (
        <button
          onClick={effectiveSignOut}
          className="inline-flex items-center gap-2 px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
          aria-label="Logga ut"
        >
          <LogOut className="h-4 w-4" />
          Logga ut
        </button>
      )}
    </header>
  );
 };


const Portal = () => {
  const { user, customer, loading, signOut: authSignOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      if (authSignOut) await authSignOut();
      else await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out failed", err);
    } finally {
      // Navigera till en existerande route - ändra till "/login" om du har en sådan route,
      // annars gå till startsidan "/"
      navigate("/", { replace: true });
    }
  };

  if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-500">Laddar...</p>
                </div>
            </div>
        );
    }

  if (!customer) return <AuthLayout />;

  // Render header centrally only for portals
  return (
    <div className="min-h-screen bg-gray-50">
      <Header customer={customer} signOut={handleSignOut} showSignOut={true} />

      {customer.is_admin ? (
        <AdminPortal customer={customer} /* no signOut prop needed */ />
      ) : (
        <CustomerPortal customer={customer} />
      )}
    </div>
  );
};

export default Portal;