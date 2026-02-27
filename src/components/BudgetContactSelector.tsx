import { useEffect, useMemo, useState, useRef } from "react";
import { Check, ChevronsUpDown, Loader2, Mail, Music, Phone, Plus, User } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  role?: string | null;
  iban?: string | null;
  artist_id?: string | null;
  field_config?: any | null;
  type: "contact";
}

interface ArtistOption {
  artistId: string;
  name: string;
  legal_name?: string | null;
  iban?: string | null;
  contactId?: string | null;
  type: "artist";
}

type SelectedOption =
  | {
      id: string;
      name: string;
      email?: string | null;
      phone?: string | null;
      iban?: string | null;
      type: "contact" | "artist";
    }
  | undefined;

interface BudgetContactSelectorProps {
  value?: string;
  onValueChange: (value: string | null) => void;
  className?: string;
  compact?: boolean;
}

export function BudgetContactSelector({
  value,
  onValueChange,
  className,
  compact = false,
}: BudgetContactSelectorProps) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [artists, setArtists] = useState<ArtistOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingArtistId, setSavingArtistId] = useState<string | null>(null);

  // Inline create state
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("");
  const [saving, setSaving] = useState(false);
  const searchRef = useRef("");

  useEffect(() => {
    void fetchData();
  }, []);

  useEffect(() => {
    if (open) {
      void fetchData();
    }
  }, [open]);

  const selected: SelectedOption = useMemo(() => {
    if (!value) return undefined;
    const selectedContact = contacts.find((c) => c.id === value);
    if (selectedContact) {
      return {
        id: selectedContact.id,
        name: selectedContact.name,
        email: selectedContact.email,
        phone: selectedContact.phone,
        iban: selectedContact.iban,
        type: "contact",
      };
    }

    const selectedArtist = artists.find((a) => a.contactId === value);
    if (selectedArtist) {
      return {
        id: selectedArtist.contactId || value,
        name: selectedArtist.name,
        iban: selectedArtist.iban,
        type: "artist",
      };
    }

    return undefined;
  }, [artists, contacts, value]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: contactsData, error: contactsError } = await supabase
        .from("contacts")
        .select("id, name, email, phone, company, role, iban, artist_id, field_config")
        .order("name");

      if (contactsError) throw contactsError;
      const mappedContacts: Contact[] = (contactsData || []).map((c) => ({
        ...c,
        type: "contact" as const,
      }));
      setContacts(mappedContacts);

      const artistContactMap = new Map<string, string>();
      for (const c of mappedContacts) {
        const rosterArtistId =
          c.field_config && typeof c.field_config === "object"
            ? (c.field_config as any).roster_artist_id
            : null;
        if (rosterArtistId) artistContactMap.set(rosterArtistId, c.id);
      }

      const { data: artistsData, error: artistsError } = await supabase
        .from("artists")
        .select("id, name, stage_name, legal_name, iban")
        .order("name");

      if (artistsError) throw artistsError;

      setArtists(
        (artistsData || []).map((a) => ({
          artistId: a.id,
          name: a.stage_name || a.name,
          legal_name: a.legal_name,
          iban: a.iban,
          contactId: artistContactMap.get(a.id) ?? null,
          type: "artist" as const,
        }))
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("No se pudieron cargar los contactos");
    } finally {
      setLoading(false);
    }
  };

  const ensureMirrorContactForArtist = async (artist: ArtistOption) => {
    if (artist.contactId) return artist.contactId;

    const { data: existingContact, error: existingErr } = await supabase
      .from("contacts")
      .select("id")
      .eq("field_config->>roster_artist_id", artist.artistId)
      .maybeSingle();

    if (existingErr) throw existingErr;
    if (existingContact?.id) return existingContact.id;

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) throw new Error("No authenticated user");

    const { data: newContact, error: insertErr } = await supabase
      .from("contacts")
      .insert({
        name: artist.name,
        legal_name: artist.legal_name,
        stage_name: artist.name,
        category: "artista",
        role: "Artista",
        created_by: userId,
        field_config: {
          roster_artist_id: artist.artistId,
          mirror_type: "roster_artist",
        },
      })
      .select("id, name, email, phone, company, role, iban, artist_id, field_config")
      .single();

    if (insertErr) throw insertErr;

    setArtists((prev) =>
      prev.map((a) =>
        a.artistId === artist.artistId ? { ...a, contactId: newContact.id } : a
      )
    );
    setContacts((prev) =>
      [...prev, { ...(newContact as any), type: "contact" as const }].sort((a, b) =>
        (a.name || "").localeCompare(b.name || "")
      )
    );

    return newContact.id;
  };

  const handleSelectArtist = async (artist: ArtistOption) => {
    try {
      if (savingArtistId) return;
      setSavingArtistId(artist.artistId);

      const contactId = await ensureMirrorContactForArtist(artist);
      if (contactId) {
        onValueChange(contactId);
        setOpen(false);
      }
    } catch (e) {
      console.error(e);
      toast.error("No se pudo asignar el artista");
    } finally {
      setSavingArtistId(null);
    }
  };

  const handleStartCreate = () => {
    setNewName(searchRef.current || "");
    setNewEmail("");
    setNewRole("");
    setCreatingNew(true);
  };

  const handleCancelCreate = () => {
    setCreatingNew(false);
    setNewName("");
    setNewEmail("");
    setNewRole("");
  };

  const handleCreateContact = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("No authenticated user");

      const { data: newContact, error } = await supabase
        .from("contacts")
        .insert({
          name: newName.trim(),
          email: newEmail.trim() || null,
          role: newRole.trim() || null,
          created_by: userId,
        })
        .select("id, name, email, phone, company, role, iban, artist_id, field_config")
        .single();

      if (error) throw error;

      setContacts((prev) =>
        [...prev, { ...(newContact as any), type: "contact" as const }].sort((a, b) =>
          (a.name || "").localeCompare(b.name || "")
        )
      );
      onValueChange(newContact.id);
      setCreatingNew(false);
      setOpen(false);
      toast.success(`Contacto "${newName.trim()}" creado y asignado`);
    } catch (e) {
      console.error(e);
      toast.error("Error al crear contacto");
    } finally {
      setSaving(false);
    }
  };

  const createButton = (
    <CommandItem
      value="__create_new__"
      onSelect={handleStartCreate}
      className="text-primary"
    >
      <Plus className="mr-2 h-4 w-4" />
      <span className="text-sm font-medium">Crear contacto nuevo</span>
    </CommandItem>
  );

  const inlineCreateForm = (
    <div className="p-3 space-y-2 border-t">
      <p className="text-xs font-medium text-muted-foreground">Nuevo contacto</p>
      <Input
        placeholder="Nombre *"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        className="h-8 text-sm"
        autoFocus
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateContact(); } }}
      />
      <Input
        placeholder="Email (opcional)"
        value={newEmail}
        onChange={(e) => setNewEmail(e.target.value)}
        className="h-8 text-sm"
        type="email"
      />
      <Input
        placeholder="Rol (opcional)"
        value={newRole}
        onChange={(e) => setNewRole(e.target.value)}
        className="h-8 text-sm"
      />
      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs flex-1"
          onClick={handleCancelCreate}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs flex-1"
          onClick={handleCreateContact}
          disabled={!newName.trim() || saving}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          Crear
        </Button>
      </div>
    </div>
  );

  const popoverContentClass =
    "z-50 w-[250px] p-0 bg-popover text-popover-foreground border border-border shadow-md";

  if (compact) {
    return (
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) handleCancelCreate(); }}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-8 justify-start text-left font-normal px-2 hover:bg-muted",
              selected ? "text-foreground" : "text-muted-foreground",
              className
            )}
          >
            {selected ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate max-w-[100px] font-medium">
                        {selected.name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <div className="space-y-1">
                      <p className="font-medium">{selected.name}</p>
                      {selected.email && (
                        <p className="text-xs flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {selected.email}
                        </p>
                      )}
                      {selected.phone && (
                        <p className="text-xs flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {selected.phone}
                        </p>
                      )}
                      {selected.iban && <p className="text-xs">IBAN: {selected.iban}</p>}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className="text-xs">Asignar</span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className={popoverContentClass} align="start">
          {creatingNew ? (
            inlineCreateForm
          ) : (
            <Command>
              <CommandInput
                placeholder="Buscar contacto..."
                onValueChange={(v) => { searchRef.current = v; }}
              />
              <CommandList>
                <CommandEmpty>
                  {loading ? "Cargando..." : (
                    <div className="space-y-2 py-2">
                      <p className="text-sm text-muted-foreground">No se encontraron contactos</p>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleStartCreate}>
                        <Plus className="h-3 w-3 mr-1" /> Crear contacto
                      </Button>
                    </div>
                  )}
                </CommandEmpty>

                {artists.length > 0 && (
                  <CommandGroup heading="Artistas del roster">
                    {artists.map((artist) => (
                      <CommandItem
                        key={`artist-${artist.artistId}`}
                        value={`${artist.name} artista`}
                        disabled={savingArtistId === artist.artistId}
                        onSelect={() => {
                          void handleSelectArtist(artist);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value && artist.contactId && value === artist.contactId
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                        <div className="flex items-center gap-2">
                          <Music className="w-3 h-3 text-primary" />
                          <span className="text-sm font-medium">{artist.name}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                <CommandGroup heading="Contactos">
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
                      key={`contact-${contact.id}`}
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
                            {contact.role}
                            {contact.role && contact.company && " • "}
                            {contact.company}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}

                  {createButton}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) handleCancelCreate(); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selected ? (
            <div className="flex items-center gap-2 truncate">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{selected.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">Seleccionar contacto...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className={cn(
          "z-50 w-[300px] p-0 bg-popover text-popover-foreground border border-border shadow-md",
          className
        )}
        align="start"
      >
        {creatingNew ? (
          inlineCreateForm
        ) : (
          <Command>
            <CommandInput
              placeholder="Buscar contacto..."
              onValueChange={(v) => { searchRef.current = v; }}
            />
            <CommandList>
              <CommandEmpty>
                {loading ? "Cargando..." : (
                  <div className="space-y-2 py-2">
                    <p className="text-sm text-muted-foreground">No se encontraron contactos</p>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleStartCreate}>
                      <Plus className="h-3 w-3 mr-1" /> Crear contacto
                    </Button>
                  </div>
                )}
              </CommandEmpty>

              {artists.length > 0 && (
                <CommandGroup heading="Artistas del roster">
                  {artists.map((artist) => (
                    <CommandItem
                      key={`artist-${artist.artistId}`}
                      value={`${artist.name} artista`}
                      disabled={savingArtistId === artist.artistId}
                      onSelect={() => {
                        void handleSelectArtist(artist);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value && artist.contactId && value === artist.contactId
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <div className="flex items-center gap-2">
                        <Music className="w-4 h-4 text-primary" />
                        <span className="font-medium">{artist.name}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              <CommandGroup heading="Contactos">
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
                    key={`contact-${contact.id}`}
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

                {createButton}
              </CommandGroup>
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}

