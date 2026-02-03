// src/hooks/useNotifications.ts
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  ref_id: string;
  ref_type: string;
  created_at: string;
  read_at: string | null;
  actor_id: string;
  payload?: any;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setNotifications(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const unread = notifications.filter(n => !n.read_at);

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
    fetchNotifications();
  };

  return {
    notifications,
    unread,
    unreadCount: unread.length,
    loading,
    markAsRead,
    refetch: fetchNotifications,
  };
}
