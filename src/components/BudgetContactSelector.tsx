import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, User, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  role?: string;
  iban?: string;
}

interface BudgetContactSelectorProps {
  value?: string;
  onValueChange: (value: string | null) => void;
  className?: string;
  compact?: boolean;
}

export function BudgetContactSelector({ value, onValueChange, className, compact = false }: BudgetContactSelectorProps) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, email, phone, company, role, iban')
        .order('name');

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedContact = contacts.find(c => c.id === value);

  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-8 justify-start text-left font-normal px-2 hover:bg-blue-100",
              selectedContact ? "text-gray-900" : "text-muted-foreground",
              className
            )}
          >
            {selectedContact ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 truncate text-gray-900">
                      <User className="w-3 h-3 flex-shrink-0 text-gray-700" />
                      <span className="truncate max-w-[100px] text-gray-900 font-medium">{selectedContact.name}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium">{selectedContact.name}</p>
                      {selectedContact.email && (
                        <p className="text-xs flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {selectedContact.email}
                        </p>
                      )}
                      {selectedContact.phone && (
                        <p className="text-xs flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {selectedContact.phone}
                        </p>
                      )}
                      {selectedContact.iban && (
                        <p className="text-xs">IBAN: {selectedContact.iban}</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className="text-xs">Asignar</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar contacto..." />
            <CommandList>
              <CommandEmpty>
                {loading ? 'Cargando...' : 'No se encontraron contactos'}
              </CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onValueChange(null);
                    setOpen(false);
                  }}
                  className="text-muted-foreground"
                >
                  <span className="text-sm">Sin asignar</span>
                </CommandItem>
                {contacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    value={contact.name}
                    onSelect={() => {
                      onValueChange(contact.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === contact.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{contact.name}</span>
                      {(contact.role || contact.company) && (
                        <span className="text-xs text-muted-foreground">
                          {contact.role}{contact.role && contact.company && ' • '}{contact.company}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedContact ? (
            <div className="flex items-center gap-2 truncate">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{selectedContact.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Seleccionar contacto...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar contacto..." />
          <CommandList>
            <CommandEmpty>
              {loading ? 'Cargando...' : 'No se encontraron contactos'}
            </CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__clear__"
                onSelect={() => {
                  onValueChange(null);
                  setOpen(false);
                }}
                className="text-muted-foreground"
              >
                <span>Sin asignar</span>
              </CommandItem>
              {contacts.map((contact) => (
                <CommandItem
                  key={contact.id}
                  value={contact.name}
                  onSelect={() => {
                    onValueChange(contact.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === contact.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{contact.name}</span>
                    <div className="text-xs text-muted-foreground">
                      {contact.email && <span>{contact.email}</span>}
                      {contact.role && <span className="ml-2">• {contact.role}</span>}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
