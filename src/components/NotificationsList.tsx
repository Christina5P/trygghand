// src/components/NotificationsList.tsx
import React from 'react';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';

export const NotificationsList: React.FC = () => {
  const { notifications, unread, unreadCount, loading, markAsRead } = useNotifications();

  return (
    <div>
      <Button variant={unreadCount > 0 ? 'default' : 'outline'} className="relative mb-2">
        Notiser
        {unreadCount > 0 && (
          <span className="ml-2 bg-red-500 text-white rounded-full px-2 text-xs absolute -top-2 -right-2">{unreadCount}</span>
        )}
      </Button>
      <ul className="bg-white border rounded shadow p-2 max-w-md">
        {loading && <li>Laddar...</li>}
        {unread.map((n) => (
          <li key={n.id} className="flex items-center justify-between py-2 border-b last:border-b-0 font-bold">
            <span>
              {n.type} – <a href={`/${n.ref_type}/${n.ref_id}`} className="underline">Gå till</a>
            </span>
            <Button size="sm" variant="ghost" onClick={() => markAsRead(n.id)}>Markera som läst</Button>
          </li>
        ))}
        {unread.length === 0 && !loading && <li>Inga notiser</li>}
      </ul>
    </div>
  );
};
