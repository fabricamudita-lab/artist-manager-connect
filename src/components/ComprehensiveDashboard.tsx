import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DollarSign, 
  FileText, 
  Calendar, 
  TrendingUp, 
  Plus, 
  ArrowRight,
  Copy,
  ExternalLink,
  Activity,
  Users,
  Globe
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface DashboardStats {
  activeBudgets: number;
  publishedEPKs: number;
  monthlyIncome: number;
  upcomingEvents: number;
}

interface Budget {
  id: string;
  name: string;
  status: string;
  created_at: string;
  total?: number;
}

interface EPK {
  id: string;
  titulo: string;
  slug: string;
  creado_en: string;
  vistas_totales?: number;
}

interface DashboardCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  loading?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function DashboardCard({ title, value, description, icon, loading, trend }: DashboardCardProps) {
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <div className="flex items-center space-x-2">
              <p className="text-xs text-muted-foreground">{description}</p>
              {trend && (
                <div className={cn(
                  "flex items-center text-xs font-medium",
                  trend.isPositive ? "text-emerald-600" : "text-red-600"
                )}>
                  <TrendingUp className={cn(
                    "h-3 w-3 mr-1",
                    !trend.isPositive && "rotate-180"
                  )} />
                  {Math.abs(trend.value)}%
                </div>
              )}
            </div>
          </div>
          <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <DashboardCard
            key={i}
            title=""
            value=""
            description=""
            icon={<div />}
            loading
          />
        ))}
      </div>
      
      {/* Lists */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ComprehensiveDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activeBudgets: 0,
    publishedEPKs: 0,
    monthlyIncome: 0,
    upcomingEvents: 0
  });
  const [recentBudgets, setRecentBudgets] = useState<Budget[]>([]);
  const [recentEPKs, setRecentEPKs] = useState<EPK[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch active budgets count
      const { count: activeBudgetsCount } = await supabase
        .from('budgets')
        .select('*', { count: 'exact', head: true });
      
      // Fetch published EPKs count
      const { count: publishedEPKsCount } = await supabase
        .from('epks')
        .select('*', { count: 'exact', head: true });
      
      // Fetch upcoming events count (next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { count: upcomingEventsCount } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .gte('start_date', new Date().toISOString())
        .lte('start_date', thirtyDaysFromNow.toISOString());
      
      // Fetch recent budgets
      const { data: budgetsData } = await supabase
        .from('budgets')
        .select(`
          id,
          name,
          budget_status,
          created_at,
          budget_items(unit_price, quantity)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Fetch recent EPKs
      const { data: epksData } = await supabase
        .from('epks')
        .select('id, titulo, slug, creado_en, vistas_totales')
        .order('creado_en', { ascending: false })
        .limit(5);
      
      // Calculate monthly income (simplified - would need proper financial data)
      const currentMonth = new Date();
      currentMonth.setDate(1);
      const nextMonth = new Date(currentMonth);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      
      // For now, just use a placeholder calculation
      const monthlyIncome = 0; // Would calculate from actual financial data

      setStats({
        activeBudgets: activeBudgetsCount || 0,
        publishedEPKs: publishedEPKsCount || 0,
        monthlyIncome,
        upcomingEvents: upcomingEventsCount || 0
      });
      
      // Process budgets with totals
      const processedBudgets = (budgetsData || []).map(budget => ({
        id: budget.id,
        name: budget.name,
        status: budget.budget_status,
        created_at: budget.created_at,
        total: (budget.budget_items as any[])?.reduce((sum, item) => 
          sum + (item.unit_price * item.quantity), 0) || 0
      }));
      
      setRecentBudgets(processedBudgets);
      setRecentEPKs(epksData || []);
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del dashboard.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyEPKLink = async (slug: string) => {
    const url = `${window.location.origin}/epk/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Enlace copiado",
        description: "El enlace del EPK se ha copiado al portapapeles.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo copiar el enlace.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string, type: 'budget') => {
    switch (status) {
      case 'borrador':
        return <Badge variant="secondary">Borrador</Badge>;
      case 'en_revision':
        return <Badge variant="outline">En revisión</Badge>;
      case 'aprobado':
        return <Badge className="bg-emerald-100 text-emerald-800">Aprobado</Badge>;
      case 'rechazado':
        return <Badge variant="destructive">Rechazado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button 
          onClick={() => navigate('/budgets')}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Presupuesto
        </Button>
        <Button 
          onClick={() => navigate('/epk-builder')}
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo EPK
        </Button>
        <Button 
          onClick={() => navigate('/booking')}
          variant="outline"
        >
          <Calendar className="h-4 w-4 mr-2" />
          Ir a Booking
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Presupuestos Activos"
          value={stats.activeBudgets}
          description="En curso y pendientes"
          icon={<FileText className="h-6 w-6 text-primary" />}
        />
        <DashboardCard
          title="EPKs Publicados"
          value={stats.publishedEPKs}
          description="Visibles públicamente"
          icon={<Globe className="h-6 w-6 text-primary" />}
        />
        <DashboardCard
          title="Ingresos del Mes"
          value={`€${stats.monthlyIncome.toLocaleString()}`}
          description="Total del mes actual"
          icon={<DollarSign className="h-6 w-6 text-primary" />}
        />
        <DashboardCard
          title="Próximos Eventos"
          value={stats.upcomingEvents}
          description="Siguientes 30 días"
          icon={<Calendar className="h-6 w-6 text-primary" />}
        />
      </div>

      {/* Lists */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Budgets */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Últimos 5 Presupuestos</CardTitle>
              <CardDescription>Presupuestos creados recientemente</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/budgets')}
              className="text-primary hover:text-primary/80"
            >
              Ver todos
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentBudgets.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <div>
                  <p className="text-sm text-muted-foreground">No hay presupuestos aún</p>
                  <Button 
                    variant="link" 
                    onClick={() => navigate('/budgets')}
                    className="text-primary mt-2"
                  >
                    Crear tu primer presupuesto
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recentBudgets.map((budget) => (
                  <div 
                    key={budget.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/budgets/${budget.id}`)}
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{budget.name}</p>
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(budget.status, 'budget')}
                        <span className="text-xs text-muted-foreground">
                          {new Date(budget.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        €{budget.total?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent EPKs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>EPKs Recientes</CardTitle>
              <CardDescription>Últimos EPKs actualizados</CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/epks')}
              className="text-primary hover:text-primary/80"
            >
              Ver todos
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentEPKs.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <Globe className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <div>
                  <p className="text-sm text-muted-foreground">No hay EPKs creados aún</p>
                  <Button 
                    variant="link" 
                    onClick={() => navigate('/epk-builder')}
                    className="text-primary mt-2"
                  >
                    Crear tu primer EPK
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recentEPKs.map((epk) => (
                  <div 
                    key={epk.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-medium">{epk.titulo}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">EPK</Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(epk.creado_en).toLocaleDateString()}
                        </span>
                        {epk.vistas_totales && (
                          <span className="text-xs text-muted-foreground">
                            {epk.vistas_totales} vistas
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyEPKLink(epk.slug);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/epk/${epk.slug}`, '_blank');
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}