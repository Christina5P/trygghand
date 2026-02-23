import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2, Loader2, Archive, Edit } from "lucide-react";
import { GDPRDeleteUserDialog } from "@/pages/Portal/dialogs/GDPRDeleteUserDialog";
import type { Customer } from "@/types";

interface CustomerManagementProps {
  customers: Customer[];
  onDataUpdated: () => Promise<void>;
  onOpenCustomer?: (customer: Customer) => void;
}

/**
 * CustomerManagement: Administratörsverktyg för att aktivera/deaktivera kundstatus
 * Vid deaktivering arkiveras kunden automatiskt i archived_customers-tabellen
 */
export default function CustomerManagement({ customers, onDataUpdated, onOpenCustomer }: CustomerManagementProps) {
  console.log("Customers in CustomerManagement:", customers); // TEMP LOG
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    // Kontrollera admin-status vid mount
    const checkAdmin = async () => {
      if (!user?.id) return setIsAdmin(false);
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin"); // Ta bort .single() och använd korrekt filter
      setIsAdmin(Array.isArray(data) && data.length > 0 && !error);
    };
    checkAdmin();
  }, [user]);

  const toggleCustomerStatus = async (customer: Customer, currentStatus: boolean) => {
    if (!isAdmin) {
      toast({
        title: "Behörighetsfel",
        description: "Du saknar admin-behörighet för att arkivera/deaktivera kunder.",
        variant: "destructive",
      });
      return;
    }
    setLoadingId(customer.id);

    try {
      // Deaktivera kunden (alltid false eftersom vi endast visar aktiva har)
      if (currentStatus) {
        // 1) Soft-delete via Edge Function (bevarar kundrad for GDPR-export)
        const { error } = await supabase.functions.invoke("admin-soft-delete-customer", {
          body: {
            customer_id: customer.id,
            confirm: true,
            reason: "Deaktiverad av admin",
          },
        });

        if (error) throw error;

        // 2) Spara arkiv-snapshot for arkivlistan
        const { error: archiveError } = await supabase
          .from("archived_customers")
          .upsert(
            {
              id: customer.id,
              email: customer.email || "",
              name: customer.name,
              phone: customer.phone,
              is_admin: customer.is_admin || false,
              archived_by: user?.id,
              archived_reason: "Deaktiverad av admin",
              original_created_at: customer.created_at,
              original_data: customer, // Lagra komplett original-data
            },
            {
              onConflict: "id", // Om id redan finns, uppdatera istallet
            }
          );

        if (archiveError) throw archiveError;
      }

      toast({
        title: "Kund deaktiverad och arkiverad",
        description: `${customer.name} har deaktiverats och arkiverats.`,
      });

      await onDataUpdated();
   } catch (err: any) {
      // Fånga och logga Supabase-felobjektet mer detaljerat
      console.error("Detaljerat fel vid uppdatering:", err); 
      toast({
        title: "Databasfel", // Ändrad titel
        // Använd err.message för RLS-fel eller ett fallback-meddelande
        description: err.message || "Kunde inte uppdatera kundstatus. Kontrollera behörigheter (RLS).", 
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
          <Card key={customer.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onOpenCustomer?.(customer)}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Badge
                  variant="default"
                  className="bg-green-100 text-green-800"
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Aktiv
                </Badge>

                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCustomerStatus(customer, true);
                  }}
                  disabled={loadingId === customer.id}
                >
                  {loadingId === customer.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Archive className="h-4 w-4 mr-2" />
                      Arkivera
                    </>
                  )}
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCustomer(customer);
                    setDeleteDialog(true);
                  }}
                >
                  Radera (GDPR)
                </Button>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{customer.name}</p>
                <p className="text-sm text-gray-500 truncate">{customer.email}</p>
                {customer.phone && <p className="text-sm text-gray-500">{customer.phone}</p>}
              </div>
            </CardContent>
          </Card>
        ))}

        {customers.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-500">Inga aktiva kunder ännu.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedCustomer && (
        <GDPRDeleteUserDialog
          open={deleteDialog}
          onOpenChange={setDeleteDialog}
          customer={selectedCustomer}
          onDeleteSuccess={() => onDataUpdated()}
        />
      )}
    </div>
  );
};
