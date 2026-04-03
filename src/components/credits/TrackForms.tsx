import React, { useState } from 'react';
import { GripVertical, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CopyButton } from '@/components/ui/copy-button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Track } from '@/hooks/useReleases';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Track Row for reorder mode
export function SortableTrackRow({ track }: { track: Track }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: track.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 rounded-lg border bg-card cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
      <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground w-6">{track.track_number}.</span>
      <span className="font-medium">{track.title}</span>
    </div>
  );
}

// Lyrics Preview with Dialog
export function LyricsPreview({ lyrics, trackTitle }: { lyrics: string; trackTitle: string }) {
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
export function CreateTrackForm({
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
          <Input id="track_number" type="number" min={1} value={trackNumber} onChange={(e) => setTrackNumber(parseInt(e.target.value) || 1)} />
        </div>
        <div className="col-span-3">
          <Label htmlFor="title">Título *</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre de la canción" required />
        </div>
      </div>
      <div>
        <Label htmlFor="isrc">ISRC</Label>
        <Input id="isrc" value={isrc} onChange={(e) => setIsrc(e.target.value)} placeholder="XX-XXX-00-00000" />
      </div>
      <div>
        <Label htmlFor="lyrics">Letra</Label>
        <Textarea id="lyrics" value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Escribe la letra de la canción..." rows={6} />
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
export function EditTrackForm({
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
        <Input id="edit_title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre de la canción" required />
      </div>
      <div>
        <Label htmlFor="edit_isrc">ISRC</Label>
        <Input id="edit_isrc" value={isrc} onChange={(e) => setIsrc(e.target.value)} placeholder="XX-XXX-00-00000" />
      </div>
      <div>
        <Label htmlFor="edit_lyrics">Letra</Label>
        <Textarea id="edit_lyrics" value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Escribe la letra de la canción..." rows={8} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading || !title.trim()}>
          {isLoading ? 'Guardando...' : 'Guardar Cambios'}
        </Button>
      </div>
    </form>
  );
}
