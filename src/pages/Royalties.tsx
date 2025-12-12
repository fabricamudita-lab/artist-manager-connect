import { useState } from 'react';
import { usePageTitle } from '@/hooks/useCommon';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Music, Users, TrendingUp, CreditCard, BarChart3 } from 'lucide-react';
import { useRoyaltiesStats } from '@/hooks/useRoyalties';
import { SongSplitsManager } from '@/components/royalties/SongSplitsManager';
import { PlatformEarningsManager } from '@/components/royalties/PlatformEarningsManager';
import { EarningsDistribution } from '@/components/royalties/EarningsDistribution';
import { PaymentTracker } from '@/components/royalties/PaymentTracker';
import { EarningsTrends } from '@/components/royalties/EarningsTrends';
import { ArtistFilter } from '@/components/royalties/ArtistFilter';

export default function Royalties() {
  usePageTitle('Royalties');
  const [selectedArtist, setSelectedArtist] = useState('all');
  
  const { totalEarnings, songsCount, collaboratorsCount, totalStreams } = useRoyaltiesStats();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Royalties</h1>
          <p className="text-muted-foreground">
            Gestiona tus ganancias y splits de canciones
          </p>
        </div>
        <ArtistFilter value={selectedArtist} onChange={setSelectedArtist} />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ganancias</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Acumulado total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canciones</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{songsCount}</div>
            <p className="text-xs text-muted-foreground">Registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Colaboradores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{collaboratorsCount}</div>
            <p className="text-xs text-muted-foreground">Con splits activos</p>
          </CardContent>
        </Card>

        <Card>
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

      <Tabs defaultValue="songs" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="songs">
            <Music className="h-4 w-4 mr-1" />
            Canciones
          </TabsTrigger>
          <TabsTrigger value="earnings">
            <DollarSign className="h-4 w-4 mr-1" />
            Ganancias
          </TabsTrigger>
          <TabsTrigger value="distribution">
            <Users className="h-4 w-4 mr-1" />
            Distribución
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="h-4 w-4 mr-1" />
            Pagos
          </TabsTrigger>
          <TabsTrigger value="trends">
            <BarChart3 className="h-4 w-4 mr-1" />
            Tendencias
          </TabsTrigger>
        </TabsList>

        <TabsContent value="songs" className="space-y-4">
          <SongSplitsManager />
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          <PlatformEarningsManager />
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <EarningsDistribution />
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <PaymentTracker />
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <EarningsTrends />
        </TabsContent>
      </Tabs>
    </div>
  );
}
