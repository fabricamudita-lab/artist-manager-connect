import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Artist {
  id: string;
  full_name: string;
  email: string;
  role: 'artist' | 'management';
}

interface ArtistSelectorProps {
  selectedArtists: string[];
  onSelectionChange: (artistIds: string[]) => void;
  placeholder?: string;
  className?: string;
  showSelfOption?: boolean;
}

export function ArtistSelector({ 
  selectedArtists, 
  onSelectionChange, 
  placeholder = "Seleccionar artistas...",
  className,
  showSelfOption = true 
}: ArtistSelectorProps) {
  const [open, setOpen] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      
      setArtists(data || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (artistId: string) => {
    if (artistId === 'self' && profile) {
      // Toggle self selection
      if (selectedArtists.includes(profile.id)) {
        onSelectionChange(selectedArtists.filter(id => id !== profile.id));
      } else {
        onSelectionChange([...selectedArtists.filter(id => id !== profile.id), profile.id]);
      }
    } else if (artistId === 'all') {
      // Toggle all artists
      const allArtistIds = artists.map(a => a.id);
      if (selectedArtists.length === allArtistIds.length) {
        onSelectionChange([]);
      } else {
        onSelectionChange(allArtistIds);
      }
    } else {
      // Toggle individual artist
      if (selectedArtists.includes(artistId)) {
        onSelectionChange(selectedArtists.filter(id => id !== artistId));
      } else {
        onSelectionChange([...selectedArtists, artistId]);
      }
    }
  };

  const getSelectedNames = () => {
    const names = artists
      .filter(artist => selectedArtists.includes(artist.id))
      .map(artist => artist.full_name);
    
    if (names.length === 0) return "Ninguno seleccionado";
    if (names.length === 1) return names[0];
    if (names.length === artists.length) return "Todos los artistas";
    return `${names.length} artistas seleccionados`;
  };

  const allArtistIds = artists.map(a => a.id);
  const allSelected = selectedArtists.length === allArtistIds.length && allArtistIds.length > 0;

  return (
    <div className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate">{getSelectedNames()}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar artistas..." />
            <CommandEmpty>No se encontraron artistas.</CommandEmpty>
            <CommandList>
              <CommandGroup>
                {showSelfOption && profile && (
                  <CommandItem
                    onSelect={() => handleSelect('self')}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedArtists.includes(profile.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <User className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>Yo mismo ({profile.full_name})</span>
                      <span className="text-xs text-muted-foreground">{profile.email}</span>
                    </div>
                  </CommandItem>
                )}
                
                {artists.length > 1 && (
                  <CommandItem
                    onSelect={() => handleSelect('all')}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        allSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Users className="mr-2 h-4 w-4" />
                    <span>Todos los artistas</span>
                  </CommandItem>
                )}
                
                {artists
                  .filter(artist => showSelfOption ? artist.id !== profile?.id : true)
                  .map((artist) => (
                    <CommandItem
                      key={artist.id}
                      onSelect={() => handleSelect(artist.id)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedArtists.includes(artist.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <User className="mr-2 h-4 w-4" />
                      <div className="flex flex-col">
                        <span>{artist.full_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {artist.email} • {artist.role}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selectedArtists.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {artists
            .filter(artist => selectedArtists.includes(artist.id))
            .map(artist => (
              <Badge
                key={artist.id}
                variant="secondary"
                className="text-xs"
              >
                {artist.full_name}
              </Badge>
            ))}
        </div>
      )}
    </div>
  );
}