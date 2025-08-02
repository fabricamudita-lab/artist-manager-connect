import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface InviteArtistDialogProps {
  onArtistInvited: () => void;
}

export default function InviteArtistDialog({ onArtistInvited }: InviteArtistDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    fullName: '',
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulate sending invitation email
      // In a real app, this would send an actual invitation email
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Invitación enviada",
        description: `Se ha enviado una invitación a ${inviteData.email}. El artista podrá registrarse usando este email.`,
      });

      setInviteData({ email: '', fullName: '' });
      setOpen(false);
      onArtistInvited();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar la invitación.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="w-4 h-4 mr-2" />
          Invitar Artista
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar Nuevo Artista</DialogTitle>
          <DialogDescription>
            Envía una invitación para que un artista se registre en la plataforma.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inviteEmail">Email del Artista</Label>
            <Input
              id="inviteEmail"
              type="email"
              value={inviteData.email}
              onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
              placeholder="artista@ejemplo.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inviteFullName">Nombre del Artista</Label>
            <Input
              id="inviteFullName"
              value={inviteData.fullName}
              onChange={(e) => setInviteData({ ...inviteData, fullName: e.target.value })}
              placeholder="Nombre completo del artista"
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Invitación
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}