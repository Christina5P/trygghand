import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RotateCcw, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { GDPRDeleteUserDialog } from "@/components/GDPRDeleteUserDialog";
import type { Customer } from "@/types";

interface ArchivedCustomer {
  id: string;
  email: string;
  name: string;
  phone?: string;
  archived_at: string;
  archived_by?: string;
  archived_reason?: string;
}

interface ArchivedCustomersListProps {
  onDataUpdated: () => Promise<void>;
  onOpenCustomer?: (customer: Customer) => void;
}

export default function ArchivedCustomersList({ onDataUpdated, onOpenCustomer }: ArchivedCustomersListProps) {
  const [archivedCustomers, setArchivedCustomers] = useState<ArchivedCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchArchivedCustomers();
  }, []);

  const fetchArchivedCustomers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("archived_customers")
        .select("*")
        .order("archived_at", { ascending: false });

      if (error) throw error;
      setArchivedCustomers(data || []);
    } catch (err: any) {
      console.error("Fel vid hämtning av arkiverade kunder:", err);
      toast({
        title: "Fel",
        description: "Kunde inte hämta arkiverade kunder.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const restoreCustomer = async (customerId: string, customerName: string) => {
    setActionLoadingId(customerId);
    try {
      // 1. Hämta den arkiverade kundens originaldata
      const { data: archivedData, error: fetchError } = await supabase
        .from("archived_customers")
        .select("*")
        .eq("id", customerId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Återställ kunden med säker RPC-funktion
      await supabase.rpc('admin_restore_customer', {
        p_customer_id: customerId
      });

      // VIKTIGT: uppdatera UI
      await fetchArchivedCustomers();
      await onDataUpdated();

      // ev. navigera - hanteras av parent component
    } catch (err: any) {
      console.error("Fel vid återställning:", err);
      toast({
        title: "Fel",
        description: err.message || "Kunde inte återställa kunden.",
        variant: "destructive",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  const deleteArchivedCustomer = (customer: ArchivedCustomer) => {
    setSelectedCustomer(customer as Customer);
    setDeleteDialog(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {archivedCustomers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">Inga arkiverade kunder.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {archivedCustomers.map((customer) => (
            <Card key={customer.id} className="bg-gray-50 border-gray-300">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{customer.name}</p>
                    <p className="text-sm text-gray-500 truncate">{customer.email}</p>
                    {customer.phone && <p className="text-sm text-gray-500">{customer.phone}</p>}
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-400">
                        Arkiverad: {format(new Date(customer.archived_at), "dd MMM yyyy HH:mm", { locale: sv })}
                      </p>
                      {customer.archived_reason && (
                        <p className="text-xs text-gray-500 italic">{customer.archived_reason}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Badge variant="secondary" className="bg-gray-300 text-gray-800 whitespace-nowrap">
                      Arkiverad
                    </Badge>
                    {onOpenCustomer && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenCustomer(customer as Customer)}
                        className="text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Redigera
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => restoreCustomer(customer.id, customer.name)}
                      disabled={actionLoadingId === customer.id}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      {actionLoadingId === customer.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Återställ
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteArchivedCustomer(customer)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Radera (GDPR)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedCustomer && (
        <GDPRDeleteUserDialog
          open={deleteDialog}
          onOpenChange={setDeleteDialog}
          customer={selectedCustomer}
          onDeleteSuccess={async () => {
            await fetchArchivedCustomers();
            await onDataUpdated();
          }}
        />
      )}
    </div>
  );
}
