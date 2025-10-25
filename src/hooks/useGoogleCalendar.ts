import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GoogleCalendarTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export const useGoogleCalendar = () => {
  const [tokens, setTokens] = useState<GoogleCalendarTokens | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = () => {
    const stored = localStorage.getItem('google_calendar_tokens');
    if (stored) {
      const parsed = JSON.parse(stored);
      setTokens(parsed);
      setIsConnected(true);
    }
    setLoading(false);
  };

  const getAuthUrl = () => {
    const clientId = '266349580236-lc1fqegavf0t47p6bo92gdsi6n5jfkcp.apps.googleusercontent.com';
    const redirectUri = `${window.location.origin}/calendar/callback`;
    const scope = 'https://www.googleapis.com/auth/calendar';
    
    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent`;
  };

  const handleCallback = async (code: string) => {
    try {
      const redirectUri = `${window.location.origin}/calendar/callback`;
      
      const { data, error } = await supabase.functions.invoke('google-calendar-oauth', {
        body: { action: 'exchange', code, redirectUri }
      });

      if (error) throw error;

      const expiresAt = Date.now() + (data.expires_in * 1000);
      const tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: expiresAt,
      };

      localStorage.setItem('google_calendar_tokens', JSON.stringify(tokens));
      setTokens(tokens);
      setIsConnected(true);
      toast.success('Conectado con Google Calendar');
      
      return true;
    } catch (error) {
      console.error('Error exchanging code:', error);
      toast.error('Error al conectar con Google Calendar');
      return false;
    }
  };

  const refreshTokenIfNeeded = async () => {
    if (!tokens) return null;

    if (Date.now() < tokens.expires_at - 60000) {
      return tokens.access_token;
    }

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-oauth', {
        body: { action: 'refresh', refreshToken: tokens.refresh_token }
      });

      if (error) throw error;

      const expiresAt = Date.now() + (data.expires_in * 1000);
      const newTokens = {
        ...tokens,
        access_token: data.access_token,
        expires_at: expiresAt,
      };

      localStorage.setItem('google_calendar_tokens', JSON.stringify(newTokens));
      setTokens(newTokens);
      
      return data.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      disconnect();
      return null;
    }
  };

  const disconnect = () => {
    localStorage.removeItem('google_calendar_tokens');
    setTokens(null);
    setIsConnected(false);
    toast.info('Desconectado de Google Calendar');
  };

  const createEvent = async (event: any) => {
    const accessToken = await refreshTokenIfNeeded();
    if (!accessToken) {
      toast.error('Necesitas reconectar con Google Calendar');
      return null;
    }

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-api', {
        body: {
          action: 'createEvent',
          accessToken,
          event,
        }
      });

      if (error) throw error;
      
      toast.success('Evento creado en Google Calendar');
      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Error al crear evento');
      return null;
    }
  };

  const listEvents = async (timeMin: string, timeMax: string) => {
    const accessToken = await refreshTokenIfNeeded();
    if (!accessToken) return [];

    try {
      const { data, error } = await supabase.functions.invoke('google-calendar-api', {
        body: {
          action: 'listEvents',
          accessToken,
          timeMin,
          timeMax,
        }
      });

      if (error) throw error;
      return data.items || [];
    } catch (error) {
      console.error('Error listing events:', error);
      return [];
    }
  };

  return {
    isConnected,
    loading,
    getAuthUrl,
    handleCallback,
    disconnect,
    createEvent,
    listEvents,
  };
};
