import React, { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
// Antag att du använder Shadcn Dialog-komponenter och andra beroenden
// Importera alla nödvändiga hooks och komponenter här...

// Exempel på nödvändiga interfaces, dessa måste vara definierade eller importerade
interface ServiceType { id: string; name: string; }
interface Case {
  id: string;
  title: string;
  description?: string | null;        // <-- tillåter null
  status: string;
  priority?: string | null;           // <-- tillåter null
  customer_id?: string | null;
  service_type?: ServiceType | null;
  scheduled_date?: string | null;     // <-- tillåter null
  address?: string | null;            // <-- tillåter null
  total_price?: number | null;
  created_at?: string | null;
  [key: string]: any;
}

// *** HUVUD-FIX: Lägg till onCaseUpdated här ***
interface EditCaseDialogProps {
  caseId: string;
  onClose: () => void;
  onCaseUpdated: () => Promise<void>; // Lade till den saknade prop:en
}

// Antag att denna funktion är din huvudkomponent
const EditCaseDialog: React.FC<EditCaseDialogProps> = ({ caseId, onClose, onCaseUpdated }) => {
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [originalCase, setOriginalCase] = useState<Case | null>(null);
  const [editedCase, setEditedCase] = useState<Case | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    const fetchCase = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("cases")
          .select("*")
          .eq("id", caseId)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setCaseData(data as Case);
          setOriginalCase(data as Case);
          setEditedCase(data as Case);
        } else {
          setCaseData(null);
          setOriginalCase(null);
          setEditedCase(null);
        }
      } catch (err: any) {
        console.error("Fetch case error:", err);
        toast({ title: "Fel", description: String(err?.message ?? err) });
      } finally {
        setIsLoading(false);
      }
    };
    fetchCase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const updateField = (key: keyof Case, value: any) => {
    setEditedCase((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!editedCase) return;
    setIsSaving(true);
    try {
      const payload: Partial<Case> = {
        title: editedCase.title,
        description: editedCase.description ?? null,
        status: editedCase.status,
        priority: editedCase.priority ?? null,
        scheduled_date: editedCase.scheduled_date ?? null,
        address: editedCase.address ?? null,
        total_price: editedCase.total_price ?? null,
        // lägg till fler fält vid behov
      };

      const { data, error } = await supabase
        .from("cases")
        .update(payload)
        .eq("id", caseId)
        .select()
        .maybeSingle();

      if (error) throw error;

      // uppdatera lokalt state och visa comparison
      setCaseData(data as Case);
      setShowComparison(true);
      // behåll originalCase som snapshot för jämförelse
      await onCaseUpdated();
      toast({ title: "Sparat", description: "Ärendet uppdaterades." });
      setIsEditing(false);
    } catch (err: any) {
      console.error("Save case error:", err);
      toast({ title: "Fel", description: String(err?.message ?? err) });
    } finally {
      setIsSaving(false);
    }
  };

  const acceptChanges = () => {
    if (editedCase) {
      setOriginalCase(editedCase);
      setShowComparison(false);
    }
  };

  const discardChanges = () => {
    setEditedCase(originalCase);
    setShowComparison(false);
  };

  if (isLoading) return <div className="p-6"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!caseData) return <div className="p-6">Ärendet hittades inte.</div>;

  return (
    // Här skulle din Shadcn Dialog-komponent ligga
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-2xl">
        <h2 className="text-xl font-bold">Redigera Ärende</h2>

        {!isEditing && !showComparison && (
          <div className="mt-4 space-y-2">
            <div className="text-sm font-medium">{caseData.title}</div>
            <div className="text-xs text-gray-500">{caseData.description}</div>
            <div className="text-xs text-gray-400">
              Status: {caseData.status} | Prioritet: {caseData.priority ?? "-"}
            </div>
            {caseData.scheduled_date && <div className="text-xs text-gray-400">Planerat: {new Date(caseData.scheduled_date).toLocaleString()}</div>}
            {caseData.address && <div className="text-xs text-gray-400">Adress: {caseData.address}</div>}
          </div>
        )}

        {isEditing && editedCase && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-600">Föregående</h4>
              <p className="text-sm mt-2">{originalCase?.title}</p>
              <p className="text-xs text-gray-500">{originalCase?.description}</p>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-600">Redigera</h4>
              <input
                className="w-full mt-2 p-2 border rounded"
                value={editedCase.title ?? ""}
                onChange={(e) => updateField("title", e.target.value)}
              />
              <textarea
                className="w-full mt-2 p-2 border rounded"
                value={editedCase.description ?? ""}    // <-- hantera null här
                onChange={(e) => updateField("description", e.target.value)}
              />
              <input
                className="w-full mt-2 p-2 border rounded"
                value={editedCase.priority ?? ""}       // <-- hantera null här
                onChange={(e) => updateField("priority", e.target.value)}
                placeholder="Prioritet"
              />
              <input
                className="w-full mt-2 p-2 border rounded"
                value={editedCase.scheduled_date ?? ""}
                onChange={(e) => updateField("scheduled_date", e.target.value)}
                placeholder="YYYY-MM-DD eller datum"
              />
              <input
                className="w-full mt-2 p-2 border rounded"
                value={editedCase.address ?? ""}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Adress"
              />
              <input
                className="w-full mt-2 p-2 border rounded"
                type="number"
                value={editedCase.total_price ?? ""}
                onChange={(e) => updateField("total_price", Number(e.target.value))}
                placeholder="Totalpris"
              />
            </div>
          </div>
        )}

        {showComparison && originalCase && editedCase && (
          <div className="mt-4 grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded">
            <div>
              <h4 className="text-sm font-medium text-gray-600">Föregående</h4>
              <p className="mt-2">{originalCase.title}</p>
              <p className="text-xs text-gray-500">{originalCase.description}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600">Uppdaterad</h4>
              <p className="mt-2">{editedCase.title}</p>
              <p className="text-xs text-gray-500">{editedCase.description}</p>
            </div>
            <div className="col-span-2 flex gap-2 mt-3">
              <button onClick={acceptChanges} className="px-3 py-1 bg-green-500 text-white rounded text-sm">Acceptera</button>
              <button onClick={discardChanges} className="px-3 py-1 bg-gray-200 text-gray-800 rounded text-sm">Ångra</button>
            </div>
          </div>
        )}

        <div className="flex justify-between space-x-2 mt-6">
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (isEditing) {
                  // cancel editing and revert editedCase to original
                  setEditedCase(originalCase);
                  setIsEditing(false);
                } else {
                  setIsEditing(true);
                }
              }}
              className="px-3 py-2 border rounded text-sm"
            >
              {isEditing ? "Avbryt" : "Redigera"}
            </button>
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
              >
                {isSaving ? "Sparar..." : "Spara ändringar"}
              </button>
            )}
          </div>

          <div>
            <button onClick={onClose} className="px-4 py-2 text-gray-700 border rounded">Stäng</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditCaseDialog;