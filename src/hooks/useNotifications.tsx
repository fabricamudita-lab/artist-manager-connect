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
    if (!profile) return;

    // Fetch existing notifications (simulated for now)
    fetchNotifications();

    // Set up real-time subscription for new requests
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
          // Show toast notification for new request
          toast({
            title: "Nueva solicitud recibida",
            description: `Tienes una nueva solicitud: ${payload.new.title}`,
          });

          // Add to notifications list
          const newNotification: Notification = {
            id: `notif_${payload.new.id}`,
            title: "Nueva Solicitud",
            message: `${payload.new.title} - ${payload.new.type}`,
            type: 'request',
            read: false,
            created_at: payload.new.created_at,
            related_id: payload.new.id,
          };

          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  const fetchNotifications = async () => {
    // Simulated notifications - in a real app, these would come from a notifications table
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