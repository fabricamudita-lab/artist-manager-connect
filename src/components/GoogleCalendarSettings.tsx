import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, ExternalLink } from 'lucide-react';

interface GoogleCalendarSettingsProps {
  defaultUrl?: string;
}

export const GoogleCalendarSettings = ({ defaultUrl = '' }: GoogleCalendarSettingsProps) => {
  const [embedUrl, setEmbedUrl] = useState(defaultUrl || 'https://calendar.google.com/calendar/embed?src=b26df3cf4e4853a651813616d4d56f297de2b51075f5dcc18f45d99b4d9a838e%40group.calendar.google.com&ctz=Europe%2FMadrid');
  const [showCalendar, setShowCalendar] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar
        </CardTitle>
        <CardDescription>
          Visualiza tu calendario de Google integrado en la aplicación
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="embed-url">URL de embed del calendario</Label>
          <Input
            id="embed-url"
            placeholder="https://calendar.google.com/calendar/embed?src=..."
            value={embedUrl}
            onChange={(e) => setEmbedUrl(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Usa la URL de integración (embed) de tu Google Calendar
          </p>
        </div>

        <Button
          onClick={() => setShowCalendar(!showCalendar)}
          className="w-full"
          variant={showCalendar ? "secondary" : "default"}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {showCalendar ? 'Ocultar calendario' : 'Mostrar calendario'}
        </Button>

        {showCalendar && embedUrl && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Vista previa del calendario</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(embedUrl.replace('/embed', '/r'), '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir en Google
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <iframe
                src={embedUrl}
                style={{ border: 0 }}
                width="100%"
                height="600"
                frameBorder="0"
                scrolling="no"
                title="Google Calendar"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
