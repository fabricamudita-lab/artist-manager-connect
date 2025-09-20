import { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks/useCommon';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, Calendar, MapPin, User, Calculator, Trash2, Truck, MicIcon, Download, FileText } from 'lucide-react';
import { EPKStatusChip } from '@/components/EPKStatusChip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import CreateBudgetDialog from '@/components/CreateBudgetDialog';
import BudgetDetailsDialog from '@/components/BudgetDetailsDialog';
import { CreateBudgetFromTemplateDialog } from '@/components/CreateBudgetFromTemplateDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { PermissionBoundary, PermissionWrapper } from '@/components/PermissionBoundary';
import { PermissionChip } from '@/components/PermissionChip';
import { useAuthz } from '@/hooks/useAuthz';
import { useGlobalSearch } from '@/hooks/useKeyboardShortcuts';
import { GlobalSearchDialog } from '@/components/GlobalSearchDialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Budget {
  id: string;
  name: string;
  ciudad?: string;
  lugar?: string;
  fecha?: string;
  estado?: string;
  total_amount?: number;
  artist_id?: string;
  created_at: string;
  artists?: {
    nombre_artistico: string;
  };
}

export default function Budgets() {
  usePageTitle('Presupuestos');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterArtist, setFilterArtist] = useState('all');
  const [artists, setArtists] = useState([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const authz = useAuthz();
  const { showGlobalSearch, setShowGlobalSearch } = useGlobalSearch();

  useEffect(() => {
    fetchBudgets();
    fetchArtists();
  }, []);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      // Build the query filters
      const filters: any = {};
      if (filterStatus !== 'all') {
        filters.estado = filterStatus;
      }
      if (filterArtist !== 'all') {
        filters.artist_id = filterArtist;
      }

      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          artists (
            nombre_artistico
          )
        `)
        .match(filters)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setBudgets((data as any) || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los presupuestos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('id, nombre_artistico')
        .order('nombre_artistico', { ascending: true });

      if (error) {
        throw error;
      }

      setArtists(data || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los artistas",
        variant: "destructive"
      });
    }
  };

  const handleDeleteBudget = async (id) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }

      toast({
        title: "Éxito",
        description: "Presupuesto eliminado correctamente",
      });

      fetchBudgets();
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el presupuesto",
        variant: "destructive"
      });
    }
  };

  const handleViewBudget = (budget) => {
    setSelectedBudget(budget);
    setShowDetailsDialog(true);
  };

  const filteredBudgets = budgets.filter(budget => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      budget.name.toLowerCase().includes(searchTermLower) ||
      (budget.artists?.nombre_artistico?.toLowerCase().includes(searchTermLower)) ||
      (budget.ciudad?.toLowerCase().includes(searchTermLower)) ||
      (budget.lugar?.toLowerCase().includes(searchTermLower))
    );
  });

  const handleExportCSV = () => {
    // Implement your CSV export logic here
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
      <div className="container-moodita section-spacing space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-xl">
              <Calculator className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gradient-primary tracking-tight">Presupuestos</h1>
              <p className="text-muted-foreground">Gestiona todos los presupuestos de la empresa</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <PermissionChip />
            <div className="flex gap-3">
              <Button
                onClick={() => handleExportCSV()}
                className="btn-secondary"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
              <PermissionWrapper requiredPermission="createBudget">
                <Button 
                  onClick={() => setShowCreateDialog(true)} 
                  className="btn-primary"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Presupuesto
                </Button>
              </PermissionWrapper>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card-moodita hover-lift">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input 
                  placeholder="Buscar por nombre, ciudad o lugar..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-4">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="enviado">Enviado</SelectItem>
                    <SelectItem value="aprobado">Aprobado</SelectItem>
                    <SelectItem value="rechazado">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={filterArtist} onValueChange={setFilterArtist}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar por artista" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los artistas</SelectItem>
                    {artists.map((artist) => (
                      <SelectItem key={artist.id} value={artist.id}>
                        {artist.nombre_artistico}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </div>

        {/* Budgets Table */}
        <Card className="card-moodita">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-primary" />
              Lista de Presupuestos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredBudgets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay presupuestos que coincidan con los filtros
              </div>
            ) : (
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Artista</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead>Lugar</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Importe</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBudgets.map((budget) => (
                      <Tooltip key={budget.id}>
                        <TooltipTrigger asChild>
                          <TableRow className="hover:bg-muted/50 cursor-pointer">
                            <TableCell className="font-medium">{budget.name}</TableCell>
                            <TableCell>
                              {budget.artists?.nombre_artistico || 'Sin asignar'}
                            </TableCell>
                            <TableCell>{budget.ciudad || '-'}</TableCell>
                            <TableCell>{budget.lugar || '-'}</TableCell>
                            <TableCell>
                              {budget.fecha ? new Date(budget.fecha).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{budget.estado || 'borrador'}</Badge>
                            </TableCell>
                            <TableCell>
                              {budget.total_amount ? `€${budget.total_amount.toLocaleString()}` : '-'}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewBudget(budget)}
                                >
                                  Ver
                                </Button>
                                <PermissionWrapper requiredPermission="manage">
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>¿Eliminar presupuesto?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Esta acción no se puede deshacer. El presupuesto "{budget.name}" será eliminado permanentemente.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteBudget(budget.id)}
                                          className="bg-destructive hover:bg-destructive/90"
                                        >
                                          Eliminar
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </PermissionWrapper>
                              </div>
                            </TableCell>
                          </TableRow>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs p-3">
                          <div className="space-y-1 text-sm">
                            <div><strong>Estado:</strong> {budget.estado || 'borrador'}</div>
                            <div><strong>Importe:</strong> {budget.total_amount ? `€${budget.total_amount.toLocaleString()}` : 'No definido'}</div>
                            <div><strong>Fecha de emisión:</strong> {new Date(budget.created_at).toLocaleDateString()}</div>
                            <div><strong>Categoría:</strong> Presupuesto general</div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TableBody>
                </Table>
              </TooltipProvider>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        <CreateBudgetDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={fetchBudgets}
        />

        <CreateBudgetFromTemplateDialog
          open={showTemplateDialog}
          onOpenChange={setShowTemplateDialog}
          onSuccess={fetchBudgets}
        />

        {selectedBudget && (
          <BudgetDetailsDialog
            open={showDetailsDialog}
            onOpenChange={setShowDetailsDialog}
            budget={selectedBudget}
            onUpdate={fetchBudgets}
          />
        )}
        
        <GlobalSearchDialog 
          open={showGlobalSearch} 
          onOpenChange={setShowGlobalSearch} 
        />
      </div>
    </div>
  );
}
