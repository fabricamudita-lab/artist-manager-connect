import { useState, useEffect } from 'react';
import { PUBLIC_APP_URL } from '@/lib/public-url';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Copy,
  Eye,
  Archive,
  Edit,
  ExternalLink,
  Calendar,
  Users,
  Globe,
  Lock,
  Shield,
  LayoutGrid,
  List,
  TrendingUp,
  Download,
  Trash2,
  BarChart3,
  Clock,
  Share2,
  QrCode
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { PermissionChip } from '@/components/PermissionChip';
import { PermissionWrapper } from '@/components/PermissionBoundary';
import { cn } from '@/lib/utils';

interface EPKData {
  id: string;
  titulo: string;
  artista_proyecto: string;
  slug: string;
  visibilidad: string;
  actualizado_en: string;
  vistas_totales: number;
  vistas_unicas: number;
  descargas_totales: number;
  creado_por: string;
  creado_en: string;
  acceso_directo: boolean;
  etiquetas?: string[];
  imagen_portada?: string;
  tagline?: string;
  tema?: string;
}

type ViewMode = 'grid' | 'list';

export default function EPKs() {
  const navigate = useNavigate();
  const [epks, setEpks] = useState<EPKData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updated_desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showArchived, setShowArchived] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [epkToDelete, setEpkToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchEPKs();
  }, [searchTerm, visibilityFilter, sortBy, showArchived]);

  const fetchEPKs = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('epks')
        .select('*');

      // Apply filters
      if (searchTerm) {
        query = query.or(`titulo.ilike.%${searchTerm}%,slug.ilike.%${searchTerm}%,artista_proyecto.ilike.%${searchTerm}%`);
      }

      if (visibilityFilter !== 'all') {
        query = query.eq('visibilidad', visibilityFilter as any);
      }

      if (!showArchived) {
        query = query.eq('acceso_directo', true);
      }

      // Apply sorting
      switch (sortBy) {
        case 'updated_desc':
          query = query.order('actualizado_en', { ascending: false });
          break;
        case 'updated_asc':
          query = query.order('actualizado_en', { ascending: true });
          break;
        case 'views_desc':
          query = query.order('vistas_totales', { ascending: false });
          break;
        case 'title_asc':
          query = query.order('titulo', { ascending: true });
          break;
        case 'created_desc':
          query = query.order('creado_en', { ascending: false });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;

      setEpks((data || []) as EPKData[]);
    } catch (error) {
      console.error('Error fetching EPKs:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los EPKs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async (slug: string) => {
    const url = `${PUBLIC_APP_URL}/epk/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Enlace copiado",
        description: "El enlace del EPK se ha copiado al portapapeles"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace",
        variant: "destructive"
      });
    }
  };

  const handleDuplicate = async (epkId: string) => {
    try {
      const { data: originalEpk, error: fetchError } = await supabase
        .from('epks')
        .select('*')
        .eq('id', epkId)
        .single();

      if (fetchError) throw fetchError;

      const duplicateData = {
        ...originalEpk,
        id: undefined,
        titulo: `${originalEpk.titulo} - Copia`,
        slug: `${originalEpk.slug}-copia-${Date.now()}`,
        vistas_totales: 0,
        vistas_unicas: 0,
        descargas_totales: 0,
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString()
      };

      delete duplicateData.id;

      const { error: insertError } = await supabase
        .from('epks')
        .insert([duplicateData])
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "EPK duplicado",
        description: "Se ha creado una copia del EPK"
      });

      fetchEPKs();
    } catch (error) {
      console.error('Error duplicating EPK:', error);
      toast({
        title: "Error",
        description: "No se pudo duplicar el EPK",
        variant: "destructive"
      });
    }
  };

  const handleArchive = async (epkId: string) => {
    try {
      const { error } = await supabase
        .from('epks')
        .update({ acceso_directo: false })
        .eq('id', epkId);

      if (error) throw error;

      toast({
        title: "EPK archivado",
        description: "El EPK ha sido marcado como inactivo"
      });

      fetchEPKs();
    } catch (error) {
      console.error('Error archiving EPK:', error);
      toast({
        title: "Error",
        description: "No se pudo archivar el EPK",
        variant: "destructive"
      });
    }
  };

  const handleRestore = async (epkId: string) => {
    try {
      const { error } = await supabase
        .from('epks')
        .update({ acceso_directo: true })
        .eq('id', epkId);

      if (error) throw error;

      toast({
        title: "EPK restaurado",
        description: "El EPK ha sido reactivado"
      });

      fetchEPKs();
    } catch (error) {
      console.error('Error restoring EPK:', error);
      toast({
        title: "Error",
        description: "No se pudo restaurar el EPK",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async () => {
    if (!epkToDelete) return;

    try {
      const { error } = await supabase
        .from('epks')
        .delete()
        .eq('id', epkToDelete);

      if (error) throw error;

      toast({
        title: "EPK eliminado",
        description: "El EPK ha sido eliminado permanentemente"
      });

      setDeleteDialogOpen(false);
      setEpkToDelete(null);
      fetchEPKs();
    } catch (error) {
      console.error('Error deleting EPK:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el EPK",
        variant: "destructive"
      });
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'publico':
        return <Globe className="w-4 h-4 text-green-500" />;
      case 'privado':
        return <Lock className="w-4 h-4 text-muted-foreground" />;
      case 'protegido_password':
        return <Shield className="w-4 h-4 text-amber-500" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'publico':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Público</Badge>;
      case 'privado':
        return <Badge variant="secondary">Privado</Badge>;
      case 'protegido_password':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Protegido</Badge>;
      default:
        return <Badge variant="secondary">{visibility}</Badge>;
    }
  };

  const getThemeBadge = (tema?: string) => {
    switch (tema) {
      case 'dark':
        return <Badge variant="outline" className="text-xs">Oscuro</Badge>;
      case 'light':
        return <Badge variant="outline" className="text-xs">Claro</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">Auto</Badge>;
    }
  };

  // Stats calculations
  const totalViews = epks.reduce((sum, epk) => sum + (epk.vistas_totales || 0), 0);
  const totalUniqueViews = epks.reduce((sum, epk) => sum + (epk.vistas_unicas || 0), 0);
  const totalDownloads = epks.reduce((sum, epk) => sum + (epk.descargas_totales || 0), 0);
  const publicCount = epks.filter(e => e.visibilidad === 'publico').length;
  const privateCount = epks.filter(e => e.visibilidad === 'privado').length;
  const protectedCount = epks.filter(e => e.visibilidad === 'protegido_password').length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando EPKs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Electronic Press Kits</h1>
          <p className="text-muted-foreground">
            Gestiona y comparte materiales promocionales de tus artistas
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PermissionChip />
          <PermissionWrapper requiredPermission="createEPK">
            <Button onClick={() => navigate('/epk-builder')} className="shadow-sm">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo EPK
            </Button>
          </PermissionWrapper>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total EPKs</p>
                <p className="text-2xl font-bold">{epks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Eye className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Vistas totales</p>
                <p className="text-2xl font-bold">{totalViews.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Visitantes únicos</p>
                <p className="text-2xl font-bold">{totalUniqueViews.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Download className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Descargas</p>
                <p className="text-2xl font-bold">{totalDownloads.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <TrendingUp className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Conversión</p>
                <p className="text-2xl font-bold">
                  {totalViews > 0 ? Math.round((totalDownloads / totalViews) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex flex-1 gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, slug o artista..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                <SelectTrigger className="w-[150px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Visibilidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="publico">Público</SelectItem>
                  <SelectItem value="privado">Privado</SelectItem>
                  <SelectItem value="protegido_password">Protegido</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updated_desc">Más reciente</SelectItem>
                  <SelectItem value="updated_asc">Más antiguo</SelectItem>
                  <SelectItem value="views_desc">Más vistas</SelectItem>
                  <SelectItem value="title_asc">Título A-Z</SelectItem>
                  <SelectItem value="created_desc">Fecha creación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={showArchived ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setShowArchived(!showArchived)}
              >
                <Archive className="w-4 h-4 mr-2" />
                {showArchived ? "Ocultar archivados" : "Ver archivados"}
              </Button>
              
              <div className="flex items-center border rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="px-2"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="px-2"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* EPKs Content */}
      {epks.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 rounded-full bg-muted mb-4">
              <FileIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No hay EPKs</h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              Crea tu primer Electronic Press Kit para compartir materiales promocionales
            </p>
            <Button onClick={() => navigate('/epk-builder')}>
              <Plus className="w-4 h-4 mr-2" />
              Crear EPK
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {epks.map((epk) => (
            <Card 
              key={epk.id} 
              className={cn(
                "group hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden",
                !epk.acceso_directo && "opacity-60"
              )}
              onClick={() => navigate(`/epk-builder/${epk.id}`)}
            >
              {/* Cover Image */}
              <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
                {epk.imagen_portada ? (
                  <img 
                    src={epk.imagen_portada} 
                    alt={epk.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FileIcon className="w-12 h-12 text-primary/30" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  {getVisibilityBadge(epk.visibilidad)}
                </div>
                {!epk.acceso_directo && (
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-xs">
                      <Archive className="w-3 h-3 mr-1" />
                      Archivado
                    </Badge>
                  </div>
                )}
              </div>

              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                      {epk.titulo}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {epk.artista_proyecto}
                    </p>
                    {epk.tagline && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {epk.tagline}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {epk.vistas_totales?.toLocaleString() || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {epk.descargas_totales?.toLocaleString() || 0}
                      </span>
                    </div>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(epk.actualizado_en), { addSuffix: true, locale: es })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[150px]">
                      /{epk.slug}
                    </code>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/epk/${epk.slug}`, '_blank');
                        }}>
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Ver EPK
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLink(epk.slug);
                        }}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copiar enlace
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(epk.id);
                        }}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {epk.acceso_directo ? (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleArchive(epk.id);
                          }}>
                            <Archive className="w-4 h-4 mr-2" />
                            Archivar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handleRestore(epk.id);
                          }}>
                            <Archive className="w-4 h-4 mr-2" />
                            Restaurar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEpkToDelete(epk.id);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título / Artista</TableHead>
                    <TableHead>Visibilidad</TableHead>
                    <TableHead>Última actualización</TableHead>
                    <TableHead>Vistas</TableHead>
                    <TableHead>Descargas</TableHead>
                    <TableHead>Enlace</TableHead>
                    <TableHead className="w-[70px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {epks.map((epk) => (
                    <TableRow 
                      key={epk.id} 
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        !epk.acceso_directo && 'opacity-50'
                      )}
                      onClick={() => navigate(`/epk-builder/${epk.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                            {epk.imagen_portada ? (
                              <img 
                                src={epk.imagen_portada} 
                                alt={epk.titulo}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <FileIcon className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-medium">{epk.titulo}</div>
                            <div className="text-sm text-muted-foreground">
                              {epk.artista_proyecto}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getVisibilityIcon(epk.visibilidad)}
                          {getVisibilityBadge(epk.visibilidad)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(epk.actualizado_en), 'dd MMM yyyy', { locale: es })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(epk.actualizado_en), { addSuffix: true, locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {(epk.vistas_totales || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {(epk.vistas_unicas || 0).toLocaleString()} únicas
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {(epk.descargas_totales || 0).toLocaleString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(epk.slug);
                          }}
                          className="text-primary hover:text-primary/80"
                        >
                          /{epk.slug}
                          <Copy className="w-3 h-3 ml-2" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background border shadow-lg">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/epk-builder/${epk.id}`);
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/epk/${epk.slug}`, '_blank');
                            }}>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Ver como invitado
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleCopyLink(epk.slug);
                            }}>
                              <Copy className="w-4 h-4 mr-2" />
                              Copiar enlace
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              handleDuplicate(epk.id);
                            }}>
                              <Users className="w-4 h-4 mr-2" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {epk.acceso_directo ? (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleArchive(epk.id);
                              }}>
                                <Archive className="w-4 h-4 mr-2" />
                                Archivar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleRestore(epk.id);
                              }}>
                                <Archive className="w-4 h-4 mr-2" />
                                Restaurar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEpkToDelete(epk.id);
                                setDeleteDialogOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visibility Distribution */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-green-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Globe className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Públicos</p>
              <p className="text-xl font-bold">{publicCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Lock className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Privados</p>
              <p className="text-xl font-bold">{privateCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Shield className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-sm text-muted-foreground">Protegidos</p>
              <p className="text-xl font-bold">{protectedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar EPK?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El EPK y todos sus datos serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FileIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}