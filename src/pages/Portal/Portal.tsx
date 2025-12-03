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
import { Phone, Mail, User, LogOut, FileText } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PortalStats } from '@/pages/Portal/PortalStats';
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Importera dina nya vyer och dialoger
import CasesView from "./views/CasesView";
import CustomersDialog from "./dialogs/CustomersDialog"; // Din dialog

// Importera dina typer
//import type { CustomerCase, Customer, Comment } from '@/types';
// OBS! Dessa används ej i den städade versionen av Portal.tsx, men behåll dem om de används någon annanstans.
// const statusColors: Record<string, string> = { ... };
// const statusLabels: Record<string, string> = { ... };



interface HeaderProps {
  customer: Customer | null;
  signOut: () => Promise<void> | void;
  showSignOut?: boolean;
}

const Header: React.FC<HeaderProps> = ({ customer, signOut, showSignOut = true }) => {
  const auth = useAuth();

  const effectiveSignOut = async () => {
    try {
      if (signOut) await signOut();
      else if (auth?.signOut) await auth.signOut();
      else await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out failed", err);
    }
  };

  return (
    <header className="w-full bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 text-trust-blue" />
          <div>
            <div className="text-sm text-gray-500">Inloggad som</div>
            <div className="font-semibold text-base">{customer?.name ?? "Användare"}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
        </div>
    
      </div>
    </header>
  );
 };


const Portal = () => {
  const { user, customer, loading, signOut: authSignOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templatesOpen, setTemplatesOpen] = useState(false);

  // Static list of downloadable fullmaktsmallar (put actual storage paths)
  const fullmaktTemplates: { id: string; name: string; storage_path: string }[] = [
    { id: "1", name: "Fullmakt - Enkel mall (PDF)", storage_path: "templates/fullmakt_enkel.pdf" },
    { id: "2", name: "Fullmakt - Omfattande mall (PDF)", storage_path: "templates/fullmakt_omfattande.pdf" },
    { id: "3", name: "Fullmakt - Fullmakt + Villkor (DOCX)", storage_path: "templates/fullmakt_med_villkor.docx" },
  ];

  const handleDownloadTemplate = async (path: string) => {
    try {
      const { data, error } = await supabase.storage.from("fullmakts-filer").createSignedUrl(path, 60);
      if (error) throw error;
      const url = (data as any)?.signedUrl ?? (data as any)?.signed_url;
      if (!url) throw new Error("Kunde inte generera länk");
      window.open(url, "_blank");
    } catch (err) {
      console.error("Template download failed:", err);
      toast({ title: "Fel", description: "Kunde inte hämta mallen.", variant: "destructive" });
    }
  };

  // Templates dialog is now rendered inside CustomerPortal (under valuation overview).

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
        <AdminPortal
          customer={customer}
          // pass templates to admin if you want admin to also show them under valuations
          fullmaktTemplates={fullmaktTemplates}
          handleDownloadTemplate={handleDownloadTemplate}
        />
      ) : (
        <CustomerPortal
          customer={customer}
          fullmaktTemplates={fullmaktTemplates}
          handleDownloadTemplate={handleDownloadTemplate}
        />
      )}
    </div>
  );
};
 
 export default Portal;