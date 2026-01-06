import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronsUpDown, User, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TeamMember {
  id: string;
  name: string;
  role?: string | null;
  category?: string | null;
  type: 'contact' | 'artist';
}

interface TeamMemberSelectorProps {
  artistId?: string | null;
  value?: string[]; // Array of contact IDs
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  compact?: boolean;
  single?: boolean; // If true, only allow single selection
}

export function TeamMemberSelector({
  artistId,
  value = [],
  onValueChange,
  placeholder = 'Seleccionar miembros...',
  compact = false,
  single = false,
}: TeamMemberSelectorProps) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchMembers();
  }, [artistId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);

      // Fetch contacts assigned to this artist + general team contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('id, name, stage_name, role, category, artist_id, field_config')
        .or(`category.eq.equipo,category.eq.management,category.eq.artista${artistId ? `,artist_id.eq.${artistId}` : ''}`)
        .order('name');

      if (contactsError) throw contactsError;

      // Filter and map contacts - include team members and those linked to the artist
      const mappedContacts: TeamMember[] = (contactsData || [])
        .filter(c => {
          // Include if it's a team/management category
          if (c.category === 'equipo' || c.category === 'management') return true;
          // Include if linked to the specific artist
          if (artistId && c.artist_id === artistId) return true;
          // Check field_config for roster_artist_id
          if (artistId && c.field_config && typeof c.field_config === 'object') {
            const rosterArtistId = (c.field_config as any).roster_artist_id;
            if (rosterArtistId === artistId) return true;
          }
          return false;
        })
        .map(c => ({
          id: c.id,
          name: c.stage_name || c.name,
          role: c.role,
          category: c.category,
          type: 'contact' as const,
        }));

      setMembers(mappedContacts);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedMembers = useMemo(() => {
    return members.filter(m => value.includes(m.id));
  }, [members, value]);

  const handleSelect = (memberId: string) => {
    if (single) {
      // Single selection mode - replace the value
      onValueChange(value.includes(memberId) ? [] : [memberId]);
      setOpen(false);
    } else {
      // Multi selection mode - toggle
      if (value.includes(memberId)) {
        onValueChange(value.filter(id => id !== memberId));
      } else {
        onValueChange([...value, memberId]);
      }
    }
  };

  const displayValue = useMemo(() => {
    if (selectedMembers.length === 0) return placeholder;
    if (compact && selectedMembers.length > 2) {
      return `${selectedMembers.length} seleccionados`;
    }
    return selectedMembers.map(m => m.name).join(', ');
  }, [selectedMembers, compact, placeholder]);

  // Group members by category
  const groupedMembers = useMemo(() => {
    const groups: Record<string, TeamMember[]> = {};
    members.forEach(m => {
      const cat = m.category || 'otros';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    });
    return groups;
  }, [members]);

  const categoryLabels: Record<string, string> = {
    equipo: 'Equipo',
    management: 'Management',
    artista: 'Artistas',
    otros: 'Otros',
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'justify-between font-normal',
            compact ? 'h-8 px-2 text-xs' : 'h-9',
            selectedMembers.length === 0 && 'text-muted-foreground'
          )}
        >
          <span className="truncate flex items-center gap-1">
            {selectedMembers.length > 0 && <Users className="w-3 h-3 shrink-0" />}
            {displayValue}
          </span>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar miembro..." className="h-9" />
          <CommandList>
            <CommandEmpty>
              {loading ? 'Cargando...' : 'No se encontraron miembros'}
            </CommandEmpty>
            {Object.entries(groupedMembers).map(([category, categoryMembers]) => (
              <CommandGroup key={category} heading={categoryLabels[category] || category}>
                {categoryMembers.map(member => (
                  <CommandItem
                    key={member.id}
                    value={member.name}
                    onSelect={() => handleSelect(member.id)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-sm">{member.name}</span>
                        {member.role && (
                          <span className="text-xs text-muted-foreground">{member.role}</span>
                        )}
                      </div>
                    </div>
                    <Check
                      className={cn(
                        'ml-auto h-4 w-4',
                        value.includes(member.id) ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Helper component for displaying selected members as badges
export function SelectedMembersBadges({
  memberIds,
  members,
}: {
  memberIds: string[];
  members: TeamMember[];
}) {
  const selected = members.filter(m => memberIds.includes(m.id));
  if (selected.length === 0) return null;
  
  return (
    <div className="flex flex-wrap gap-1">
      {selected.map(m => (
        <Badge key={m.id} variant="secondary" className="text-xs">
          {m.name}
        </Badge>
      ))}
    </div>
  );
}
