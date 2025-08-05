import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'request' | 'event' | 'financial' | 'general';
  read: boolean;
  created_at: string;
  related_id?: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { profile } = useAuth();

  useEffect(() => {
    console.log('Notifications hook - Profile:', profile);
    if (!profile) return;

    // Fetch existing notifications (simulated for now)
    fetchNotifications();

    // Simplified real-time setup (commenting out complex subscription for now)
    // We'll add this back once basic functionality works
    /*
    const channel = supabase
      .channel('requests_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'requests',
          filter: `artist_id=eq.${profile.id}`,
        },
        (payload) => {
          console.log('New notification received:', payload);
          toast({
            title: "Nueva solicitud recibida",
            description: `Tienes una nueva solicitud: ${payload.new.title}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    */
  }, [profile]);

  const fetchNotifications = async () => {
    console.log('Fetching notifications...');
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile?.user_id)
        .order('created_at', { ascending: false });

      if (data) {
        const typedNotifications = data.map(item => ({
          ...item,
          type: item.type as 'request' | 'event' | 'financial' | 'general'
        }));
        setNotifications(typedNotifications);
        setUnreadCount(typedNotifications.filter(n => !n.read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Fallback to mock notification
      const mockNotifications: Notification[] = [
        {
          id: '1',
          title: 'Bienvenido a MOODITA',
          message: 'Tu cuenta ha sido configurada exitosamente.',
          type: 'general',
          read: false,
          created_at: new Date().toISOString(),
        },
      ];
      setNotifications(mockNotifications);
      setUnreadCount(mockNotifications.filter(n => !n.read).length);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    setUnreadCount(0);
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
}