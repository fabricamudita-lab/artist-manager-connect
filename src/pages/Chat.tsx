import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePageTitle } from '@/hooks/useCommon';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, User, Filter, Users, Search, Phone, Video, Plus, Mail, MessageSquare } from 'lucide-react';
import { ArtistSelector } from '@/components/ArtistSelector';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  roles: ('artist' | 'management')[];
  active_role: 'artist' | 'management';
  phone?: string | null;
}

interface Message {
  id: string;
  message: string;
  sender_id: string;
  recipient_id: string;
  created_at: string;
  read_at: string | null;
}

interface Conversation {
  profile: Profile;
  lastMessage: Message | null;
  unreadCount: number;
}

export default function Chat() {
  usePageTitle('Chat');
  const { profile } = useAuth();
  const { toast } = useToast();
  const [allContacts, setAllContacts] = useState<Profile[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) {
      fetchAllContacts();
      fetchConversations();
    }
  }, [profile]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchAllContacts = async () => {
    try {
      console.log('Fetching contacts based on role...');
      
      // Fetch all profiles first
      const { data: allProfiles, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) {
        console.error('Error fetching contacts:', error);
        throw error;
      }

      console.log('All profiles found:', allProfiles);
      
      // Filter contacts based on current user's role
      let filteredContacts = [];
      
      if (profile?.active_role === 'management') {
        // Management can see artists (including themselves if they have artist role)
        filteredContacts = allProfiles?.filter(p => 
          p.roles.includes('artist')
        ) || [];
      } else if (profile?.active_role === 'artist') {
        // Artists can see management users (including themselves if they have management role)
        filteredContacts = allProfiles?.filter(p => 
          p.roles.includes('management')
        ) || [];
      }

      console.log('Filtered contacts:', filteredContacts);
      setAllContacts(filteredContacts);
      
      // If no real contacts found, create demo data for testing
      if (filteredContacts.length === 0) {
        await createDemoContacts();
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los contactos",
        variant: "destructive",
      });
    }
  };

  const createDemoContacts = async () => {
    try {
      console.log('Creating demo contacts...');
      
      // Create demo profiles based on current user's role
      const demoProfiles = [];
      
      if (profile?.active_role === 'management') {
        // Create demo artists for management
        demoProfiles.push(
          {
            id: 'demo-artist-1',
            email: 'artist1@demo.com',
            full_name: 'Ana García',
            roles: ['artist'] as ('artist' | 'management')[],
            active_role: 'artist' as const,
            phone: '666 111 222',
            avatar_url: null
          },
          {
            id: 'demo-artist-2',
            email: 'artist2@demo.com', 
            full_name: 'Carlos Mendez',
            roles: ['artist'] as ('artist' | 'management')[],
            active_role: 'artist' as const,
            phone: '666 333 444',
            avatar_url: null
          }
        );
      } else if (profile?.active_role === 'artist') {
        // Create demo management for artist
        demoProfiles.push(
          {
            id: 'demo-manager-1',
            email: 'manager1@demo.com',
            full_name: 'Laura Martín',
            roles: ['management'] as ('artist' | 'management')[],
            active_role: 'management' as const, 
            phone: '666 555 666',
            avatar_url: null
          },
          {
            id: 'demo-manager-2',
            email: 'manager2@demo.com',
            full_name: 'Pedro Sánchez',
            roles: ['management'] as ('artist' | 'management')[],
            active_role: 'management' as const,
            phone: '666 777 888',
            avatar_url: null
          }
        );
      }

      setAllContacts(demoProfiles);
      
      toast({
        title: "Demo Mode",
        description: `Contactos disponibles para chat. Haz clic en "+" para iniciar una conversación.`,
      });
      
    } catch (error) {
      console.error('Error creating demo contacts:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      console.log('Fetching conversations...');
      
      // Only get conversations for contacts that have exchanged messages
      const { data: messageProfiles } = await supabase
        .from('chat_messages')
        .select('sender_id, recipient_id')
        .or(`sender_id.eq.${profile?.id},recipient_id.eq.${profile?.id}`);

      console.log('Message profiles:', messageProfiles);

      // Get unique user IDs that have conversations with current user
      const userIds = new Set<string>();
      messageProfiles?.forEach(msg => {
        if (msg.sender_id !== profile?.id) userIds.add(msg.sender_id);
        if (msg.recipient_id !== profile?.id) userIds.add(msg.recipient_id);
      });

      console.log('User IDs with conversations:', Array.from(userIds));

      if (userIds.size === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get profiles for users with conversations
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', Array.from(userIds));

      console.log('Conversation profiles found:', profiles);

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

      // Sort by last message date
      conversationsData.sort((a, b) => {
        if (!a.lastMessage && !b.lastMessage) return 0;
        if (!a.lastMessage) return 1;
        if (!b.lastMessage) return -1;
        return new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime();
      });

      console.log('Final conversations data:', conversationsData);
      setConversations(conversationsData);
    } catch (error) {
      console.error('Error fetching conversations:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las conversaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      // Handle demo contacts
      if (userId.startsWith('demo-')) {
        setMessages([]);
        return;
      }

      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${profile?.id},recipient_id.eq.${userId}),and(sender_id.eq.${userId},recipient_id.eq.${profile?.id})`)
        .order('created_at', { ascending: true });

      setMessages(data || []);

      // Mark messages as read
      await supabase
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', userId)
        .eq('recipient_id', profile?.id)
        .is('read_at', null);

      // Refresh conversations to update unread count
      fetchConversations();
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !profile) return;

    // Handle demo contacts
    if (selectedConversation.id.startsWith('demo-')) {
      // Simulate sending message for demo
      const demoMessage: Message = {
        id: `demo-msg-${Date.now()}`,
        message: newMessage.trim(),
        sender_id: profile.id,
        recipient_id: selectedConversation.id,
        created_at: new Date().toISOString(),
        read_at: null
      };
      
      setMessages(prev => [...prev, demoMessage]);
      setNewMessage('');
      
      // Simulate response after 2 seconds
      setTimeout(() => {
        const responseMessage: Message = {
          id: `demo-response-${Date.now()}`,
          message: `Gracias por tu mensaje. Este es un chat de demostración con ${selectedConversation.full_name}.`,
          sender_id: selectedConversation.id,
          recipient_id: profile.id,
          created_at: new Date().toISOString(),
          read_at: null
        };
        setMessages(prev => [...prev, responseMessage]);
      }, 2000);
      
      return;
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          message: newMessage.trim(),
          sender_id: profile.id,
          recipient_id: selectedConversation.id,
        });

      if (error) throw error;

      setNewMessage('');
      fetchMessages(selectedConversation.id);
      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    }
  };

  const startWhatsAppChat = (contact: Profile) => {
    // Format phone number for WhatsApp (remove spaces, dashes, etc.)
    const phone = contact.phone?.replace(/[^\d+]/g, '') || '';
    const message = encodeURIComponent(`Hola ${contact.full_name}, te escribo desde la plataforma de gestión artística.`);
    
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
    } else {
      toast({
        title: "Error",
        description: "Este contacto no tiene número de teléfono configurado",
        variant: "destructive",
      });
    }
  };

  const startEmailChat = (contact: Profile) => {
    const subject = encodeURIComponent('Comunicación desde plataforma de gestión artística');
    const body = encodeURIComponent(`Hola ${contact.full_name},\n\nTe escribo desde nuestra plataforma de gestión artística.\n\nSaludos cordiales.`);
    
    window.open(`mailto:${contact.email}?subject=${subject}&body=${body}`, '_blank');
  };

  const filteredConversations = conversations.filter(conv =>
    conv.profile.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.profile.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = allContacts.filter(contact =>
    contact.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startNewConversation = (contact: Profile) => {
    setSelectedConversation(contact);
    setShowNewChatDialog(false);
    setMessages([]);
  };

  if (loading) {
    return <div className="p-6">Cargando conversaciones...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
      <div className="container-moodita section-spacing space-y-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-primary rounded-xl">
            <MessageCircle className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient-primary tracking-tight">Chat Profesional</h1>
            <p className="text-muted-foreground">Conecta con tu equipo artístico</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[70vh]">
          {/* Conversations List */}
          <Card className="lg:col-span-1 card-moodita">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-gradient-primary rounded-lg">
                    <Users className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg">Conversaciones</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNewChatDialog(true)}
                  className="h-8 w-8 p-0 hover-lift"
                  title="Nuevo chat"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar contactos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 input-modern"
                />
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {filteredConversations.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground space-y-4">
                    <div className="w-16 h-16 mx-auto bg-muted/50 rounded-2xl flex items-center justify-center">
                      <MessageCircle className="w-8 h-8" />
                    </div>
                    <div className="space-y-3">
                      <p className="font-medium">No hay conversaciones activas</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowNewChatDialog(true)}
                        className="text-sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Iniciar nueva conversación
                      </Button>
                    </div>
                  </div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <div
                      key={conversation.profile.id}
                      className={`p-4 border-b border-border cursor-pointer transition-all duration-200 hover:bg-muted/50 ${
                        selectedConversation?.id === conversation.profile.id ? 'bg-primary/10 border-primary/20' : ''
                      }`}
                      onClick={() => setSelectedConversation(conversation.profile)}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={conversation.profile.avatar_url || ''} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">
                              {conversation.profile.full_name}
                            </p>
                            {conversation.unreadCount > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {conversation.unreadCount}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate leading-relaxed">
                            {conversation.lastMessage?.message || 'Sin mensajes'}
                          </p>
                          <Badge variant="outline" className="text-xs mt-2 badge-info">
                            {conversation.profile.active_role}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))
                )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Messages Area */}
        <Card className="lg:col-span-2 card-moodita">
          {selectedConversation ? (
            <>
              <CardHeader className="border-b border-border/50 bg-gradient-to-r from-muted/30 to-muted/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                      <AvatarImage src={selectedConversation.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                        <User className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        {selectedConversation.full_name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedConversation.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => startWhatsAppChat(selectedConversation)}
                      className="text-success hover:bg-success/10 hover-lift"
                      title="Abrir en WhatsApp"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => startEmailChat(selectedConversation)}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      title="Abrir en Gmail"
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" title="Llamada">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" title="Videollamada">
                      <Video className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px] p-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No hay mensajes aún. ¡Envía el primero!
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender_id === profile?.id ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[70%] p-3 rounded-lg ${
                              message.sender_id === profile?.id
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{message.message}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(message.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Escribe tu mensaje..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={sendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="text-6xl">💬</div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Chat Interno</h3>
                    <p className="text-muted-foreground mb-4">
                      Selecciona una conversación existente o inicia una nueva
                    </p>
                    <div className="flex gap-2 justify-center">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowNewChatDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nueva conversación
                      </Button>
                      {filteredConversations.length > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setSelectedConversation(filteredConversations[0].profile)}
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />
                          Continuar chat
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
            </CardContent>
          )}
        </Card>
        </div>

        {/* New Chat Dialog */}
        {showNewChatDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewChatDialog(false)}>
            <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Nueva Conversación</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNewChatDialog(false)}
                    className="h-8 w-8 p-0"
                  >
                    ×
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar contactos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <ScrollArea className="h-64">
                  {filteredContacts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-8 w-8 mx-auto mb-2" />
                      <p>No se encontraron contactos</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredContacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => startNewConversation(contact)}
                        >
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={contact.avatar_url || ''} />
                              <AvatarFallback>
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{contact.full_name}</p>
                              <p className="text-sm text-muted-foreground truncate">{contact.email}</p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {contact.active_role}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}