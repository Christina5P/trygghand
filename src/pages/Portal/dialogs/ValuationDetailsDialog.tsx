import React from 'react';
import type { Valuation, Customer } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Package, Calendar, Clock, DollarSign, User } from 'lucide-react';

interface ValuationDetailsDialogProps {
    valuation: Valuation;
    customers: Customer[];
    onClose: () => void;
}

const ValuationDetailsDialog: React.FC<ValuationDetailsDialogProps> = ({ valuation, customers, onClose }) => {
    
    // Hjälpfunktion för att hitta kundnamn (kopierad från ValuationsView för konsistens)
    const getCustomerName = (customerId: string | null): string => {
        if (!customerId) return "Gästvärdering (ej kopplad till kund)";
        const customer = customers.find(c => c.id === customerId);
        return customer ? customer.name : `Okänd Kund (ID: ${customerId.substring(0, 8)}...)`;
    };

    const customerName = getCustomerName(valuation.customer_id);
    const createdAt = valuation.created_at ? new Date(valuation.created_at) : null;

    const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value: string | React.ReactNode }> = ({ icon, label, value }) => (
        <div className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg shadow-inner">
            <div className="pt-1 text-blue-600 flex-shrink-0">{icon}</div>
            <div>
                <p className="text-sm font-medium text-gray-700">{label}</p>
                <p className="text-base font-semibold text-gray-900 break-words">{value}</p>
            </div>
        </div>
    );

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b pb-3">
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Package className="w-6 h-6" />
                        Värderingsrapport
                    </DialogTitle>
                    <DialogDescription className="text-gray-500">
                        Detaljerad AI-analys av föremålet. ID: {valuation.id}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {/* Översiktssektion */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <DetailItem 
                            icon={<User className="w-5 h-5" />} 
                            label="Kund" 
                            value={customerName}
                        />
                        <DetailItem 
                            icon={<Calendar className="w-5 h-5" />} 
                            label="Datum" 
                            value={createdAt ? format(createdAt, 'yyyy-MM-dd', { locale: sv }) : 'N/A'}
                        />
                         <DetailItem 
                            icon={<Clock className="w-5 h-5" />} 
                            label="Tidpunkt" 
                            value={createdAt ? format(createdAt, 'HH:mm:ss', { locale: sv }) : 'N/A'}
                        />
                    </div>

                    {/* Värderingssektionen */}
                    <div className="space-y-4 p-4 border rounded-lg bg-white shadow-md">
                        <h3 className="text-xl font-semibold border-b pb-2 text-green-700">Värde & Skick</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <DetailItem 
                                icon={<DollarSign className="w-5 h-5 text-green-600" />} 
                                label="Uppskattat Värde" 
                                value={
                                    <span className="text-3xl font-extrabold text-green-700">
                                        {valuation.varde_min_sek} - {valuation.varde_max_sek} SEK
                                    </span>
                                }
                            />
                            <DetailItem 
                                icon={<Package className="w-5 h-5" />} 
                                label="Skick" 
                                value={<Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{valuation.skick || 'Ej angivet'}</Badge>}
                            />
                        </div>

                        <div className="mt-6">
                            <h4 className="text-lg font-medium text-gray-800 mb-2">Motivering</h4>
                            <div className="bg-gray-100 p-4 rounded-lg text-gray-700 whitespace-pre-wrap">
                                {valuation.motivering || "AI:n returnerade ingen motivering för denna värdering."}
                            </div>
                        </div>
                    </div>
                    
                    {/* Föremålsbeskrivning */}
                    <div className="p-4 border rounded-lg bg-white shadow-md">
                        <h3 className="text-xl font-semibold border-b pb-2 text-blue-700">Föremålsbeskrivning</h3>
                        <p className="mt-2 text-gray-700 whitespace-pre-wrap">
                            {valuation.foremal_beskrivning || "AI:n kunde inte generera en beskrivning av föremålet baserat på bilderna."}
                        </p>
                    </div>

                    {/* Rådata (För Admin) */}
                    <div className="p-4 border rounded-lg bg-white shadow-md">
                        <h3 className="text-xl font-semibold border-b pb-2 text-red-700">Rådata (Debugg)</h3>
                        <pre className="mt-2 p-3 bg-red-50 rounded-lg text-xs overflow-x-auto text-red-900">
                            {JSON.stringify(valuation, null, 2)}
                        </pre>
                    </div>
                </div>

            </DialogContent>
        </Dialog>
    );
};

export default ValuationDetailsDialog;