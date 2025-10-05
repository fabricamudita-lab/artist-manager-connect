import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, Users, UserCheck, FileUser, Camera, LayoutGrid, CreditCard, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  field_config: any; // Using any to handle JSON type from database
  is_public: boolean;
  public_slug?: string;
  created_at: string;
  updated_at: string;
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

export default function Contacts() {
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
        const searchableFields: string[] = [];
        
        searchableFields.push(contact.name);
        
        if (contact.stage_name) searchableFields.push(contact.stage_name);
        if (contact.legal_name) searchableFields.push(contact.legal_name);
        if (contact.role) searchableFields.push(contact.role);
        if (contact.company && contact.field_config?.company) searchableFields.push(contact.company);
        if (contact.email && contact.field_config?.email) searchableFields.push(contact.email);
        if (contact.phone && contact.field_config?.phone) searchableFields.push(contact.phone);
        if (contact.city) searchableFields.push(contact.city);
        if (contact.country) searchableFields.push(contact.country);
        if (contact.address && contact.field_config?.address) searchableFields.push(contact.address);
        if (contact.notes && contact.field_config?.notes) searchableFields.push(contact.notes);
        if (contact.bank_info && contact.field_config?.bank_info) searchableFields.push(contact.bank_info);
        if (contact.iban && contact.field_config?.iban) searchableFields.push(contact.iban);
        if (contact.allergies && contact.field_config?.allergies) searchableFields.push(contact.allergies);
        if (contact.special_needs && contact.field_config?.special_needs) searchableFields.push(contact.special_needs);
        
        return searchableFields.some(field => 
          field.toLowerCase().includes(term)
        );
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
        const { data, error } = await supabase
          .from('contact_group_members')
          .select('contact_id')
          .eq('group_id', selectedGroup);

        if (error) throw error;
        
        const contactIdsInGroup = new Set(data.map(m => m.contact_id));
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
    return CATEGORIES.find(cat => cat.value === category) || CATEGORIES[4];
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
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contactos</h1>
          <p className="text-muted-foreground">
            Gestiona tu agenda de contactos profesionales
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsManageGroupsOpen(true)}>
            <FolderOpen className="w-4 h-4 mr-2" />
            Gestionar Grupos
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
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {CATEGORIES.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Ciudad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las ciudades</SelectItem>
            {cities.map((city) => (
              <SelectItem key={`city-${city}`} value={city}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Grupo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los grupos</SelectItem>
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
                      <Button variant="ghost" size="sm">
                        •••
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingContact(contact)}>
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSharingContact(contact)}>
                        Compartir
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Exportar vCard
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Exportar PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <categoryInfo.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {categoryInfo.label}
                  </span>
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
                  <Badge variant="outline" className="text-xs">
                    Público
                  </Badge>
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
            {searchTerm || selectedCategory || selectedCity
              ? "No se encontraron contactos con los filtros aplicados"
              : "Comienza agregando tu primer contacto"}
          </p>
          {!searchTerm && !selectedCategory && !selectedCity && (
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