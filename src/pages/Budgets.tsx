import { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks/useCommon';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, Calendar, MapPin, User, Calculator, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import CreateBudgetDialog from '@/components/CreateBudgetDialog';
import BudgetDetailsDialog from '@/components/BudgetDetailsDialog';

interface Budget {
  id: string;
  name: string;
  type: 'concierto' | 'produccion_musical' | 'campana_promocional' | 'videoclip' | 'otros';
  city: string;
  country: string;
  venue: string;
  budget_status: 'nacional' | 'internacional';
  show_status: 'confirmado' | 'pendiente' | 'cancelado';
  internal_notes: string;
  created_at: string;
  artist_id: string;
  event_date: string;
  event_time: string;
  fee: number;
  profiles?: { full_name: string };
}

export default function Budgets() {
  usePageTitle('Presupuestos');
  const { profile } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'created_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  useEffect(() => {
    fetchBudgets();
  }, []);

  const fetchBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          profiles!budgets_artist_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
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

  const filteredAndSortedBudgets = budgets
    .filter(budget => {
      const matchesSearch = budget.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           budget.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           budget.venue?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || budget.type === filterType;
      const matchesStatus = filterStatus === 'all' || budget.show_status === filterStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    })
    .sort((a, b) => {
      let aValue: string | Date;
      let bValue: string | Date;
      
      switch (sortBy) {
        case 'date':
          aValue = a.event_date ? new Date(a.event_date) : new Date('1900-01-01');
          bValue = b.event_date ? new Date(b.event_date) : new Date('1900-01-01');
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado': return 'bg-green-100 text-green-800';
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'concierto': return '🎤';
      case 'produccion_musical': return '🎧';
      case 'campana_promocional': return '📣';
      case 'videoclip': return '🎬';
      default: return '🧩';
    }
  };

  const formatType = (type: string) => {
    const types = {
      'concierto': 'Concierto',
      'produccion_musical': 'Producción Musical',
      'campana_promocional': 'Campaña Promocional',
      'videoclip': 'Videoclip',
      'otros': 'Otros'
    };
    return types[type as keyof typeof types] || type;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando presupuestos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Presupuestos</h1>
          <p className="text-muted-foreground">
            Gestiona todos los presupuestos de la empresa
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Presupuesto
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
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
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="concierto">Concierto</SelectItem>
                <SelectItem value="produccion_musical">Producción Musical</SelectItem>
                <SelectItem value="campana_promocional">Campaña Promocional</SelectItem>
                <SelectItem value="videoclip">Videoclip</SelectItem>
                <SelectItem value="otros">Otros</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-') as [typeof sortBy, typeof sortOrder];
              setSortBy(field);
              setSortOrder(order);
            }}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">Más recientes</SelectItem>
                <SelectItem value="created_at-asc">Más antiguos</SelectItem>
                <SelectItem value="name-asc">Nombre A-Z</SelectItem>
                <SelectItem value="name-desc">Nombre Z-A</SelectItem>
                <SelectItem value="date-desc">Fecha evento (más reciente)</SelectItem>
                <SelectItem value="date-asc">Fecha evento (más antiguo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Budgets Table */}
      {filteredAndSortedBudgets.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calculator className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay presupuestos</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all' 
                ? "No se encontraron presupuestos con los filtros aplicados"
                : "Crea tu primer presupuesto para comenzar"
              }
            </p>
            {(!searchTerm && filterType === 'all' && filterStatus === 'all') && (
              <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Crear Presupuesto
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Artista</TableHead>
                    <TableHead className="w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedBudgets.map((budget) => (
                    <TableRow 
                      key={budget.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedBudget(budget)}
                    >
                      <TableCell className="font-medium">
                        <div>
                          <p className="font-semibold">{budget.name}</p>
                          {budget.venue && (
                            <p className="text-sm text-muted-foreground line-clamp-1">{budget.venue}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{getTypeIcon(budget.type)}</span>
                          <span className="text-sm">{formatType(budget.type)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {budget.city && budget.country ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="text-sm">{budget.city}, {budget.country}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {budget.event_date ? (
                          <span className="text-sm">
                            {new Date(budget.event_date).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {budget.event_time ? (
                          <span className="text-sm">{budget.event_time}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {budget.fee > 0 ? (
                          <span className="text-sm font-medium text-green-600">
                            €{budget.fee.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(budget.show_status)}>
                          {budget.show_status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {budget.profiles ? (
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span className="text-sm">{budget.profiles.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBudget(budget);
                          }}
                        >
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <CreateBudgetDialog 
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchBudgets}
      />
      
      {selectedBudget && (
        <BudgetDetailsDialog
          open={!!selectedBudget}
          onOpenChange={(open) => !open && setSelectedBudget(null)}
          budget={selectedBudget}
          onUpdate={fetchBudgets}
          onDelete={() => {
            setSelectedBudget(null);
            fetchBudgets();
          }}
        />
      )}
    </div>
  );
}