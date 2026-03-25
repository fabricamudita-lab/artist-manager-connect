import { useState, useEffect, useRef } from 'react';
import { format, isPast, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useUpdateRelease, Release } from '@/hooks/useReleases';
import { ArtistSelector } from '@/components/ArtistSelector';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EditReleaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  release: Release | null;
}

export default function EditReleaseDialog({
  open,
  onOpenChange,
  release,
}: EditReleaseDialogProps) {
  const updateRelease = useUpdateRelease();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<'album' | 'ep' | 'single'>('single');
  const [status, setStatus] = useState<'planning' | 'in_progress' | 'released' | 'archived'>('planning');
  const [releaseDate, setReleaseDate] = useState<Date | undefined>();
  const [description, setDescription] = useState('');
  const [artistIds, setArtistIds] = useState<string[]>([]);
  const dateButtonRef = useRef<HTMLButtonElement>(null);

  const isPastDue = releaseDate && isPast(startOfDay(releaseDate)) && status !== 'released' && status !== 'archived';

  useEffect(() => {
    if (release) {
      setTitle(release.title);
      setType(release.type);
      setStatus(release.status);
      setReleaseDate(release.release_date ? new Date(release.release_date) : undefined);
      setDescription(release.description || '');
      // Load artists from release_artists if available, fallback to artist_id
      const raIds = release.release_artists?.map(ra => ra.artist_id) || [];
      setArtistIds(raIds.length > 0 ? raIds : (release.artist_id ? [release.artist_id] : []));
    }
  }, [release]);

  const handleSubmit = async () => {
    if (!release || !title.trim()) return;

    await updateRelease.mutateAsync({
      id: release.id,
      title: title.trim(),
      type,
      status,
      release_date: releaseDate ? format(releaseDate, 'yyyy-MM-dd') : null,
      description: description.trim() || null,
      artist_id: artistIds[0] || null,
      artist_ids: artistIds,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Lanzamiento</DialogTitle>
          <DialogDescription>
            Modifica los detalles del lanzamiento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isPastDue && (
            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                <p className="mb-2 font-medium">La fecha de lanzamiento ya ha pasado y el estado no es "Publicado".</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setStatus('released')}
                    className="text-xs font-medium px-2.5 py-1 rounded-md bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 transition-colors"
                  >
                    Marcar como Publicado
                  </button>
                  <button
                    type="button"
                    onClick={() => dateButtonRef.current?.click()}
                    className="text-xs font-medium px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 transition-colors"
                  >
                    Cambiar fecha
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus('archived')}
                    className="text-xs font-medium px-2.5 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                  >
                    Archivar
                  </button>
                </div>
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre del lanzamiento"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="ep">EP</SelectItem>
                  <SelectItem value="album">Álbum</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planificando</SelectItem>
                  <SelectItem value="in_progress">En Progreso</SelectItem>
                  <SelectItem value="released">Publicado</SelectItem>
                  <SelectItem value="archived">Archivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Artistas</Label>
            <ArtistSelector
              selectedArtists={artistIds}
              onSelectionChange={setArtistIds}
              placeholder="Seleccionar artistas..."
            />
          </div>

          <div className="space-y-2">
            <Label>Fecha de Lanzamiento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  ref={dateButtonRef}
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !releaseDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {releaseDate
                    ? format(releaseDate, 'PPP', { locale: es })
                    : 'Selecciona una fecha'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={releaseDate}
                  onSelect={setReleaseDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del lanzamiento (opcional)"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || updateRelease.isPending}
          >
            {updateRelease.isPending ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
