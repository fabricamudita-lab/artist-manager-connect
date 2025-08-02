import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Users, PlusCircle, FileText, DollarSign, LogOut, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Artist {
  id: string;
  full_name: string;
  email: string;
}

interface Request {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  due_date: string;
  artist_id: string;
  created_at: string;
}

export default function ManagementDashboard() {
  const { profile, signOut } = useAuth();
  const [artists, setArtists] = useState<Artist[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewRequestForm, setShowNewRequestForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    artist_id: '',
    type: '',
    title: '',
    description: '',
    due_date: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch artists (profiles with role 'artist')
      const { data: artistsData } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'artist');

      // Fetch all requests created by this management
      const { data: requestsData } = await supabase
        .from('requests')
        .select('*')
        .eq('management_id', profile?.id)
        .order('created_at', { ascending: false });

      setArtists(artistsData || []);
      setRequests(requestsData || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newRequest.artist_id || !newRequest.type || !newRequest.title) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('requests')
        .insert({
          artist_id: newRequest.artist_id,
          management_id: profile?.id,
          type: newRequest.type,
          title: newRequest.title,
          description: newRequest.description,
          due_date: newRequest.due_date || null,
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Solicitud creada correctamente.",
      });

      setNewRequest({
        artist_id: '',
        type: '',
        title: '',
        description: '',
        due_date: '',
      });
      setShowNewRequestForm(false);
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la solicitud.",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'completed': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'booking': return '🎤';
      case 'interview': return '🎙️';
      case 'consultation': return '💬';
      default: return '📄';
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Sesión cerrada",
      description: "Has cerrado sesión correctamente.",
    });
  };

  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard - Management</h1>
              <p className="text-muted-foreground">Bienvenido, {profile?.full_name}</p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Solicitudes
            </TabsTrigger>
            <TabsTrigger value="artists" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Artistas
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Eventos
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Finanzas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Gestión de Solicitudes</h2>
                <Button onClick={() => setShowNewRequestForm(!showNewRequestForm)}>
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Nueva Solicitud
                </Button>
              </div>

              {showNewRequestForm && (
                <Card>
                  <CardHeader>
                    <CardTitle>Crear Nueva Solicitud</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleCreateRequest} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="artist">Artista</Label>
                          <Select
                            value={newRequest.artist_id}
                            onValueChange={(value) => setNewRequest({ ...newRequest, artist_id: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un artista" />
                            </SelectTrigger>
                            <SelectContent>
                              {artists.map((artist) => (
                                <SelectItem key={artist.id} value={artist.id}>
                                  {artist.full_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="type">Tipo</Label>
                          <Select
                            value={newRequest.type}
                            onValueChange={(value) => setNewRequest({ ...newRequest, type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Tipo de solicitud" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="booking">Booking</SelectItem>
                              <SelectItem value="interview">Entrevista</SelectItem>
                              <SelectItem value="consultation">Consulta</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input
                          id="title"
                          value={newRequest.title}
                          onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                          placeholder="Título de la solicitud"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea
                          id="description"
                          value={newRequest.description}
                          onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                          placeholder="Descripción detallada de la solicitud"
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="due_date">Fecha Límite (Opcional)</Label>
                        <Input
                          id="due_date"
                          type="datetime-local"
                          value={newRequest.due_date}
                          onChange={(e) => setNewRequest({ ...newRequest, due_date: e.target.value })}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit">Crear Solicitud</Button>
                        <Button type="button" variant="outline" onClick={() => setShowNewRequestForm(false)}>
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              {requests.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No has creado solicitudes aún.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {requests.map((request) => (
                    <Card key={request.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getTypeIcon(request.type)}</span>
                            <div>
                              <CardTitle className="text-lg">{request.title}</CardTitle>
                              <CardDescription>
                                {request.type} - Artista: {artists.find(a => a.id === request.artist_id)?.full_name}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge className={getStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">{request.description}</p>
                        {request.due_date && (
                          <p className="text-xs text-muted-foreground">
                            Fecha límite: {new Date(request.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="artists">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Lista de Artistas</h2>
              {artists.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-8">
                    <p className="text-muted-foreground">No hay artistas registrados en el sistema.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {artists.map((artist) => (
                    <Card key={artist.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5" />
                          {artist.full_name}
                        </CardTitle>
                        <CardDescription>{artist.email}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="events">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Gestión de Eventos</h2>
              <Card>
                <CardContent className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    La gestión de eventos estará disponible próximamente.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="financial">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Reportes Financieros</h2>
              <Card>
                <CardContent className="text-center py-8">
                  <DollarSign className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    La gestión financiera estará disponible próximamente.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}