import { usePageTitle } from '@/hooks/useCommon';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { DollarSign, Music, Users, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Royalties() {
  usePageTitle('Royalties');
  const { profile } = useAuth();

  const platforms = [
    { name: 'Spotify', amount: 1250.50, icon: '🎵', color: 'text-green-500' },
    { name: 'Apple Music', amount: 980.25, icon: '🍎', color: 'text-red-500' },
    { name: 'YouTube', amount: 750.80, icon: '▶️', color: 'text-red-600' },
    { name: 'Amazon Music', amount: 420.15, icon: '🛒', color: 'text-orange-500' },
    { name: 'Tidal', amount: 180.50, icon: '🌊', color: 'text-blue-500' },
  ];

  const totalEarnings = platforms.reduce((sum, platform) => sum + platform.amount, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Royalties</h1>
        <p className="text-muted-foreground">
          Gestiona tus ganancias y splits de canciones
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ganancias</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canciones</CardTitle>
            <Music className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Con splits activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Colaboradores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Artistas activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximo Pago</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Sin pagos programados</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="earnings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="earnings">Ganancias por Plataforma</TabsTrigger>
          <TabsTrigger value="songs">Splits de Canciones</TabsTrigger>
          <TabsTrigger value="payments">Pagos Programados</TabsTrigger>
        </TabsList>

        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ganancias por Plataforma</CardTitle>
              <CardDescription>
                Desglose de ingresos de cada plataforma de streaming
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {platforms.map((platform) => (
                <div
                  key={platform.name}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{platform.icon}</div>
                    <div>
                      <p className="font-medium">{platform.name}</p>
                      <p className="text-sm text-muted-foreground">Últimos 6 meses</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold ${platform.color}`}>
                      ${platform.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="songs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Splits de Canciones</CardTitle>
              <CardDescription>
                Administra los porcentajes de regalías para cada canción
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Music className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No hay canciones con splits configurados</p>
                <p className="text-sm mt-2">Agrega canciones para gestionar sus splits</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pagos Programados</CardTitle>
              <CardDescription>
                Pagos calculados cada 6 meses según los splits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No hay pagos programados</p>
                <p className="text-sm mt-2">Los pagos se calcularán automáticamente cada 6 meses</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
