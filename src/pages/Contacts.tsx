import React, { useState, useEffect } from 'react';
import { Plus, Search, Users, UserCheck, FileUser, Camera, LayoutGrid, CreditCard, FolderOpen, User, Shield, BookOpen, Mail, Phone, MapPin, Building, Edit2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreateContactDialog } from '@/components/CreateContactDialog';
import { EditContactDialog } from '@/components/EditContactDialog';
import { ContactShareDialog } from '@/components/ContactShareDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { RolodexView } from '@/components/RolodexView';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ManageContactGroupsDialog } from '@/components/ManageContactGroupsDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';

interface Contact {
  id: string;
  name: string;
  stage_name?: string;
  legal_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  bank_info?: string;
  iban?: string;
  clothing_size?: string;
  shoe_size?: string;
  allergies?: string;
  special_needs?: string;
  contract_url?: string;
  preferred_hours?: string;
  company?: string;
  role?: string;
  category: string;
  city?: string;
  country?: string;
  notes?: string;
  field_config: any;
  is_public: boolean;
  public_slug?: string;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  emergency_contact?: string;
  team_contacts?: string;
  internal_notes?: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  permissions: {
    documents: 'none' | 'view' | 'edit' | 'owner';
    solicitudes: 'none' | 'view' | 'edit' | 'owner';
    carpetas: 'none' | 'view' | 'edit' | 'owner';
    booking: 'none' | 'view' | 'edit' | 'owner';
    presupuestos: 'none' | 'view' | 'edit' | 'owner';
  };
}

const CATEGORIES = [
  { value: 'artistas', label: 'Artistas', icon: Users },
  { value: 'tecnicos', label: 'Técnicos', icon: UserCheck },
  { value: 'contables', label: 'Contables', icon: FileUser },
  { value: 'prensa', label: 'Prensa', icon: Camera },
  { value: 'produccion', label: 'Producción', icon: Users },
  { value: 'disenadores', label: 'Diseñadores', icon: Camera },
  { value: 'general', label: 'General', icon: Users },
];

