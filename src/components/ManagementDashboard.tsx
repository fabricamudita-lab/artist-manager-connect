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
import { Calendar, Users, PlusCircle, FileText, DollarSign, LogOut, Send, TrendingUp, Music, Radio, Receipt, Headphones, Mic, Globe } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import InviteArtistDialog from '@/components/InviteArtistDialog';
import NotificationBell from '@/components/NotificationBell';

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


  if (loading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">M00DITA</h1>
          <p className="text-muted-foreground">Bienvenido, {profile?.full_name}</p>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
        </div>
      </div>

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
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Lista de Artistas</h2>
              <InviteArtistDialog onArtistInvited={fetchData} />
            </div>
            
            {artists.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No hay artistas registrados en el sistema.</p>
                  <p className="text-sm text-muted-foreground">
                    Invita artistas para empezar a gestionar solicitudes y eventos.
                  </p>
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
                  Visita la sección de <strong>Calendario</strong> para gestionar eventos.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ... keep existing code (financial content) */}
        <TabsContent value="financial">
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Gestión Financiera</h2>
            
            {/* Resumen de ingresos */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€0</div>
                  <p className="text-xs text-muted-foreground">Este mes</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Live Performance</CardTitle>
                  <Music className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€0</div>
                  <p className="text-xs text-muted-foreground">Conciertos y shows</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Royalties</CardTitle>
                  <Headphones className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€0</div>
                  <p className="text-xs text-muted-foreground">Streaming + mechanical</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sincronización</CardTitle>
                  <Radio className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">€0</div>
                  <p className="text-xs text-muted-foreground">TV, cine, publicidad</p>
                </CardContent>
              </Card>
            </div>

            {/* Categorías financieras */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Live Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Music className="w-5 h-5" />
                    Live Performance
                  </CardTitle>
                  <CardDescription>Conciertos, giras y actuaciones en directo</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Gira principal</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Festivales</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Conciertos únicos</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Eventos privados</span>
                      <span className="font-medium">€0</span>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Nuevo Show
                  </Button>
                </CardContent>
              </Card>

              {/* Performance Royalties */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Headphones className="w-5 h-5" />
                    Performance Royalties
                  </CardTitle>
                  <CardDescription>Streaming, radio, TV y ejecución pública</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Spotify (PRO)</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Radio/TV</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Venues públicos</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Streaming internacional</span>
                      <span className="font-medium">€0</span>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Registrar Royalty
                  </Button>
                </CardContent>
              </Card>

              {/* Mechanical Royalties */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Mechanical Royalties
                  </CardTitle>
                  <CardDescription>Downloads, streams y reproducciones físicas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Streaming mechanicals</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Digital downloads</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Ventas físicas</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Covers/samples</span>
                      <span className="font-medium">€0</span>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Registrar Mechanical
                  </Button>
                </CardContent>
              </Card>

              {/* Sync Licensing */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Radio className="w-5 h-5" />
                    Sync Licensing
                  </CardTitle>
                  <CardDescription>Sincronización en medios audiovisuales</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>TV/Series</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Cine/Documentales</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Publicidad/Brands</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Videojuegos</span>
                      <span className="font-medium">€0</span>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Nuevo Sync
                  </Button>
                </CardContent>
              </Card>

              {/* Merchandising */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Merchandising
                  </CardTitle>
                  <CardDescription>Productos físicos y digitales del artista</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Ropa/Accesorios</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Vinilos/CDs</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Productos digitales</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Ediciones limitadas</span>
                      <span className="font-medium">€0</span>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Registrar Venta
                  </Button>
                </CardContent>
              </Card>

              {/* Brand Partnerships */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="w-5 h-5" />
                    Brand Partnerships
                  </CardTitle>
                  <CardDescription>Patrocinios, endorsements y colaboraciones</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Endorsements</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Patrocinios</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Colaboraciones</span>
                      <span className="font-medium">€0</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Ambassadorships</span>
                      <span className="font-medium">€0</span>
                    </div>
                  </div>
                  <Button className="w-full" variant="outline">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Nuevo Partnership
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Otros ingresos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Otros Ingresos
                </CardTitle>
                <CardDescription>Masterclasses, sesiones de estudio, features y otros</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center">
                    <div className="text-lg font-bold">€0</div>
                    <div className="text-sm text-muted-foreground">Features/Collabs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">€0</div>
                    <div className="text-sm text-muted-foreground">Sesiones estudio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">€0</div>
                    <div className="text-sm text-muted-foreground">Masterclasses</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">€0</div>
                    <div className="text-sm text-muted-foreground">Fan subscriptions</div>
                  </div>
                </div>
                <Button className="w-full" variant="outline">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Registrar Ingreso
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}