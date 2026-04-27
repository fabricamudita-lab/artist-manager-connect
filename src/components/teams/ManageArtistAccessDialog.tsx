import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

type ArtistRole =
  | 'ARTIST_MANAGER'
  | 'ARTIST_OBSERVER'
  | 'BOOKING_AGENT'
  | 'PRODUCER'
  | 'LABEL'
  | 'PUBLISHER'
  | 'AR'
  | 'ROADIE_TECH';

const ROLE_OPTIONS: { value: ArtistRole; label: string }[] = [
  { value: 'ARTIST_MANAGER', label: 'Manager (acceso completo)' },
  { value: 'BOOKING_AGENT', label: 'Booking Agent' },
  { value: 'PRODUCER', label: 'Productor' },
  { value: 'LABEL', label: 'Sello' },
  { value: 'PUBLISHER', label: 'Editorial' },
  { value: 'AR', label: 'A&R' },
  { value: 'ROADIE_TECH', label: 'Técnico / Roadie' },
  { value: 'ARTIST_OBSERVER', label: 'Observador (solo lectura)' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string | null;
  userName: string;
}

interface Artist {
  id: string;
  name: string;
  stage_name: string | null;
}

interface BindingState {
  artistId: string;
  enabled: boolean;
  role: ArtistRole;
  originalEnabled: boolean;
  originalRole: ArtistRole | null;
}

export function ManageArtistAccessDialog({ open, onOpenChange, userId, userName }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [bindings, setBindings] = useState<Record<string, BindingState>>({});

  useEffect(() => {
    if (!open || !userId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [artistsRes, bindingsRes] = await Promise.all([
          supabase.from('artists').select('id, name, stage_name').order('name'),
          supabase.from('artist_role_bindings').select('artist_id, role').eq('user_id', userId),
        ]);

        if (cancelled) return;
        if (artistsRes.error) throw artistsRes.error;
        if (bindingsRes.error) throw bindingsRes.error;

        const list = artistsRes.data ?? [];
        const existing = new Map<string, ArtistRole>();
        (bindingsRes.data ?? []).forEach((b: any) => existing.set(b.artist_id, b.role));

        const initial: Record<string, BindingState> = {};
        list.forEach((a) => {
          const role = existing.get(a.id) ?? null;
          initial[a.id] = {
            artistId: a.id,
            enabled: role !== null,
            role: (role ?? 'ARTIST_MANAGER') as ArtistRole,
            originalEnabled: role !== null,
            originalRole: role,
          };
        });

        setArtists(list);
        setBindings(initial);
      } catch (err: any) {
        toast({
          title: 'Error al cargar',
          description: err.message ?? 'No se pudieron cargar los artistas.',
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, userId]);

  const toggleArtist = (artistId: string, enabled: boolean) => {
    setBindings((prev) => ({
      ...prev,
      [artistId]: { ...prev[artistId], enabled },
    }));
  };

  const setRole = (artistId: string, role: ArtistRole) => {
    setBindings((prev) => ({
      ...prev,
      [artistId]: { ...prev[artistId], role },
    }));
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const toInsert: { artist_id: string; user_id: string; role: ArtistRole }[] = [];
      const toDelete: string[] = [];
      const toUpdate: { artist_id: string; role: ArtistRole }[] = [];

      Object.values(bindings).forEach((b) => {
        if (b.enabled && !b.originalEnabled) {
          toInsert.push({ artist_id: b.artistId, user_id: userId, role: b.role });
        } else if (!b.enabled && b.originalEnabled) {
          toDelete.push(b.artistId);
        } else if (b.enabled && b.originalEnabled && b.role !== b.originalRole) {
          toUpdate.push({ artist_id: b.artistId, role: b.role });
        }
      });

      if (toInsert.length > 0) {
        const { error } = await supabase.from('artist_role_bindings').insert(toInsert as any);
        if (error) throw error;
      }
      if (toDelete.length > 0) {
        const { error } = await supabase
          .from('artist_role_bindings')
          .delete()
          .eq('user_id', userId)
          .in('artist_id', toDelete);
        if (error) throw error;
      }
      for (const u of toUpdate) {
        const { error } = await supabase
          .from('artist_role_bindings')
          .update({ role: u.role } as any)
          .eq('user_id', userId)
          .eq('artist_id', u.artist_id);
        if (error) throw error;
      }

      toast({
        title: 'Acceso actualizado',
        description: `Se actualizó el acceso a artistas de ${userName}.`,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: 'Error al guardar',
        description: err.message ?? 'No se pudieron guardar los cambios.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const enabledCount = Object.values(bindings).filter((b) => b.enabled).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Acceso a artistas</DialogTitle>
          <DialogDescription>
            Selecciona los artistas a los que <strong>{userName}</strong> debe tener acceso y define su rol en cada uno.
            Solo verá la información de los artistas marcados.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : artists.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No hay artistas en el workspace todavía.
          </p>
        ) : (
          <ScrollArea className="max-h-[50vh] pr-3">
            <div className="space-y-2">
              {artists.map((artist) => {
                const b = bindings[artist.id];
                if (!b) return null;
                const displayName = artist.stage_name || artist.name;
                return (
                  <div
                    key={artist.id}
                    className="flex items-center gap-3 p-3 rounded-md border bg-card"
                  >
                    <Checkbox
                      id={`a-${artist.id}`}
                      checked={b.enabled}
                      onCheckedChange={(c) => toggleArtist(artist.id, c === true)}
                    />
                    <Label
                      htmlFor={`a-${artist.id}`}
                      className="flex-1 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      {displayName}
                    </Label>
                    <Select
                      value={b.role}
                      onValueChange={(v) => setRole(artist.id, v as ArtistRole)}
                      disabled={!b.enabled}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {enabledCount} artista{enabledCount === 1 ? '' : 's'} seleccionado{enabledCount === 1 ? '' : 's'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
