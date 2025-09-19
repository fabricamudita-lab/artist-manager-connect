import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, AlertTriangle, Clock, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PasswordAttemptStatus {
  allowed: boolean;
  locked: boolean;
  locked_until?: string;
  remaining_attempts: number;
  lockout_duration_minutes?: number;
}

export const EPKPasswordProtectionPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [attemptStatus, setAttemptStatus] = useState<PasswordAttemptStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [epkTitle, setEPKTitle] = useState('');
  const [lockoutTimer, setLockoutTimer] = useState<number | null>(null);

  useEffect(() => {
    if (slug) {
      checkAttemptStatus();
      fetchEPKInfo();
    }
  }, [slug]);

  useEffect(() => {
    if (attemptStatus?.locked && attemptStatus.locked_until) {
      const lockedUntil = new Date(attemptStatus.locked_until);
      const now = new Date();
      const remainingMs = lockedUntil.getTime() - now.getTime();
      
      if (remainingMs > 0) {
        setLockoutTimer(Math.ceil(remainingMs / 1000));
        
        const interval = setInterval(() => {
          setLockoutTimer(prev => {
            if (prev && prev > 1) {
              return prev - 1;
            } else {
              clearInterval(interval);
              checkAttemptStatus(); // Recheck status when timer expires
              return null;
            }
          });
        }, 1000);
        
        return () => clearInterval(interval);
      }
    }
  }, [attemptStatus]);

  const fetchEPKInfo = async () => {
    if (!slug) return;
    
    try {
      const { data, error } = await supabase
        .from('epks')
        .select('titulo, artista_proyecto')
        .eq('slug', slug)
        .single();
        
      if (data) {
        setEPKTitle(`${data.titulo} - ${data.artista_proyecto}`);
      }
    } catch (error) {
      console.error('Error fetching EPK info:', error);
    }
  };

  const checkAttemptStatus = async () => {
    if (!slug) return;
    
    setChecking(true);
    try {
      const { data, error } = await supabase
        .rpc('check_epk_password_attempts', {
          epk_slug: slug,
          client_ip: null // In a real implementation, you'd get the actual IP
        });

      if (error) {
        console.error('Error checking attempt status:', error);
      } else {
        setAttemptStatus(data as unknown as PasswordAttemptStatus);
      }
    } catch (error) {
      console.error('Error checking attempt status:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!slug || !password.trim()) return;
    if (attemptStatus?.locked) return;
    
    setLoading(true);
    
    try {
      const { data: epkData, error: epkError } = await supabase
        .from('epks')
        .select('password_hash')
        .eq('slug', slug)
        .single();

      if (epkError || !epkData) {
        toast({
          title: "Error",
          description: "EPK no encontrado",
          variant: "destructive"
        });
        return;
      }

      // Verify password
      const passwordHash = btoa(password);
      const isValid = passwordHash === epkData.password_hash;

      if (isValid) {
        // Reset attempts on successful login
        await supabase.rpc('reset_password_attempts', {
          epk_slug: slug,
          client_ip: null
        });
        
        // Store successful authentication in sessionStorage
        sessionStorage.setItem(`epk_auth_${slug}`, 'true');
        
        // Navigate to EPK
        navigate(`/epk/${slug}`);
      } else {
        // Record failed attempt
        const { data: failData, error: failError } = await supabase
          .rpc('record_failed_password_attempt', {
            epk_slug: slug,
            client_ip: null
          });

        if (!failError && failData) {
          const failResult = failData as any;
          setAttemptStatus({
            allowed: !failResult.locked,
            locked: failResult.locked,
            locked_until: failResult.locked_until,
            remaining_attempts: failResult.remaining_attempts
          });
          
          if (failResult.locked) {
            toast({
              title: "Acceso bloqueado",
              description: `Demasiados intentos fallidos. Inténtalo de nuevo en 5 minutos.`,
              variant: "destructive"
            });
          } else {
            toast({
              title: "Contraseña incorrecta",
              description: `Te quedan ${failResult.remaining_attempts} intentos.`,
              variant: "destructive"
            });
          }
        }
        
        setPassword('');
      }
    } catch (error) {
      console.error('Error verifying password:', error);
      toast({
        title: "Error",
        description: "Error al verificar la contraseña",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatLockoutTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-gradient-primary animate-spin flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-background"></div>
          </div>
          <p className="text-muted-foreground">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md card-moodita">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-primary flex items-center justify-center">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl mb-2">EPK Protegido</CardTitle>
            {epkTitle && (
              <p className="text-sm text-muted-foreground">{epkTitle}</p>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {attemptStatus?.locked ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p>Acceso temporalmente bloqueado por demasiados intentos fallidos.</p>
                {lockoutTimer && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>Tiempo restante: {formatLockoutTime(lockoutTimer)}</span>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Introduce la contraseña"
                  disabled={loading}
                  autoFocus
                />
              </div>
              
              {attemptStatus && attemptStatus.remaining_attempts < 3 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Te quedan {attemptStatus.remaining_attempts} intento(s). 
                    Después del tercer intento fallido, el acceso se bloqueará por 5 minutos.
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                type="submit" 
                className="w-full btn-primary"
                disabled={loading || !password.trim()}
              >
                <Lock className="w-4 h-4 mr-2" />
                {loading ? 'Verificando...' : 'Acceder'}
              </Button>
            </form>
          )}
          
          <div className="text-center">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="text-sm"
            >
              Volver al inicio
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};