import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface ProducerRef {
  type: "profile" | "contact";
  id: string;
  name: string;
}

interface ProducerSelectorProps {
  value: ProducerRef[];
  onChange: (value: ProducerRef[]) => void;
  artistId?: string | null;
  placeholder?: string;
  className?: string;
}

export function ProducerSelector({
  value,
  onChange,
  artistId,
  placeholder = "Seleccionar productor/es...",
  className,
}: ProducerSelectorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ProducerRef[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!open) return;

      try {
        setLoading(true);
        const allItems: ProducerRef[] = [];

        if (artistId) {
          // 1. Contacts linked to artist
          const { data: assignments } = await supabase
            .from("contact_artist_assignments")
            .select("contact_id")
            .eq("artist_id", artistId);

          const contactIds = (assignments || []).map((a) => a.contact_id);

          if (contactIds.length > 0) {
            const { data: contacts } = await supabase
              .from("contacts")
              .select("id, name, stage_name")
              .in("id", contactIds)
              .order("name", { ascending: true });

            (contacts || []).forEach((c) => {
              allItems.push({ type: "contact", id: c.id, name: c.stage_name || c.name });
            });
          }

          // 2. Workspace profiles with artist binding
          const { data: bindings } = await supabase
            .from("artist_role_bindings")
            .select("user_id")
            .eq("artist_id", artistId);

          const userIds = (bindings || []).map((b) => b.user_id);

          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from("profiles")
              .select("user_id, full_name, stage_name")
              .in("user_id", userIds)
              .order("full_name", { ascending: true });

            (profiles || []).forEach((p) => {
              allItems.push({
                type: "profile",
                id: p.user_id,
                name: p.stage_name || p.full_name || "Usuario",
              });
            });
          }
        } else {
          // Fallback: no artistId
          const [profilesRes, contactsRes] = await Promise.all([
            supabase
              .from("profiles")
              .select("user_id, full_name, stage_name")
              .order("full_name", { ascending: true })
              .limit(50),
            supabase
              .from("contacts")
              .select("id, name, stage_name")
              .order("name", { ascending: true })
              .limit(100),
          ]);

          (profilesRes.data || []).forEach((p) => {
            allItems.push({
              type: "profile",
              id: p.user_id,
              name: p.stage_name || p.full_name || "Usuario",
            });
          });

          (contactsRes.data || []).forEach((c) => {
            allItems.push({ type: "contact", id: c.id, name: c.stage_name || c.name });
          });
        }

        if (cancelled) return;

        allItems.sort((a, b) => a.name.localeCompare(b.name, "es"));
        setItems(allItems);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [open, artistId]);

  const grouped = useMemo(() => ({
    perfiles: items.filter((i) => i.type === "profile"),
    contactos: items.filter((i) => i.type === "contact"),
  }), [items]);

  const isSelected = (item: ProducerRef) =>
    value.some((v) => v.type === item.type && v.id === item.id);

  const toggle = (item: ProducerRef) => {
    if (isSelected(item)) {
      onChange(value.filter((v) => !(v.type === item.type && v.id === item.id)));
    } else {
      onChange([...value, item]);
    }
  };

  const remove = (item: ProducerRef) => {
    onChange(value.filter((v) => !(v.type === item.type && v.id === item.id)));
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-9 w-full justify-between text-sm font-normal"
          >
            <span className="flex items-center gap-1.5 truncate text-muted-foreground">
              <User className="h-3.5 w-3.5 shrink-0" />
              {value.length === 0
                ? placeholder
                : `${value.length} seleccionado${value.length > 1 ? "s" : ""}`}
            </span>
            <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar..." className="h-9" />
            <CommandList className="max-h-64">
              <CommandEmpty>{loading ? "Cargando..." : "Sin resultados"}</CommandEmpty>

              {grouped.perfiles.length > 0 && (
                <CommandGroup heading="Equipo del artista">
                  {grouped.perfiles.map((item) => (
                    <CommandItem
                      key={`profile:${item.id}`}
                      value={item.name}
                      onSelect={() => toggle(item)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          isSelected(item) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{item.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {grouped.contactos.length > 0 && (
                <CommandGroup heading="Contactos">
                  {grouped.contactos.map((item) => (
                    <CommandItem
                      key={`contact:${item.id}`}
                      value={item.name}
                      onSelect={() => toggle(item)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          isSelected(item) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="truncate">{item.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected badges */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((item) => (
            <Badge
              key={`${item.type}:${item.id}`}
              variant="secondary"
              className="flex items-center gap-1 pr-1 text-xs"
            >
              <span className="max-w-[120px] truncate">{item.name}</span>
              <button
                type="button"
                onClick={() => remove(item)}
                className="ml-0.5 rounded-sm hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
