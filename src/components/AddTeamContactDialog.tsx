import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { TeamCategorySelector, TeamCategoryOption } from './TeamCategorySelector';
import { Check, X, Music, UserPlus, BookOpen, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface Artist {
  id: string;
  name: string;
  stage_name?: string;
}

interface AgendaContact {
  id: string;
  name: string;
  stage_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  company?: string;
  city?: string;
}

interface AddTeamContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactAdded: () => void;
  customCategories?: TeamCategoryOption[];
  onAddCustomCategory?: (category: TeamCategoryOption) => void;
  defaultArtistId?: string;
}

export function AddTeamContactDialog({ 
  open, 
  onOpenChange, 
  onContactAdded,
  customCategories = [],
  onAddCustomCategory,
  defaultArtistId,
}: AddTeamContactDialogProps) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'select' | 'existing' | 'new'>('select');
  const [activeTab, setActiveTab] = useState('basico');
  const [teamCategories, setTeamCategories] = useState<string[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtistIds, setSelectedArtistIds] = useState<string[]>(defaultArtistId ? [defaultArtistId] : []);
  const [artistSelectOpen, setArtistSelectOpen] = useState(false);
  
  // Existing contact selection
  const [agendaContacts, setAgendaContacts] = useState<AgendaContact[]>([]);
  const [selectedExistingContact, setSelectedExistingContact] = useState<AgendaContact | null>(null);
  const [contactSearchTerm, setContactSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    // Datos básicos
    name: '',
    stage_name: '',
    legal_name: '',
    role: '',
    // Contacto
    email: '',
    phone: '',
    preferred_hours: '',
    // Dirección
    address: '',
    city: '',
    country: '',
    // Datos personales
    clothing_size: '',
    shoe_size: '',
    allergies: '',
    special_needs: '',
    // Financiero
    iban: '',
    bank_info: '',
    // Notas
    notes: '',
  });

  useEffect(() => {
    if (open) {
      fetchArtists();
      fetchAgendaContacts();
      if (defaultArtistId && !selectedArtistIds.includes(defaultArtistId)) {
        setSelectedArtistIds([defaultArtistId]);
      }
    } else {
      // Reset on close
      setMode('select');
      setSelectedExistingContact(null);
      setContactSearchTerm('');
    }
  }, [open, defaultArtistId]);

  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, stage_name')
        .order('name');
      
      if (error) throw error;
      setArtists(data || []);
    } catch (error) {
      console.error('Error fetching artists:', error);
    }
  };

  const fetchAgendaContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, stage_name, email, phone, role, company, city, field_config')
        .order('name');
      
      if (error) throw error;
      // Filter out contacts already in team
      const nonTeamContacts = (data || []).filter(c => {
        const config = c.field_config as Record<string, any> | null;
        return !config?.is_team_member;
      });
      setAgendaContacts(nonTeamContacts);
    } catch (error) {
      console.error('Error fetching agenda contacts:', error);
    }
  };

  const toggleArtist = (artistId: string) => {
    if (selectedArtistIds.includes(artistId)) {
      setSelectedArtistIds(selectedArtistIds.filter(id => id !== artistId));
    } else {
      setSelectedArtistIds([...selectedArtistIds, artistId]);
    }
  };

  const removeArtist = (artistId: string) => {
    setSelectedArtistIds(selectedArtistIds.filter(id => id !== artistId));
  };

  const getArtistLabel = (artistId: string) => {
    const artist = artists.find(a => a.id === artistId);
    return artist?.stage_name || artist?.name || artistId;
  };

  const handleAddExistingContact = async () => {
    if (!selectedExistingContact) {
      toast({
        title: "Error",
        description: "Selecciona un contacto de la agenda",
        variant: "destructive",
      });
      return;
    }

    if (teamCategories.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona al menos una etiqueta de equipo",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Update existing contact to be a team member
      const { error } = await supabase
        .from('contacts')
        .update({
          field_config: {
            is_team_member: true,
            team_categories: teamCategories,
          },
          category: teamCategories[0],
        })
        .eq('id', selectedExistingContact.id);

      if (error) throw error;

      // Insert artist assignments if any artists selected
      if (selectedArtistIds.length > 0) {
        // First remove any existing assignments for this contact
        await supabase
          .from('contact_artist_assignments')
          .delete()
          .eq('contact_id', selectedExistingContact.id);

        const assignments = selectedArtistIds.map(artistId => ({
          contact_id: selectedExistingContact.id,
          artist_id: artistId,
        }));

        const { error: assignError } = await supabase
          .from('contact_artist_assignments')
          .insert(assignments);

        if (assignError) {
          console.error('Error assigning artists:', assignError);
        }
      }

      toast({
        title: "Miembro añadido",
        description: `${selectedExistingContact.stage_name || selectedExistingContact.name} se ha añadido al equipo`,
      });

      // Reset and close
      setTeamCategories([]);
      setSelectedArtistIds(defaultArtistId ? [defaultArtistId] : []);
      setSelectedExistingContact(null);
      setMode('select');
      onContactAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding existing contact to team:', error);
      toast({
        title: "Error",
        description: "No se pudo añadir el contacto al equipo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
        variant: "destructive",
      });
      return;
    }

    if (teamCategories.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona al menos una etiqueta",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Create a contact with is_team_member flag and multiple categories
      // Don't use artist_id directly - use the junction table instead
      const { data: newContact, error } = await supabase
        .from('contacts')
        .insert({
          name: formData.name.trim(),
          stage_name: formData.stage_name || null,
          legal_name: formData.legal_name || null,
          role: formData.role || null,
          category: teamCategories[0], // Primary category for backwards compatibility
          email: formData.email || null,
          phone: formData.phone || null,
          preferred_hours: formData.preferred_hours || null,
          address: formData.address || null,
          city: formData.city || null,
          country: formData.country || null,
          clothing_size: formData.clothing_size || null,
          shoe_size: formData.shoe_size || null,
          allergies: formData.allergies || null,
          special_needs: formData.special_needs || null,
          iban: formData.iban || null,
          bank_info: formData.bank_info || null,
          notes: formData.notes || null,
          created_by: user.id,
          field_config: {
            is_team_member: true,
            team_categories: teamCategories,
          },
        })
        .select('id')
        .single();

      if (error) throw error;

      // Insert artist assignments if any artists selected
      if (selectedArtistIds.length > 0 && newContact?.id) {
        const assignments = selectedArtistIds.map(artistId => ({
          contact_id: newContact.id,
          artist_id: artistId,
        }));

        const { error: assignError } = await supabase
          .from('contact_artist_assignments')
          .insert(assignments);

        if (assignError) {
          console.error('Error assigning artists:', assignError);
          // Don't fail the whole operation, just log the error
        }
      }

      toast({
        title: "Miembro añadido",
        description: `${formData.name} se ha añadido al equipo`,
      });

      // Reset form
      setFormData({
        name: '',
        stage_name: '',
        legal_name: '',
        role: '',
        email: '',
        phone: '',
        preferred_hours: '',
        address: '',
        city: '',
        country: '',
        clothing_size: '',
        shoe_size: '',
        allergies: '',
        special_needs: '',
        iban: '',
        bank_info: '',
        notes: '',
      });
      setTeamCategories([]);
      setSelectedArtistIds(defaultArtistId ? [defaultArtistId] : []);
      setActiveTab('basico');
      onContactAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding team member:', error);
      toast({
        title: "Error",
        description: "No se pudo añadir el miembro",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const filteredAgendaContacts = agendaContacts.filter(c => {
    if (!contactSearchTerm) return true;
    const term = contactSearchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.stage_name?.toLowerCase().includes(term)) ||
      (c.email?.toLowerCase().includes(term)) ||
      (c.role?.toLowerCase().includes(term)) ||
      (c.company?.toLowerCase().includes(term))
    );
  });

  // Mode selection screen
  if (mode === 'select') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Añadir Miembro al Equipo</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              ¿Cómo quieres añadir el miembro?
            </p>
            
            <div className="grid gap-3">
              <Button
                variant="outline"
                className="h-auto p-4 justify-start"
                onClick={() => setMode('existing')}
              >
                <BookOpen className="w-5 h-5 mr-3 text-primary" />
                <div className="text-left">
                  <div className="font-medium">Desde la Agenda</div>
                  <div className="text-xs text-muted-foreground">
                    Seleccionar un contacto existente
                  </div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="h-auto p-4 justify-start"
                onClick={() => setMode('new')}
              >
                <UserPlus className="w-5 h-5 mr-3 text-primary" />
                <div className="text-left">
                  <div className="font-medium">Nuevo perfil</div>
                  <div className="text-xs text-muted-foreground">
                    Crear un perfil desde cero
                  </div>
                </div>
              </Button>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Existing contact selection screen
  if (mode === 'existing') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setMode('select')} className="mr-2">
                ← Volver
              </Button>
              Seleccionar de la Agenda
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden flex flex-col gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar contacto..."
                value={contactSearchTerm}
                onChange={(e) => setContactSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Contact list */}
            <div className="flex-1 overflow-y-auto border rounded-md">
              {filteredAgendaContacts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No hay contactos disponibles</p>
                  <p className="text-xs">Los contactos ya añadidos al equipo no aparecen aquí</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredAgendaContacts.map(contact => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => setSelectedExistingContact(contact)}
                      className={cn(
                        "w-full p-3 text-left hover:bg-accent transition-colors flex items-center gap-3",
                        selectedExistingContact?.id === contact.id && "bg-accent"
                      )}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="text-sm">
                          {(contact.stage_name || contact.name).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {contact.stage_name || contact.name}
                        </div>
                        <div className="text-sm text-muted-foreground truncate">
                          {contact.role && <span>{contact.role}</span>}
                          {contact.role && contact.email && <span> · </span>}
                          {contact.email && <span>{contact.email}</span>}
                        </div>
                      </div>
                      {selectedExistingContact?.id === contact.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Team config for selected contact */}
            {selectedExistingContact && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center gap-2 p-2 bg-accent/50 rounded-md">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {(selectedExistingContact.stage_name || selectedExistingContact.name).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">
                    {selectedExistingContact.stage_name || selectedExistingContact.name}
                  </span>
                  <Badge variant="secondary" className="ml-auto">Seleccionado</Badge>
                </div>
                
                <div>
                  <Label>Artistas</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Asignar a uno o varios artistas
                  </p>
                  <Popover open={artistSelectOpen} onOpenChange={setArtistSelectOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-start text-left font-normal h-auto min-h-10"
                      >
                        {selectedArtistIds.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedArtistIds.map((artistId) => (
                              <span
                                key={artistId}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary text-sm"
                              >
                                <Music className="w-3 h-3" />
                                {getArtistLabel(artistId)}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeArtist(artistId);
                                  }}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Seleccionar artistas...</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar artista..." />
                        <CommandList>
                          <CommandEmpty>No se encontró ningún artista.</CommandEmpty>
                          <CommandGroup>
                            {artists.map((artist) => (
                              <CommandItem
                                key={artist.id}
                                value={artist.stage_name || artist.name}
                                onSelect={() => toggleArtist(artist.id)}
                              >
                                <div className={cn(
                                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                                  selectedArtistIds.includes(artist.id) ? "bg-primary text-primary-foreground" : "opacity-50"
                                )}>
                                  {selectedArtistIds.includes(artist.id) && <Check className="h-3 w-3" />}
                                </div>
                                {artist.stage_name || artist.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <Label>Etiquetas de equipo *</Label>
                  <TeamCategorySelector
                    selectedCategories={teamCategories}
                    onCategoriesChange={setTeamCategories}
                    customCategories={customCategories}
                    onAddCustomCategory={onAddCustomCategory}
                    placeholder="Seleccionar etiquetas..."
                  />
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setMode('select')}>
              Volver
            </Button>
            <Button 
              onClick={handleAddExistingContact} 
              disabled={loading || !selectedExistingContact || teamCategories.length === 0}
            >
              {loading ? 'Añadiendo...' : 'Añadir al Equipo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // New profile form (mode === 'new')
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setMode('select')} className="mr-2">
              ← Volver
            </Button>
            Nuevo Perfil de Equipo
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basico">Básico</TabsTrigger>
              <TabsTrigger value="contacto">Contacto</TabsTrigger>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="financiero">Financiero</TabsTrigger>
              <TabsTrigger value="notas">Notas</TabsTrigger>
            </TabsList>

            <TabsContent value="basico" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">Nombre completo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    placeholder="Nombre y apellidos"
                  />
                </div>
                <div>
                  <Label htmlFor="stage_name">Nombre artístico</Label>
                  <Input
                    id="stage_name"
                    value={formData.stage_name}
                    onChange={(e) => updateField('stage_name', e.target.value)}
                    placeholder="Nombre de escenario"
                  />
                </div>
                <div>
                  <Label htmlFor="legal_name">Nombre legal/fiscal</Label>
                  <Input
                    id="legal_name"
                    value={formData.legal_name}
                    onChange={(e) => updateField('legal_name', e.target.value)}
                    placeholder="Para contratos y facturas"
                  />
                </div>
                <div>
                  <Label htmlFor="role">Rol / Instrumento</Label>
                  <Input
                    id="role"
                    value={formData.role}
                    onChange={(e) => updateField('role', e.target.value)}
                    placeholder="Ej: Batería, Manager, Fotógrafo..."
                  />
                </div>
                <div className="col-span-2">
                  <Label>Artistas</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Puedes asignar este miembro a varios artistas
                  </p>
                  <Popover open={artistSelectOpen} onOpenChange={setArtistSelectOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={artistSelectOpen}
                        className="w-full justify-start text-left font-normal h-auto min-h-10 bg-background hover:bg-background/80"
                      >
                        {selectedArtistIds.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {selectedArtistIds.map((artistId) => (
                              <span
                                key={artistId}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-background border border-border/50 text-sm font-medium text-foreground shadow-sm"
                              >
                                <Music className="w-3.5 h-3.5 text-primary" />
                                {getArtistLabel(artistId)}
                                <button
                                  type="button"
                                  className="ml-0.5 rounded-full p-0.5 hover:bg-muted transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeArtist(artistId);
                                  }}
                                >
                                  <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Seleccionar artistas...</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar artista..." />
                        <CommandList>
                          <CommandEmpty>No se encontró ningún artista.</CommandEmpty>
                          <CommandGroup heading="Artistas">
                            {artists.map((artist) => {
                              const isSelected = selectedArtistIds.includes(artist.id);
                              return (
                                <CommandItem
                                  key={artist.id}
                                  value={artist.stage_name || artist.name}
                                  onSelect={() => toggleArtist(artist.id)}
                                >
                                  <div className={cn(
                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                    isSelected ? "bg-primary text-primary-foreground" : "opacity-50"
                                  )}>
                                    {isSelected && <Check className="h-3 w-3" />}
                                  </div>
                                  <Music className="mr-2 h-4 w-4" />
                                  {artist.stage_name || artist.name}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="col-span-2">
                  <Label>Etiquetas de equipo *</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Puedes asignar varias etiquetas (ej: Banda + Producción)
                  </p>
                  <TeamCategorySelector
                    selectedCategories={teamCategories}
                    onCategoriesChange={setTeamCategories}
                    customCategories={customCategories}
                    onAddCustomCategory={onAddCustomCategory}
                    placeholder="Seleccionar etiquetas..."
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contacto" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    placeholder="+34 600 000 000"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="preferred_hours">Horario preferido de contacto</Label>
                  <Input
                    id="preferred_hours"
                    value={formData.preferred_hours}
                    onChange={(e) => updateField('preferred_hours', e.target.value)}
                    placeholder="Ej: Lunes a viernes 10:00-14:00"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    placeholder="Calle, número, piso..."
                  />
                </div>
                <div>
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => updateField('city', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => updateField('country', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="personal" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Información útil para tours, riders y logística
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clothing_size">Talla de ropa</Label>
                  <Input
                    id="clothing_size"
                    value={formData.clothing_size}
                    onChange={(e) => updateField('clothing_size', e.target.value)}
                    placeholder="Ej: M, L, XL..."
                  />
                </div>
                <div>
                  <Label htmlFor="shoe_size">Talla de calzado</Label>
                  <Input
                    id="shoe_size"
                    value={formData.shoe_size}
                    onChange={(e) => updateField('shoe_size', e.target.value)}
                    placeholder="Ej: 42"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="allergies">Alergias alimentarias/médicas</Label>
                  <Textarea
                    id="allergies"
                    value={formData.allergies}
                    onChange={(e) => updateField('allergies', e.target.value)}
                    placeholder="Alergias a alimentos, medicamentos..."
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="special_needs">Necesidades especiales</Label>
                  <Textarea
                    id="special_needs"
                    value={formData.special_needs}
                    onChange={(e) => updateField('special_needs', e.target.value)}
                    placeholder="Requisitos de accesibilidad, dieta especial, etc."
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="financiero" className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                Datos para pagos y facturación
              </p>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    value={formData.iban}
                    onChange={(e) => updateField('iban', e.target.value)}
                    placeholder="ES00 0000 0000 0000 0000 0000"
                  />
                </div>
                <div>
                  <Label htmlFor="bank_info">Información bancaria adicional</Label>
                  <Textarea
                    id="bank_info"
                    value={formData.bank_info}
                    onChange={(e) => updateField('bank_info', e.target.value)}
                    placeholder="Titular de la cuenta, banco, SWIFT/BIC para transferencias internacionales..."
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notas" className="space-y-4 mt-4">
              <div>
                <Label htmlFor="notes">Notas internas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Notas privadas sobre este miembro del equipo..."
                  rows={6}
                />
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setMode('select')}>
              Volver
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Añadiendo...' : 'Añadir al Equipo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
