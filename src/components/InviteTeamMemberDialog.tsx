import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type WorkspaceRole = Database['public']['Enums']['workspace_role'];
type TeamCategory = Database['public']['Enums']['team_category'];

interface InviteTeamMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onMemberInvited: () => void;
}

const TEAM_CATEGORIES: { value: TeamCategory; label: string }[] = [
  { value: 'management', label: 'Management' },
  { value: 'banda', label: 'Banda' },
  { value: 'tecnico', label: 'Técnico' },
  { value: 'artistico', label: 'Artístico' },
  { value: 'comunicacion', label: 'Comunicación' },
  { value: 'legal', label: 'Legal' },
  { value: 'otro', label: 'Otro' },
];

const ROLES: { value: WorkspaceRole; label: string }[] = [
  { value: 'TEAM_MANAGER', label: 'Team Manager' },
  { value: 'OWNER', label: 'Propietario' },
];

export function InviteTeamMemberDialog({ 
  open, 
  onOpenChange, 
  workspaceId,
  onMemberInvited 
}: InviteTeamMemberDialogProps) {
  const [loading, setLoading] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    role: 'TEAM_MANAGER' as WorkspaceRole,
    teamCategory: 'otro' as TeamCategory,
  });

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteData.email.trim()) {
      toast.error('El email es obligatorio');
      return;
    }

    setLoading(true);

    try {
      // Check if user already exists in profiles
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name')
        .eq('email', inviteData.email.toLowerCase().trim())
        .maybeSingle();

      if (profileError) throw profileError;

      if (existingProfile) {
        // User exists - add them directly to workspace
        const { error: membershipError } = await supabase
          .from('workspace_memberships')
          .insert({
            workspace_id: workspaceId,
            user_id: existingProfile.user_id,
            role: inviteData.role,
            team_category: inviteData.teamCategory,
          });

        if (membershipError) {
          if (membershipError.code === '23505') {
            toast.error('Este usuario ya es miembro del equipo');
          } else {
            throw membershipError;
          }
          return;
        }

        toast.success(`${existingProfile.full_name || inviteData.email} añadido al equipo`);
      } else {
        // User doesn't exist - create invitation
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No autenticado');

        // Generate invite token
        const token = crypto.randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        const { error: inviteError } = await supabase
          .from('invitations')
          .insert({
            workspace_id: workspaceId,
            email: inviteData.email.toLowerCase().trim(),
            role: inviteData.role,
            invited_by: user.id,
            token,
            expires_at: expiresAt.toISOString(),
          });

        if (inviteError) {
          if (inviteError.code === '23505') {
            toast.error('Ya existe una invitación pendiente para este email');
          } else {
            throw inviteError;
          }
          return;
        }

        toast.success(`Invitación enviada a ${inviteData.email}`);
      }

      setInviteData({ email: '', role: 'TEAM_MANAGER', teamCategory: 'otro' });
      onOpenChange(false);
      onMemberInvited();
    } catch (error: any) {
      console.error('Error inviting member:', error);
      toast.error(error.message || 'Error al invitar miembro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invitar Miembro al Equipo
          </DialogTitle>
          <DialogDescription>
            Invita a alguien a unirse a tu equipo. Si ya tiene cuenta, será añadido directamente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={inviteData.email}
              onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
              placeholder="email@ejemplo.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Rol</Label>
            <Select 
              value={inviteData.role} 
              onValueChange={(value: WorkspaceRole) => setInviteData({ ...inviteData, role: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(role => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select 
              value={inviteData.teamCategory} 
              onValueChange={(value: TeamCategory) => setInviteData({ ...inviteData, teamCategory: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                {TEAM_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Invitar
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
