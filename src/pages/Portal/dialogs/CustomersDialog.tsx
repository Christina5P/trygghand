// src/pages/Portal/views/CustomersDialog.tsx
import React, { useEffect, useState } from "react";
import type { Customer, CustomerCase } from "@/types";
import { supabase } from "@/lib/supabase";

interface CustomersDialogProps {
  customer: Customer;
  onClose: () => void;
  onCustomerUpdated: () => Promise<void>;
  onNewCase: (customerId: string) => void;
  onOpenCase?: (c: CustomerCase) => void;
}

const CustomersDialog: React.FC<CustomersDialogProps> = ({ customer, onClose, onCustomerUpdated, onNewCase, onOpenCase }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [originalCustomer, setOriginalCustomer] = useState<Customer>(customer);
  const [editedCustomer, setEditedCustomer] = useState<Customer>(customer);
  const [showComparison, setShowComparison] = useState(false);

  const [customerCases, setCustomerCases] = useState<CustomerCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);

  useEffect(() => {
    setOriginalCustomer(customer);
    setEditedCustomer(customer);

    const loadCases = async () => {
      if (!customer?.id) {
        setCustomerCases([]);
        return;
      }
      setLoadingCases(true);
      try {
        const { data, error } = await supabase
          .from("cases")
          .select("*, service_type:service_type_id(*)")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setCustomerCases(data || []);
      } catch (err) {
        console.error("loadCases error", err);
        setCustomerCases([]);
      } finally {
        setLoadingCases(false);
      }
    };

    loadCases();
  }, [customer]);

  const handleSave = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .update({
          name: editedCustomer.name,
          email: editedCustomer.email,
          phone: editedCustomer.phone,
          personal_number: editedCustomer.personal_number,
        })
        .eq("id", customer.id)
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Ingen kund uppdaterades.");

      setOriginalCustomer(data);
      setEditedCustomer(data);
      setShowComparison(true);
      await onCustomerUpdated();
    } catch (err) {
      console.error("handleSave error", err);
      // optionally toast here
    } finally {
      setIsEditing(false);
    }
  };

  const handleCreateNewCase = () => {
    onNewCase(customer.id);
    onClose();
  };

  const updateField = (key: keyof Customer, value: any) => {
    setEditedCustomer((p) => ({ ...p, [key]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md overflow-auto max-h-[90vh]">
        <h2 className="text-xl font-bold">Kundinformation: {originalCustomer.name}</h2>

        {!isEditing && !showComparison && (
          <>
            <p className="mt-4">Email: {originalCustomer.email}</p>
            {originalCustomer.personal_number && <p>Personnummer: {originalCustomer.personal_number}</p>}

            <div className="mt-4">
              <h4 className="font-medium">Ärenden</h4>
              {loadingCases ? (
                <p className="text-sm text-gray-500">Laddar ärenden...</p>
              ) : customerCases.length === 0 ? (
                <p className="text-sm text-gray-500">Inga ärenden</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {customerCases.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        if (typeof onOpenCase === "function") onOpenCase(c);
                      }}
                      className="w-full text-left p-2 rounded border hover:shadow-sm"
                      aria-label={c.description ?? ""}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{c.title}</div>
                          <div className="text-xs text-gray-500">{c.service_type?.name ?? ""}</div>
                        </div>
                        <div className="text-xs text-gray-500">{c.status}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {isEditing && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <h4 className="text-sm font-medium text-gray-600">Föregående</h4>
              <p className="text-sm mt-2">{originalCustomer.name}</p>
              <p className="text-xs text-gray-500">{originalCustomer.email}</p>
              <p className="text-xs text-gray-500">{originalCustomer.phone ?? "-"}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-600">Redigera</h4>
              <input placeholder="Namn" className="w-full mt-2 p-2 border rounded" value={editedCustomer.name ?? ""} onChange={(e) => updateField("name", e.target.value)} />
              <input placeholder="Email" className="w-full mt-2 p-2 border rounded" value={editedCustomer.email ?? ""} onChange={(e) => updateField("email", e.target.value)} />
              <input placeholder="Telefon" className="w-full mt-2 p-2 border rounded" value={editedCustomer.phone ?? ""} onChange={(e) => updateField("phone", e.target.value)} />
              <input placeholder="Personnummer" className="w-full mt-2 p-2 border rounded" value={editedCustomer.personal_number ?? ""} onChange={(e) => updateField("personal_number", e.target.value)} />
            </div>
          </div>
        )}

        {showComparison && (
          <div className="mt-4 grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded">
            <div>
              <h4 className="text-sm font-medium text-gray-600">Föregående</h4>
              <p className="mt-2">{originalCustomer.name}</p>
              <p className="text-xs text-gray-500">{originalCustomer.email}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600">Uppdaterad</h4>
              <p className="mt-2">{editedCustomer.name}</p>
              <p className="text-xs text-gray-500">{editedCustomer.email}</p>
            </div>

            <div className="col-span-2 flex gap-2 mt-3">
              <button onClick={() => setShowComparison(false)} className="px-3 py-1 bg-green-500 text-white rounded text-sm">Ok</button>
            </div>
          </div>
        )}

        <div className="flex justify-between space-x-2 mt-6">
          <button onClick={handleCreateNewCase} className="px-3 py-1 bg-green-500 text-white rounded text-sm">Nytt Ärende</button>

          <div>
            <button onClick={onClose} className="px-4 py-2 text-gray-700 border rounded mr-2">Stäng</button>
            <button onClick={() => { if (isEditing) handleSave(); else setIsEditing(true); }} className="px-4 py-2 bg-blue-600 text-white rounded">
              {isEditing ? "Spara Ändringar" : "Redigera Kund"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomersDialog;
