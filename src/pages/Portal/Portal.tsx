// src/Portal.tsx 

import { useAuth } from '@/hooks/useAuth'
import AuthLayout from './AuthLayout' // visa inloggningsrutan
import type { Customer } from '@/types';
// Importen av Auth används sällan direkt; AuthLayout hanterar det oftast
//import Auth from './Auth' 
import CustomerPortal from './CustomerPortal'
import AdminPortal from './AdminPortal'
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PortalStats } from '@/components/PortalStats';
// Ta bort oanvända komponenter/typer
import { Card, CardContent } from "@/components/ui/card";

// OBS! Dessa används ej i den städade versionen av Portal.tsx, men behåll dem om de används någon annanstans.
// const statusColors: Record<string, string> = { ... };
// const statusLabels: Record<string, string> = { ... };


const Portal = () => {

    const { user, customer, loading } = useAuth();

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

   if (!customer) {
        return <AuthLayout />; 
    }
    // 3. Villkorlig rendering baserat på administratörsstatus
    if (customer.is_admin) { // Använd is_admin
    return <AdminPortal customer={customer} />;
}

    return <CustomerPortal customer={customer} />;
};

export default Portal;