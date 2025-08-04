import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, User } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';

interface Artist {
  id: string;
  full_name: string;
  email: string;
}

interface SingleArtistSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SingleArtistSelector({ 
  value, 
  onValueChange, 
  placeholder = "Seleccionar artista...",
  className
}: SingleArtistSelectorProps) {
  const [open, setOpen] = useState(false);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArtists();
  }, []);

  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      setArtists(data || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedArtist = artists.find(artist => artist.id === value);

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
            <span className="truncate">
              {selectedArtist ? selectedArtist.full_name : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar artistas..." />
            <CommandEmpty>No se encontraron artistas.</CommandEmpty>
            <CommandList>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onValueChange('');
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      !value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span>Ningún artista</span>
                </CommandItem>
                
                {artists.map((artist) => (
                  <CommandItem
                    key={artist.id}
                    onSelect={() => {
                      onValueChange(artist.id);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === artist.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <User className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{artist.full_name}</span>
                      <span className="text-xs text-muted-foreground">{artist.email}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}