import { useState, useEffect, useMemo } from "react";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Clock, Users, FolderKanban, User } from 'lucide-react';
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
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';

const eventTypes = [
  { value: 'concert', label: 'Concierto' },
  { value: 'recording', label: 'Ensayo' },
  { value: 'meeting', label: 'Reunión' },
  { value: 'interview', label: 'Entrevista' },
  { value: 'deadline', label: 'Compromiso' },
  { value: 'other', label: 'Otros' }
] as const;

const personalCategories = [
  { value: 'meeting', label: 'Reunión' },
  { value: 'medical', label: 'Médico' },
  { value: 'personal', label: 'Personal' },
  { value: 'travel', label: 'Viaje' },
  { value: 'other', label: 'Otros' }
] as const;

const formSchema = z.object({
  eventContext: z.enum(['project', 'personal']),
  project_id: z.string().optional(),
  title: z.string().min(1, 'El título es requerido'),
  event_type: z.string().min(1, 'Selecciona un tipo'),
  start_date: z.date({ required_error: 'La fecha es requerida' }),
  start_time: z.string().min(1, 'Hora requerida'),
  end_date: z.date({ required_error: 'La fecha es requerida' }),
  end_time: z.string().min(1, 'Hora requerida'),
  description: z.string().optional(),
  location: z.string().optional(),
  syncWithGoogle: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  location: string | null;
  description: string | null;
  event_type?: string;
}

interface Project {
  id: string;
  name: string;
}

interface EditEventDialogControlledProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated?: () => void;
}

export function EditEventDialogControlled({ event, open, onOpenChange, onUpdated }: EditEventDialogControlledProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const { isConnected: googleConnected, createEvent: createGoogleEvent } = useGoogleCalendar();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventContext: 'personal',
      project_id: '',
      title: '',
      event_type: '',
      start_time: '09:00',
      end_time: '10:00',
      start_date: undefined,
      end_date: undefined,
      description: '',
      location: '',
      syncWithGoogle: false,
    },
  });

  const eventContext = form.watch('eventContext');

  // Fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name')
          .order('name');

        if (error) throw error;
        setProjects(data || []);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setLoadingProjects(false);
      }
    };

    if (open) {
      fetchProjects();
    }
  }, [open]);

  // Reset form when event changes
  useEffect(() => {
    if (event && open) {
      const start = new Date(event.start_date);
      const end = new Date(event.end_date);
      
      form.reset({
        eventContext: 'personal',
        project_id: '',
        title: event.title,
        event_type: event.event_type || 'other',
        start_date: start,
        end_date: end,
        start_time: format(start, 'HH:mm'),
        end_time: format(end, 'HH:mm'),
        description: event.description || '',
        location: event.location || '',
        syncWithGoogle: false,
      });
    }
  }, [event, open, form]);

  const onSubmit = async (data: FormData) => {
    if (!event) return;

    setIsSubmitting(true);

    try {
      // Combine date and time
      const startDateTime = new Date(data.start_date);
      const [startHours, startMinutes] = data.start_time.split(':').map(Number);
      startDateTime.setHours(startHours, startMinutes, 0, 0);

      const endDateTime = new Date(data.end_date);
      const [endHours, endMinutes] = data.end_time.split(':').map(Number);
      endDateTime.setHours(endHours, endMinutes, 0, 0);

      const { error } = await supabase
        .from('events')
        .update({
          title: data.title,
          event_type: data.event_type,
          start_date: startDateTime.toISOString(),
          end_date: endDateTime.toISOString(),
          description: data.description || null,
          location: data.location || null,
        })
        .eq('id', event.id);

      if (error) throw error;

      // Sync with Google if requested
      if (data.syncWithGoogle && googleConnected) {
        await createGoogleEvent({
          summary: data.title,
          description: data.description || '',
          start: { dateTime: startDateTime.toISOString(), timeZone: 'Europe/Madrid' },
          end: { dateTime: endDateTime.toISOString(), timeZone: 'Europe/Madrid' },
        });
      }

      toast({ 
        title: "Evento actualizado", 
        description: "Los cambios se guardaron correctamente" 
      });
      onOpenChange(false);
      onUpdated?.();
    } catch (e: any) {
      console.error(e);
      toast({ 
        title: "Error", 
        description: e?.message || 'No se pudo actualizar el evento', 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Editar Evento
          </DialogTitle>
          <DialogDescription>
            Modifica los detalles del evento
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Context Selector */}
            <FormField
              control={form.control}
              name="eventContext"
              render={({ field }) => (
                <FormItem>
                  <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="project" className="gap-2">
                        <FolderKanban className="h-4 w-4" />
                        Vinculado a Proyecto
                      </TabsTrigger>
                      <TabsTrigger value="personal" className="gap-2">
                        <User className="h-4 w-4" />
                        Evento Personal
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </FormItem>
              )}
            />

            {/* Project Selector - Only show if project context */}
            {eventContext === 'project' && (
              <FormField
                control={form.control}
                name="project_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proyecto</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={loadingProjects}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingProjects ? "Cargando..." : "Seleccionar proyecto"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del evento..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Event Type / Category */}
            <FormField
              control={form.control}
              name="event_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{eventContext === 'project' ? 'Tipo de Evento' : 'Categoría'}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(eventContext === 'project' ? eventTypes : personalCategories).map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date & Time - Compact Row */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "d MMM", { locale: es }) : "Fecha"}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            form.setValue('end_date', date!);
                          }}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inicio</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input 
                            type="time" 
                            className="pl-7 h-8 text-sm" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fin</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Clock className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                          <Input 
                            type="time" 
                            className="pl-7 h-8 text-sm" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Location */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ubicación (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Lugar, teléfono o enlace..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Detalles adicionales..." 
                      className="resize-none h-20"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Google Sync */}
            <FormField
              control={form.control}
              name="syncWithGoogle"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!googleConnected}
                    />
                  </FormControl>
                  <FormLabel className={cn(
                    "text-sm font-normal cursor-pointer",
                    !googleConnected && "text-muted-foreground"
                  )}>
                    Sincronizar con Google Calendar
                    {!googleConnected && " (no conectado)"}
                  </FormLabel>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
