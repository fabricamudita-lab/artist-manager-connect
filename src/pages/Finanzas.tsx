import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePageTitle } from '@/hooks/useCommon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Calculator, DollarSign, Music, TrendingUp, Users, CreditCard, Info } from 'lucide-react';
import { useRoyaltiesStats, usePlatformEarnings, useSongs } from '@/hooks/useRoyalties';
import { SongSplitsManager } from '@/components/royalties/SongSplitsManager';
import { PlatformEarningsManager } from '@/components/royalties/PlatformEarningsManager';
import { EarningsDistribution } from '@/components/royalties/EarningsDistribution';
import { PaymentTracker } from '@/components/royalties/PaymentTracker';
import { EarningsTrends } from '@/components/royalties/EarningsTrends';
import { ArtistFilter } from '@/components/royalties/ArtistFilter';
import { FinanzasPresupuestos } from '@/components/finanzas/FinanzasPresupuestos';
import { LiquidacionCalculator } from '@/components/finanzas/LiquidacionCalculator';
import { FinanzasOverview } from '@/components/finanzas/FinanzasOverview';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { subMonths, format, parseISO } from 'date-fns';

export default function Finanzas() {
  usePageTitle('Finanzas');
  const [searchParams] = useSearchParams();
  const artistIdFromUrl = searchParams.get('artistId');
  const [selectedArtist, setSelectedArtist] = useState(artistIdFromUrl || 'all');
  const [activeTab, setActiveTab] = useState('ganancias');

  // Update selectedArtist when URL changes
  useEffect(() => {
    if (artistIdFromUrl) {
      setSelectedArtist(artistIdFromUrl);
    }
  }, [artistIdFromUrl]);
  
  const { totalEarnings, songsCount, collaboratorsCount, totalStreams } = useRoyaltiesStats(selectedArtist);
  const { data: allEarnings = [] } = usePlatformEarnings();
  const { data: songs = [] } = useSongs(selectedArtist);

  // Sparkline data: last 6 months
  const sparklineData = useMemo(() => {
    const now = new Date();
    const months: { month: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const key = format(d, 'yyyy-MM');
      months.push({ month: key, value: 0 });
    }

    const songIds = new Set(songs.map(s => s.id));
    const filtered = selectedArtist && selectedArtist !== 'all'
      ? allEarnings.filter(e => songIds.has(e.song_id))
      : allEarnings;

    filtered.forEach(e => {
      if (!e.period_start) return;
      const key = e.period_start.substring(0, 7);
      const entry = months.find(m => m.month === key);
      if (entry) entry.value += Number(e.amount);
    });

    return months;
  }, [allEarnings, songs, selectedArtist]);

  // Contextual subtext for Total Royalties card
  const royaltySubtext = totalEarnings === 0 && songsCount > 0
    ? 'Los royalties tardan 2-6 meses en llegar tras la publicación'
    : totalEarnings === 0 && songsCount === 0
      ? 'Registra canciones para empezar'
      : 'Ingresos fonográficos';

  // Semantic colors for cards
  const royaltyBorder = totalEarnings > 0
    ? 'border-l-green-500'
    : songsCount > 0
      ? 'border-l-blue-500'
      : 'border-l-muted-foreground/30';
  const royaltyIconColor = totalEarnings > 0
    ? 'text-green-500'
    : songsCount > 0
      ? 'text-blue-500'
      : 'text-muted-foreground';

  const streamsBorder = totalStreams > 0 ? 'border-l-green-500' : 'border-l-muted-foreground/30';
  const streamsIconColor = totalStreams > 0 ? 'text-green-500' : 'text-muted-foreground';

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
        <div className="container-moodita section-spacing space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-primary rounded-xl">
                <Calculator className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Finanzas</h1>
                <p className="text-muted-foreground">
                  Gestiona presupuestos, royalties y liquidaciones
                </p>
              </div>
            </div>
            <ArtistFilter value={selectedArtist} onChange={setSelectedArtist} />
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            {/* Total Royalties */}
            <Card className={`card-moodita hover-lift border-l-4 ${royaltyBorder}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Royalties</CardTitle>
                <div className="flex items-center gap-1">
                  {totalEarnings === 0 && songsCount > 0 && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3.5 w-3.5 text-blue-500 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-[200px] text-xs">Es normal. Los royalties de streaming tardan entre 2 y 6 meses en reportarse.</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <DollarSign className={`h-4 w-4 ${royaltyIconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-2xl font-bold">€{totalEarnings.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground">{royaltySubtext}</p>
                  </div>
                  <div className="w-[80px] h-[32px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparklineData}>
                        <defs>
                          <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="hsl(var(--primary))"
                          strokeWidth={1.5}
                          fill="url(#sparkGradient)"
                          dot={false}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Canciones */}
            <Card className="card-moodita hover-lift border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Canciones</CardTitle>
                <Music className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{songsCount}</div>
                <p className="text-xs text-muted-foreground">Con splits registrados</p>
              </CardContent>
            </Card>

            {/* Colaboradores */}
            <Card className="card-moodita hover-lift border-l-4 border-l-violet-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Colaboradores</CardTitle>
                <Users className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{collaboratorsCount}</div>
                <p className="text-xs text-muted-foreground">Participantes activos</p>
              </CardContent>
            </Card>

            {/* Reproducciones */}
            <Card className={`card-moodita hover-lift border-l-4 ${streamsBorder}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reproducciones</CardTitle>
                <TrendingUp className={`h-4 w-4 ${streamsIconColor}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStreams.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Total streams</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Tabs: 3 primary */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
              <TabsTrigger value="ganancias" className="data-[state=active]:bg-background">
                <DollarSign className="h-4 w-4 mr-1" />
                Ganancias
              </TabsTrigger>
              <TabsTrigger value="presupuestos" className="data-[state=active]:bg-background">
                <Calculator className="h-4 w-4 mr-1" />
                Presupuestos
              </TabsTrigger>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="pagos" className="data-[state=active]:bg-background">
                    <Users className="h-4 w-4 mr-1" />
                    Pagos a Artistas
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Gestiona cuánto y cuándo cobran tus artistas y colaboradores</p>
                </TooltipContent>
              </Tooltip>
            </TabsList>

            {/* Ganancias tab with sub-tabs */}
            <TabsContent value="ganancias" className="space-y-4">
              <Tabs defaultValue="resumen" className="space-y-4">
                <TabsList className="bg-muted/30">
                  <TabsTrigger value="resumen">Resumen</TabsTrigger>
                  <TabsTrigger value="songs">Canciones & Splits</TabsTrigger>
                  <TabsTrigger value="plataformas">Por Plataforma</TabsTrigger>
                </TabsList>
                <TabsContent value="resumen" className="space-y-6">
                  <FinanzasOverview artistId={selectedArtist} />
                  <EarningsTrends artistId={selectedArtist} />
                </TabsContent>
                <TabsContent value="songs" className="space-y-4">
                  <SongSplitsManager artistId={selectedArtist} />
                </TabsContent>
                <TabsContent value="plataformas" className="space-y-4">
                  <PlatformEarningsManager artistId={selectedArtist} />
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Presupuestos tab */}
            <TabsContent value="presupuestos" className="space-y-4">
              <FinanzasPresupuestos />
            </TabsContent>

            {/* Pagos a Artistas tab with sub-tabs */}
            <TabsContent value="pagos" className="space-y-4">
              <Tabs defaultValue="calculadora" className="space-y-4">
                <TabsList className="bg-muted/30">
                  <TabsTrigger value="calculadora">Liquidación</TabsTrigger>
                  <TabsTrigger value="historial">Historial de Pagos</TabsTrigger>
                </TabsList>
                <TabsContent value="calculadora" className="space-y-4">
                  <LiquidacionCalculator artistId={selectedArtist} />
                </TabsContent>
                <TabsContent value="historial" className="space-y-4">
                  <PaymentTracker artistId={selectedArtist} />
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
}
