import React, { useEffect, useState } from 'react';
import { useSubscriptionCancellations, createCancellation, updateCancellationStatus } from '@/hooks/useSubscriptionCancellations';
import { supabase } from "@/lib/supabase";
import type { Subscription } from "@/types";

interface SubscriptionsViewProps {
  subscriptions: Subscription[];
  onDataUpdated: () => Promise<void>;
}

const SubscriptionsView: React.FC<SubscriptionsViewProps> = ({ subscriptions, onDataUpdated }) => {
  const { data, loading, error, refetch } = useSubscriptionCancellations();
  const [newCancellation, setNewCancellation] = useState({
    customer_id: '',
    provider: '',
    service_type: '',
    custom_description: '',
  });

  const handleCreate = async () => {
    await createCancellation(newCancellation);
    setNewCancellation({ customer_id: '', provider: '', service_type: '', custom_description: '' });
    refetch();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateCancellationStatus(id, status);
    refetch();
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Subscription Cancellations</h1>

      {/* Create Form */}
      <div className="mb-6 p-4 border rounded shadow-sm">
        <h2 className="font-semibold mb-2">Add New Cancellation</h2>
        <input
          type="text"
          placeholder="Customer ID"
          value={newCancellation.customer_id}
          onChange={(e) => setNewCancellation({ ...newCancellation, customer_id: e.target.value })}
          className="border p-1 mr-2"
        />
        <input
          type="text"
          placeholder="Provider"
          value={newCancellation.provider}
          onChange={(e) => setNewCancellation({ ...newCancellation, provider: e.target.value })}
          className="border p-1 mr-2"
        />
        <input
          type="text"
          placeholder="Service Type"
          value={newCancellation.service_type}
          onChange={(e) => setNewCancellation({ ...newCancellation, service_type: e.target.value })}
          className="border p-1 mr-2"
        />
        <input
          type="text"
          placeholder="Custom Description"
          value={newCancellation.custom_description}
          onChange={(e) => setNewCancellation({ ...newCancellation, custom_description: e.target.value })}
          className="border p-1 mr-2"
        />
        <button onClick={handleCreate} className="bg-blue-600 text-white px-3 py-1 rounded">Add</button>
      </div>

      {/* Table */}
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Provider</th>
            <th className="border p-2">Service Type</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td className="border p-2">{item.provider}</td>
              <td className="border p-2">{item.service_type}</td>
              <td className="border p-2">{item.status}</td>
              <td className="border p-2 space-x-2">
                {['pending', 'in_progress', 'sent', 'completed', 'rejected'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(item.id, status)}
                    className="bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
                  >
                    {status}
                  </button>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SubscriptionsView;
