import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { SingleArtistSelector } from '@/components/SingleArtistSelector';
import { Disc3, DollarSign, Music, CalendarDays, FileText, AlignLeft, Trash2 } from 'lucide-react';

const cardDisplayConfigSchema = z.object({
  show_releases: z.boolean(),
  show_budgets: z.boolean(),
  show_events: z.boolean(),
  show_dates: z.boolean(),
  show_epk: z.boolean(),
  show_description: z.boolean(),
});

export type CardDisplayConfig = z.infer<typeof cardDisplayConfigSchema>;

export const DEFAULT_CARD_CONFIG: CardDisplayConfig = {
  show_releases: true,
  show_budgets: true,
  show_events: true,
  show_dates: true,
  show_epk: true,
  show_description: false,
};

interface ProjectSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  artistId?: string | null;
  config: CardDisplayConfig;
}

const TOGGLE_OPTIONS: { key: keyof CardDisplayConfig; label: string; icon: React.ReactNode }[] = [
  { key: 'show_releases', label: 'Lanzamientos', icon: <Disc3 className="h-4 w-4 text-orange-500" /> },
  { key: 'show_budgets', label: 'Presupuestos', icon: <DollarSign className="h-4 w-4 text-green-500" /> },
  { key: 'show_events', label: 'Eventos', icon: <Music className="h-4 w-4 text-purple-500" /> },
  { key: 'show_dates', label: 'Fechas', icon: <CalendarDays className="h-4 w-4 text-blue-500" /> },
  { key: 'show_epk', label: 'EPK', icon: <FileText className="h-4 w-4 text-cyan-500" /> },
  { key: 'show_description', label: 'Descripción', icon: <AlignLeft className="h-4 w-4 text-muted-foreground" /> },
];

export function ProjectSettingsDialog({ open, onOpenChange, projectId, projectName, artistId, config }: ProjectSettingsDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [localConfig, setLocalConfig] = useState<CardDisplayConfig>(config);
  const [localName, setLocalName] = useState(projectName);
  const [localArtistId, setLocalArtistId] = useState<string | null>(artistId ?? null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Sync state when dialog opens with new props
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setLocalName(projectName);
      setLocalArtistId(artistId ?? null);
      setLocalConfig(config);
    }
    onOpenChange(newOpen);
  };

  const handleNameSave = async () => {
    const trimmed = localName.trim();
    if (!trimmed || trimmed.length > 100) {
      toast({ title: 'Error', description: 'El nombre debe tener entre 1 y 100 caracteres', variant: 'destructive' });
      setLocalName(projectName);
      return;
    }
    if (trimmed === projectName) return;

    const { error } = await supabase
      .from('projects')
      .update({ name: trimmed })
      .eq('id', projectId);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo guardar el nombre', variant: 'destructive' });
      setLocalName(projectName);
    } else {
      queryClient.invalidateQueries({ queryKey: ['proyectos-projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-detail', projectId] });
    }
  };

  const handleArtistChange = async (newArtistId: string | null) => {
    setLocalArtistId(newArtistId);
    const { error } = await supabase
      .from('projects')
      .update({ artist_id: newArtistId })
      .eq('id', projectId);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo cambiar el artista', variant: 'destructive' });
      setLocalArtistId(artistId ?? null);
    } else {
      queryClient.invalidateQueries({ queryKey: ['proyectos-projects'] });
      queryClient.invalidateQueries({ queryKey: ['project-detail', projectId] });
    }
  };

  const handleToggle = async (key: keyof CardDisplayConfig, value: boolean) => {
    const updated = { ...localConfig, [key]: value };
    const parsed = cardDisplayConfigSchema.safeParse(updated);
    if (!parsed.success) return;

    setLocalConfig(updated);
    const { error } = await supabase
      .from('projects')
      .update({ card_display_config: updated as any })
      .eq('id', projectId);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo guardar la configuración', variant: 'destructive' });
      setLocalConfig(localConfig);
    } else {
      queryClient.invalidateQueries({ queryKey: ['proyectos-projects'] });
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    const { error } = await supabase.from('projects').delete().eq('id', projectId);
    setDeleting(false);

    if (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar el proyecto', variant: 'destructive' });
    } else {
      toast({ title: 'Proyecto eliminado' });
      queryClient.invalidateQueries({ queryKey: ['proyectos-projects'] });
      onOpenChange(false);
      navigate('/proyectos');
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configuración del proyecto</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* General data */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Datos generales</p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-sm">Nombre</Label>
                  <Input
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    onBlur={handleNameSave}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); }}
                    maxLength={100}
                    placeholder="Nombre del proyecto"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Perfil vinculado</Label>
                  <SingleArtistSelector
                    value={localArtistId}
                    onValueChange={handleArtistChange}
                    placeholder="Sin artista vinculado"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Card display toggles */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Vista previa en tarjeta</p>
              <p className="text-xs text-muted-foreground">Elige qué datos se muestran en la tarjeta del proyecto (máx. 3)</p>
              {Object.values(localConfig).filter(Boolean).length >= 3 && (
                <p className="text-xs text-amber-500 font-medium">Máximo 3 opciones seleccionadas</p>
              )}
              <div className="space-y-3 pt-1">
                {TOGGLE_OPTIONS.map(({ key, label, icon }) => {
                  const activeCount = Object.values(localConfig).filter(Boolean).length;
                  const isChecked = localConfig[key];
                  const isDisabled = !isChecked && activeCount >= 3;
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <Label className={`flex items-center gap-2 text-sm ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                        {icon}
                        {label}
                      </Label>
                      <Switch
                        checked={isChecked}
                        disabled={isDisabled}
                        onCheckedChange={(v) => handleToggle(key, v)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Danger zone */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-destructive">Zona peligrosa</p>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar proyecto
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{projectName}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todos los datos asociados al proyecto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}