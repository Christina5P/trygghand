

import React from "react";
import { usePortalStats } from "@/hooks/usePortalStats";
import { useAuth } from "@/hooks/useAuth";
import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

export const PortalStats: React.FC = () => {
    const { customer } = useAuth();
    const { caseProgress, subscriptionProgress, loadingStats } = usePortalStats();

    if (loadingStats) {
        return (
            <div className="flex justify-center mb-8">
                <p className="text-gray-500">Laddar statistik...</p>
            </div>
        );
    }
    
    // Antar att denna komponent endast används om kunden inte är admin
    return (
        <div className="max-w-3xl mx-auto py-8">
            {/* Välkomsttext */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-trust-blue">Kundportal</h1>
                <p className="text-lg text-gray-600 font-medium">
                    Välkommen {customer?.name ?? "Användare"}
                </p>
            </div>
            
            {/* Ringar/diagram */}
            <div className="flex gap-8 justify-center mb-8 p-4 bg-white rounded-lg shadow-md">
                
                {/* Ärenden klara */}
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
                    <span className="mt-2 text-sm text-gray-500">Ärenden klara</span>
                </div>
                
                {/* Uppsägningar klara */}
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
                    <span className="mt-2 text-sm text-gray-500">Uppsägningar klara</span>
                </div>
            </div>
        </div>
    );
};