// Profile Tab Component
function ProfileTab() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-muted rounded-lg"></div>
        <div className="h-48 bg-muted rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="text-2xl">
                {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{profile?.full_name || 'Sin nombre'}</h2>
                  <p className="text-muted-foreground">{profile?.email}</p>
                </div>
                <Button variant="outline" size="sm">
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar Perfil
                </Button>
              </div>
              <div className="flex gap-4 mt-4">
                {profile?.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    {profile.phone}
                  </div>
                )}
                {profile?.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {profile.address}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nombre Completo</label>
              <p className="text-sm">{profile?.full_name || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-sm">{profile?.email || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Teléfono</label>
              <p className="text-sm">{profile?.phone || '-'}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Dirección</label>
              <p className="text-sm">{profile?.address || '-'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Contacto de Emergencia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Contacto</label>
              <p className="text-sm whitespace-pre-wrap">{profile?.emergency_contact || 'No configurado'}</p>
            </div>
            <Separator />
            <div>
              <label className="text-sm font-medium text-muted-foreground">Contactos del Equipo</label>
              <p className="text-sm whitespace-pre-wrap">{profile?.team_contacts || 'No configurado'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Notas Internas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {profile?.internal_notes || 'Sin notas internas'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Teams Tab Component
function TeamsTab() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      // Fetch workspace members with their profiles
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.workspace_id) {
        setLoading(false);
        return;
      }

      const { data: members, error } = await supabase
        .from('workspace_memberships')
        .select(`
          id,
          user_id,
          role,
          profiles!inner(full_name, email, avatar_url)
        `)
        .eq('workspace_id', profile.workspace_id);

      if (error) throw error;

      const formattedMembers: TeamMember[] = (members || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        full_name: m.profiles?.full_name || 'Sin nombre',
        email: m.profiles?.email || '',
        avatar_url: m.profiles?.avatar_url,
        permissions: {
          documents: 'view',
          solicitudes: 'view',
          carpetas: 'view',
          booking: 'view',
          presupuestos: 'view',
        }
      }));

      setTeamMembers(formattedMembers);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const permissionLabels = {
    none: { label: 'Sin acceso', color: 'bg-muted text-muted-foreground' },
    view: { label: 'Ver', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
    edit: { label: 'Editar', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
    owner: { label: 'Propietario', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Gestión de Equipos</h2>
          <p className="text-sm text-muted-foreground">
            Administra los accesos y permisos de tu equipo
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Invitar Miembro
        </Button>
      </div>

      {teamMembers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Sin miembros de equipo</h3>
            <p className="text-muted-foreground mb-4">
              Invita a personas a tu equipo para colaborar
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Invitar Primer Miembro
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {teamMembers.map((member) => (
            <Card key={member.id}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={member.avatar_url || ''} />
                    <AvatarFallback>
                      {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{member.full_name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {member.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {Object.entries(member.permissions).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <p className="text-xs text-muted-foreground capitalize mb-1">{key}</p>
                      <Badge className={`text-xs ${permissionLabels[value].color}`}>
                        {permissionLabels[value].label}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Agenda Tab Component (existing contacts functionality)
function AgendaTab() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [sharingContact, setSharingContact] = useState<Contact | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'rolodex'>('grid');
  const [isManageGroupsOpen, setIsManageGroupsOpen] = useState(false);
  const [groups, setGroups] = useState<Array<{ id: string; name: string; color: string }>>([]);

  const cities = Array.from(new Set(contacts.map(c => c.city).filter(Boolean))).sort();

  useEffect(() => {
    fetchContacts();
    fetchGroups();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchTerm, selectedCategory, selectedCity, selectedGroup]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los contactos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_groups')
        .select('id, name, color')
        .order('name');

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const filterContacts = async () => {
    let filtered = contacts;

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(contact => {
        const searchableFields: string[] = [contact.name];
        if (contact.stage_name) searchableFields.push(contact.stage_name);
        if (contact.legal_name) searchableFields.push(contact.legal_name);
        if (contact.role) searchableFields.push(contact.role);
        if (contact.company) searchableFields.push(contact.company);
        if (contact.email) searchableFields.push(contact.email);
        if (contact.phone) searchableFields.push(contact.phone);
        if (contact.city) searchableFields.push(contact.city);
        if (contact.country) searchableFields.push(contact.country);
        return searchableFields.some(field => field.toLowerCase().includes(term));
      });
    }

    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(contact => contact.category === selectedCategory);
    }

    if (selectedCity && selectedCity !== 'all') {
      filtered = filtered.filter(contact => contact.city === selectedCity);
    }

    if (selectedGroup && selectedGroup !== 'all') {
      try {
        const { data } = await supabase
          .from('contact_group_members')
          .select('contact_id')
          .eq('group_id', selectedGroup);

        const contactIdsInGroup = new Set(data?.map(m => m.contact_id) || []);
        filtered = filtered.filter(contact => contactIdsInGroup.has(contact.id));
      } catch (error) {
        console.error('Error filtering by group:', error);
      }
    }

    setFilteredContacts(filtered);
  };

  const handleContactCreated = () => {
    fetchContacts();
    setIsCreateDialogOpen(false);
  };

  const handleContactUpdated = () => {
    fetchContacts();
    setEditingContact(null);
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(cat => cat.value === category) || CATEGORIES[6];
  };

  const getContactDisplayName = (contact: Contact) => {
    if (contact.field_config?.stage_name && contact.stage_name) {
      return contact.stage_name;
    }
    return contact.name;
  };

  const getContactSecondaryName = (contact: Contact) => {
    if (contact.field_config?.legal_name && contact.legal_name && contact.stage_name && contact.legal_name !== contact.stage_name) {
      return contact.legal_name;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-muted rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Agenda de Contactos</h2>
          <p className="text-sm text-muted-foreground">
            {filteredContacts.length} contactos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsManageGroupsOpen(true)}>
            <FolderOpen className="w-4 h-4 mr-2" />
            Grupos
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Contacto
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por nombre, rol, ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {CATEGORIES.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Ciudad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {cities.map((city) => (
              <SelectItem key={`city-${city}`} value={city as string}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Grupo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: group.color || '#3b82f6' }}
                  />
                  {group.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'grid' | 'rolodex')}>
          <ToggleGroupItem value="grid" aria-label="Vista en cuadrícula">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="rolodex" aria-label="Vista Rolodex">
            <CreditCard className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => {
            const categoryInfo = getCategoryInfo(contact.category);
            const displayName = getContactDisplayName(contact);
            const secondaryName = getContactSecondaryName(contact);
            
            return (
              <Card key={contact.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src="" />
                        <AvatarFallback>
                          {displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{displayName}</CardTitle>
                        {secondaryName && (
                          <p className="text-sm text-muted-foreground">{secondaryName}</p>
                        )}
                        {contact.role && (
                          <Badge variant="secondary" className="mt-1">
                            {contact.role}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">•••</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingContact(contact)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSharingContact(contact)}>
                          Compartir
                        </DropdownMenuItem>
                        <DropdownMenuItem>Exportar vCard</DropdownMenuItem>
                        <DropdownMenuItem>Exportar PDF</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <categoryInfo.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{categoryInfo.label}</span>
                  </div>
                  
                  {contact.email && contact.field_config?.email && (
                    <p className="text-sm">{contact.email}</p>
                  )}
                  
                  {contact.phone && contact.field_config?.phone && (
                    <p className="text-sm">{contact.phone}</p>
                  )}
                  
                  {contact.city && (
                    <p className="text-sm text-muted-foreground">{contact.city}</p>
                  )}
                  
                  {contact.company && contact.field_config?.company && (
                    <p className="text-sm text-muted-foreground">{contact.company}</p>
                  )}

                  {contact.is_public && (
                    <Badge variant="outline" className="text-xs">Público</Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filteredContacts.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay contactos</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedCategory !== 'all' || selectedCity !== 'all'
              ? "No se encontraron contactos con los filtros aplicados"
              : "Comienza agregando tu primer contacto"}
          </p>
          {!searchTerm && selectedCategory === 'all' && selectedCity === 'all' && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear primer contacto
            </Button>
          )}
        </div>
      )}

      <CreateContactDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onContactCreated={handleContactCreated}
      />

      {editingContact && (
        <EditContactDialog
          contact={editingContact}
          open={!!editingContact}
          onOpenChange={(open) => !open && setEditingContact(null)}
          onContactUpdated={handleContactUpdated}
        />
      )}

      {sharingContact && (
        <ContactShareDialog
          contact={sharingContact}
          open={!!sharingContact}
          onOpenChange={(open) => !open && setSharingContact(null)}
        />
      )}

      <ManageContactGroupsDialog
        open={isManageGroupsOpen}
        onOpenChange={setIsManageGroupsOpen}
      />

      {viewMode === 'rolodex' && filteredContacts.length > 0 && (
        <RolodexView
          contacts={filteredContacts}
          onClose={() => setViewMode('grid')}
        />
      )}
    </div>
  );
}

export default function Contacts() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Artistas & Equipos</h1>
        <p className="text-muted-foreground">
          Gestiona tu perfil, equipo y agenda de contactos
        </p>
      </div>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="perfil" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="equipos" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Equipos
          </TabsTrigger>
          <TabsTrigger value="agenda" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Agenda
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="mt-6">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="equipos" className="mt-6">
          <TeamsTab />
        </TabsContent>

        <TabsContent value="agenda" className="mt-6">
          <AgendaTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
