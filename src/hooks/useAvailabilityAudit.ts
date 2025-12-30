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
