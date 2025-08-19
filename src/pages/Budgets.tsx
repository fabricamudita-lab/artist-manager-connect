import { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks/useCommon';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, Calendar, MapPin, User, Calculator, Trash2, Truck, MicIcon } from 'lucide-react';
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
  profiles?: {
    full_name: string;
  };
}
export default function Budgets() {
  usePageTitle('Presupuestos');
  const {
    profile
  } = useAuth();
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
      const {
        data,
        error
      } = await supabase.from('budgets').select(`
          *,
          profiles!budgets_artist_id_fkey(full_name)
        `).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setBudgets(data as any || []);
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
  const filteredAndSortedBudgets = budgets.filter(budget => {
    const matchesSearch = budget.name.toLowerCase().includes(searchTerm.toLowerCase()) || budget.city?.toLowerCase().includes(searchTerm.toLowerCase()) || budget.venue?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || budget.type === filterType;
    const matchesStatus = filterStatus === 'all' || budget.show_status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  }).sort((a, b) => {
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
      case 'confirmado':
        return 'bg-green-100 text-green-800';
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'concierto':
        return <Truck className="w-4 h-4" />;
      case 'produccion_musical':
        return <MicIcon className="w-4 h-4" />;
      case 'campana_promocional':
        return '📣';
      case 'videoclip':
        return '🎬';
      default:
        return '🧩';
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
    return <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Cargando presupuestos...</p>
        </div>
      </div>;
  }
  return <div className="container-moodita section-spacing space-y-8">
      {/* Hero Header */}
      <div className="card-moodita p-8 bg-gradient-accent text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Calculator className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-playfair font-bold">Presupuestos</h1>
              <p className="text-white/90 mt-1">
                Gestiona todos los presupuestos de la empresa
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="btn-primary bg-white/20 hover:bg-white/30 text-white border-white/20">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Presupuesto
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="card-moodita hover-lift">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input placeholder="Buscar por nombre, ciudad o lugar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-modern pl-10" />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full lg:w-48 input-modern">
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
              <SelectTrigger className="w-full lg:w-48 input-modern">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={value => {
            const [field, order] = value.split('-') as [typeof sortBy, typeof sortOrder];
            setSortBy(field);
            setSortOrder(order);
          }}>
              <SelectTrigger className="w-full lg:w-48 input-modern">
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
      </div>

      {/* Budgets Table */}
      {filteredAndSortedBudgets.length === 0 ? <div className="card-moodita">
          <CardContent className="p-16 text-center">
            <div className="w-20 h-20 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Calculator className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-3">No hay presupuestos</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all' ? "No se encontraron presupuestos con los filtros aplicados" : "Crea tu primer presupuesto para comenzar a organizar tus proyectos"}
            </p>
            {!searchTerm && filterType === 'all' && filterStatus === 'all' && <Button onClick={() => setShowCreateDialog(true)} className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Crear Presupuesto
              </Button>}
          </CardContent>
        </div> : <div className="card-moodita overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="border-0">
                  <TableHead className="font-semibold w-[80px]">Tipo</TableHead>
                  <TableHead className="font-semibold">Presupuesto</TableHead>
                  <TableHead className="font-semibold">Ubicación</TableHead>
                  <TableHead className="font-semibold">Fecha</TableHead>
                  <TableHead className="font-semibold">Hora</TableHead>
                  <TableHead className="font-semibold">Presupuesto</TableHead>
                  <TableHead className="font-semibold">Estado</TableHead>
                  <TableHead className="font-semibold">Artista</TableHead>
                  <TableHead className="w-[100px] font-semibold">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedBudgets.map(budget => <TableRow key={budget.id} className="cursor-pointer hover:bg-muted/30 transition-colors border-0 group" onClick={() => setSelectedBudget(budget)}>
                    <TableCell className="py-4">
                      <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                        <div className="text-white">{getTypeIcon(budget.type)}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium py-4">
                      <div className="space-y-1">
                        <p className="font-semibold group-hover:text-primary transition-colors">{budget.name}</p>
                        {budget.venue && <p className="text-sm text-muted-foreground line-clamp-1">{budget.venue}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      {budget.city && budget.country ? <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-secondary" />
                          <span className="text-sm">{budget.city}, {budget.country}</span>
                        </div> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="py-4">
                      {budget.event_date ? <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-accent" />
                          <span className="text-sm font-medium">
                            {new Date(budget.event_date).toLocaleDateString()}
                          </span>
                        </div> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="py-4">
                      {budget.event_time ? <span className="text-sm font-medium">{budget.event_time}</span> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="py-4">
                      {budget.fee > 0 ? <div className="badge-success">
                          €{budget.fee.toLocaleString()}
                        </div> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge className={getStatusColor(budget.show_status)}>
                        {budget.show_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4">
                      {budget.profiles ? <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">{budget.profiles.full_name}</span>
                        </div> : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="py-4">
                      <Button size="sm" variant="ghost" onClick={e => {
                  e.stopPropagation();
                  setSelectedBudget(budget);
                }} className="btn-ghost-modern">
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>)}
              </TableBody>
            </Table>
          </div>
        </div>}

      {/* Dialogs */}
      <CreateBudgetDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} onSuccess={fetchBudgets} />
      
      {selectedBudget && <BudgetDetailsDialog open={!!selectedBudget} onOpenChange={open => !open && setSelectedBudget(null)} budget={selectedBudget} onUpdate={fetchBudgets} onDelete={() => {
      setSelectedBudget(null);
      fetchBudgets();
    }} />}
    </div>;
}