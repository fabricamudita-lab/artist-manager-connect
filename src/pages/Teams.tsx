import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Users, Mail, Building, Shield, UserCheck, Edit2, Settings, MoreVertical, UserMinus, FolderPlus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { InviteTeamMemberDialog } from '@/components/InviteTeamMemberDialog';
import { AddTeamContactDialog } from '@/components/AddTeamContactDialog';
import { TeamMemberActivityDialog } from '@/components/TeamMemberActivityDialog';
import { CreateTeamDialog } from '@/components/CreateTeamDialog';
import { EditContactDialog } from '@/components/EditContactDialog';
import { ContactProfileSheet } from '@/components/ContactProfileSheet';
import { TEAM_CATEGORIES } from '@/lib/teamCategories';

type TeamCategory = 'banda' | 'artistico' | 'tecnico' | 'management' | 'comunicacion' | 'legal' | 'produccion' | 'otro';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  functional_role?: string; // Rol funcional (ej: "Business Manager")
  team_category: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  mirror_contact_id?: string; // ID del contacto espejo si existe
  permissions: {
    documents: 'none' | 'view' | 'edit' | 'owner';
    solicitudes: 'none' | 'view' | 'edit' | 'owner';
    carpetas: 'none' | 'view' | 'edit' | 'owner';
    booking: 'none' | 'view' | 'edit' | 'owner';
    presupuestos: 'none' | 'view' | 'edit' | 'owner';
  };
}

