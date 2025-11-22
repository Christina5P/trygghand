import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Case {
  id: string;
  title?: string;
  status?: string;
  created_at?: string;
}

interface Props {
  customerId?: string;
}

const CaseList: React.FC<Props> = ({ customerId }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchCases = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("cases")
          .select("*")
          .eq("customer_id", customerId);

        if (error) throw error;
        if (mounted) setCases(data ?? []);
      } catch (err) {
        console.error("Error fetching cases:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (customerId) fetchCases();
    return () => { mounted = false; };
  }, [customerId]);

  if (loading) return <p>Hämtar ärenden...</p>;
  if (cases.length === 0) return <p>Inga ärenden hittades.</p>;

  return (
    <ul className="space-y-2">
      {cases.map((c) => (
        <li key={c.id} className="p-3 border rounded bg-gray-50">
          <div className="font-medium">{c.title ?? `Ärende #${c.id}`}</div>
          <div className="text-sm text-gray-500">Status: {c.status ?? "Okänd"}</div>
        </li>
      ))}
    </ul>
  );
};

export default CaseList;
