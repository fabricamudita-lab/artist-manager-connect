import { supabase } from '@/integrations/supabase/client';

type EventType = 
  | 'request_created' 
  | 'response_added' 
  | 'status_changed' 
  | 'response_removed' 
  | 'block_toggled';

interface AuditParams {
  requestId?: string;
  responseId?: string;
  bookingId: string;
  eventType: EventType;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  metadata?: Record<string, any>;
}

// Map availability events to booking history event descriptions
function getAvailabilityEventDescription(eventType: EventType, previousValue?: Record<string, any>, newValue?: Record<string, any>): string {
  const name = newValue?.responder_name || previousValue?.responder_name || 'Contacto';
  switch (eventType) {
    case 'request_created':
      return 'Solicitud de disponibilidad creada';
    case 'response_added':
      return `Disponibilidad: ${name} añadido a la consulta`;
    case 'response_removed':
      return `Disponibilidad: ${name} eliminado`;
    case 'status_changed':
      const oldStatus = previousValue?.status || 'pendiente';
      const newStatus = newValue?.status || 'pendiente';
      return `Disponibilidad: ${name} cambió de ${oldStatus} a ${newStatus}`;
    case 'block_toggled':
      return newValue?.block_confirmation 
        ? 'Bloqueo de confirmación activado'
        : 'Bloqueo de confirmación desactivado';
    default:
      return eventType;
  }
}

export async function logAvailabilityEvent({
  requestId,
  responseId,
  bookingId,
  eventType,
  previousValue,
  newValue,
  metadata
}: AuditParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Log to booking_availability_history (detailed audit)
    await supabase.from('booking_availability_history').insert({
      request_id: requestId,
      response_id: responseId,
      booking_id: bookingId,
      event_type: eventType,
      actor_user_id: user.id,
      previous_value: previousValue,
      new_value: newValue,
      metadata
    });

    // Also log to booking_history for unified view
    await supabase.from('booking_history').insert({
      booking_id: bookingId,
      event_type: 'availability_change',
      field_changed: eventType,
      previous_value: previousValue,
      new_value: newValue,
      changed_by: user.id,
      metadata: {
        availability_event: eventType,
        description: getAvailabilityEventDescription(eventType, previousValue, newValue),
        ...metadata
      }
    });
  } catch (error) {
    console.error('Error logging availability audit:', error);
  }
}

export function useAvailabilityAudit() {
  const logEvent = async (params: AuditParams) => {
    await logAvailabilityEvent(params);
  };

  return { logEvent };
}
