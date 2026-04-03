import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface BookingOffer {
  id: string;
  fecha?: string;
  festival_ciclo?: string;
  ciudad?: string;
  lugar?: string;
  formato?: string;
  estado?: string;
  hora?: string;
  artist_id?: string;
  event_id?: string;
}

interface CalendarEvent {
  id?: string;
  title: string;
  start_date: string;
  end_date: string;
  location?: string;
  description?: string;
  event_type: string;
  artist_id: string;
  created_by: string;
}

export function useBookingCalendarSync() {
  const createEventFromBooking = useCallback(async (booking: BookingOffer, createdBy: string) => {
    if (!booking.fecha || !booking.ciudad) {
      console.warn('Cannot create event: missing required fields (fecha, ciudad)');
      return null;
    }

    // Create the event title
    const titleParts = ['CONCIERTO', booking.ciudad];
    if (booking.festival_ciclo) {
      titleParts.splice(1, 0, `(${booking.festival_ciclo})`);
    }
    if (booking.formato) {
      titleParts.push(booking.formato);
    }
    const title = titleParts.join(' ');

    // Create start and end dates
    const eventDate = new Date(booking.fecha);
    let startDate: Date;
    let endDate: Date;

    if (booking.hora) {
      // Parse the time string (HH:mm format)
      const [hours, minutes] = booking.hora.split(':').map(Number);
      startDate = new Date(eventDate);
      startDate.setHours(hours, minutes, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(hours + 2, minutes, 0, 0); // Assume 2-hour duration
    } else {
      // Default to 20:00 if no time specified
      startDate = new Date(eventDate);
      startDate.setHours(20, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(22, 0, 0, 0); // 2-hour duration
    }

    // Create location string
    const locationParts = [];
    if (booking.lugar) locationParts.push(booking.lugar);
    if (booking.ciudad) locationParts.push(booking.ciudad);
    const location = locationParts.join(', ');

    // Create description
    const descriptionParts = [];
    if (booking.formato) descriptionParts.push(`Formato: ${booking.formato}`);
    const description = descriptionParts.join('\n');

    const eventData: CalendarEvent = {
      title,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      location,
      description,
      event_type: 'concierto',
      artist_id: booking.artist_id || '',
      created_by: createdBy,
    };

    try {
      const { data, error } = await supabase
        .from('events')
        .insert([eventData])
        .select()
        .single();

      if (error) throw error;

      // Store the event ID in the booking for future reference
      await supabase
        .from('booking_offers')
        .update({ event_id: data.id })
        .eq('id', booking.id);

      console.log('Event created from booking:', data);
      return data;
    } catch (error) {
      console.error('Error creating event from booking:', error);
      throw error;
    }
  }, []);

  const updateEventFromBooking = useCallback(async (booking: BookingOffer, eventId: string) => {
    if (!booking.fecha || !booking.ciudad) {
      console.warn('Cannot update event: missing required fields (fecha, ciudad)');
      return null;
    }

    // Create the event title
    const titleParts = ['CONCIERTO', booking.ciudad];
    if (booking.festival_ciclo) {
      titleParts.splice(1, 0, `(${booking.festival_ciclo})`);
    }
    if (booking.formato) {
      titleParts.push(booking.formato);
    }
    const title = titleParts.join(' ');

    // Create start and end dates
    const eventDate = new Date(booking.fecha);
    let startDate: Date;
    let endDate: Date;

    if (booking.hora) {
      const [hours, minutes] = booking.hora.split(':').map(Number);
      startDate = new Date(eventDate);
      startDate.setHours(hours, minutes, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(hours + 2, minutes, 0, 0);
    } else {
      startDate = new Date(eventDate);
      startDate.setHours(20, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(22, 0, 0, 0);
    }

    // Create location string
    const locationParts = [];
    if (booking.lugar) locationParts.push(booking.lugar);
    if (booking.ciudad) locationParts.push(booking.ciudad);
    const location = locationParts.join(', ');

    // Create description
    const descriptionParts = [];
    if (booking.formato) descriptionParts.push(`Formato: ${booking.formato}`);
    const description = descriptionParts.join('\n');

    try {
      const { data, error } = await supabase
        .from('events')
        .update({
          title,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          location,
          description,
        })
        .eq('id', eventId)
        .select()
        .single();

      if (error) throw error;

      console.log('Event updated from booking:', data);
      return data;
    } catch (error) {
      console.error('Error updating event from booking:', error);
      throw error;
    }
  }, []);

  const deleteEventFromBooking = useCallback(async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      console.log('Event deleted from booking:', eventId);
      return true;
    } catch (error) {
      console.error('Error deleting event from booking:', error);
      throw error;
    }
  }, []);

  const syncBookingWithCalendar = useCallback(async (
    oldBooking: BookingOffer | null,
    newBooking: BookingOffer,
    createdBy: string
  ) => {
    try {
      const oldStatus = oldBooking?.estado;
      const newStatus = newBooking.estado;

      // Get existing event ID if it exists
      const { data: existingBooking } = await supabase
        .from('booking_offers')
        .select('event_id')
        .eq('id', newBooking.id)
        .single();

      const existingEventId = existingBooking?.event_id;

      // Case 1: Status changed to "confirmado" - create event if not exists
      if (newStatus === 'confirmado' && oldStatus !== 'confirmado') {
        if (!existingEventId) {
          await createEventFromBooking(newBooking, createdBy);
          toast({
            title: "Evento creado",
            description: "Se ha creado automáticamente un evento en el calendario.",
          });
        }
      }
      
      // Case 2: Status changed to "cancelado" - delete event if exists
      else if (newStatus === 'cancelado' && existingEventId) {
        await deleteEventFromBooking(existingEventId);
        await supabase
          .from('booking_offers')
          .update({ event_id: null })
          .eq('id', newBooking.id);
        
        toast({
          title: "Evento eliminado",
          description: "Se ha eliminado el evento del calendario debido a la cancelación.",
        });
      }
      
      // Case 3: Booking details changed and status is still "confirmado" - update event
      else if (newStatus === 'confirmado' && existingEventId) {
        const fieldsToCheck = ['fecha', 'festival_ciclo', 'ciudad', 'lugar', 'formato', 'hora'];
        const hasRelevantChanges = fieldsToCheck.some(field => 
          oldBooking && oldBooking[field as keyof BookingOffer] !== newBooking[field as keyof BookingOffer]
        );

        if (hasRelevantChanges) {
          await updateEventFromBooking(newBooking, existingEventId);
          toast({
            title: "Evento actualizado",
            description: "Se ha actualizado el evento en el calendario con los nuevos datos.",
          });
        }
      }

    } catch (error) {
      console.error('Error syncing booking with calendar:', error);
      toast({
        title: "Error de sincronización",
        description: "No se pudo sincronizar con el calendario.",
        variant: "destructive",
      });
    }
  }, [createEventFromBooking, updateEventFromBooking, deleteEventFromBooking]);

  return {
    syncBookingWithCalendar,
    createEventFromBooking,
    updateEventFromBooking,
    deleteEventFromBooking,
  };
}