import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Check, ChevronsUpDown, Plus, User, Loader2 } from 'lucide-react';

interface ContactOption {
  id: string;
  name: string;
  category?: string | null;
  role?: string | null;
  isLinked: boolean; // linked to the artist
}

type FieldType = 'sello' | 'distribucion' | 'owner';

const FIELD_CONFIG: Record<FieldType, {
  placeholder: string;
  category: string;
  role: string;
  allowCreate: boolean;
  filterCategories: string[];
  filterRoles: string[];
}> = {
  sello: {
    placeholder: 'Seleccionar sello...',
    category: 'sello',
    role: 'Sello',
    allowCreate: true,
    filterCategories: ['sello'],
    filterRoles: ['Sello', 'Label'],
  },
  distribucion: {
    placeholder: 'Seleccionar distribuidora...',
    category: 'distribucion',
    role: 'Distribución',
    allowCreate: true,
    filterCategories: ['distribucion'],
    filterRoles: ['Distribución', 'Distribuidor', 'Distribution'],
  },
  owner: {
    placeholder: 'Seleccionar owner...',
    category: 'management',
    role: 'Management',
    allowCreate: false,
    filterCategories: ['management'],
    filterRoles: ['Management', 'Manager', 'Business Manager'],
  },
};

interface ReleaseBudgetContactFieldProps {
  type: FieldType;
  artistId: string | null;
  value?: string;
  onValueChange: (value: string | undefined) => void;
}

export function ReleaseBudgetContactField({
  type,
  artistId,
  value,
  onValueChange,
}: ReleaseBudgetContactFieldProps) {
  const config = FIELD_CONFIG[type];
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (artistId) void fetchOptions();
  }, [artistId]);

  const fetchOptions = async () => {
    if (!artistId) return;
    setLoading(true);
    try {
      // 1. Get contacts linked to this artist
      const { data: assignments } = await supabase
        .from('contact_artist_assignments')
        .select('contact_id')
        .eq('artist_id', artistId);

      const linkedIds = new Set((assignments || []).map(a => a.contact_id));

      // 2. Get all contacts that match the category/role filter OR are linked
      const { data: contacts } = await supabase
        .from('contacts')
        .select('id, name, category, role')
        .order('name');

      if (!contacts) return;

      const filtered: ContactOption[] = [];
      const seen = new Set<string>();

      for (const c of contacts) {
        const isLinked = linkedIds.has(c.id);
        const matchesCategory = config.filterCategories.includes(c.category || '');
        const matchesRole = config.filterRoles.some(r =>
          (c.role || '').toLowerCase().includes(r.toLowerCase())
        );

        if (type === 'owner') {
          // Owner: only linked contacts with management category
          if (isLinked && (matchesCategory || matchesRole)) {
            if (!seen.has(c.id)) { seen.add(c.id); filtered.push({ ...c, isLinked }); }
          }
        } else {
          // Sello/Distribucion: show linked first, then matching global contacts
          if (isLinked && (matchesCategory || matchesRole)) {
            if (!seen.has(c.id)) { seen.add(c.id); filtered.push({ ...c, isLinked: true }); }
          } else if (matchesCategory || matchesRole) {
            if (!seen.has(c.id)) { seen.add(c.id); filtered.push({ ...c, isLinked: false }); }
          }
        }
      }

      setOptions(filtered);

      // Auto-select if artist has exactly one linked contact of this type and no value set
      if (!value) {
        const linkedMatch = filtered.find(o => o.isLinked);
        if (linkedMatch) {
          onValueChange(linkedMatch.id);
        }
      }
    } catch (e) {
      console.error('Error fetching contacts for field', type, e);
    } finally {
      setLoading(false);
    }
  };

  const selectedName = useMemo(() => {
    if (!value) return null;
    return options.find(o => o.id === value)?.name || null;
  }, [value, options]);

  const handleCreate = async () => {
    if (!newName.trim() || !artistId) return;
    setCreating(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error('No user');

      // Create contact
      const { data: newContact, error } = await supabase
        .from('contacts')
        .insert({
          name: newName.trim(),
          category: config.category,
          role: config.role,
          created_by: userId,
        })
        .select('id, name, category, role')
        .single();

      if (error) throw error;

      // Link to artist
      await supabase.from('contact_artist_assignments').insert({
        contact_id: newContact.id,
        artist_id: artistId,
      });

      setOptions(prev => [{ ...newContact, isLinked: true }, ...prev]);
      onValueChange(newContact.id);
      setNewName('');
      setOpen(false);
      toast.success(`${config.role} "${newName.trim()}" creado y vinculado al artista`);
    } catch (e) {
      console.error(e);
      toast.error('Error al crear contacto');
    } finally {
      setCreating(false);
    }
  };

  const linked = options.filter(o => o.isLinked);
  const others = options.filter(o => !o.isLinked);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 text-sm font-normal"
        >
          {selectedName ? (
            <div className="flex items-center gap-1.5 truncate">
              <User className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
              <span className="truncate">{selectedName}</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">{config.placeholder}</span>
          )}
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[250px] p-0 z-[300] bg-popover border border-border shadow-lg pointer-events-auto"
        align="start"
        side="bottom"
        sideOffset={4}
        avoidCollisions={false}
        style={{ pointerEvents: 'auto' }}
      >
        <Command>
          <CommandInput placeholder="Buscar..." />
          <CommandList className="max-h-[200px]">
            <CommandEmpty>
              {loading ? 'Cargando...' : 'No se encontraron contactos'}
            </CommandEmpty>

            {/* Clear option */}
            <CommandGroup>
              <CommandItem
                value="__clear__"
                onSelect={() => { onValueChange(undefined); setOpen(false); }}
                className="text-muted-foreground"
              >
                <span className="text-xs">Sin asignar</span>
              </CommandItem>
            </CommandGroup>

            {linked.length > 0 && (
              <CommandGroup heading="Vinculados al artista">
                {linked.map(o => (
                  <CommandItem
                    key={o.id}
                    value={o.name}
                    onSelect={() => { onValueChange(o.id); setOpen(false); }}
                  >
                    <Check className={cn("mr-2 h-3.5 w-3.5", value === o.id ? "opacity-100" : "opacity-0")} />
                    <span className="text-sm">{o.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {others.length > 0 && (
              <CommandGroup heading="Otros contactos">
                {others.map(o => (
                  <CommandItem
                    key={o.id}
                    value={o.name}
                    onSelect={() => { onValueChange(o.id); setOpen(false); }}
                  >
                    <Check className={cn("mr-2 h-3.5 w-3.5", value === o.id ? "opacity-100" : "opacity-0")} />
                    <span className="text-sm">{o.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>

          {/* Create new */}
          {config.allowCreate && (
            <div className="border-t p-2">
              <div className="flex gap-1.5">
                <Input
                  placeholder={`Nuevo ${config.role.toLowerCase()}...`}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="h-7 text-xs"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreate(); } }}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 px-2"
                  disabled={!newName.trim() || creating}
                  onClick={handleCreate}
                >
                  {creating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
