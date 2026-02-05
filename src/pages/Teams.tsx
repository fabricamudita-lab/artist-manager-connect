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
import { TeamMemberGrid } from '@/components/TeamMemberGrid';
import { TeamMemberList } from '@/components/TeamMemberList';
import { CategoryDropdown } from '@/components/CategoryDropdown';
import { TeamDropdown } from '@/components/TeamDropdown';
import { TeamManagerSheet } from '@/components/TeamManagerSheet';
import { CategoryManagerSheet } from '@/components/CategoryManagerSheet';
import { TEAM_CATEGORIES } from '@/lib/teamCategories';
import { MemberType } from '@/components/TeamMemberCard';

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
  const [teamManagerOpen, setTeamManagerOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
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
  const [contactRefreshTrigger, setContactRefreshTrigger] = useState(0);

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

  // Fetch artists (teams) and apply stored order
  const fetchArtists = async () => {
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('id, name, stage_name, description, avatar_url')
        .order('name');
      
      if (error) throw error;
      
      // Apply stored order if exists
      const storedOrder = localStorage.getItem('team_order');
      if (storedOrder && data) {
        try {
          const orderIds: string[] = JSON.parse(storedOrder);
          const orderedArtists = [...data].sort((a, b) => {
            const aIndex = orderIds.indexOf(a.id);
            const bIndex = orderIds.indexOf(b.id);
            if (aIndex === -1 && bIndex === -1) return 0;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
          });
          setArtists(orderedArtists);
        } catch {
          setArtists(data || []);
        }
      } else {
        setArtists(data || []);
      }
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

  const handleAddCustomCategory = (category: { value: string; label: string; icon?: any; isCustom?: boolean }) => {
    const newCat = { ...category, icon: Users, isCustom: true };
    setCustomCategories(prev => {
      const updated = [...prev, newCat];
      localStorage.setItem('custom_team_categories', JSON.stringify(updated.map(c => ({ value: c.value, label: c.label }))));
      return updated;
    });
    toast({ title: 'Categoría creada' });
  };

  const handleRenameCategory = (value: string, newLabel: string) => {
    setCustomCategories(prev => {
      const updated = prev.map(c => 
        c.value === value ? { ...c, label: newLabel } : c
      );
      localStorage.setItem('custom_team_categories', JSON.stringify(
        updated.map(c => ({ value: c.value, label: c.label }))
      ));
      return updated;
    });
    toast({ title: 'Categoría actualizada' });
  };

  const handleDeleteCategory = (value: string) => {
    setCustomCategories(prev => {
      const updated = prev.filter(c => c.value !== value);
      localStorage.setItem('custom_team_categories', JSON.stringify(
        updated.map(c => ({ value: c.value, label: c.label }))
      ));
      return updated;
    });
    toast({ title: 'Categoría eliminada' });
  };

  // State to force recalculation when category order changes
  const [categoryOrderVersion, setCategoryOrderVersion] = useState(0);

  // Apply saved order and label overrides from localStorage to all categories
  const allCategoriesForDisplay = useMemo(() => {
    // Load label overrides for system categories
    const labelOverrides: Record<string, string> = {};
    const storedLabels = localStorage.getItem('category_label_overrides');
    if (storedLabels) {
      try {
        Object.assign(labelOverrides, JSON.parse(storedLabels));
      } catch (e) {
        console.error('Error loading label overrides:', e);
      }
    }

    // Apply label overrides to system categories
    const systemWithLabels = TEAM_CATEGORIES.map(cat => ({
      ...cat,
      label: labelOverrides[cat.value] || cat.label,
    }));

    const allCategories = [...systemWithLabels, ...customCategories];
    const savedOrder = localStorage.getItem('category_order');
    
    if (savedOrder) {
      try {
        const orderIds: string[] = JSON.parse(savedOrder);
        return [...allCategories].sort((a, b) => {
          const aIndex = orderIds.indexOf(a.value);
          const bIndex = orderIds.indexOf(b.value);
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
      } catch {
        return allCategories;
      }
    }
    return allCategories;
  }, [customCategories, categoryOrderVersion]);

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

  // Handle team reordering
  const handleTeamReorder = (orderedIds: string[]) => {
    localStorage.setItem('team_order', JSON.stringify(orderedIds));
    const orderedArtists = orderedIds
      .map(id => artists.find(a => a.id === id))
      .filter(Boolean) as typeof artists;
    setArtists(orderedArtists);
  };

  // Handle category reordering (both system and custom)
  const handleCategoryReorder = (orderedValues: string[]) => {
    // Save the complete order of all categories
    localStorage.setItem('category_order', JSON.stringify(orderedValues));
    
    // Also reorder custom categories for state consistency
    const reorderedCustomCategories = orderedValues
      .filter(value => customCategories.some(c => c.value === value))
      .map(value => customCategories.find(c => c.value === value))
      .filter(Boolean) as typeof customCategories;
    setCustomCategories(reorderedCustomCategories);
    localStorage.setItem('custom_team_categories', JSON.stringify(
      reorderedCustomCategories.map(c => ({ value: c.value, label: c.label }))
    ));
    
    // Force recalculation of allCategoriesForDisplay
    setCategoryOrderVersion(v => v + 1);
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
      
      // Format role: use contact.role, or combine category labels if multiple categories
      const formattedRole = contact.role 
        ? contact.role 
        : categories.length > 0 
          ? categories
              .slice(0, 2)
              .map((c: string) => allCategoriesForDisplay.find(cat => cat.value === c)?.label || c)
              .join(' · ')
          : undefined;

      members.push({
        id: contact.id,
        name: contact.stage_name || contact.name,
        email: contact.email,
        role: formattedRole,
        type: 'profile' as MemberType,
        currentCategory: categoryValue,
        rawData: contact,
      });
    });

    return members;
  };

  // Categories for filter pills
  const categoryPillsData = useMemo(() => {
    // Build counts from allTeamByCategory
    const countsMap = new Map<string, number>();
    allTeamByCategory.forEach(cat => {
      countsMap.set(cat.value, cat.total);
    });
    
    // Include ALL categories (system + custom), even those with 0 members
    return allCategoriesForDisplay.map(cat => ({
      value: cat.value,
      label: cat.label,
      count: countsMap.get(cat.value) || 0,
      icon: cat.icon,
    }));
  }, [allCategoriesForDisplay, allTeamByCategory]);

  // Filter categories based on selected filter
  const filteredCategories = selectedCategoryFilter === 'all' 
    ? allTeamByCategory 
    : allTeamByCategory.filter(c => c.value === selectedCategoryFilter);

  // Build flattened member list for unified grid view (when "all" is selected)
  const allMembersFlattened = useMemo(() => {
    const members: Array<{
      id: string;
      name: string;
      email?: string;
      role?: string;
      avatarUrl?: string;
      type: MemberType;
      currentCategory?: string;
      rawData: any;
    }> = [];
    const addedIds = new Set<string>();

    allTeamByCategory.forEach(category => {
      const categoryMembers = buildGridMembers(category.value);
      categoryMembers.forEach(member => {
        if (!addedIds.has(member.id)) {
          addedIds.add(member.id);
          // Add role/category label if not already set
          members.push({
            ...member,
            role: member.role || category.label,
          });
        }
      });
    });

    return members;
  }, [allTeamByCategory, buildGridMembers]);

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

      {/* Team Header with Dropdowns and Actions */}
      <div className="flex items-center justify-between border-t pt-6">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">
            {allTeamByCategory.reduce((sum, cat) => sum + cat.total, 0)} miembros
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          {/* Team Dropdown */}
          <TeamDropdown
            teams={artists.map(a => ({
              id: a.id,
              name: a.name,
              stageName: a.stage_name,
              avatarUrl: a.avatar_url,
              memberCount: teamMemberCounts.get(a.id) || 0,
            }))}
            selectedTeamId={selectedArtistId}
            onTeamChange={setSelectedArtistId}
            managementMemberCount={teamMembers.length}
            onManageTeams={() => setTeamManagerOpen(true)}
          />
          
          {/* Category Dropdown */}
          {categoryPillsData.length > 0 && (
            <CategoryDropdown
              categories={categoryPillsData}
              selectedCategory={selectedCategoryFilter}
              onCategoryChange={setSelectedCategoryFilter}
              allCount={allTeamByCategory.reduce((sum, cat) => sum + cat.total, 0)}
              onManageCategories={() => setCategoryManagerOpen(true)}
            />
          )}
          
          {/* View Toggle */}
          <div className="flex gap-1 border rounded-md p-1">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
              className="h-8 w-8"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
              className="h-8 w-8"
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
      ) : selectedCategoryFilter === 'all' ? (
        /* Unified view - all members */
        <div className="space-y-4">
          {viewMode === 'grid' ? (
            <TeamMemberGrid
              members={allMembersFlattened}
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
          ) : (
            <TeamMemberList
              members={allMembersFlattened}
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
              categories={allCategoriesForDisplay.map(c => ({ value: c.value, label: c.label }))}
              showActions
            />
          )}
        </div>
      ) : (
        /* Filtered view - show only selected category */
        <div className="space-y-4">
          {filteredCategories.map((category) => {
            const CategoryIcon = category.icon;
            const gridMembers = buildGridMembers(category.value);
            
            return (
              <div key={category.value} className="space-y-4">
                <div className="flex items-center gap-2">
                  <CategoryIcon className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">{category.label}</h3>
                  <Badge variant="secondary">{category.total}</Badge>
                </div>
                
                {viewMode === 'grid' ? (
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
                ) : (
                  <TeamMemberList
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
                    categories={allCategoriesForDisplay.map(c => ({ value: c.value, label: c.label }))}
                    showActions
                  />
                )}
              </div>
            );
          })}
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
          customCategories={customCategories}
          onContactUpdated={() => {
            const contactId = editingContact.id;
            setEditingContact(null);
            fetchTeamContacts();
            // Refresh the profile sheet and reopen it
            setContactRefreshTrigger(prev => prev + 1);
            setSelectedContactId(contactId);
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
        refreshTrigger={contactRefreshTrigger}
        onEdit={(contactId) => {
          const contact = teamContacts.find(c => c.id === contactId);
          if (contact) {
            setEditingContact(contact);
          }
        }}
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

      <TeamManagerSheet
        open={teamManagerOpen}
        onOpenChange={setTeamManagerOpen}
        teams={artists.map(a => ({
          id: a.id,
          name: a.name,
          stageName: a.stage_name,
          avatarUrl: a.avatar_url,
          memberCount: teamMemberCounts.get(a.id) || 0,
          description: a.description,
        }))}
        onCreateNew={() => {
          setTeamManagerOpen(false);
          setCreateTeamDialogOpen(true);
        }}
        onEdit={(teamId) => {
          setTeamManagerOpen(false);
          handleEditTeam(teamId);
        }}
        onDuplicate={handleDuplicateTeam}
        onDelete={handleDeleteTeam}
        onReorder={handleTeamReorder}
      />

      <CategoryManagerSheet
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        systemCategories={TEAM_CATEGORIES}
        customCategories={customCategories}
        categoryCounts={new Map(categoryPillsData.map(c => [c.value, c.count]))}
        onCreateNew={(name) => {
          handleAddCustomCategory({ 
            value: name.toLowerCase().replace(/\s+/g, '_'), 
            label: name 
          });
        }}
        onRename={handleRenameCategory}
        onDelete={handleDeleteCategory}
        onReorder={handleCategoryReorder}
      />

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
