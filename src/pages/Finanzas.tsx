import { useState } from 'react';
import { usePageTitle } from '@/hooks/useCommon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, DollarSign, Music, TrendingUp, Users, CreditCard, BarChart3, PieChart } from 'lucide-react';
import { useRoyaltiesStats } from '@/hooks/useRoyalties';
import { SongSplitsManager } from '@/components/royalties/SongSplitsManager';
import { PlatformEarningsManager } from '@/components/royalties/PlatformEarningsManager';
import { EarningsDistribution } from '@/components/royalties/EarningsDistribution';
import { PaymentTracker } from '@/components/royalties/PaymentTracker';
import { EarningsTrends } from '@/components/royalties/EarningsTrends';
import { ArtistFilter } from '@/components/royalties/ArtistFilter';
import { FinanzasPresupuestos } from '@/components/finanzas/FinanzasPresupuestos';
import { LiquidacionCalculator } from '@/components/finanzas/LiquidacionCalculator';
import { FinanzasOverview } from '@/components/finanzas/FinanzasOverview';

export default function Finanzas() {
  usePageTitle('Finanzas');
  const [selectedArtist, setSelectedArtist] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  
  const { totalEarnings, songsCount, collaboratorsCount, totalStreams } = useRoyaltiesStats(selectedArtist);

  return (
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
          <Card className="card-moodita hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Royalties</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{totalEarnings.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Ingresos fonográficos</p>
            </CardContent>
          </Card>

          <Card className="card-moodita hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Canciones</CardTitle>
              <Music className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{songsCount}</div>
              <p className="text-xs text-muted-foreground">Con splits registrados</p>
            </CardContent>
          </Card>

          <Card className="card-moodita hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Colaboradores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{collaboratorsCount}</div>
              <p className="text-xs text-muted-foreground">Participantes activos</p>
            </CardContent>
          </Card>

          <Card className="card-moodita hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reproducciones</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStreams.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total streams</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="overview" className="data-[state=active]:bg-background">
              <PieChart className="h-4 w-4 mr-1" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="presupuestos" className="data-[state=active]:bg-background">
              <Calculator className="h-4 w-4 mr-1" />
              Presupuestos
            </TabsTrigger>
            <TabsTrigger value="songs" className="data-[state=active]:bg-background">
              <Music className="h-4 w-4 mr-1" />
              Canciones & Splits
            </TabsTrigger>
            <TabsTrigger value="earnings" className="data-[state=active]:bg-background">
              <DollarSign className="h-4 w-4 mr-1" />
              Ganancias
            </TabsTrigger>
            <TabsTrigger value="liquidacion" className="data-[state=active]:bg-background">
              <CreditCard className="h-4 w-4 mr-1" />
              Liquidación
            </TabsTrigger>
            <TabsTrigger value="trends" className="data-[state=active]:bg-background">
              <BarChart3 className="h-4 w-4 mr-1" />
              Tendencias
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <FinanzasOverview artistId={selectedArtist} />
          </TabsContent>

          <TabsContent value="presupuestos" className="space-y-4">
            <FinanzasPresupuestos />
          </TabsContent>

          <TabsContent value="songs" className="space-y-4">
            <SongSplitsManager artistId={selectedArtist} />
          </TabsContent>

          <TabsContent value="earnings" className="space-y-4">
            <PlatformEarningsManager artistId={selectedArtist} />
          </TabsContent>

          <TabsContent value="liquidacion" className="space-y-4">
            <LiquidacionCalculator artistId={selectedArtist} />
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <EarningsTrends artistId={selectedArtist} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
