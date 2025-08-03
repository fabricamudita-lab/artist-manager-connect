import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { LocationMap } from './LocationMap';

const eventTypes = [
  { value: 'concert', label: 'Concierto' },
  { value: 'recording', label: 'Ensayo' },
  { value: 'meeting', label: 'Entrevista' },
  { value: 'deadline', label: 'Compromiso' },
  { value: 'other', label: 'Otros' }
] as const;

const eventTypeValues = ['concert', 'recording', 'meeting', 'deadline', 'other'] as const;

const availableArtists = [
  'Ejemplo 1',
  'Ejemplo 2', 
  'Ejemplo 3',
  'María García',
  'Carlos Ruiz',
  'Ana López'
];

const formSchema = z.object({
  artist_names: z.array(z.string()).min(1, 'Selecciona al menos un artista'),
  title: z.string().min(1, 'El título es requerido'),
  event_type: z.enum(eventTypeValues, {
    required_error: 'Selecciona un tipo de evento',
  }),
  start_date: z.date({
    required_error: 'La fecha de inicio es requerida',
  }),
  start_time: z.string().min(1, 'La hora de inicio es requerida'),
  end_date: z.date({
    required_error: 'La fecha de fin es requerida',
  }),
  end_time: z.string().min(1, 'La hora de fin es requerida'),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CreateEventDialogProps {
  onEventCreated: () => void;
}

export function CreateEventDialog({ onEventCreated }: CreateEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();

  console.log('CreateEventDialog - Rendering, profile:', profile);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      artist_names: ['Ejemplo 1'],
      title: '',
      event_type: undefined,
      location: '',
      description: '',
      start_time: '09:00',
      end_time: '10:00',
    },
  });

  const selectedArtists = form.watch('artist_names') || [];

  const onSubmit = async (data: FormData) => {
    if (!profile) {
      toast({
        title: "Error",
        description: "No se pudo obtener el perfil de usuario",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('Creating event with data:', data);
      
      // Combinar fecha y hora para crear timestamps completos
      const startDateTime = new Date(data.start_date);
      const [startHour, startMinute] = data.start_time.split(':').map(Number);
      startDateTime.setHours(startHour, startMinute);

      const endDateTime = new Date(data.end_date);
      const [endHour, endMinute] = data.end_time.split(':').map(Number);
      endDateTime.setHours(endHour, endMinute);

      // Crear el evento principal con datos mínimos
      const eventPayload = {
        title: data.title,
        description: data.description || '',
        start_date: startDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        event_type: data.event_type,
        location: data.location || '',
        artist_id: profile.user_id, // Usar user_id que es la referencia a auth.users
        created_by: profile.user_id, // Usar user_id que es la referencia a auth.users
      };

      console.log('Event payload:', eventPayload);

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert(eventPayload)
        .select()
        .single();

      if (eventError) {
        console.error('Error creating event:', eventError);
        console.error('Error details:', JSON.stringify(eventError, null, 2));
        toast({
          title: "Error en Base de Datos",
          description: `${eventError.message || eventError.code || 'Error desconocido'}`,
          variant: "destructive",
        });
        return;
      }

      console.log('Event created successfully:', eventData);

      toast({
        title: "¡Éxito!",
        description: `Evento "${data.title}" creado exitosamente`,
      });
      form.reset();
      setOpen(false);
      onEventCreated();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Error inesperado al crear el evento",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addArtist = (artistName: string) => {
    const current = form.getValues('artist_names') || [];
    if (!current.includes(artistName)) {
      form.setValue('artist_names', [...current, artistName]);
    }
  };

  const removeArtist = (artistName: string) => {
    const current = form.getValues('artist_names') || [];
    form.setValue('artist_names', current.filter(name => name !== artistName));
  };

  const handleLocationSelect = (location: string, lat?: number, lng?: number) => {
    form.setValue('location', location);
    if (lat && lng) {
      form.setValue('latitude', lat);
      form.setValue('longitude', lng);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <CalendarIcon className="mr-2 h-4 w-4" />
          Crear Evento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Evento Profesional</DialogTitle>
          <DialogDescription>
            Gestiona el calendario profesional con selección múltiple de artistas y ubicación en Google Maps
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="artist_names"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artistas Seleccionados</FormLabel>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {selectedArtists.map((artist) => (
                        <Badge key={artist} variant="secondary" className="flex items-center gap-1">
                          {artist}
                          <X 
                            className="h-3 w-3 cursor-pointer hover:text-red-500" 
                            onClick={() => removeArtist(artist)}
                          />
                        </Badge>
                      ))}
                      {selectedArtists.length === 0 && (
                        <p className="text-sm text-muted-foreground">No hay artistas seleccionados</p>
                      )}
                    </div>
                    
                    <Select onValueChange={addArtist}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Agregar artista..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableArtists
                          .filter(artist => !selectedArtists.includes(artist))
                          .map((artist) => (
                            <SelectItem key={artist} value={artist}>
                              {artist}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FormDescription>
                    Puedes seleccionar múltiples artistas para el mismo evento
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título del Evento</FormLabel>
                  <FormControl>
                    <Input placeholder="Breve y claro..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="event_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Evento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {eventTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Categorías: Ensayo, Entrevista, Compromiso, Concierto, Transfer, Otros
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Inicio</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Selecciona fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de Inicio</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha de Fin</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Selecciona fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hora de Fin</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <LocationMap 
              onLocationSelect={handleLocationSelect}
              initialLocation={form.watch('location')}
              initialCoords={
                form.watch('latitude') && form.watch('longitude') 
                  ? { lat: form.watch('latitude')!, lng: form.watch('longitude')! }
                  : undefined
              }
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detalles Relevantes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Breve descripción, contactos clave, enlaces, notas necesarias..."
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Información adicional importante para el evento
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creando...' : 'Crear Evento Profesional'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}