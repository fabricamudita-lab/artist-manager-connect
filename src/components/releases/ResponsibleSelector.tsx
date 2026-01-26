import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, User } from "lucide-react";

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
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type ResponsibleRefType = "profile" | "contact";

export interface ResponsibleRef {
  type: ResponsibleRefType;
  id: string;
  name: string;
}

interface ResponsibleSelectorProps {
  value: ResponsibleRef | null;
  onChange: (value: ResponsibleRef | null) => void;
  placeholder?: string;
  className?: string;
}

export function ResponsibleSelector({
  value,
  onChange,
  placeholder = "Asignar...",
  className,
}: ResponsibleSelectorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ResponsibleRef[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!open) return;
      if (items.length > 0) return;

      try {
        setLoading(true);

        const [profilesRes, contactsRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("user_id, full_name")
            .order("full_name", { ascending: true }),
          supabase
            .from("contacts")
            .select("id, name, stage_name")
            .order("name", { ascending: true })
            .limit(250),
        ]);

        if (profilesRes.error) console.error("ResponsibleSelector profiles error", profilesRes.error);
        if (contactsRes.error) console.error("ResponsibleSelector contacts error", contactsRes.error);

        const profiles = profilesRes.data;
        const contacts = contactsRes.data;

        if (cancelled) return;

        const profileItems: ResponsibleRef[] = (profiles || []).map((p) => ({
          type: "profile",
          id: p.user_id,
          name: p.full_name || "Usuario",
        }));

        const contactItems: ResponsibleRef[] = (contacts || []).map((c) => ({
          type: "contact",
          id: c.id,
          name: c.stage_name || c.name,
        }));

        const merged = [...profileItems, ...contactItems].sort((a, b) =>
          a.name.localeCompare(b.name, "es")
        );
        setItems(merged);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, items.length]);

  const grouped = useMemo(() => {
    return {
      perfiles: items.filter((i) => i.type === "profile"),
      contactos: items.filter((i) => i.type === "contact"),
    };
  }, [items]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-8 w-full justify-between border-0 bg-transparent px-2 font-normal hover:bg-muted/50 focus:bg-muted",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate flex items-center gap-2">
            <User className="h-3 w-3 shrink-0 text-muted-foreground" />
            {value?.name || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar responsable..." className="h-9" />
          <CommandList className="max-h-72">
            <CommandEmpty>{loading ? "Cargando..." : "Sin resultados"}</CommandEmpty>

            <CommandGroup heading="Acciones">
              <CommandItem
                value="sin_asignar"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <span className="truncate">Sin asignar</span>
                <Check className={cn("ml-auto h-4 w-4", !value ? "opacity-100" : "opacity-0")} />
              </CommandItem>
            </CommandGroup>

            {grouped.perfiles.length > 0 && (
              <CommandGroup heading="Perfiles">
                {grouped.perfiles.map((item) => (
                  <CommandItem
                    key={`profile:${item.id}`}
                    value={item.name}
                    onSelect={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{item.name}</span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value?.type === item.type && value?.id === item.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
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
                    onSelect={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate">{item.name}</span>
                    <Check
                      className={cn(
                        "ml-auto h-4 w-4",
                        value?.type === item.type && value?.id === item.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
