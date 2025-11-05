import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Case, Customer } from "./AdminPortal";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface CustomerDialogProps {
  customer: Customer;
  onClose: () => void;
}

const CustomerDialog: React.FC<CustomerDialogProps> = ({ customer, onClose }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("cases")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCases(data || []);
    } catch (err) {
      console.error("fetchCases error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [customer]);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customer.name}</DialogTitle>
          <DialogDescription>
            E-post: {customer.email} <br />
            Telefon: {customer.phone ?? "Ej angiven"} <br />
            Skapad: {customer.created_at ? new Date(customer.created_at).toLocaleString("sv-SE") : "-"}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Ärenden</h3>
          {loading ? (
            <div className="text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </div>
          ) : cases.length === 0 ? (
            <p>Inga ärenden för denna kund.</p>
          ) : (
            <div className="space-y-2">
              {cases.map((c) => (
                <Card key={c.id} className="cursor-pointer">
                  <CardContent className="p-3">
                    <p className="font-medium">{c.title}</p>
                    <p className="text-sm text-gray-500">{c.description}</p>
                    <p className="text-xs text-gray-400">
                      Status: {c.status} | Prioritet: {c.priority ?? "-"}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>Stäng</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDialog;
