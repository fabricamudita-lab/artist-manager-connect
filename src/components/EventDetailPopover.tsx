import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Edit, Trash2, Mail, MoreHorizontal, X, MapPin, AlignLeft, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Event {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  event_type: string;
  location: string | null;
  artist_id: string;
}

interface EventDetailPopoverProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistName?: string;
  createdBy?: string;
  onEdit?: (event: Event) => void;
  onDelete?: (eventId: string) => void;
  position?: { x: number; y: number };
}

export function EventDetailPopover({ 
  event, 
  open, 
  onOpenChange, 
  artistName = "David Solans",
  createdBy = "Fabrica Mudita",
  onEdit,
  onDelete,
  position = { x: 0, y: 0 }
}: EventDetailPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  console.log('EventDetailPopover rendering with event:', event);
  if (!event || !open) return null;

  console.log('Event start_date:', event.start_date);
  console.log('Event end_date:', event.end_date);
  console.log('Position:', position);

  const eventTypeLabels = {
    'concierto': 'Concierto',
    'entrevista': 'Entrevista', 
    'reunion': 'Reunión',
    'ensayo': 'Ensayo',
    'other': 'Otro'
  };

  const eventTypeColors = {
    'concierto': 'bg-blue-100 text-blue-800',
    'entrevista': 'bg-green-100 text-green-800',
    'reunion': 'bg-purple-100 text-purple-800',
    'ensayo': 'bg-orange-100 text-orange-800',
    'other': 'bg-gray-100 text-gray-800'
  };

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onOpenChange]);

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 w-80 bg-background border border-border/50 rounded-xl shadow-2xl animate-scale-in"
      style={{
        left: `${position.x + 10}px`,
        top: `${position.y}px`,
        maxHeight: '400px',
      }}
    >
      {/* Header with actions */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Badge 
            variant="secondary" 
            className={`text-xs ${eventTypeColors[event.event_type as keyof typeof eventTypeColors] || eventTypeColors.other}`}
          >
            {eventTypeLabels[event.event_type as keyof typeof eventTypeLabels] || 'Evento'}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-muted"
              onClick={() => onEdit(event)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-muted text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(event.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
          >
            <Mail className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-muted"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Event details */}
      <div className="p-4 space-y-4">
        {/* Title and date */}
        <div>
          <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Calendar className="h-4 w-4" />
            <span>
              {format(new Date(event.start_date), 'EEEE, d \'de\' MMMM', { locale: es })} • {' '}
              {format(new Date(event.start_date), 'HH:mm')} – {format(new Date(event.end_date), 'HH:mm')}
            </span>
          </div>
        </div>

        {/* Location */}
        {event.location && (
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm">{event.location}</span>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="flex items-start gap-3">
            <AlignLeft className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground">{event.description}</span>
          </div>
        )}

        {/* Artist info */}
        <div className="flex items-start gap-3">
          <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
          <div className="text-sm">
            <div className="font-medium">{artistName}</div>
            <div className="text-muted-foreground">Creado por: {createdBy}</div>
          </div>
        </div>
      </div>
    </div>
  );
}