import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Users, Mail, Grid3X3, List, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { InviteTeamMemberDialog } from '@/components/InviteTeamMemberDialog';
import { AddTeamContactDialog } from '@/components/AddTeamContactDialog';
import { TeamMemberActivityDialog } from '@/components/TeamMemberActivityDialog';
import { CreateTeamDialog } from '@/components/CreateTeamDialog';
import { EditTeamDialog } from '@/components/EditTeamDialog';
import { EditContactDialog } from '@/components/EditContactDialog';
import { ContactProfileSheet } from '@/components/ContactProfileSheet';
import { TeamCard } from '@/components/TeamCard';
import { TeamMemberGrid } from '@/components/TeamMemberGrid';
import { CategoryPills } from '@/components/CategoryPills';
import { TEAM_CATEGORIES } from '@/lib/teamCategories';
import { MemberType } from '@/components/TeamMemberCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

type TeamCategory = 'banda' | 'artistico' | 'tecnico' | 'management' | 'comunicacion' | 'legal' | 'produccion' | 'otro';

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  functional_role?: string;
  team_category: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  mirror_contact_id?: string;
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
  const [editTeamDialogOpen, setEditTeamDialogOpen] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  
  // Artist filter state
  const [artists, setArtists] = useState<Array<{ id: string; name: string; stage_name?: string | null; description?: string | null; avatar_url?: string | null }>>([]);
  const artistIdFromUrl = searchParams.get('artistId');
  const [selectedArtistId, setSelectedArtistId] = useState<string>(artistIdFromUrl || 'all');

  // Activity dialog state
  const [activityMember, setActivityMember] = useState<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    role?: string;
    type: 'contact' | 'profile';
  } | null>(null);

  // Contact quick view state
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);

  // Editing functional role state
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

  // Fetch artists (teams)
  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, stage_name, description, avatar_url')
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
        const { error } = await supabase
          .from('contacts')
          .update({ role: newFunctionalRole.trim() })
          .eq('id', editingMemberRole.mirrorContactId);

        if (error) throw error;
      } else {
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

      setTeamMembers(prev => prev.map(m =>
        m.user_id === editingMemberRole.userId
          ? { ...m, functional_role: newFunctionalRole.trim() }
          : m
      ));

      toast({ title: 'Rol funcional actualizado' });
      setEditingMemberRole(null);
      setNewFunctionalRole('');
      fetchTeamMembers();
    } catch (error) {
      console.error('Error updating functional role:', error);
      toast({ title: 'Error al actualizar rol', variant: 'destructive' });
    }
  };

  // Team management functions
  const handleEditTeam = (teamId: string) => {
    setEditingTeamId(teamId);
    setEditTeamDialogOpen(true);
  };

  const handleDeleteTeam = async (teamId: string) => {
    try {
      const { error } = await supabase
        .from('artists')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      toast({ title: 'Equipo eliminado correctamente' });
      fetchArtists();
      
      if (selectedArtistId === teamId) {
        setSelectedArtistId('all');
      }
    } catch (error: any) {
      console.error('Error deleting team:', error);
      toast({ title: 'Error al eliminar equipo', description: error.message, variant: 'destructive' });
    }
  };

  const handleDuplicateTeam = async (teamId: string) => {
    try {
      const team = artists.find(a => a.id === teamId);
      if (!team) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Error', description: 'Usuario no autenticado', variant: 'destructive' });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.workspace_id) {
        toast({ title: 'Error', description: 'No se encontró workspace', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('artists')
        .insert({
          name: `${team.name} (copia)`,
          stage_name: team.stage_name ? `${team.stage_name} (copia)` : null,
          description: team.description,
          workspace_id: profile.workspace_id,
          created_by: user.id,
        });

      if (error) throw error;

      toast({ title: 'Equipo duplicado correctamente' });
      fetchArtists();
    } catch (error: any) {
      console.error('Error duplicating team:', error);
      toast({ title: 'Error al duplicar equipo', description: error.message, variant: 'destructive' });
    }
  };

  // Compute member counts per team
  const teamMemberCounts = useMemo(() => {
    const counts = new Map<string, number>();
    
    teamContacts.forEach(contact => {
      const assignedIds = (contact as any).assigned_artist_ids || [];
      assignedIds.forEach((artistId: string) => {
        counts.set(artistId, (counts.get(artistId) || 0) + 1);
      });
    });
    
    return counts;
  }, [teamContacts]);

  const editingTeam = editingTeamId ? artists.find(a => a.id === editingTeamId) : null;

  // Get selected artist info
  const selectedArtist = selectedArtistId !== 'all' && selectedArtistId !== '00-management' 
    ? artists.find(a => a.id === selectedArtistId) 
    : null;

  // Get team name for display
  const getSelectedTeamName = () => {
    if (selectedArtistId === 'all') return 'Todos los equipos';
    if (selectedArtistId === '00-management') return '00 Management';
    return selectedArtist?.stage_name || selectedArtist?.name || 'Equipo';
  };

  // Build members data for the grid with category information
  const allTeamByCategory = useMemo(() => {
    return allCategoriesForDisplay.map(cat => {
      const wsMembers = teamMembers.filter(m => {
        if (selectedArtistId === '00-management') {
          return m.team_category === cat.value;
        }
        return m.team_category === cat.value;
      });
      
      const contacts = teamContacts.filter(c => {
        const config = c.field_config as Record<string, any> | null;
        
        if (config?.mirror_type === 'workspace_member' || config?.workspace_user_id) {
          return false;
        }
        
        const isManagementTeam = config?.is_management_team === true;
        const categories = config?.team_categories || [];
        const singleCategory = config?.team_category || c.category;
        
        if (selectedArtistId === '00-management') {
          if (!isManagementTeam) return false;
          return categories.includes(cat.value) || singleCategory === cat.value;
        }
        
        if (selectedArtistId !== 'all') {
          const assignedArtists = (c as any).assigned_artist_ids || [];
          if (!assignedArtists.includes(selectedArtistId)) {
            return false;
          }
        }
        
        return categories.includes(cat.value) || singleCategory === cat.value;
      });

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
  }, [allCategoriesForDisplay, teamMembers, teamContacts, selectedArtistId, selectedArtist]);

  // Build flat member list for grid view
  const buildGridMembers = (categoryValue: string) => {
    const category = allTeamByCategory.find(c => c.value === categoryValue);
    if (!category) return [];

    const members: Array<{
      id: string;
      name: string;
      email?: string;
      role?: string;
      avatarUrl?: string;
      type: MemberType;
      extraCategories?: string[];
      currentCategory?: string;
      rawData: any;
    }> = [];

    // Add artist if present
    if (category.artistMember) {
      members.push({
        id: category.artistMember.id,
        name: category.artistMember.name,
        role: category.artistMember.role,
        type: 'artist' as MemberType,
        currentCategory: categoryValue,
        rawData: category.artistMember,
      });
    }

    // Add workspace members
    category.members.forEach((member) => {
      members.push({
        id: member.id,
        name: member.full_name,
        email: member.email,
        role: member.functional_role || member.role,
        avatarUrl: member.avatar_url,
        type: 'user' as MemberType,
        currentCategory: member.team_category,
        rawData: member,
      });
    });

    // Add contacts
    category.contacts.forEach((contact: any) => {
      const config = contact.field_config as Record<string, any> | null;
      const categories = config?.team_categories || [];
      const otherCategories = categories
        .filter((c: string) => c !== categoryValue)
        .map((c: string) => allCategoriesForDisplay.find(cat => cat.value === c)?.label || c);

      members.push({
        id: contact.id,
        name: contact.stage_name || contact.name,
        email: contact.email,
        role: contact.role,
        type: 'profile' as MemberType,
        extraCategories: otherCategories,
        currentCategory: categoryValue,
        rawData: contact,
      });
    });

    return members;
  };

  // Categories for filter pills
  const categoryPillsData = allTeamByCategory.map(cat => ({
    value: cat.value,
    label: cat.label,
    count: cat.total,
    icon: cat.icon,
  }));

  // Filter categories based on selected filter
  const filteredCategories = selectedCategoryFilter === 'all' 
    ? allTeamByCategory 
    : allTeamByCategory.filter(c => c.value === selectedCategoryFilter);

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
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Equipos</h1>
        <p className="text-muted-foreground">
          Gestiona tu equipo por categorías y artistas
        </p>
      </div>

      {/* Team Selector - Horizontal chips */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Management Team Chip */}
        <TeamCard
          id="00-management"
          name="00 Management"
          description="Equipo de gestión"
          memberCount={teamMembers.length}
          isManagement
          isSelected={selectedArtistId === '00-management'}
          onSelect={(id) => setSelectedArtistId(id)}
          onEdit={() => {}}
          onDelete={() => {}}
          onDuplicate={() => {}}
        />
        
        {/* Artist/Team Chips */}
        {artists.map((artist) => (
          <TeamCard
            key={artist.id}
            id={artist.id}
            name={artist.name}
            stageName={artist.stage_name}
            description={artist.description}
            avatarUrl={artist.avatar_url}
            memberCount={teamMemberCounts.get(artist.id) || 0}
            isSelected={selectedArtistId === artist.id}
            onSelect={(id) => setSelectedArtistId(id)}
            onEdit={handleEditTeam}
            onDelete={handleDeleteTeam}
            onDuplicate={handleDuplicateTeam}
          />
        ))}

        {/* New Team Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full px-4"
          onClick={() => setCreateTeamDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Nuevo
        </Button>
      </div>

      {/* Selected Team Header with Actions */}
      <div className="flex items-center justify-between border-t pt-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{getSelectedTeamName()}</h2>
          <Badge variant="secondary">
            {allTeamByCategory.reduce((sum, cat) => sum + cat.total, 0)} miembros
          </Badge>
        </div>
        <div className="flex gap-2">
          {/* View Toggle */}
          <div className="flex gap-1 mr-2">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="h-9 w-9"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="h-9 w-9"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
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

      {/* Category Pills */}
      {categoryPillsData.length > 0 && (
        <CategoryPills
          categories={categoryPillsData}
          selectedCategory={selectedCategoryFilter}
          onCategoryChange={setSelectedCategoryFilter}
          allCount={allTeamByCategory.reduce((sum, cat) => sum + cat.total, 0)}
        />
      )}

      {/* Members Grid/List */}
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
          {filteredCategories.map((category) => {
            const CategoryIcon = category.icon;
            const gridMembers = buildGridMembers(category.value);
            
            return (
              <Collapsible key={category.value} defaultOpen>
                <div className="space-y-4">
                  <CollapsibleTrigger className="flex items-center gap-2 w-full group">
                    <CategoryIcon className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">{category.label}</h3>
                    <Badge variant="secondary" className="ml-2">{category.total}</Badge>
                    <ChevronDown className="h-4 w-4 ml-auto transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <TeamMemberGrid
                      members={gridMembers}
                      onMemberClick={(member) => {
                        if (member.type === 'user') {
                          setActivityMember({
                            id: member.rawData.user_id,
                            name: member.name,
                            email: member.email,
                            role: member.rawData.role,
                            type: 'profile'
                          });
                        } else if (member.type === 'profile') {
                          setSelectedContactId(member.rawData.id);
                        }
                      }}
                      onMemberEdit={(member) => {
                        if (member.type === 'profile') {
                          setEditingContact(member.rawData);
                        }
                      }}
                      onMemberRemove={(member) => {
                        if (member.type === 'profile') {
                          handleRemoveFromTeam(member.rawData.id);
                        }
                      }}
                      onMemberEditRole={(member) => {
                        if (member.type === 'user') {
                          setEditingMemberRole({
                            memberId: member.rawData.id,
                            userId: member.rawData.user_id,
                            name: member.name,
                            currentRole: member.rawData.functional_role,
                            mirrorContactId: member.rawData.mirror_contact_id,
                          });
                          setNewFunctionalRole(member.rawData.functional_role || '');
                        }
                      }}
                      onCategoryChange={(memberId, newCategory) => {
                        const member = teamMembers.find(m => m.id === memberId);
                        if (member) {
                          updateMemberCategory(memberId, newCategory);
                        }
                      }}
                      categories={allCategoriesForDisplay.map(c => ({ value: c.value, label: c.label }))}
                      showActions
                    />
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}

          {allTeamByCategory.length < allCategoriesForDisplay.length && selectedCategoryFilter === 'all' && (
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

      {/* Dialogs */}
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

      <EditTeamDialog
        open={editTeamDialogOpen}
        onOpenChange={setEditTeamDialogOpen}
        teamId={editingTeamId}
        initialData={editingTeam ? {
          name: editingTeam.name,
          stage_name: editingTeam.stage_name,
          description: editingTeam.description,
        } : undefined}
        onSuccess={() => {
          setEditTeamDialogOpen(false);
          setEditingTeamId(null);
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
