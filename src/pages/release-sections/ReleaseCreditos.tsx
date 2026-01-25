import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Users, Music, Pencil, Trash2, FileText, UserPlus, Copy, Check, AlertTriangle } from 'lucide-react';
import { CopyButton } from '@/components/ui/copy-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useRelease, useTracks, useTrackCredits, Track, TrackCredit } from '@/hooks/useReleases';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const CREDIT_ROLES = [
  'Compositor',
  'Letrista',
  'Productor',
  'Intérprete',
  'Featuring',
  'Sello',
  'Editorial',
];

// Order for sorting credits by role
const ROLE_ORDER: Record<string, number> = {
  'Compositor': 1,
  'Letrista': 2,
  'Productor': 3,
  'Intérprete': 4,
  'Featuring': 5,
  'Sello': 6,
  'Editorial': 7,
};

const sortCreditsByRole = (credits: TrackCredit[]) => {
  return [...credits].sort((a, b) => {
    const orderA = ROLE_ORDER[a.role] ?? 99;
    const orderB = ROLE_ORDER[b.role] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });
};

export default function ReleaseCreditos() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: release, isLoading: loadingRelease } = useRelease(id);
  const { data: tracks, isLoading: loadingTracks } = useTracks(id);

  const [isCreateTrackOpen, setIsCreateTrackOpen] = useState(false);
  const [isEditTrackOpen, setIsEditTrackOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [deleteTrackId, setDeleteTrackId] = useState<string | null>(null);

  // Create track mutation
  const createTrack = useMutation({
    mutationFn: async (data: { title: string; track_number: number; lyrics?: string; isrc?: string }) => {
      const { data: track, error } = await supabase
        .from('tracks')
        .insert({ ...data, release_id: id })
        .select()
        .single();
      if (error) throw error;
      return track;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks', id] });
      toast.success('Canción creada');
      setIsCreateTrackOpen(false);
    },
    onError: () => {
      toast.error('Error al crear la canción');
    },
  });

  // Update track mutation
  const updateTrack = useMutation({
    mutationFn: async (data: { id: string; title?: string; lyrics?: string; isrc?: string }) => {
      const { id: trackId, ...updates } = data;
      const { error } = await supabase.from('tracks').update(updates).eq('id', trackId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks', id] });
      toast.success('Canción actualizada');
      setIsEditTrackOpen(false);
      setSelectedTrack(null);
    },
    onError: () => {
      toast.error('Error al actualizar');
    },
  });

  // Delete track mutation
  const deleteTrack = useMutation({
    mutationFn: async (trackId: string) => {
      const { error } = await supabase.from('tracks').delete().eq('id', trackId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tracks', id] });
      toast.success('Canción eliminada');
      setDeleteTrackId(null);
    },
    onError: () => {
      toast.error('Error al eliminar');
    },
  });

  if (loadingRelease) {
    return <Skeleton className="h-64 w-full" />;
  }

  const nextTrackNumber = tracks ? Math.max(0, ...tracks.map((t) => t.track_number)) + 1 : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/releases/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{release?.title}</p>
          <h1 className="text-2xl font-bold">Créditos y Autoría</h1>
        </div>
        <Dialog open={isCreateTrackOpen} onOpenChange={setIsCreateTrackOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Canción
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Añadir Canción</DialogTitle>
            </DialogHeader>
            <CreateTrackForm
              nextTrackNumber={nextTrackNumber}
              onSubmit={(data) => createTrack.mutate(data)}
              isLoading={createTrack.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Canciones y Autoría</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTracks ? (
            <Skeleton className="h-32 w-full" />
          ) : tracks && tracks.length > 0 ? (
            <Accordion type="multiple" className="w-full">
              {tracks.map((track) => (
                <TrackCreditsItem
                  key={track.id}
                  track={track}
                  onEdit={() => {
                    setSelectedTrack(track);
                    setIsEditTrackOpen(true);
                  }}
                  onDelete={() => setDeleteTrackId(track.id)}
                />
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-12">
              <Music className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin canciones</h3>
              <p className="text-muted-foreground mb-4">
                Crea las canciones para añadir letra y créditos
              </p>
              <Button onClick={() => setIsCreateTrackOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Añadir Canción
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Track Dialog */}
      <Dialog open={isEditTrackOpen} onOpenChange={setIsEditTrackOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Canción</DialogTitle>
          </DialogHeader>
          {selectedTrack && (
            <EditTrackForm
              track={selectedTrack}
              onSubmit={(data) => updateTrack.mutate({ id: selectedTrack.id, ...data })}
              isLoading={updateTrack.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTrackId} onOpenChange={() => setDeleteTrackId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar canción?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará la canción y todos sus créditos. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTrackId && deleteTrack.mutate(deleteTrackId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Track Credits Item Component
function TrackCreditsItem({
  track,
  onEdit,
  onDelete,
}: {
  track: Track;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { data: credits = [], isLoading } = useTrackCredits(track.id);
  const queryClient = useQueryClient();
  const [isAddCreditOpen, setIsAddCreditOpen] = useState(false);
  const [editingCreditId, setEditingCreditId] = useState<string | null>(null);

  const createCredit = useMutation({
    mutationFn: async (data: { name: string; role: string; percentage?: number }) => {
      const { error } = await supabase.from('track_credits').insert({
        track_id: track.id,
        ...data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-credits', track.id] });
      toast.success('Crédito añadido');
      setIsAddCreditOpen(false);
    },
    onError: () => {
      toast.error('Error al añadir crédito');
    },
  });

  const updateCredit = useMutation({
    mutationFn: async ({ creditId, data }: { creditId: string; data: Partial<{ role: string; name: string; percentage: number | null }> }) => {
      const { error } = await supabase.from('track_credits').update(data).eq('id', creditId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-credits', track.id] });
      toast.success('Crédito actualizado');
      setEditingCreditId(null);
    },
    onError: () => {
      toast.error('Error al actualizar');
    },
  });

  const deleteCredit = useMutation({
    mutationFn: async (creditId: string) => {
      const { error } = await supabase.from('track_credits').delete().eq('id', creditId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-credits', track.id] });
      toast.success('Crédito eliminado');
    },
  });

  return (
    <AccordionItem value={track.id}>
      <AccordionTrigger className="hover:no-underline">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-muted-foreground w-6">{track.track_number}.</span>
          <span className="font-medium">{track.title}</span>
          <div className="flex gap-1 ml-auto mr-4">
            {track.lyrics && (
              <Badge variant="outline" className="text-xs">
                <FileText className="w-3 h-3 mr-1" />
                Letra
              </Badge>
            )}
            {credits.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                {credits.length}
              </Badge>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent>
        <div className="pl-9 space-y-4">
          {/* Track Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="w-3 h-3 mr-1" />
              Editar Canción
            </Button>
            <Button variant="outline" size="sm" onClick={onDelete}>
              <Trash2 className="w-3 h-3 mr-1" />
              Eliminar
            </Button>
          </div>

          {/* Lyrics Preview */}
          {track.lyrics && (
            <LyricsPreview lyrics={track.lyrics} trackTitle={track.title} />
          )}

          {/* Credits Section */}
          <CreditsSection
            credits={credits}
            isLoading={isLoading}
            isAddCreditOpen={isAddCreditOpen}
            setIsAddCreditOpen={setIsAddCreditOpen}
            createCredit={createCredit}
            editingCreditId={editingCreditId}
            setEditingCreditId={setEditingCreditId}
            updateCredit={updateCredit}
            deleteCredit={deleteCredit}
          />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// Credits Section Component with copy button and percentage validation
function CreditsSection({
  credits,
  isLoading,
  isAddCreditOpen,
  setIsAddCreditOpen,
  createCredit,
  editingCreditId,
  setEditingCreditId,
  updateCredit,
  deleteCredit,
}: {
  credits: TrackCredit[];
  isLoading: boolean;
  isAddCreditOpen: boolean;
  setIsAddCreditOpen: (open: boolean) => void;
  createCredit: { mutate: (data: { name: string; role: string; percentage?: number }) => void; isPending: boolean };
  editingCreditId: string | null;
  setEditingCreditId: (id: string | null) => void;
  updateCredit: { mutate: (args: { creditId: string; data: Partial<{ role: string; name: string; percentage: number | null }> }) => void; isPending: boolean };
  deleteCredit: { mutate: (id: string) => void };
}) {
  const [copiedCredits, setCopiedCredits] = useState(false);

  // Calculate total percentage
  const totalPercentage = credits.reduce((sum, c) => sum + (c.percentage ?? 0), 0);
  const hasPercentageError = credits.length > 0 && totalPercentage !== 100;

  const handleCopyCredits = () => {
    if (credits.length === 0) return;
    
    // Group credits by role
    const groupedByRole: Record<string, string[]> = {};
    sortCreditsByRole(credits).forEach((credit) => {
      const role = credit.role || 'Otro';
      if (!groupedByRole[role]) {
        groupedByRole[role] = [];
      }
      groupedByRole[role].push(credit.name);
    });
    
    // Format: "Rol: Name1 & Name2"
    const formattedCredits = Object.entries(groupedByRole)
      .map(([role, names]) => `${role}: ${names.join(' & ')}`)
      .join('\n');
    
    navigator.clipboard.writeText(formattedCredits);
    setCopiedCredits(true);
    toast.success('Créditos copiados');
    setTimeout(() => setCopiedCredits(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-medium">Créditos y Autoría</Label>
          {credits.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopyCredits}
              title="Copiar créditos"
            >
              {copiedCredits ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
        </div>
        <Dialog open={isAddCreditOpen} onOpenChange={setIsAddCreditOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <UserPlus className="w-3 h-3 mr-1" />
              Añadir Crédito
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir Crédito</DialogTitle>
            </DialogHeader>
            <AddCreditForm
              onSubmit={(data) => createCredit.mutate(data)}
              isLoading={createCredit.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Percentage validation warning */}
      {hasPercentageError && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            Los porcentajes suman {totalPercentage.toFixed(1)}% — deben sumar 100%
          </span>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : credits.length > 0 ? (
        <div className="space-y-2">
          {sortCreditsByRole(credits).map((credit) => (
            <CreditRow
              key={credit.id}
              credit={credit}
              isEditing={editingCreditId === credit.id}
              onStartEdit={() => setEditingCreditId(credit.id)}
              onCancelEdit={() => setEditingCreditId(null)}
              onSave={(data) => updateCredit.mutate({ creditId: credit.id, data })}
              onDelete={() => deleteCredit.mutate(credit.id)}
              isSaving={updateCredit.isPending}
              hasPercentageError={hasPercentageError}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Sin créditos ni autorías registrados para esta canción.
        </p>
      )}
    </div>
  );
}

// Credit Row with inline editing
function CreditRow({
  credit,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
  isSaving,
  hasPercentageError = false,
}: {
  credit: TrackCredit;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: Partial<{ role: string; name: string; percentage: number | null }>) => void;
  onDelete: () => void;
  isSaving: boolean;
  hasPercentageError?: boolean;
}) {
  const [editRole, setEditRole] = useState(credit.role);
  const [editName, setEditName] = useState(credit.name);
  const [editPercentage, setEditPercentage] = useState<string>(
    credit.percentage != null ? String(credit.percentage) : ''
  );
  const hasContact = !!credit.contact_id;

  const handleSave = () => {
    const updates: Partial<{ role: string; name: string; percentage: number | null }> = {};
    if (editRole !== credit.role) updates.role = editRole;
    if (!hasContact && editName !== credit.name) updates.name = editName;
    const newPercentage = editPercentage === '' ? null : Number(editPercentage);
    if (newPercentage !== credit.percentage) updates.percentage = newPercentage;
    if (Object.keys(updates).length > 0) {
      onSave(updates);
    } else {
      onCancelEdit();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 p-2 bg-background rounded border flex-wrap">
        {!hasContact && (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 h-8 min-w-[120px]"
            placeholder="Nombre"
          />
        )}
        {hasContact && (
          <span className="font-medium text-sm flex-1">{credit.name}</span>
        )}
        <Select value={editRole} onValueChange={setEditRole}>
          <SelectTrigger className="w-[140px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CREDIT_ROLES.map((role) => (
              <SelectItem key={role} value={role}>{role}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={editPercentage}
            onChange={(e) => setEditPercentage(e.target.value)}
            className="w-[70px] h-8"
            placeholder="Autoría"
            title="Porcentaje de autoría"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
        <Button size="sm" variant="default" onClick={handleSave} disabled={isSaving}>
          Guardar
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancelEdit}>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between p-2 bg-background rounded border cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onStartEdit}
    >
      <div>
        <p className="font-medium text-sm">{credit.name}</p>
        <p className="text-xs text-muted-foreground">{credit.role}</p>
      </div>
      <div className="flex items-center gap-2">
        {credit.percentage != null && (
          <Badge variant="outline" title="Porcentaje de autoría">{credit.percentage}%</Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

// Lyrics Preview with Dialog
function LyricsPreview({ lyrics, trackTitle }: { lyrics: string; trackTitle: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div 
        className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
        onClick={() => setIsOpen(true)}
      >
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-medium">Letra</Label>
          <CopyButton 
            text={lyrics} 
            successMessage="Letra copiada al portapapeles"
            size="icon"
            variant="ghost"
            className="h-7 w-7"
          />
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">
          {lyrics}
        </p>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between pr-8">
              <DialogTitle>Letra - {trackTitle}</DialogTitle>
              <CopyButton 
                text={lyrics} 
                successMessage="Letra copiada al portapapeles"
                size="sm"
                variant="outline"
                showText
              />
            </div>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] pr-2">
            <p className="text-sm whitespace-pre-line leading-relaxed">
              {lyrics}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Create Track Form
function CreateTrackForm({
  nextTrackNumber,
  onSubmit,
  isLoading,
}: {
  nextTrackNumber: number;
  onSubmit: (data: { title: string; track_number: number; lyrics?: string; isrc?: string }) => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState('');
  const [trackNumber, setTrackNumber] = useState(nextTrackNumber);
  const [lyrics, setLyrics] = useState('');
  const [isrc, setIsrc] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({
      title: title.trim(),
      track_number: trackNumber,
      lyrics: lyrics.trim() || undefined,
      isrc: isrc.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        <div className="col-span-1">
          <Label htmlFor="track_number">N°</Label>
          <Input
            id="track_number"
            type="number"
            min={1}
            value={trackNumber}
            onChange={(e) => setTrackNumber(parseInt(e.target.value) || 1)}
          />
        </div>
        <div className="col-span-3">
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nombre de la canción"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="isrc">ISRC</Label>
        <Input
          id="isrc"
          value={isrc}
          onChange={(e) => setIsrc(e.target.value)}
          placeholder="XX-XXX-00-00000"
        />
      </div>

      <div>
        <Label htmlFor="lyrics">Letra</Label>
        <Textarea
          id="lyrics"
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          placeholder="Escribe la letra de la canción..."
          rows={6}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading || !title.trim()}>
          {isLoading ? 'Guardando...' : 'Crear Canción'}
        </Button>
      </div>
    </form>
  );
}

// Edit Track Form
function EditTrackForm({
  track,
  onSubmit,
  isLoading,
}: {
  track: Track;
  onSubmit: (data: { title?: string; lyrics?: string; isrc?: string }) => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState(track.title);
  const [lyrics, setLyrics] = useState(track.lyrics || '');
  const [isrc, setIsrc] = useState(track.isrc || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title: title.trim(),
      lyrics: lyrics.trim() || undefined,
      isrc: isrc.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="edit_title">Título *</Label>
        <Input
          id="edit_title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nombre de la canción"
          required
        />
      </div>

      <div>
        <Label htmlFor="edit_isrc">ISRC</Label>
        <Input
          id="edit_isrc"
          value={isrc}
          onChange={(e) => setIsrc(e.target.value)}
          placeholder="XX-XXX-00-00000"
        />
      </div>

      <div>
        <Label htmlFor="edit_lyrics">Letra</Label>
        <Textarea
          id="edit_lyrics"
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          placeholder="Escribe la letra de la canción..."
          rows={8}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading || !title.trim()}>
          {isLoading ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </form>
  );
}

// Add Credit Form
function AddCreditForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: { name: string; role: string; percentage?: number }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [percentage, setPercentage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !role) return;
    onSubmit({
      name: name.trim(),
      role,
      percentage: percentage ? parseFloat(percentage) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="credit_name">Nombre *</Label>
        <Input
          id="credit_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre del colaborador"
          required
        />
      </div>

      <div>
        <Label htmlFor="credit_role">Rol *</Label>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un rol" />
          </SelectTrigger>
          <SelectContent>
            {CREDIT_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="credit_percentage">Porcentaje (%)</Label>
        <Input
          id="credit_percentage"
          type="number"
          min={0}
          max={100}
          step={0.1}
          value={percentage}
          onChange={(e) => setPercentage(e.target.value)}
          placeholder="Opcional"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading || !name.trim() || !role}>
          {isLoading ? 'Guardando...' : 'Añadir Crédito'}
        </Button>
      </div>
    </form>
  );
}
