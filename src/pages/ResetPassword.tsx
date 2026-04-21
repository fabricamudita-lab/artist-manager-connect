import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, Music } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery token from the URL hash automatically and
    // emits a PASSWORD_RECOVERY event. We also check for an existing session.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && event === 'SIGNED_IN')) {
        setHasRecoverySession(true);
        setChecking(false);
      }
    });

    // Fallback: check current session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setHasRecoverySession(true);
      }
      setChecking(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        title: 'Contraseña demasiado corta',
        description: 'La contraseña debe tener al menos 6 caracteres.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Las contraseñas no coinciden',
        description: 'Asegúrate de escribir la misma contraseña en ambos campos.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast({
          title: 'Error al actualizar la contraseña',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Contraseña actualizada',
          description: 'Ya puedes iniciar sesión con tu nueva contraseña.',
        });
        await supabase.auth.signOut();
        navigate('/auth');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-950 dark:to-indigo-950 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Music className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Restablecer contraseña</CardTitle>
          <CardDescription>
            Introduce tu nueva contraseña para acceder a tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {checking ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !hasRecoverySession ? (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                El enlace de recuperación es inválido o ha expirado.
              </p>
              <Button onClick={() => navigate('/auth')} className="w-full">
                Volver a iniciar sesión
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nueva contraseña</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Actualizar contraseña
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
