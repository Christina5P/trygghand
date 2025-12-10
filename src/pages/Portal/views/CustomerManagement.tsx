import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, XCircle, Loader2, Archive } from "lucide-react";
import type { Customer } from "@/types";

interface CustomerManagementProps {
  customers: Customer[];
  onDataUpdated: () => Promise<void>;
}

/**
 * CustomerManagement: Administratörsverktyg för att aktivera/deaktivera kundstatus
 * Vid deaktivering arkiveras kunden automatiskt i archived_customers-tabellen
 */
export default function CustomerManagement({ customers, onDataUpdated }: CustomerManagementProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const toggleCustomerStatus = async (customer: Customer, currentStatus: boolean) => {
    setLoadingId(customer.id);

    try {
      // Om vi deaktiverar en kund (currentStatus = true, ska bli false)
      if (currentStatus) {
        // 1. Arkivera kunden
        const { error: archiveError } = await supabase
          .from("archived_customers")
          .insert({
            id: customer.id,
            email: customer.email,
            name: customer.name,
            phone: customer.phone,
            address: customer.address || null,
            is_admin: customer.is_admin || false,
            archived_by: user?.id,
            archived_reason: "Deaktiverad av admin",
            original_created_at: customer.created_at,
            original_data: customer, // Lagra komplett original-data
          });

        if (archiveError) throw archiveError;
      }

      // 2. Uppdatera is_customer-status
      const { error: updateError } = await supabase
        .from("customers")
        .update({ is_customer: !currentStatus })
        .eq("id", customer.id);

      if (updateError) throw updateError;

      toast({
        title: currentStatus ? "Kund deaktiverad och arkiverad" : "Kund aktiverad",
        description: currentStatus
          ? `${customer.name} har deaktiverats och arkiverats.`
          : `${customer.name} är nu aktiv igen.`,
      });

      await onDataUpdated();
    } catch (err: any) {
      console.error("Fel vid uppdatering:", err);
      toast({
        title: "Fel",
        description: err.message || "Kunde inte uppdatera kundstatus.",
        variant: "destructive",
      });
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {customers.map((customer) => (
          <Card key={customer.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{customer.name}</p>
                  <p className="text-sm text-gray-500 truncate">{customer.email}</p>
                  {customer.phone && <p className="text-sm text-gray-500">{customer.phone}</p>}
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    variant={customer.is_customer ? "default" : "secondary"}
                    className={
                      customer.is_customer
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-200 text-gray-800"
                    }
                  >
                    {customer.is_customer ? (
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                    ) : (
                      <XCircle className="mr-1 h-3 w-3" />
                    )}
                    {customer.is_customer ? "Aktiv Kund" : "Inaktiv"}
                  </Badge>

                  <Button
                    size="sm"
                    variant={customer.is_customer ? "outline" : "default"}
                    onClick={() => toggleCustomerStatus(customer, customer.is_customer ?? false)}
                    disabled={loadingId === customer.id}
                  >
                    {loadingId === customer.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : customer.is_customer ? (
                      <>
                        <Archive className="h-4 w-4 mr-2" />
                        Deaktivera & Arkivera
                      </>
                    ) : (
                      "Aktivera"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {customers.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">Inga kunder ännu.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