export default function Teams() {
  const [searchParams] = useSearchParams();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamContacts, setTeamContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingContact, setEditingContact] = useState<any | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [addContactDialogOpen, setAddContactDialogOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<Array<{ value: string; label: string; icon: any; isCustom: boolean }>>([]);
  const [createTeamDialogOpen, setCreateTeamDialogOpen] = useState(false);
  
  // Artist filter state - initialize from URL param if present
  const [artists, setArtists] = useState<Array<{ id: string; name: string; stage_name?: string }>>([]);
  const artistIdFromUrl = searchParams.get('artistId');
  const [selectedArtistId, setSelectedArtistId] = useState<string>(artistIdFromUrl || 'all');

  // State for activity dialog
  const [activityMember, setActivityMember] = useState<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    role?: string;
    type: 'contact' | 'profile';
  } | null>(null);

  // State for contact quick view
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // State for editing functional role
  const [editingMemberRole, setEditingMemberRole] = useState<{ memberId: string; userId: string; name: string; currentRole?: string; mirrorContactId?: string } | null>(null);
  const [newFunctionalRole, setNewFunctionalRole] = useState('');

  // Load custom categories from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('custom_team_categories');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setCustomCategories(parsed.map((c: any) => ({ ...c, icon: Users, isCustom: true })));
      } catch (e) {
        console.error('Error loading custom categories:', e);
      }
    }
  }, []);

  // Fetch artists
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

  useEffect(() => {
    fetchArtists();
  }, []);

  useEffect(() => {
    fetchTeamMembers();
    fetchTeamContacts();
  }, []);

  const handleAddCustomCategory = (category: { value: string; label: string; icon: any; isCustom?: boolean }) => {
    const newCat = { ...category, icon: Users, isCustom: true };
    setCustomCategories(prev => {
      const updated = [...prev, newCat];
      localStorage.setItem('custom_team_categories', JSON.stringify(updated.map(c => ({ value: c.value, label: c.label }))));
      return updated;
    });
  };

  const allCategoriesForDisplay = [...TEAM_CATEGORIES, ...customCategories];

  const fetchTeamContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('created_by', user.id)
        .order('name');

      if (error) throw error;

      const teamContactsList = (data || []).filter(c => {
        const config = c.field_config as Record<string, any> | null;
        return config?.is_team_member === true;
      });

      if (teamContactsList.length > 0) {
        const contactIds = teamContactsList.map(c => c.id);
        const { data: assignments, error: assignError } = await supabase
          .from('contact_artist_assignments')
          .select('contact_id, artist_id')
          .in('contact_id', contactIds);

        if (!assignError && assignments) {
          const assignmentMap = new Map<string, string[]>();
          assignments.forEach(a => {
            if (!assignmentMap.has(a.contact_id)) {
              assignmentMap.set(a.contact_id, []);
            }
            assignmentMap.get(a.contact_id)!.push(a.artist_id);
          });

          teamContactsList.forEach(c => {
            (c as any).assigned_artist_ids = assignmentMap.get(c.id) || [];
          });
        }
      }

      setTeamContacts(teamContactsList);
    } catch (error) {
      console.error('Error fetching team contacts:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
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

      setWorkspaceId(profile.workspace_id);

      const { data: workspace } = await supabase
        .from('workspaces')
        .select('created_by')
        .eq('id', profile.workspace_id)
        .single();

      let { data: members, error } = await supabase
        .from('workspace_memberships')
        .select('id, user_id, role, team_category')
        .eq('workspace_id', profile.workspace_id);

      if (error) throw error;

      if ((!members || members.length === 0) && workspace?.created_by === user.id) {
        const { data: newMembership, error: insertError } = await supabase
          .from('workspace_memberships')
          .insert({
            workspace_id: profile.workspace_id,
            user_id: user.id,
            role: 'OWNER',
            team_category: 'management'
          })
          .select('id, user_id, role, team_category')
          .single();

        if (!insertError && newMembership) {
          members = [newMembership];
        }
      }

      if (!members || members.length === 0) {
        setTeamMembers([]);
        setLoading(false);
        return;
      }

      const userIds = members.map(m => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, stage_name, email, avatar_url')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Fetch mirror contacts for workspace members
      const { data: mirrorContacts } = await supabase
        .from('contacts')
        .select('id, name, role, field_config')
        .filter('field_config->>workspace_user_id', 'in', `(${userIds.join(',')})`);

      const mirrorContactMap = new Map<string, any>();
      (mirrorContacts || []).forEach((c: any) => {
        const config = c.field_config as Record<string, any> | null;
        if (config?.workspace_user_id) {
          mirrorContactMap.set(config.workspace_user_id, c);
        }
      });

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      const formattedMembers: TeamMember[] = members.map((m: any) => {
        const memberProfile = profileMap.get(m.user_id);
        const mirrorContact = mirrorContactMap.get(m.user_id);
        const displayName = memberProfile?.stage_name || memberProfile?.full_name || 'Sin nombre';
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          functional_role: mirrorContact?.role || undefined,
          team_category: m.team_category || 'management',
          full_name: displayName,
          email: memberProfile?.email || '',
          avatar_url: memberProfile?.avatar_url,
          mirror_contact_id: mirrorContact?.id,
          permissions: {
            documents: 'view',
            solicitudes: 'view',
            carpetas: 'view',
            booking: 'view',
            presupuestos: 'view',
          }
        };
      });

      setTeamMembers(formattedMembers);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactAdded = () => {
    fetchTeamContacts();
  };

  const handleRemoveFromTeam = async (contactId: string) => {
    try {
      const contact = teamContacts.find(c => c.id === contactId);
      if (!contact) return;

      const currentConfig = (contact.field_config as Record<string, any>) || {};
      const { is_team_member, team_categories, team_category, ...restConfig } = currentConfig;

      const { error } = await supabase
        .from('contacts')
        .update({ 
          field_config: restConfig
        })
        .eq('id', contactId);

      if (error) throw error;

      setTeamContacts(prev => prev.filter(c => c.id !== contactId));
      toast({ title: 'Perfil eliminado del equipo' });
    } catch (error) {
      console.error('Error removing from team:', error);
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  const updateMemberCategory = async (memberId: string, category: string) => {
    try {
      const { error } = await supabase
        .from('workspace_memberships')
        .update({ team_category: category as any })
        .eq('id', memberId);

      if (error) throw error;

      setTeamMembers(prev => prev.map(m => 
        m.id === memberId ? { ...m, team_category: category } : m
      ));
      toast({ title: 'Categoría actualizada' });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({ title: 'Error al actualizar', variant: 'destructive' });
    }
  };

  const updateFunctionalRole = async () => {
    if (!editingMemberRole || !newFunctionalRole.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingMemberRole.mirrorContactId) {
        // Update existing mirror contact
        const { error } = await supabase
          .from('contacts')
          .update({ role: newFunctionalRole.trim() })
          .eq('id', editingMemberRole.mirrorContactId);

        if (error) throw error;
      } else {
        // Create new mirror contact
        const { error } = await supabase
          .from('contacts')
          .insert({
            name: editingMemberRole.name,
            role: newFunctionalRole.trim(),
            category: 'management',
            created_by: user.id,
            field_config: {
              workspace_user_id: editingMemberRole.userId,
              mirror_type: 'workspace_member',
              is_team_member: true,
            },
          });

        if (error) throw error;
      }

      // Update local state
      setTeamMembers(prev => prev.map(m =>
        m.user_id === editingMemberRole.userId
          ? { ...m, functional_role: newFunctionalRole.trim() }
          : m
      ));

      toast({ title: 'Rol funcional actualizado' });
      setEditingMemberRole(null);
      setNewFunctionalRole('');
      fetchTeamMembers(); // Refresh to get mirror contact ID
    } catch (error) {
      console.error('Error updating functional role:', error);
      toast({ title: 'Error al actualizar rol', variant: 'destructive' });
    }
  };

  // Get selected artist info to show as team member
  const selectedArtist = selectedArtistId !== 'all' && selectedArtistId !== '00-management' 
    ? artists.find(a => a.id === selectedArtistId) 
    : null;

  const allTeamByCategory = allCategoriesForDisplay.map(cat => {
    const wsMembers = teamMembers.filter(m => {
      if (selectedArtistId === '00-management') {
        // For 00 Management, show all workspace members grouped by category
        return m.team_category === cat.value;
      }
      return m.team_category === cat.value;
    });
    
    const contacts = teamContacts.filter(c => {
      const config = c.field_config as Record<string, any> | null;
      const isManagementTeam = config?.is_management_team === true;
      const categories = config?.team_categories || [];
      const singleCategory = config?.team_category || c.category;
      
      if (selectedArtistId === '00-management') {
        // Only show contacts marked as management team (empresa)
        if (!isManagementTeam) return false;
        return categories.includes(cat.value) || singleCategory === cat.value;
      }
      
      if (selectedArtistId !== 'all') {
        // For specific artist, show contacts that have this artist assigned
        // regardless of whether they are management team or not
        const assignedArtists = (c as any).assigned_artist_ids || [];
        if (!assignedArtists.includes(selectedArtistId)) {
          return false;
        }
      } else {
        // For "all", show both management and artist team contacts
      }
      
      return categories.includes(cat.value) || singleCategory === cat.value;
    });

    // Add the artist as a virtual member in "artistico" or "banda" category
    let artistAsMember: any = null;
    if (selectedArtist && (cat.value === 'artistico' || cat.value === 'banda')) {
      artistAsMember = {
        id: `artist-${selectedArtist.id}`,
        isArtist: true,
        name: selectedArtist.stage_name || selectedArtist.name,
        role: 'Artista principal',
        artistId: selectedArtist.id
      };
    }

    return {
      ...cat,
      members: wsMembers,
      contacts: contacts,
      artistMember: artistAsMember,
      total: wsMembers.length + contacts.length + (artistAsMember ? 1 : 0),
    };
  }).filter(cat => cat.total > 0);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Equipos</h1>
        <p className="text-muted-foreground">
          Gestiona tu equipo por categorías y artistas
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Select value={selectedArtistId} onValueChange={setSelectedArtistId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por equipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los equipos</SelectItem>
              <SelectItem value="00-management">00 Management</SelectItem>
              {artists.map((artist) => (
                <SelectItem key={artist.id} value={artist.id}>
                  {artist.stage_name || artist.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCreateTeamDialogOpen(true)}>
            <FolderPlus className="w-4 h-4 mr-2" />
            Crear Equipo
          </Button>
          <Button variant="outline" onClick={() => setAddContactDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Añadir Perfil
          </Button>
          <Button onClick={() => setInviteDialogOpen(true)} disabled={!workspaceId}>
            <Mail className="w-4 h-4 mr-2" />
            Invitar Usuario
          </Button>
        </div>
      </div>

      {teamMembers.length === 0 && teamContacts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Sin miembros de equipo</h3>
            <p className="text-muted-foreground mb-4">
              Añade personas a tu equipo (con o sin cuenta de usuario)
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setAddContactDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Añadir Perfil
              </Button>
              <Button onClick={() => setInviteDialogOpen(true)} disabled={!workspaceId}>
                <Mail className="w-4 h-4 mr-2" />
                Invitar Usuario
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {allTeamByCategory.map((category) => {
            const CategoryIcon = category.icon;
            return (
              <div key={category.value} className="space-y-4">
                <div className="flex items-center gap-2">
                  <CategoryIcon className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">{category.label}</h3>
                  <Badge variant="secondary" className="ml-2">{category.total}</Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* Workspace members with accounts */}
                  {category.members.map((member) => (
                    <Card key={member.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setActivityMember({
                      id: member.user_id,
                      name: member.full_name,
                      email: member.email,
                      role: member.role,
                      type: 'profile'
                    })}>
                      <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={member.avatar_url || ''} />
                            <AvatarFallback className="text-sm">
                              {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium truncate">{member.full_name}</h4>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 border border-primary/20 text-primary shadow-sm">
                                Usuario
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{member.email}</p>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {member.functional_role ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-background border border-primary/20 text-foreground shadow-sm">
                                  {member.functional_role}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-background border border-border/40 text-foreground shadow-sm">
                                  {member.role}
                                </span>
                              )}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm">
                                <Settings className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingMemberRole({
                                    memberId: member.id,
                                    userId: member.user_id,
                                    name: member.full_name,
                                    currentRole: member.functional_role,
                                    mirrorContactId: member.mirror_contact_id,
                                  });
                                  setNewFunctionalRole(member.functional_role || '');
                                }}
                              >
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar rol funcional
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {allCategoriesForDisplay.map(cat => (
                                <DropdownMenuItem
                                  key={cat.value}
                                  onClick={() => updateMemberCategory(member.id, cat.value)}
                                  className={member.team_category === cat.value ? 'bg-accent' : ''}
                                >
                                  Mover a {cat.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Artist as team member */}
                  {category.artistMember && (
                    <Card key={category.artistMember.id} className="hover:shadow-md transition-shadow border-primary/30 bg-primary/5">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 ring-2 ring-primary/30">
                            <AvatarFallback className="text-sm bg-primary/20 text-primary font-semibold">
                              {category.artistMember.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold truncate">{category.artistMember.name}</h4>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/20 border border-primary/30 text-primary shadow-sm">
                                Artista
                              </span>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-background border border-primary/20 text-foreground shadow-sm mt-1.5">
                              {category.artistMember.role}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Team contacts without accounts */}
                  {category.contacts.map((contact: any) => {
                    const config = contact.field_config as Record<string, any> | null;
                    const categories = config?.team_categories || [];
                    const otherCategories = categories.filter((c: string) => c !== category.value);
                    
                    return (
                      <Card key={contact.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedContactId(contact.id)}>
                        <CardContent className="py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="text-sm bg-secondary">
                                {contact.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium truncate">{contact.stage_name || contact.name}</h4>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-background border border-border/40 text-muted-foreground shadow-sm">
                                  Perfil
                                </span>
                              </div>
                              {contact.email && (
                                <p className="text-sm text-muted-foreground truncate">{contact.email}</p>
                              )}
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {contact.role && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white dark:bg-background border border-primary/20 text-foreground shadow-sm">
                                    {contact.role}
                                  </span>
                                )}
                                {otherCategories.map((catValue: string) => {
                                  const catInfo = allCategoriesForDisplay.find(c => c.value === catValue);
                                  return catInfo ? (
                                    <span 
                                      key={catValue} 
                                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/5 dark:bg-primary/10 border border-primary/20 text-primary shadow-sm"
                                    >
                                      +{catInfo.label}
                                    </span>
                                  ) : null;
                                })}
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingContact(contact)}>
                                  <Edit2 className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => handleRemoveFromTeam(contact.id)}
                                >
                                  <UserMinus className="w-4 h-4 mr-2" />
                                  Quitar del equipo
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {allTeamByCategory.length < allCategoriesForDisplay.length && (
            <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Organiza mejor tu equipo añadiendo miembros a categorías como: {' '}
                {allCategoriesForDisplay.filter(c => !allTeamByCategory.find(m => m.value === c.value))
                  .slice(0, 5)
                  .map(c => c.label).join(', ')}
              </p>
            </div>
          )}
        </div>
      )}

      {workspaceId && (
        <InviteTeamMemberDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          workspaceId={workspaceId}
          onMemberInvited={fetchTeamMembers}
        />
      )}

      <AddTeamContactDialog
        open={addContactDialogOpen}
        onOpenChange={setAddContactDialogOpen}
        onContactAdded={handleContactAdded}
        customCategories={customCategories}
        onAddCustomCategory={handleAddCustomCategory}
        defaultArtistId={selectedArtistId !== 'all' ? selectedArtistId : undefined}
      />

      {editingContact && (
        <EditContactDialog
          open={!!editingContact}
          onOpenChange={(open) => !open && setEditingContact(null)}
          contact={editingContact}
          onContactUpdated={() => {
            setEditingContact(null);
            fetchTeamContacts();
          }}
        />
      )}

      <TeamMemberActivityDialog
        open={!!activityMember}
        onOpenChange={(open) => !open && setActivityMember(null)}
        member={activityMember}
      />

      <ContactProfileSheet
        open={!!selectedContactId}
        onOpenChange={(open) => !open && setSelectedContactId(null)}
        contactId={selectedContactId || ''}
      />

      <CreateTeamDialog
        open={createTeamDialogOpen}
        onOpenChange={setCreateTeamDialogOpen}
        onSuccess={() => {
          setCreateTeamDialogOpen(false);
          fetchArtists();
        }}
      />

      {/* Dialog for editing functional role */}
      <Dialog open={!!editingMemberRole} onOpenChange={(open) => !open && setEditingMemberRole(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar rol funcional</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Define el rol funcional para <strong>{editingMemberRole?.name}</strong>. Este rol se mostrará en lugar del rol de workspace y se usará al añadir a presupuestos.
            </p>
            <div className="space-y-2">
              <Label>Rol funcional</Label>
              <Input
                value={newFunctionalRole}
                onChange={(e) => setNewFunctionalRole(e.target.value)}
                placeholder="Ej: Business Manager, Director Artístico, Booker..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMemberRole(null)}>
              Cancelar
            </Button>
            <Button onClick={updateFunctionalRole} disabled={!newFunctionalRole.trim()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
