import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Check, ChevronsUpDown, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TrackCredit, ReleaseArtist } from '@/hooks/useReleases';
import { useAuth } from '@/hooks/useAuth';

interface CreditedArtistRolesProps {
  releaseId: string;
  allCredits: TrackCredit[];
  releaseArtists: ReleaseArtist[];
}

interface CreditedPerson {
  name: string;
  artistId: string | null;
  contactId: string | null;
}

export function CreditedArtistRoles({ releaseId, allCredits, releaseArtists }: CreditedArtistRolesProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [openMain, setOpenMain] = useState(false);
  const [openFeat, setOpenFeat] = useState(false);

  // Deduplicate credited people by name
  const creditedPeople = useMemo(() => {
    const map = new Map<string, CreditedPerson>();
    for (const credit of allCredits) {
      const key = credit.name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: credit.name.trim(),
          artistId: credit.artist_id,
          contactId: credit.contact_id,
        });
      } else {
        const existing = map.get(key)!;
        if (!existing.artistId && credit.artist_id) existing.artistId = credit.artist_id;
        if (!existing.contactId && credit.contact_id) existing.contactId = credit.contact_id;
      }
    }
    return Array.from(map.values());
  }, [allCredits]);

  // Map release_artists by name
  const releaseArtistMap = useMemo(() => {
    const map = new Map<string, { role: string; artistId: string }>();
    for (const ra of releaseArtists) {
      if (ra.artist?.name) {
        map.set(ra.artist.name.trim().toLowerCase(), {
          role: ra.role === 'featuring' ? 'featuring' : 'main',
          artistId: ra.artist_id,
        });
      }
    }
    return map;
  }, [releaseArtists]);

  const mainArtists = creditedPeople.filter(p => releaseArtistMap.get(p.name.toLowerCase())?.role === 'main');
  const featArtists = creditedPeople.filter(p => releaseArtistMap.get(p.name.toLowerCase())?.role === 'featuring');
  const mainNames = new Set(mainArtists.map(p => p.name.toLowerCase()));
  const featNames = new Set(featArtists.map(p => p.name.toLowerCase()));

  const availableForMain = creditedPeople.filter(p => !mainNames.has(p.name.toLowerCase()) && !featNames.has(p.name.toLowerCase()));
  const availableForFeat = creditedPeople.filter(p => !mainNames.has(p.name.toLowerCase()) && !featNames.has(p.name.toLowerCase()));

  const handleRoleChange = async (person: CreditedPerson, newRole: string) => {
    setLoading(person.name);
    try {
      let artistId = person.artistId;
      const existingRA = releaseArtistMap.get(person.name.toLowerCase());
      if (existingRA) artistId = existingRA.artistId;

      if (newRole === 'none') {
        if (artistId) {
          await supabase.from('release_artists').delete().eq('release_id', releaseId).eq('artist_id', artistId);
        }
      } else {
        if (!artistId) {
          const { data: existingArtist } = await supabase
            .from('artists').select('id').ilike('name', person.name.trim()).limit(1).single();

          if (existingArtist) {
            artistId = existingArtist.id;
          } else {
            const { data: releaseData } = await supabase
              .from('releases')
              .select('artist_id, artists!releases_artist_id_fkey(workspace_id)')
              .eq('id', releaseId).single();

            const workspaceId = (releaseData?.artists as any)?.workspace_id;
            if (!workspaceId || !user?.id) {
              toast.error('No se pudo determinar el workspace');
              return;
            }

            const { data: newArtist, error: createError } = await supabase
              .from('artists')
              .insert({ name: person.name.trim(), artist_type: 'collaborator', workspace_id: workspaceId, created_by: user.id })
              .select('id').single();

            if (createError) throw createError;
            artistId = newArtist.id;
          }
        }

        const { error } = await supabase
          .from('release_artists')
          .upsert({ release_id: releaseId, artist_id: artistId, role: newRole }, { onConflict: 'release_id,artist_id' });
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['release', releaseId] });
      queryClient.invalidateQueries({ queryKey: ['release-artists', releaseId] });
    } catch (e) {
      console.error(e);
      toast.error('Error al actualizar rol de distribución');
    } finally {
      setLoading(null);
    }
  };

  if (creditedPeople.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        Añade créditos a las canciones para poder asignar roles de distribución.
      </div>
    );
  }

  const renderCombobox = (
    label: string,
    selected: CreditedPerson[],
    available: CreditedPerson[],
    role: 'main' | 'featuring',
    open: boolean,
    setOpen: (v: boolean) => void,
  ) => (
    <div className="space-y-2">
      <Label className="text-xs font-medium">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-8 text-xs">
            <span className="truncate text-muted-foreground">
              {selected.length > 0 ? `${selected.length} seleccionado(s)` : 'Buscar en créditos...'}
            </span>
            <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar..." className="h-8 text-xs" />
            <CommandEmpty className="text-xs py-3">No se encontraron nombres.</CommandEmpty>
            <CommandList className="max-h-[200px]">
              <CommandGroup>
                {[...selected, ...available].map((person) => {
                  const isSelected = selected.some(s => s.name.toLowerCase() === person.name.toLowerCase());
                  return (
                    <CommandItem
                      key={person.name}
                      value={person.name}
                      onSelect={() => {
                        if (isSelected) {
                          handleRoleChange(person, 'none');
                        } else {
                          handleRoleChange(person, role);
                        }
                      }}
                      className="text-xs cursor-pointer"
                    >
                      <Check className={cn("mr-2 h-3 w-3", isSelected ? "opacity-100" : "opacity-0")} />
                      {person.name}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((person) => (
            <Badge key={person.name} variant="secondary" className="text-xs gap-1 pr-1">
              {person.name}
              <button
                type="button"
                onClick={() => handleRoleChange(person, 'none')}
                className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                disabled={loading === person.name}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Artistas para Distribución</p>
      </div>

      {renderCombobox('Main Artist', mainArtists, availableForMain, 'main', openMain, setOpenMain)}
      {renderCombobox('Featuring', featArtists, availableForFeat, 'featuring', openFeat, setOpenFeat)}

      {(mainArtists.length > 0 || featArtists.length > 0) && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Vista: </span>
            {mainArtists.map(p => p.name).join(', ') || '—'}
            {featArtists.length > 0 && (
              <span className="italic"> feat. {featArtists.map(p => p.name).join(', ')}</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
