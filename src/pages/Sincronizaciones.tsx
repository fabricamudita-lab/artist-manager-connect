import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Film, Kanban, List, Download, FileText, DollarSign, Clock, CheckCircle2, TrendingUp, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { usePageTitle } from '@/hooks/useCommon';
import { EmptyState } from '@/components/ui/empty-state';
import { SyncKanban } from '@/components/sync/SyncKanban';
import { CreateSyncOfferDialog } from '@/components/sync/CreateSyncOfferDialog';
import { CreateFormLinkDialog } from '@/components/sync/CreateFormLinkDialog';
import { exportToCSV } from '@/utils/exportUtils';

export interface SyncOffer {
  id: string;
  production_title: string;
  production_type: string;
  production_company?: string;
  director?: string;
  territory?: string;
  media?: string[];
  duration_years?: number;
  song_title: string;
  song_artist?: string;
  usage_type?: string;
  usage_duration?: string;
  scene_description?: string;
  requester_name?: string;
  requester_email?: string;
  requester_company?: string;
  requester_phone?: string;
  contact_id?: string;
  total_budget?: number;
  music_budget?: number;
  sync_fee?: number;
  master_fee?: number;
  publishing_fee?: number;
  currency?: string;
  master_percentage?: number;
  publishing_percentage?: number;
  master_holder?: string;
  publishing_holder?: string;
  phase: string;
  priority?: string;
  deadline?: string;
  artist_id?: string;
  project_id?: string;
  notes?: string;
  internal_notes?: string;
  contract_url?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export default function Sincronizaciones() {
  usePageTitle('Sincronizaciones');
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [offers, setOffers] = useState<SyncOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showFormLinkDialog, setShowFormLinkDialog] = useState(false);

  useEffect(() => {
    fetchOffers();

    const channel = supabase
      .channel('sync-offers-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sync_offers'
        },
        () => {
          fetchOffers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sync_offers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (error) {
      console.error('Error fetching sync offers:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las ofertas de sincronización.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    try {
      const csvHeaders = {
        production_title: 'Producción',
        production_type: 'Tipo',
        song_title: 'Canción',
        song_artist: 'Artista',
        territory: 'Territorio',
        phase: 'Estado',
        sync_fee: 'Sync Fee (€)',
        master_fee: 'Master Fee (€)',
        publishing_fee: 'Publishing Fee (€)',
        requester_company: 'Empresa Solicitante',
        created_at: 'Fecha Creación'
      };

      const exportData = offers.map(offer => ({
        production_title: offer.production_title || '',
        production_type: offer.production_type || '',
        song_title: offer.song_title || '',
        song_artist: offer.song_artist || '',
        territory: offer.territory || '',
        phase: offer.phase || '',
        sync_fee: offer.sync_fee || 0,
        master_fee: offer.master_fee || 0,
        publishing_fee: offer.publishing_fee || 0,
        requester_company: offer.requester_company || '',
        created_at: new Date(offer.created_at).toLocaleDateString()
      }));

      exportToCSV(exportData, 'sincronizaciones', csvHeaders);
      
      toast({
        title: "Exportación exitosa",
        description: "Las ofertas se han exportado correctamente",
      });
    } catch (error) {
      console.error('Error exporting sync offers:', error);
      toast({
        title: "Error de exportación",
        description: "No se pudieron exportar las ofertas",
        variant: "destructive",
      });
    }
  };

  // Calculate stats
  const stats = {
    total: offers.length,
    enNegociacion: offers.filter(o => o.phase === 'negociacion' || o.phase === 'cotizacion').length,
    confirmadas: offers.filter(o => o.phase === 'licencia_firmada').length,
    totalFacturado: offers
      .filter(o => o.phase === 'facturado')
      .reduce((sum, o) => sum + (o.sync_fee || 0), 0),
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-primary rounded-xl">
              <Film className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gradient-primary tracking-tight">Sincronizaciones</h1>
              <p className="text-muted-foreground">Gestión de licencias para cine, publicidad y TV</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button
              onClick={() => setShowFormLinkDialog(true)}
              variant="outline"
              className="gap-2"
            >
              <LinkIcon className="h-4 w-4" />
              Crear Formulario
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Nueva Oferta
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="card-moodita">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Solicitudes</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-moodita">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">En Negociación</p>
                  <p className="text-2xl font-bold">{stats.enNegociacion}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-moodita">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Confirmadas</p>
                  <p className="text-2xl font-bold">{stats.confirmadas}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="card-moodita">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Facturado</p>
                  <p className="text-2xl font-bold">€{stats.totalFacturado.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="kanban" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="kanban" className="flex items-center gap-2">
              <Kanban className="h-4 w-4" />
              Vista Kanban
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              Vista Lista
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kanban" className="space-y-6">
            {offers.length === 0 ? (
              <EmptyState
                icon={<Film className="w-10 h-10 text-muted-foreground" />}
                title="No hay ofertas de sincronización"
                description="Crea tu primera oferta para comenzar a gestionar licencias de música para cine, publicidad y TV."
                action={{
                  label: "Nueva Oferta",
                  onClick: () => setShowCreateDialog(true)
                }}
              />
            ) : (
              <SyncKanban offers={offers} onUpdate={fetchOffers} />
            )}
          </TabsContent>

          <TabsContent value="list" className="space-y-6">
            <Card className="card-moodita">
              <CardContent className="p-0">
                {offers.length === 0 ? (
                  <EmptyState
                    icon={<Film className="w-10 h-10 text-muted-foreground" />}
                    title="No hay ofertas de sincronización"
                    description="Crea tu primera oferta para comenzar a gestionar licencias."
                    action={{
                      label: "Nueva Oferta",
                      onClick: () => setShowCreateDialog(true)
                    }}
                  />
                ) : (
                  <div className="divide-y divide-border">
                    {offers.map((offer) => (
                      <div
                        key={offer.id}
                        className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{offer.production_title}</span>
                              <Badge variant="outline" className="text-xs">
                                {offer.production_type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              🎵 {offer.song_title} {offer.song_artist && `- ${offer.song_artist}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            {offer.sync_fee && (
                              <span className="text-sm font-medium">
                                €{offer.sync_fee.toLocaleString()}
                              </span>
                            )}
                            <Badge className={getPhaseColor(offer.phase)}>
                              {getPhaseName(offer.phase)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CreateSyncOfferDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onOfferCreated={fetchOffers}
      />

      <CreateFormLinkDialog
        open={showFormLinkDialog}
        onOpenChange={setShowFormLinkDialog}
      />
    </div>
  );
}

function getPhaseColor(phase: string): string {
  switch (phase) {
    case 'solicitud':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'cotizacion':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    case 'negociacion':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    case 'licencia_firmada':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'facturado':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  }
}

function getPhaseName(phase: string): string {
  switch (phase) {
    case 'solicitud':
      return 'Solicitud';
    case 'cotizacion':
      return 'Cotización';
    case 'negociacion':
      return 'Negociación';
    case 'licencia_firmada':
      return 'Licencia Firmada';
    case 'facturado':
      return 'Facturado';
    default:
      return phase;
  }
}