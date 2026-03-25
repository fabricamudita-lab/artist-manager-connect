import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Loader2, Check, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface InviteArtistDialogProps {
  onArtistInvited?: () => void;
  artistId?: string;
  artistName?: string;
}

export default function InviteArtistDialog({ onArtistInvited, artistId, artistName }: InviteArtistDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    fullName: artistName || '',
  });

  const handleInvite = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inviteData.email || !user) return;

    setLoading(true);
    try {
      // Check if user already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, user_id')
        .eq('email', inviteData.email)
        .maybeSingle();

      if (existingProfile && artistId) {
        // User exists — create binding
        const { error: bindingError } = await supabase
          .from('artist_role_bindings')
          .insert({
            artist_id: artistId,
            user_id: existingProfile.user_id,
            role: 'ARTIST_MANAGER' as any,
          });

        if (bindingError) {
          if (bindingError.code === '23505') {
            toast({ title: "Ya vinculado", description: `${inviteData.email} ya tiene acceso a este artista.` });
            setOpen(false);
            return;
          }
          throw bindingError;
        }

        // Update artist profile_id
        await supabase
          .from('artists')
          .update({ profile_id: existingProfile.id })
          .eq('id', artistId);

        // Update profile to include artist role
        await supabase
          .from('profiles')
          .update({ 
            roles: ['artist'],
            active_role: 'artist',
          })
          .eq('id', existingProfile.id);

        setDone(true);
        toast({
          title: "Acceso concedido",
          description: `${inviteData.email} ya puede acceder a su portal de artista.`,
        });
      } else {
        // User doesn't exist — send signup invitation
        const tempPassword = crypto.randomUUID();
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: inviteData.email,
          password: tempPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: inviteData.fullName,
              roles: ['artist'],
              invited_by: user.id,
            },
          },
        });

        if (signUpError) throw signUpError;

        if (signUpData.user && artistId) {
          // Create binding
          await supabase
            .from('artist_role_bindings')
            .insert({
              artist_id: artistId,
              user_id: signUpData.user.id,
              role: 'ARTIST_MANAGER' as any,
            });
        }

        setDone(true);
        toast({
          title: "Invitación enviada",
          description: `Se ha enviado un email a ${inviteData.email} para que confirme su cuenta.`,
        });
      }

      onArtistInvited?.();
    } catch (error: any) {
      console.error('Error inviting artist:', error);
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar la invitación.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (v: boolean) => {
    setOpen(v);
    if (!v) {
      setDone(false);
      setInviteData({ email: '', fullName: artistName || '' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="w-4 h-4 mr-2" />
          Invitar Artista
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {artistName ? `Invitar a ${artistName}` : 'Invitar Nuevo Artista'}
          </DialogTitle>
          <DialogDescription>
            {artistName 
              ? 'Envía una invitación para que el artista acceda a su portal personal.'
              : 'Envía una invitación para que un artista se registre en la plataforma.'}
          </DialogDescription>
        </DialogHeader>

        {done ? (
          <div className="py-6 text-center space-y-3">
            <Check className="h-12 w-12 text-green-500 mx-auto" />
            <p className="font-medium">¡Invitación procesada!</p>
            <p className="text-sm text-muted-foreground">
              El artista recibirá un email para acceder a su portal.
            </p>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inviteFullName">Nombre completo</Label>
              <Input
                id="inviteFullName"
                value={inviteData.fullName}
                onChange={(e) => setInviteData({ ...inviteData, fullName: e.target.value })}
                placeholder="Nombre del artista"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteEmail">Email del artista</Label>
              <Input
                id="inviteEmail"
                type="email"
                value={inviteData.email}
                onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                placeholder="artista@email.com"
                required
              />
            </div>
            
            {artistId && (
              <div className="rounded-lg bg-muted/50 p-3 flex gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  El artista tendrá acceso completo a su perfil, lanzamientos, calendario de shows y datos financieros.
                </p>
              </div>
            )}

            <DialogFooter>
              <Button type="submit" disabled={loading || !inviteData.email}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Enviar invitación
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
