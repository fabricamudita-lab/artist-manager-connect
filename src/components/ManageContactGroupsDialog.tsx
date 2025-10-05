import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CreateContactGroupDialog } from './CreateContactGroupDialog';

interface ContactGroup {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  member_count?: number;
}

interface ManageContactGroupsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageContactGroupsDialog({ open, onOpenChange }: ManageContactGroupsDialogProps) {
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_groups')
        .select(`
          *,
          contact_group_members(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const groupsWithCount = data.map(group => ({
        ...group,
        member_count: group.contact_group_members?.[0]?.count || 0,
      }));

      setGroups(groupsWithCount);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los grupos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchGroups();
    }
  }, [open]);

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este grupo?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('contact_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: "Grupo eliminado",
        description: "El grupo se ha eliminado correctamente",
      });

      fetchGroups();
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el grupo",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gestionar Grupos</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Crear Nuevo Grupo
            </Button>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando grupos...
              </div>
            ) : groups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tienes grupos creados</p>
                <p className="text-sm">Crea tu primer grupo para organizar tus contactos</p>
              </div>
            ) : (
              <div className="space-y-2">
                {groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: group.color || '#3b82f6' }}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{group.name}</h3>
                        {group.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {group.description}
                          </p>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {group.member_count} contacto{group.member_count !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGroup(group.id)}
                      className="ml-2"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CreateContactGroupDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onGroupCreated={fetchGroups}
      />
    </>
  );
}