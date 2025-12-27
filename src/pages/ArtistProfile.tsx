import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, Music, Users, Calendar, FolderOpen, 
  Edit, Plus, MapPin, DollarSign, Mic, FileText, 
  Disc3, ClipboardList, TrendingUp, Settings2
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AddTeamContactDialog } from '@/components/AddTeamContactDialog';
import { ContactProfileSheet } from '@/components/ContactProfileSheet';
import { ArtistFormatsDialog } from '@/components/ArtistFormatsDialog';

interface Artist {
  id: string;
  name: string;
  stage_name: string | null;
  description: string | null;
  created_at: string;
}

interface TeamMember {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  category: string | null;
  field_config: {
    team_categories?: string[];
  } | null;
}

interface Booking {
  id: string;
  fecha: string | null;
  ciudad: string | null;
  venue: string | null;
  estado: string | null;
  fee: number | null;
}

interface Project {
  id: string;
  name: string;
  status: string;
  created_at: string;
  is_folder: boolean;
}

interface Release {
  id: string;
  title: string;
  type: string;
  release_date: string | null;
  status: string;
}

interface Solicitud {
  id: string;
  nombre_solicitante: string;
  tipo: string;
  estado: string;
  fecha_creacion: string;
}

export default function ArtistProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showAddTeamMember, setShowAddTeamMember] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showFormatsDialog, setShowFormatsDialog] = useState(false);

  // Fetch artist
  const { data: artist, isLoading: loadingArtist } = useQuery({
    queryKey: ['artist', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Artist;
    },
    enabled: !!id,
  });

  // Fetch team members for this artist via contact_artist_assignments
  const { data: teamMembers = [], refetch: refetchTeam } = useQuery({
    queryKey: ['artist-team', id],
    queryFn: async () => {
      // First get contact IDs assigned to this artist
      const { data: assignments, error: assignError } = await supabase
        .from('contact_artist_assignments')
        .select('contact_id')
        .eq('artist_id', id!);
      
      if (assignError) throw assignError;
      
      if (!assignments || assignments.length === 0) {
        return [] as TeamMember[];
      }
      
      const contactIds = assignments.map(a => a.contact_id);
      
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, role, email, phone, category, field_config')
        .in('id', contactIds)
        .order('name');
      
      if (error) throw error;
      return data as TeamMember[];
    },
    enabled: !!id,
  });

  // Fetch bookings for this artist
  const { data: bookings = [] } = useQuery({
    queryKey: ['artist-bookings', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_offers')
        .select('id, fecha, ciudad, venue, estado, fee')
        .eq('artist_id', id)
        .order('fecha', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as Booking[];
    },
    enabled: !!id,
  });

  // Fetch projects for this artist (separate folders and projects)
  const { data: projects = [] } = useQuery({
    queryKey: ['artist-projects', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status, created_at, is_folder')
        .eq('artist_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
    enabled: !!id,
  });

  // Fetch releases for this artist
  const { data: releases = [] } = useQuery({
    queryKey: ['artist-releases', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('releases')
        .select('id, title, type, release_date, status')
        .eq('artist_id', id)
        .order('release_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as Release[];
    },
    enabled: !!id,
  });

  // Fetch solicitudes for this artist
  const { data: solicitudes = [] } = useQuery({
    queryKey: ['artist-solicitudes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('solicitudes')
        .select('id, nombre_solicitante, tipo, estado, fecha_creacion')
        .eq('artist_id', id)
        .order('fecha_creacion', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as Solicitud[];
    },
    enabled: !!id,
  });

  // Stats
  const upcomingBookings = bookings.filter(b => b.fecha && new Date(b.fecha) >= new Date()).length;
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.fee || 0), 0);

  if (loadingArtist) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Artista no encontrado</h3>
            <Button variant="outline" onClick={() => navigate('/mi-management')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Management
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Separate folders (archive) from projects (workspace)
  const folders = projects.filter(p => p.is_folder);
  const workProjects = projects.filter(p => !p.is_folder);
  const pendingSolicitudes = solicitudes.filter(s => s.estado === 'pendiente');

  const stats = [
    { label: 'Equipo', value: teamMembers.length, icon: Users, color: 'text-blue-500', path: `/teams?artistId=${id}` },
    { label: 'Shows próximos', value: upcomingBookings, icon: Mic, color: 'text-orange-500', path: `/booking?artistId=${id}` },
    { label: 'Proyectos', value: workProjects.length, icon: FolderOpen, color: 'text-purple-500', path: `/projects?artistId=${id}` },
    { label: 'Releases', value: releases.length, icon: Disc3, color: 'text-pink-500', path: `/releases?artistId=${id}` },
    { label: 'Solicitudes', value: pendingSolicitudes.length, icon: ClipboardList, color: 'text-amber-500', path: `/solicitudes?artistId=${id}` },
    { label: 'Ingresos totales', value: `€${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-green-500', path: `/royalties?artistId=${id}` },
  ];

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'confirmado': return 'bg-green-500/10 text-green-500';
      case 'pendiente': return 'bg-yellow-500/10 text-yellow-500';
      case 'cancelado': return 'bg-red-500/10 text-red-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/mi-management')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-16 w-16">
          <AvatarFallback className="bg-primary/10 text-primary text-xl">
            {(artist.stage_name || artist.name).substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">
            {artist.stage_name || artist.name}
          </h1>
          {artist.stage_name && (
            <p className="text-muted-foreground">{artist.name}</p>
          )}
        </div>
        <Button variant="outline">
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>

      {/* Description */}
      {artist.description && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">{artist.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card 
            key={stat.label}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate(stat.path)}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="team" className="space-y-4">
        <TabsList>
          <TabsTrigger value="team">Equipo</TabsTrigger>
          <TabsTrigger value="bookings">Shows</TabsTrigger>
          <TabsTrigger value="projects">Proyectos</TabsTrigger>
          <TabsTrigger value="releases">Releases</TabsTrigger>
          <TabsTrigger value="solicitudes">Solicitudes</TabsTrigger>
          <TabsTrigger value="finanzas">Finanzas</TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">
              Equipo asignado a {artist.stage_name || artist.name}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowFormatsDialog(true)}>
                <Settings2 className="h-4 w-4 mr-2" />
                Configurar Formatos
              </Button>
              <Button onClick={() => setShowAddTeamMember(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Añadir Miembro
              </Button>
            </div>
          </div>

          {teamMembers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Sin equipo asignado</h3>
                <p className="text-muted-foreground mb-4">
                  Añade miembros al equipo de este artista
                </p>
                <Button onClick={() => setShowAddTeamMember(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Añadir Miembro
                </Button>
              </CardContent>
            </Card>
          ) : (
            (() => {
              // Group team members by team_categories
              const groupedMembers: Record<string, TeamMember[]> = {};
              
              teamMembers.forEach((member) => {
                const fieldConfig = member.field_config as { team_categories?: string[] } | null;
                const categories = fieldConfig?.team_categories || [member.category || 'otros'];
                
                categories.forEach((cat: string) => {
                  if (!groupedMembers[cat]) {
                    groupedMembers[cat] = [];
                  }
                  // Avoid duplicates in same category
                  if (!groupedMembers[cat].find(m => m.id === member.id)) {
                    groupedMembers[cat].push(member);
                  }
                });
              });

              const categoryLabels: Record<string, string> = {
                banda: 'Banda',
                tourmanager: 'Tour Manager',
                produccion: 'Producción',
                tecnico: 'Técnicos',
                management: 'Management',
                otros: 'Otros',
              };

              const sortedCategories = Object.keys(groupedMembers).sort((a, b) => {
                const order = ['management', 'tourmanager', 'banda', 'produccion', 'tecnico', 'otros'];
                return order.indexOf(a) - order.indexOf(b);
              });

              return (
                <div className="space-y-6">
                  {sortedCategories.map((category) => (
                    <div key={category} className="space-y-3">
                      <h3 className="text-lg font-semibold capitalize">
                        {categoryLabels[category] || category}
                      </h3>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groupedMembers[category].map((member) => (
                          <Card 
                            key={member.id} 
                            className="cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => setSelectedContactId(member.id)}
                          >
                            <CardContent className="pt-6">
                              <div className="flex items-start gap-3">
                                <Avatar>
                                  <AvatarFallback>
                                    {member.name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{member.name}</p>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {member.role || 'Sin rol'}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()
          )}
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Últimos shows y conciertos</p>
            <Button variant="outline" onClick={() => navigate('/booking')}>
              Ver todos
            </Button>
          </div>

          {bookings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Sin shows</h3>
                <p className="text-muted-foreground">
                  No hay shows registrados para este artista
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {bookings.map((booking) => (
                <Card 
                  key={booking.id} 
                  className="cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => navigate(`/booking/${booking.id}`)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {booking.venue || booking.ciudad || 'Sin ubicación'}
                          </span>
                        </div>
                        {booking.ciudad && booking.venue && (
                          <p className="text-sm text-muted-foreground ml-6">
                            {booking.ciudad}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        {booking.fecha && (
                          <p className="text-sm">
                            {format(new Date(booking.fecha), 'd MMM yyyy', { locale: es })}
                          </p>
                        )}
                        {booking.fee && (
                          <p className="text-sm text-muted-foreground">
                            €{booking.fee.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <Badge className={getStatusColor(booking.estado)}>
                        {booking.estado || 'pendiente'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-muted-foreground">Proyectos del artista</p>
            <Button variant="outline" onClick={() => navigate('/projects')}>
              Ver todos
            </Button>
          </div>

          {projects.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Sin proyectos</h3>
                <p className="text-muted-foreground">
                  No hay proyectos asociados a este artista
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <Card 
                  key={project.id}
                  className="cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                        {project.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      Creado {format(new Date(project.created_at), 'd MMM yyyy', { locale: es })}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AddTeamContactDialog
        open={showAddTeamMember}
        onOpenChange={setShowAddTeamMember}
        onContactAdded={() => {
          refetchTeam();
          setShowAddTeamMember(false);
        }}
        defaultArtistId={id}
      />

      <ContactProfileSheet
        open={!!selectedContactId}
        onOpenChange={(open) => !open && setSelectedContactId(null)}
        contactId={selectedContactId || ''}
      />

      <ArtistFormatsDialog
        open={showFormatsDialog}
        onOpenChange={setShowFormatsDialog}
        artistId={id || ''}
        artistName={artist?.stage_name || artist?.name || ''}
      />
    </div>
  );
}
