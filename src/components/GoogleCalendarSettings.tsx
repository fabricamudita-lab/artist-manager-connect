import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
export const GoogleCalendarSettings = () => {
  const {
    isConnected,
    loading,
    getAuthUrl,
    disconnect
  } = useGoogleCalendar();
  const handleConnect = () => {
    window.location.href = getAuthUrl();
  };
  if (loading) {
    return <Card>
        <CardContent className="py-6">
          <p className="text-center text-muted-foreground">Cargando...</p>
        </CardContent>
      </Card>;
  }
  return <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Conectar Calendario 
        </CardTitle>
        <CardDescription>
          Conecta tu cuenta de Google para crear y sincronizar eventos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            {isConnected ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
            <div>
              <p className="font-medium">
                {isConnected ? 'Conectado' : 'No conectado'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isConnected ? 'Puedes crear eventos en Google Calendar' : 'Conecta tu cuenta para empezar'}
              </p>
            </div>
          </div>
          
          {isConnected ? <Button variant="outline" onClick={disconnect}>
              Desconectar
            </Button> : <Button onClick={handleConnect}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Conectar con Google
            </Button>}
        </div>

        {isConnected && <div className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
            <p className="font-medium mb-1">✓ Funciones disponibles:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Crear eventos en Google Calendar desde Lovable</li>
              <li>Los eventos se sincronizan automáticamente</li>
              <li>Visualiza todos tus eventos en un solo lugar</li>
            </ul>
          </div>}
      </CardContent>
    </Card>;
};