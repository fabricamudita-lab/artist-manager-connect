import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
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
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PermissionChip } from '@/components/PermissionChip';
import { PermissionWrapper } from '@/components/PermissionBoundary';

interface EPKData {
  id: string;
  titulo: string;
  artista_proyecto: string;
  slug: string;
  visibilidad: string; // Allow any string since the enum might not be typed correctly
  actualizado_en: string;
  vistas_totales: number;
  vistas_unicas: number;
  creado_por: string;
  creado_en: string;
  acceso_directo: boolean;
  etiquetas?: string[];
  projects?: any;
  artists?: any;
}

export default function EPKs() {
  const navigate = useNavigate();
  const [epks, setEpks] = useState<EPKData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('updated_desc');

  useEffect(() => {
    fetchEPKs();
  }, [searchTerm, visibilityFilter, sortBy]);

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
    const url = `${window.location.origin}/epk/${slug}`;
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
      // Get the original EPK data
      const { data: originalEpk, error: fetchError } = await supabase
        .from('epks')
        .select('*')
        .eq('id', epkId)
        .single();

      if (fetchError) throw fetchError;

      // Create duplicate with modified title and new slug
      const duplicateData = {
        ...originalEpk,
        id: undefined, // Let it generate a new ID
        titulo: `${originalEpk.titulo} - Copia`,
        slug: `${originalEpk.slug}-copia-${Date.now()}`,
        vistas_totales: 0,
        vistas_unicas: 0,
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString()
      };

      delete duplicateData.id; // Ensure the id is removed

      const { data: newEpk, error: insertError } = await supabase
        .from('epks')
        .insert([duplicateData])
        .select()
        .single();

      if (insertError) throw insertError;

      toast({
        title: "EPK duplicado",
        description: "Se ha creado una copia del EPK"
      });

      fetchEPKs(); // Refresh the list
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
        .update({ acceso_directo: false }) // Use existing field instead of archivado
        .eq('id', epkId);

      if (error) throw error;

      toast({
        title: "EPK archivado",
        description: "El EPK ha sido marcado como inactivo"
      });

      fetchEPKs(); // Refresh the list
    } catch (error) {
      console.error('Error archiving EPK:', error);
      toast({
        title: "Error",
        description: "No se pudo archivar el EPK",
        variant: "destructive"
      });
    }
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'publico':
        return <Globe className="w-4 h-4" />;
      case 'privado':
        return <Lock className="w-4 h-4" />;
      case 'protegido_password':
        return <Shield className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'publico':
        return <Badge variant="default">Público</Badge>;
      case 'privado':
        return <Badge variant="secondary">Privado</Badge>;
      case 'protegido_password':
        return <Badge variant="outline">Protegido</Badge>;
      default:
        return <Badge variant="secondary">{visibility}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando EPKs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">EPKs</h1>
          <p className="text-muted-foreground">
            Gestiona tus Electronic Press Kits
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PermissionChip />
          <PermissionWrapper requiredPermission="createEPK">
            <Button onClick={() => navigate('/epk-builder')}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo EPK
            </Button>
          </PermissionWrapper>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros y búsqueda</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título, slug o artista..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
              <SelectTrigger className="w-[180px]">
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
              <SelectTrigger className="w-[180px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_desc">Más reciente</SelectItem>
                <SelectItem value="updated_asc">Más antiguo</SelectItem>
                <SelectItem value="views_desc">Más vistas</SelectItem>
                <SelectItem value="title_asc">Título A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* EPKs Table */}
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
                  <TableHead>Enlace</TableHead>
                  <TableHead className="w-[70px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {epks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="text-muted-foreground">
                        No se encontraron EPKs
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  epks.map((epk) => (
                    <TableRow key={epk.id} className={!epk.acceso_directo ? 'opacity-50' : ''}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{epk.titulo}</div>
                          <div className="text-sm text-muted-foreground">
                            {epk.artista_proyecto}
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
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {epk.vistas_totales.toLocaleString()} total
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {epk.vistas_unicas.toLocaleString()} únicas
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLink(epk.slug)}
                          className="text-primary hover:text-primary/80"
                        >
                          /{epk.slug}
                          <Copy className="w-3 h-3 ml-2" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background border shadow-lg">
                            <DropdownMenuItem 
                              onClick={() => navigate(`/epk-builder/${epk.id}`)}
                              className="hover:bg-muted cursor-pointer"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => window.open(`/epk/${epk.slug}`, '_blank')}
                              className="hover:bg-muted cursor-pointer"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Ver como invitado
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleCopyLink(epk.slug)}
                              className="hover:bg-muted cursor-pointer"
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Copiar enlace
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDuplicate(epk.id)}
                              className="hover:bg-muted cursor-pointer"
                            >
                              <Users className="w-4 h-4 mr-2" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleArchive(epk.id)}
                              className="hover:bg-muted cursor-pointer text-destructive"
                            >
                              <Archive className="w-4 h-4 mr-2" />
                              Archivar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Públicos</p>
                <p className="text-lg font-bold">
                  {epks.filter(e => e.visibilidad === 'publico').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-sm font-medium">Privados</p>
                <p className="text-lg font-bold">
                  {epks.filter(e => e.visibilidad === 'privado').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total vistas</p>
                <p className="text-lg font-bold">
                  {epks.reduce((sum, epk) => sum + epk.vistas_totales, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Total EPKs</p>
                <p className="text-lg font-bold">{epks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}