import { useState, useEffect } from 'react';
import { Check, ChevronsUpDown, User, Users, X } from 'lucide-react';
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

interface TeamMember {
  id: string;
  full_name: string;
  email: string;
}

interface TeamMemberSelectorProps {
  selectedMembers: string[];
  onSelectionChange: (memberIds: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TeamMemberSelector({ 
  selectedMembers, 
  onSelectionChange, 
  placeholder = "Seleccionar miembros del equipo...",
  className
}: TeamMemberSelectorProps) {
  const [open, setOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name', { ascending: true });
      
      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (memberId: string) => {
    if (memberId === 'all') {
      // Toggle all members
      const allMemberIds = teamMembers.map(m => m.id);
      if (selectedMembers.length === allMemberIds.length) {
        onSelectionChange([]);
      } else {
        onSelectionChange(allMemberIds);
      }
    } else {
      // Toggle individual member
      if (selectedMembers.includes(memberId)) {
        onSelectionChange(selectedMembers.filter(id => id !== memberId));
      } else {
        onSelectionChange([...selectedMembers, memberId]);
      }
    }
  };

  const removeMember = (memberId: string) => {
    onSelectionChange(selectedMembers.filter(id => id !== memberId));
  };

  const getSelectedNames = () => {
    const names = teamMembers
      .filter(member => selectedMembers.includes(member.id))
      .map(member => member.full_name);
    
    if (names.length === 0) return "Ningún miembro seleccionado";
    if (names.length === 1) return names[0];
    if (names.length === teamMembers.length) return "Todo el equipo";
    return `${names.length} miembros seleccionados`;
  };

  const allMemberIds = teamMembers.map(m => m.id);
  const allSelected = selectedMembers.length === allMemberIds.length && allMemberIds.length > 0;

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
        <PopoverContent className="w-full p-0 bg-background border shadow-lg z-50" align="start">
          <Command>
            <CommandInput placeholder="Buscar miembros del equipo..." />
            <CommandEmpty>No se encontraron miembros.</CommandEmpty>
            <CommandList>
              <CommandGroup>
                {teamMembers.length > 1 && (
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
                    <span>Todo el equipo</span>
                  </CommandItem>
                )}
                
                {teamMembers.map((member) => (
                  <CommandItem
                    key={member.id}
                    onSelect={() => handleSelect(member.id)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedMembers.includes(member.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <User className="mr-2 h-4 w-4" />
                    <div className="flex flex-col">
                      <span>{member.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {member.email}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {selectedMembers.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {teamMembers
            .filter(member => selectedMembers.includes(member.id))
            .map(member => (
              <Badge
                key={member.id}
                variant="secondary"
                className="text-xs flex items-center gap-1"
              >
                {member.full_name}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive"
                  onClick={() => removeMember(member.id)}
                />
              </Badge>
            ))}
        </div>
      )}
    </div>
  );
}