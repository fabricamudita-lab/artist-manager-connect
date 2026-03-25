import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import { TrackCredit, ReleaseArtist } from '@/hooks/useReleases';
import { getRoleLabel, getCategoryMeta, getRoleCategory5 } from '@/lib/creditRoles';
import { useAuth } from '@/hooks/useAuth';

interface CreditedArtistRolesProps {
  releaseId: string;
  allCredits: TrackCredit[];
  releaseArtists: ReleaseArtist[];
}

interface CreditedPerson {
  name: string;
  roles: string[];
  artistId: string | null; // from track_credits.artist_id if linked
  contactId: string | null;
}

export function CreditedArtistRoles({ releaseId, allCredits, releaseArtists }: CreditedArtistRolesProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  // Deduplicate credited people by name
  const creditedPeople = useMemo(() => {
    const map = new Map<string, CreditedPerson>();
    for (const credit of allCredits) {
      const key = credit.name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: credit.name.trim(),
          roles: [credit.role],
          artistId: credit.artist_id,
          contactId: credit.contact_id,
        });
      } else {
        const existing = map.get(key)!;
        if (!existing.roles.includes(credit.role)) {
          existing.roles.push(credit.role);
        }
        if (!existing.artistId && credit.artist_id) {
          existing.artistId = credit.artist_id;
        }
        if (!existing.contactId && credit.contact_id) {
          existing.contactId = credit.contact_id;
        }
      }
    }
    return Array.from(map.values());
  }, [allCredits]);

  // Map: artistName (lowercase) -> release_artist role
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

  const getCurrentRole = (person: CreditedPerson): string => {
    const match = releaseArtistMap.get(person.name.toLowerCase());
    return match?.role || 'none';
  };

  const handleRoleChange = async (person: CreditedPerson, newRole: string) => {
    setLoading(person.name);
    try {
      let artistId = person.artistId;

      // Also check if there's already a release_artist for this person
      const existingRA = releaseArtistMap.get(person.name.toLowerCase());
      if (existingRA) {
        artistId = existingRA.artistId;
      }

      if (newRole === 'none') {
        // Remove from release_artists
        if (artistId) {
          await supabase
            .from('release_artists')
            .delete()
            .eq('release_id', releaseId)
            .eq('artist_id', artistId);
        }
      } else {
        // Need an artist_id - create collaborator if needed
        if (!artistId) {
          // Look up existing artist by name
          const { data: existingArtist } = await supabase
            .from('artists')
            .select('id')
            .ilike('name', person.name.trim())
            .limit(1)
            .single();

          if (existingArtist) {
            artistId = existingArtist.id;
          } else {
            // Get workspace_id from the release's artist
            const { data: releaseData } = await supabase
              .from('releases')
              .select('artist_id, artists!releases_artist_id_fkey(workspace_id)')
              .eq('id', releaseId)
              .single();

            const workspaceId = (releaseData?.artists as any)?.workspace_id;
            if (!workspaceId || !user?.id) {
              toast.error('No se pudo determinar el workspace');
              return;
            }

            const { data: newArtist, error: createError } = await supabase
              .from('artists')
              .insert({
                name: person.name.trim(),
                artist_type: 'collaborator',
                workspace_id: workspaceId,
                created_by: user.id,
              })
              .select('id')
              .single();

            if (createError) throw createError;
            artistId = newArtist.id;
          }
        }

        // Upsert into release_artists
        const { error } = await supabase
          .from('release_artists')
          .upsert(
            { release_id: releaseId, artist_id: artistId, role: newRole },
            { onConflict: 'release_id,artist_id' }
          );
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

  const mainArtists = creditedPeople.filter(p => getCurrentRole(p) === 'main');
  const featArtists = creditedPeople.filter(p => getCurrentRole(p) === 'featuring');

  if (creditedPeople.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        Añade créditos a las canciones para poder asignar roles de distribución.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">Artistas para Distribución</p>
      </div>

      <div className="space-y-1.5">
        {creditedPeople.map((person) => {
          const currentRole = getCurrentRole(person);
          return (
            <div
              key={person.name}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="font-medium text-sm truncate">{person.name}</span>
                <div className="flex gap-1 flex-wrap">
                  {person.roles.slice(0, 3).map((role) => {
                    const cat = getRoleCategory5(role);
                    const meta = cat ? getCategoryMeta(cat) : null;
                    return (
                      <Badge
                        key={role}
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${meta ? `${meta.textClass} ${meta.borderClass}` : ''}`}
                      >
                        {getRoleLabel(role)}
                      </Badge>
                    );
                  })}
                  {person.roles.length > 3 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      +{person.roles.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
              <Select
                value={currentRole}
                onValueChange={(v) => handleRoleChange(person, v)}
                disabled={loading === person.name}
              >
                <SelectTrigger className="w-[120px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sin asignar</SelectItem>
                  <SelectItem value="main">Main Artist</SelectItem>
                  <SelectItem value="featuring">Featuring</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      {(mainArtists.length > 0 || featArtists.length > 0) && (
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Vista de distribución: </span>
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
