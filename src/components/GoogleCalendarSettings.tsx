import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useGoogleCalendarSync } from '@/hooks/useGoogleCalendarSync';
import { RefreshCw, Calendar } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleCalendarSettingsProps {
  defaultUrl?: string;
}

export const GoogleCalendarSettings = ({ defaultUrl = 'https://calendar.google.com/calendar/ical/b26df3cf4e4853a651813616d4d56f297de2b51075f5dcc18f45d99b4d9a838e%40group.calendar.google.com/private-b924938f038b3859fd24329dcbf73591/basic.ics' }: GoogleCalendarSettingsProps) => {
  const [icalUrl, setIcalUrl] = useState(defaultUrl);
  const [autoSync, setAutoSync] = useState(true);
  const { syncGoogleCalendar, syncing, lastSync } = useGoogleCalendarSync();

  const handleSync = async () => {
    if (!icalUrl) {
      toast.error('Por favor, introduce la URL del calendario');
      return;
    }
    await syncGoogleCalendar(icalUrl);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          Sincroniza eventos desde tu Google Calendar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ical-url">URL del calendario iCal (privada)</Label>
          <Input
            id="ical-url"
            placeholder="https://calendar.google.com/calendar/ical/.../private-.../basic.ics"
            value={icalUrl}
            onChange={(e) => setIcalUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Usa la URL <strong>privada</strong> (.ics) de tu Google Calendar. Las URLs públicas no funcionan.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Sincronización automática</Label>
            <p className="text-xs text-muted-foreground">
              Sincronizar cada 30 minutos
            </p>
          </div>
          <Switch
            checked={autoSync}
            onCheckedChange={setAutoSync}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSync}
            disabled={!icalUrl || syncing}
            className="flex-1"
          >
            {syncing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sincronizar ahora
              </>
            )}
          </Button>
        </div>

        {lastSync && (
          <p className="text-xs text-muted-foreground text-center">
            Última sincronización: {lastSync.toLocaleString('es-ES')}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
