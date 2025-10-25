import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ICAL from 'ical.js';

interface GoogleCalendarConfig {
  ical_url: string;
  calendar_name: string;
  sync_enabled: boolean;
}

export const useGoogleCalendarSync = () => {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const parseICalEvents = async (icalData: string, artistId: string | null = null) => {
    try {
      const jcalData = ICAL.parse(icalData);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');
      
      return vevents.map(vevent => {
        const event = new ICAL.Event(vevent);
        return {
          title: event.summary,
          start_date: event.startDate.toJSDate().toISOString(),
          end_date: event.endDate.toJSDate().toISOString(),
          location: event.location || null,
          description: event.description || null,
          event_type: 'google_sync',
          artist_id: artistId || ''
        };
      });
    } catch (error) {
      console.error('Error parsing iCal data:', error);
      throw error;
    }
  };

  const syncGoogleCalendar = async (icalUrl: string, artistId: string | null = null) => {
    setSyncing(true);
    try {
      // Fetch iCal data with CORS proxy if needed
      const response = await fetch(icalUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch calendar data');
      }
      
      const icalData = await response.text();
      const events = await parseICalEvents(icalData, artistId);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete existing Google synced events to avoid duplicates
      await supabase
        .from('events')
        .delete()
        .eq('event_type', 'google_sync')
        .eq('created_by', user.id);

      // Insert new events
      if (events.length > 0) {
        const eventsWithUser = events.map(event => ({
          ...event,
          created_by: user.id
        }));

        const { error } = await supabase
          .from('events')
          .insert(eventsWithUser);

        if (error) throw error;
      }

      setLastSync(new Date());
      toast.success(`Sincronizados ${events.length} eventos de Google Calendar`);
      return events.length;
    } catch (error) {
      console.error('Error syncing Google Calendar:', error);
      toast.error('Error al sincronizar con Google Calendar');
      throw error;
    } finally {
      setSyncing(false);
    }
  };

  const setupAutoSync = (icalUrl: string, artistId: string | null = null, intervalMinutes: number = 30) => {
    // Initial sync
    syncGoogleCalendar(icalUrl, artistId);

    // Setup interval for auto-sync
    const interval = setInterval(() => {
      syncGoogleCalendar(icalUrl, artistId);
    }, intervalMinutes * 60 * 1000);

    return () => clearInterval(interval);
  };

  return {
    syncGoogleCalendar,
    setupAutoSync,
    syncing,
    lastSync
  };
};
