import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleCalendar } from '@/hooks/useGoogleCalendar';
import { Loader2 } from 'lucide-react';

export default function GoogleCalendarCallback() {
  const navigate = useNavigate();
  const { handleCallback } = useGoogleCalendar();

  useEffect(() => {
    const processCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      if (error) {
        console.error('OAuth error:', error);
        navigate('/calendar');
        return;
      }

      if (code) {
        const success = await handleCallback(code);
        if (success) {
          navigate('/calendar');
        }
      }
    };

    processCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-muted-foreground">Conectando con Google Calendar...</p>
      </div>
    </div>
  );
}
