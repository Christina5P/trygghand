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
  const [userId, setUserId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Only fetch active (unread) notifications
    // Archived notifications (read_at !== null) from status changes are excluded
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .is('read_at', null)
      .order('created_at', { ascending: false });
    if (!error) setNotifications(data || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    // onAuthStateChange fires immediately with the cached session (INITIAL_SESSION event)
    // without a network round-trip — prevents userId from being null when the first click fires.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchNotifications]);

  const unread = notifications.filter(n => !n.read_at);

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
    fetchNotifications();
  };

  const markNotificationsReadForRef = async (refId: string) => {
    // Prefer hook state; fall back to session cache in case state hasn't synced yet.
    const resolvedUserId = userId ?? (await supabase.auth.getSession()).data.session?.user.id ?? null;
    if (!resolvedUserId) {
      console.warn('[useNotifications] markNotificationsReadForRef: no authenticated user', { refId });
      return;
    }
    console.log('[useNotifications] markNotificationsReadForRef', { refId, resolvedUserId });
    const { data, error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', resolvedUserId)
      .eq('ref_id', refId)
      .is('read_at', null)
      .select();
    console.log('[useNotifications] rows updated', { count: data?.length ?? 0, data, error });
    // Realtime will trigger a refetch; call manually as fallback.
    await fetchNotifications();
  };

  return {
    notifications,
    unread,
    unreadCount: unread.length,
    loading,
    markAsRead,
    markNotificationsReadForRef,
    refetch: fetchNotifications,
  };
}
