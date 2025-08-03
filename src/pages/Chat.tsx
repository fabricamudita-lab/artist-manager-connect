import { useState, useEffect, useRef } from 'react';
import { usePageTitle } from '@/hooks/useCommon';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Users, Search, Phone, Video } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Message {
  id: string;
  message: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
  read_at: string | null;
}

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url: string | null;
}

interface Conversation {
  profile: Profile;
  lastMessage: Message | null;
  unreadCount: number;
}

export default function Chat() {
  usePageTitle('Chat');
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) {
      fetchConversations();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      markMessagesAsRead(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    try {
      // Get all profiles except current user
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', profile?.id);

      const conversationsData: Conversation[] = [];

      for (const userProfile of profiles || []) {
        // Get last message with this user
        const { data: lastMessageData } = await supabase
          .from('chat_messages')
          .select('*')
          .or(`and(sender_id.eq.${profile?.id},recipient_id.eq.${userProfile.id}),and(sender_id.eq.${userProfile.id},recipient_id.eq.${profile?.id})`)
          .order('created_at', { ascending: false })
          .limit(1);

        // Count unread messages from this user
        const { count: unreadCount } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', userProfile.id)
          .eq('recipient_id', profile?.id)
          .is('read_at', null);

        conversationsData.push({
          profile: userProfile,
          lastMessage: lastMessageData?.[0] || null,
          unreadCount: unreadCount || 0,
        });
      }

      // Sort by last message time
      conversationsData.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
      });

      setConversations(conversationsData);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las conversaciones.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const { data: messagesData } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${profile?.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${profile?.id})`)
        .order('created_at', { ascending: true });

      setMessages(messagesData || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los mensajes.",
        variant: "destructive",
      });
    }
  };

  const markMessagesAsRead = async (senderId: string) => {
    try {
      await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', senderId)
        .eq('recipient_id', profile?.id)
        .is('read_at', null);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          message: newMessage.trim(),
          sender_id: profile?.id,
          recipient_id: selectedConversation.id,
        });

      if (error) throw error;

      setNewMessage('');
      await fetchMessages(selectedConversation.id);
      await fetchConversations();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje.",
        variant: "destructive",
      });
    }
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Ayer';
    } else if (days < 7) {
      return date.toLocaleDateString('es-ES', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.profile.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="p-6">Cargando chat...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Conversations Sidebar */}
        <div className="w-80 border-r bg-card">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-6 h-6" />
              <h1 className="text-xl font-bold">Chat</h1>
            </div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Buscar conversaciones..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <ScrollArea className="h-[calc(100vh-140px)]">
            <div className="p-2">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No hay conversaciones</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <div
                    key={conversation.profile.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                      selectedConversation?.id === conversation.profile.id
                        ? 'bg-primary/10'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setSelectedConversation(conversation.profile)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={conversation.profile.avatar_url || ''} />
                        <AvatarFallback>
                          {conversation.profile.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium truncate">{conversation.profile.full_name}</p>
                          {conversation.lastMessage && (
                            <span className="text-xs text-muted-foreground">
                              {formatMessageTime(conversation.lastMessage.created_at)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground truncate">
                            {conversation.lastMessage?.message || 'No hay mensajes'}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs mt-1">
                          {conversation.profile.role === 'artist' ? 'Artista' : 'Management'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={selectedConversation.avatar_url || ''} />
                      <AvatarFallback>
                        {selectedConversation.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="font-semibold">{selectedConversation.full_name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedConversation.role === 'artist' ? 'Artista' : 'Management'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Phone className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Video className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.sender_id === profile?.id ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender_id === profile?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.message}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {formatMessageTime(message.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t bg-card">
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Selecciona una conversación</h3>
                <p className="text-muted-foreground">
                  Elige una conversación para empezar a chatear
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}