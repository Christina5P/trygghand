import { useState, useEffect } from 'react';
import { supabase } from "@/lib/supabase";

export const useSubscriptionCancellations = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subscription_cancellations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) setError(error);
    else setData(data);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return { data, loading, error, refetch: fetchData };
};

export const createCancellation = async (cancellation: any) => {
  const { data, error } = await supabase
    .from('subscription_cancellations')
    .insert([cancellation]);
  if (error) throw error;
  return data;
};

export const updateCancellationStatus = async (id: string, status: string) => {
  const { data, error } = await supabase
    .from('subscription_cancellations')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
  return data;
};

