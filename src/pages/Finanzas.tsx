import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { usePageTitle } from '@/hooks/useCommon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Calculator, DollarSign, Music, TrendingUp, Users, LayoutDashboard, Info } from 'lucide-react';
import { useRoyaltiesStats, usePlatformEarnings, useSongs } from '@/hooks/useRoyalties';
import { SongSplitsManager } from '@/components/royalties/SongSplitsManager';
import { PlatformEarningsManager } from '@/components/royalties/PlatformEarningsManager';
import { EarningsDistribution } from '@/components/royalties/EarningsDistribution';
import { PaymentTracker } from '@/components/royalties/PaymentTracker';
import { EarningsTrends } from '@/components/royalties/EarningsTrends';
import { ArtistFilter } from '@/components/royalties/ArtistFilter';
import Budgets from '@/pages/Budgets';
import { LiquidacionCalculator } from '@/components/finanzas/LiquidacionCalculator';
import { FinanzasOverview } from '@/components/finanzas/FinanzasOverview';
import { FinanzasPanelTab } from '@/components/finanzas/FinanzasPanelTab';

export default function Finanzas() {
  usePageTitle('Finanzas');
  const [searchParams] = useSearchParams();
  const artistIdFromUrl = searchParams.get('artistId');
  const tabFromUrl = searchParams.get('tab');
  const [selectedArtist, setSelectedArtist] = useState(artistIdFromUrl || 'all');
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'panel');

  useEffect(() => {
    if (artistIdFromUrl) setSelectedArtist(artistIdFromUrl);
  }, [artistIdFromUrl]);

  useEffect(() => {
    if (tabFromUrl) setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

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

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="flex-wrap h-auto gap-1 bg-muted/50 p-1">
              <TabsTrigger value="panel" className="data-[state=active]:bg-background">
                <LayoutDashboard className="h-4 w-4 mr-1" />
                Panel
              </TabsTrigger>
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

            {/* Panel tab - financial dashboard */}
            <TabsContent value="panel" className="space-y-4">
              <FinanzasPanelTab artistId={selectedArtist} />
            </TabsContent>

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

            {/* Pagos a Artistas tab */}
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
