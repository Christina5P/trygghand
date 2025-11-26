// src/components/customer/CustomerPortal.tsx (Den nya, renare versionen)

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import Tidio from "@/components/Tidio";
import { useCustomerData } from "@/hooks/useCustomerData"; 
import type { Customer } from '@/types';
import { ValuationManager } from "../../components/ValuationManager"; 
import ValueEstimator from "@/components/ValueEstimator";   
import { Card, CardContent } from "@/components/ui/card";
import { PortalStats } from '@/components/PortalStats';


interface CustomerPortalProps {
    // Definiera att CustomerPortal tar emot 'customer'-objektet
    customer: Customer; 
}
    
const CustomerPortal: React.FC<CustomerPortalProps> = ({ customer }) => {
    const { signOut } = useAuth();
    const { loading } = useCustomerData(); // Hämta endast loading state här

    const handleSignOut = async () => {
        try { await signOut(); } catch (err) { console.error(err); }
        finally { window.location.href = "/"; }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Laddar dina data...</p>
            </div>
        </div>
    );

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                
                {/* Header */}
                <header className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold text-blue-600">Välkommen {customer?.name}</h2>
                    <Button onClick={handleSignOut} variant="outline" size="sm">
                        <LogOut className="w-4 h-4 mr-2" /> Logga ut
                    </Button>
                </header>


                {/* Tidio-widget */}
                <div className="fixed bottom-4 right-4 z-50 pointer-events-auto"><Tidio/></div>
            </div>
        </div>
    );
};

export default CustomerPortal;