import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface ChatChannel {
  id: string;
  name: string;
  description: string | null;
  channel_type: 'project' | 'department' | 'general';
  project_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  project?: { id: string; name: string } | null;
  unread_count?: number;
  last_message?: ChannelMessage | null;
}

export interface ChannelMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  message: string;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
  read_by: string[];
  sender?: { id: string; full_name: string; avatar_url: string | null } | null;
}

export function useChatChannels() {
  const { profile } = useAuth();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChannels = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select(`
          *,
          project:project_id(id, name)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Fetch last message for each channel
      const channelsWithMessages = await Promise.all(
        (data || []).map(async (channel: any) => {
          const { data: lastMsg } = await supabase
            .from('channel_messages')
            .select('*')
            .eq('channel_id', channel.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Count unread messages
          const { count } = await supabase
            .from('channel_messages')
            .select('*', { count: 'exact', head: true })
            .eq('channel_id', channel.id)
            .not('read_by', 'cs', `{${profile?.id}}`);

          return {
            ...channel,
            last_message: lastMsg || null,
            unread_count: count || 0
          };
        })
      );

      setChannels(channelsWithMessages);
    } catch (error) {
      console.error('Error fetching channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const createChannel = async (data: {
    name: string;
    description?: string;
    channel_type: 'project' | 'department' | 'general';
    project_id?: string;
  }) => {
    if (!profile) return null;

    try {
      const { data: newChannel, error } = await supabase
        .from('chat_channels')
        .insert({
          name: data.name,
          description: data.description || null,
          channel_type: data.channel_type,
          project_id: data.project_id || null,
          created_by: profile.id
        })
        .select()
        .single();

      if (error) throw error;

      // Auto-join the creator
      await supabase.from('channel_members').insert({
        channel_id: newChannel.id,
        user_id: profile.id
      });

      toast({
        title: 'Canal creado',
        description: `#${data.name} está listo`
      });

      fetchChannels();
      return newChannel;
    } catch (error) {
      console.error('Error creating channel:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el canal',
        variant: 'destructive'
      });
      return null;
    }
  };

  const deleteChannel = async (channelId: string) => {
    try {
      const { error } = await supabase
        .from('chat_channels')
        .delete()
        .eq('id', channelId);

      if (error) throw error;

      toast({
        title: 'Canal eliminado',
        description: 'El canal ha sido eliminado'
      });

      fetchChannels();
    } catch (error) {
      console.error('Error deleting channel:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el canal',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    if (profile) {
      fetchChannels();
    }
  }, [profile]);

  return {
    channels,
    loading,
    fetchChannels,
    createChannel,
    deleteChannel
  };
}

export function useChannelMessages(channelId: string | null) {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMessages = async () => {
    if (!channelId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('channel_messages')
        .select('*')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch sender profiles
      const senderIds = [...new Set((data || []).map(m => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', senderIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      const messagesWithSenders = (data || []).map(msg => ({
        ...msg,
        sender: profileMap.get(msg.sender_id) || null
      }));

      setMessages(messagesWithSenders);

      // Mark messages as read - simplified approach
      if (profile?.id && data) {
        const unreadMsgs = data.filter(m => !m.read_by?.includes(profile.id));
        for (const msg of unreadMsgs) {
          const newReadBy = [...(msg.read_by || []), profile.id];
          await supabase
            .from('channel_messages')
            .update({ read_by: newReadBy })
            .eq('id', msg.id);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (message: string, file?: { url: string; name: string; type: string }) => {
    if (!channelId || !profile) return null;

    try {
      const { data, error } = await supabase
        .from('channel_messages')
        .insert({
          channel_id: channelId,
          sender_id: profile.id,
          message,
          file_url: file?.url || null,
          file_name: file?.name || null,
          file_type: file?.type || null,
          read_by: [profile.id]
        })
        .select()
        .single();

      if (error) throw error;

      // Update channel updated_at
      await supabase
        .from('chat_channels')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', channelId);

      fetchMessages();
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'No se pudo enviar el mensaje',
        variant: 'destructive'
      });
      return null;
    }
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime updates
    if (channelId) {
      const subscription = supabase
        .channel(`channel-${channelId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'channel_messages', filter: `channel_id=eq.${channelId}` },
          () => fetchMessages()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [channelId, profile?.id]);

  return {
    messages,
    loading,
    fetchMessages,
    sendMessage
  };
}
