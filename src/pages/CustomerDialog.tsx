import React, { useState, useEffect } from 'react';
// Importera nödvändiga hooks och komponenter
// ...

// Exempel på nödvändiga interfaces, dessa måste vara definierade eller importerade
interface Customer {
  id: string; name: string; email: string; phone?: string; is_admin?: boolean; created_at?: string; personal_number?: string;
}

// *** HUVUD-FIX: Lägg till onCustomerUpdated och onNewCase här ***
interface CustomerDialogProps {
  customer: Customer;
  onClose: () => void;
  onCustomerUpdated: () => Promise<void>; // Lade till den saknade prop:en
  onNewCase: (customerId: string) => void; // Lade till den saknade prop:en
}

// Antag att denna funktion är din huvudkomponent
const CustomerDialog: React.FC<CustomerDialogProps> = ({ customer, onClose, onCustomerUpdated, onNewCase }) => {
  const [isEditing, setIsEditing] = useState(false);

  // snapshot of original data (kept so we can show "före" after save)
  const [originalCustomer, setOriginalCustomer] = useState<Customer>(customer);
  // working copy for edits
  const [editedCustomer, setEditedCustomer] = useState<Customer>(customer);
  // after saving we can show a before/after comparison
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    // update local copies if prop changes
    setOriginalCustomer(customer);
    setEditedCustomer(customer);
  }, [customer]);

  const handleSave = async () => {
    // ... logik för att spara kunddata
    // Här ska du anropa ditt API / save-funktion. För nu sparar vi lokalt och visar comparison.
    const previous = originalCustomer;
    try {
      // TODO: kalla API för att spara editedCustomer och invänta resultat.
      // Exempel: await updateCustomer(editedCustomer);
      // När API-spara lyckas, visas jämförelse och parent uppdateras.
      setShowComparison(true);
      // leave originalCustomer as snapshot of previous
      // setUpdated will be shown from editedCustomer
      await onCustomerUpdated();
    } catch (err) {
      console.error("Kunde inte spara kund:", err);
      // Hantera fel (toast etc.)
    } finally {
      setIsEditing(false);
    }
  };

  const handleCreateNewCase = () => {
    onNewCase(customer.id); // Skicka kundens ID för att skapa nytt ärende
    onClose();
  }

  const acceptChanges = () => {
    // Accept: make edited the new original and hide comparison
    setOriginalCustomer(editedCustomer);
    setShowComparison(false);
  };

  const discardChanges = () => {
    // Revert edited to original snapshot
    setEditedCustomer(originalCustomer);
    setShowComparison(false);
  };

  const updateField = (key: keyof Customer, value: any) => {
    setEditedCustomer((prev) => ({ ...prev, [key]: value }));
  };

  return (
    // Här skulle din Shadcn Dialog-komponent ligga
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-bold">Kundinformation: {originalCustomer.name}</h2>
        
        {!isEditing && !showComparison && (
          <>
            <p className="mt-4">Email: {originalCustomer.email}</p>
            {originalCustomer.personal_number && <p>Personnummer: {originalCustomer.personal_number}</p>}
          </>
        )}

        {isEditing && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Visar original till vänster, editable fält till höger */}
            <div>
              <h4 className="text-sm font-medium text-gray-600">Föregående</h4>
              <p className="text-sm mt-2">{originalCustomer.name}</p>
              <p className="text-xs text-gray-500">{originalCustomer.email}</p>
              <p className="text-xs text-gray-500">{originalCustomer.phone ?? "-"}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-600">Redigera</h4>
              <input className="w-full mt-2 p-2 border rounded" value={editedCustomer.name} onChange={(e) => updateField("name", e.target.value)} />
              <input className="w-full mt-2 p-2 border rounded" value={editedCustomer.email} onChange={(e) => updateField("email", e.target.value)} />
              <input className="w-full mt-2 p-2 border rounded" value={editedCustomer.phone ?? ""} onChange={(e) => updateField("phone", e.target.value)} />
              <input className="w-full mt-2 p-2 border rounded" value={editedCustomer.personal_number ?? ""} onChange={(e) => updateField("personal_number", e.target.value)} />
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
              <button onClick={acceptChanges} className="px-3 py-1 bg-green-500 text-white rounded text-sm">Acceptera</button>
              <button onClick={discardChanges} className="px-3 py-1 bg-gray-200 text-gray-800 rounded text-sm">Ångra</button>
            </div>
          </div>
        )}

        <div className="flex justify-between space-x-2 mt-6">
          <button onClick={handleCreateNewCase} className="px-3 py-1 bg-green-500 text-white rounded text-sm">Nytt Ärende</button>
          
          <div>
            <button onClick={onClose} className="px-4 py-2 text-gray-700 border rounded mr-2">Stäng</button>
            <button onClick={() => {
              if (isEditing) {
                handleSave();
              } else {
                // start editing - ensure editedCustomer initialized
                setEditedCustomer(originalCustomer);
                setIsEditing(true);
              }
            }} className="px-4 py-2 bg-blue-600 text-white rounded">
              {isEditing ? 'Spara Ändringar' : 'Redigera Kund'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDialog;