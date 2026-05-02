import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Plus, Users, Mail, Grid3X3, List, Pencil, Move, Search, MousePointerClick, X, LayoutDashboard, Shield } from 'lucide-react';
import { PermissionsByRoleTab } from '@/pages/teams/PermissionsByRoleTab';
import { RolePermissionSummary } from '@/components/permissions/RolePermissionSummary';
import { useDebounce } from '@/hooks/useDebounce';
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
import { TeamMemberFreeCanvas } from '@/components/TeamMemberFreeCanvas';
import { CategoryDropdown } from '@/components/CategoryDropdown';
import { TeamDropdown } from '@/components/TeamDropdown';
import { TeamManagerSheet } from '@/components/TeamManagerSheet';
import { CategoryManagerSheet } from '@/components/CategoryManagerSheet';
import { TEAM_CATEGORIES, FUNCTIONAL_ROLES } from '@/lib/teamCategories';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ManageArtistAccessDialog } from '@/components/teams/ManageArtistAccessDialog';
import { MemberType } from '@/components/TeamMemberCard';
import { ContactDashboardDialog } from '@/components/ContactDashboardDialog';
import { ArtistInfoDialog } from '@/components/ArtistInfoDialog';

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
  /** Artist IDs the member is bound to via artist_role_bindings (empty = no specific artist scope). */
  artist_ids?: string[];
  permissions: {
    documents: 'none' | 'view' | 'edit' | 'owner';
    solicitudes: 'none' | 'view' | 'edit' | 'owner';
    carpetas: 'none' | 'view' | 'edit' | 'owner';
    booking: 'none' | 'view' | 'edit' | 'owner';
    presupuestos: 'none' | 'view' | 'edit' | 'owner';
  };
}

function FunctionalRoleCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const trimmedSearch = search.trim();
  const exactMatch = FUNCTIONAL_ROLES.some(
    (r) => r.toLowerCase() === trimmedSearch.toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value || 'Selecciona o escribe un rol funcional...'}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput
            placeholder="Buscar rol o escribir uno nuevo..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList
            className="max-h-[260px] overflow-y-auto overscroll-contain"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <CommandEmpty>
              {trimmedSearch ? (
                <button
                  type="button"
                  className="w-full text-left text-sm px-2 py-1.5 hover:bg-accent rounded"
                  onClick={() => {
                    onChange(trimmedSearch);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  Usar "<strong>{trimmedSearch}</strong>" como rol personalizado
                </button>
              ) : (
                <span className="text-sm text-muted-foreground">No hay coincidencias.</span>
              )}
            </CommandEmpty>
            <CommandGroup heading="Roles funcionales">
              {FUNCTIONAL_ROLES.map((role) => (
                <CommandItem
                  key={role}
                  value={role}
                  onSelect={() => {
                    onChange(role);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === role ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {role}
                </CommandItem>
              ))}
            </CommandGroup>
            {trimmedSearch && !exactMatch && (
              <CommandGroup heading="Personalizado">
                <CommandItem
                  value={`__custom__${trimmedSearch}`}
                  onSelect={() => {
                    onChange(trimmedSearch);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check className="mr-2 h-4 w-4 opacity-0" />
                  Usar "{trimmedSearch}" como personalizado
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function Teams() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'free' | 'permissions'>('grid');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  
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

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [restoredProfiles, setRestoredProfiles] = useState<any[] | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<{ name: string; avatarUrl?: string } | null>(null);
  const [artistInfoDialog, setArtistInfoDialog] = useState<{ open: boolean; artistId: string | null }>({ open: false, artistId: null });
  const [manageArtistAccessFor, setManageArtistAccessFor] = useState<{ userId: string; name: string; functionalRole?: string | null } | null>(null);

  // Restore dashboard state when navigating back
  useEffect(() => {
    const saved = sessionStorage.getItem('contactDashboardProfiles');
    if (saved) {
      sessionStorage.removeItem('contactDashboardProfiles');
      try {
        const profiles = JSON.parse(saved);
        if (Array.isArray(profiles) && profiles.length > 0) {
          setRestoredProfiles(profiles);
          setDashboardOpen(true);
        }
      } catch {}
    }
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedMemberIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMemberIds(new Set());
    setSelectionMode(false);
  }, []);

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
        .eq('artist_type', 'roster')
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

      // Cargar artistas asignados a cada miembro vía artist_role_bindings
      const { data: bindings } = await supabase
        .from('artist_role_bindings')
        .select('user_id, artist_id')
        .in('user_id', userIds);

      const artistsByUser = new Map<string, string[]>();
      (bindings || []).forEach((b: any) => {
        const arr = artistsByUser.get(b.user_id) || [];
        if (!arr.includes(b.artist_id)) arr.push(b.artist_id);
        artistsByUser.set(b.user_id, arr);
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
          artist_ids: artistsByUser.get(m.user_id) || [],
          permissions: {
            documents: 'view',
            solicitudes: 'view',
            carpetas: 'view',
            booking: 'view',
            presupuestos: 'view',
          }
        };
      });

      // Extract owner and filter from visible members
      const ownerMember = formattedMembers.find(m => m.role === 'OWNER');
      if (ownerMember) {
        setOwnerInfo({ name: ownerMember.full_name, avatarUrl: ownerMember.avatar_url });
        setTeamMembers(formattedMembers.filter(m => m.role !== 'OWNER'));
      } else {
        setOwnerInfo(null);
        setTeamMembers(formattedMembers);
      }
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

  // Toggle a category for a member (add/remove from multi-category)
  const toggleMemberCategory = async (memberId: string, category: string) => {
    // Check if it's a contact
    const contact = teamContacts.find(c => c.id === memberId);
    if (contact) {
      try {
        const config = (contact.field_config as Record<string, any>) || {};
        const currentCategories: string[] = config.team_categories || [];
        const singleCategory = config.team_category || contact.category;
        
        // Build full list of current categories
        const allCurrentCats = new Set(currentCategories);
        if (singleCategory && !allCurrentCats.has(singleCategory)) {
          allCurrentCats.add(singleCategory);
        }
        
        // Toggle
        if (allCurrentCats.has(category)) {
          if (allCurrentCats.size <= 1) return; // Must keep at least one
          allCurrentCats.delete(category);
        } else {
          allCurrentCats.add(category);
        }
        
        const newCategories = Array.from(allCurrentCats);
        const { error } = await supabase
          .from('contacts')
          .update({
            field_config: {
              ...config,
              team_categories: newCategories,
              team_category: newCategories[0], // Keep primary in sync
            }
          })
          .eq('id', memberId);

        if (error) throw error;

        // Update local state
        setTeamContacts(prev => prev.map(c => 
          c.id === memberId 
            ? { ...c, field_config: { ...config, team_categories: newCategories, team_category: newCategories[0] } }
            : c
        ));
        toast({ title: 'Categorías actualizadas' });
      } catch (error) {
        console.error('Error toggling contact category:', error);
        toast({ title: 'Error al actualizar', variant: 'destructive' });
      }
      return;
    }

    // Check if it's a workspace member
    const wsMember = teamMembers.find(m => m.id === memberId);
    if (wsMember) {
      // For workspace members, the primary category is team_category
      // Additional categories are stored in the mirror contact's field_config.team_categories
      const currentPrimary = wsMember.team_category;
      
      // Get mirror contact categories
      let mirrorCategories: string[] = [];
      if (wsMember.mirror_contact_id) {
        const { data: mirrorContact } = await supabase
          .from('contacts')
          .select('field_config')
          .eq('id', wsMember.mirror_contact_id)
          .single();
        
        const mirrorConfig = (mirrorContact?.field_config as Record<string, any>) || {};
        mirrorCategories = mirrorConfig.team_categories || [];
      }
      
      const allCurrentCats = new Set([currentPrimary, ...mirrorCategories]);
      
      // Toggle
      if (allCurrentCats.has(category)) {
        if (allCurrentCats.size <= 1) return; // Must keep at least one
        allCurrentCats.delete(category);
      } else {
        allCurrentCats.add(category);
      }
      
      const newCategories = Array.from(allCurrentCats);
      const newPrimary = newCategories[0];
      
      try {
        // Update primary category
        if (newPrimary !== currentPrimary) {
          const { error } = await supabase
            .from('workspace_memberships')
            .update({ team_category: newPrimary as any })
            .eq('id', memberId);
          if (error) throw error;
        }
        
        // Update mirror contact categories
        if (wsMember.mirror_contact_id) {
          const { data: mirrorContact } = await supabase
            .from('contacts')
            .select('field_config')
            .eq('id', wsMember.mirror_contact_id)
            .single();
          
          const mirrorConfig = (mirrorContact?.field_config as Record<string, any>) || {};
          await supabase
            .from('contacts')
            .update({
              field_config: { ...mirrorConfig, team_categories: newCategories }
            })
            .eq('id', wsMember.mirror_contact_id);
        }
        
        // Update local state
        setTeamMembers(prev => prev.map(m => 
          m.id === memberId ? { ...m, team_category: newPrimary } : m
        ));
        toast({ title: 'Categorías actualizadas' });
      } catch (error) {
        console.error('Error toggling ws member category:', error);
        toast({ title: 'Error al actualizar', variant: 'destructive' });
      }
    }
  };

  // Get all categories for a member (used by the toggle submenu)
  const getMemberCategories = useCallback((member: { id: string; type: MemberType; rawData?: any; currentCategory?: string }) => {
    if (member.type === 'profile') {
      const config = member.rawData?.field_config as Record<string, any> | null;
      const categories: string[] = config?.team_categories || [];
      const singleCategory = config?.team_category || member.rawData?.category;
      const allCats = new Set(categories);
      if (singleCategory) allCats.add(singleCategory);
      return Array.from(allCats);
    }
    if (member.type === 'user') {
      const wsMember = teamMembers.find(m => m.id === member.id);
      if (wsMember) {
        return [wsMember.team_category];
      }
    }
    return member.currentCategory ? [member.currentCategory] : [];
  }, [teamMembers]);

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

    // Sumar también miembros del workspace asignados a cada artista vía bindings
    teamMembers.forEach(m => {
      (m.artist_ids || []).forEach(aid => {
        counts.set(aid, (counts.get(aid) || 0) + 1);
      });
    });

    return counts;
  }, [teamContacts, teamMembers]);

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
    // Normalizador para hacer match de nombres ignorando mayúsculas/acentos/espacios
    const norm = (s: string) =>
      (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

    // Lookup de artistas del roster por nombre normalizado (stage_name y name)
    const artistByName = new Map<string, typeof artists[number]>();
    (artists || []).forEach(a => {
      const keys = [a.stage_name, a.name].filter(Boolean) as string[];
      keys.forEach(k => {
        const key = norm(k);
        if (key && !artistByName.has(key)) artistByName.set(key, a);
      });
    });

    // Pre-cómputo GLOBAL: ¿este artista del roster ya está representado por algún
    // contacto promocionado en CUALQUIER categoría? Evita duplicar al mismo
    // artista como "Artista principal" + "Compositor, Productor", etc.
    const globallyPromotedArtistIds = new Set<string>();
    (teamContacts || []).forEach(c => {
      const linkedId = (c as any).linked_artist_id as string | null | undefined;
      let match = linkedId ? artists.find(a => a.id === linkedId) : undefined;
      if (!match) {
        match =
          artistByName.get(norm((c as any).stage_name || '')) ||
          artistByName.get(norm((c as any).name || ''));
      }
      if (match) globallyPromotedArtistIds.add(match.id);
    });

    return allCategoriesForDisplay.map(cat => {
      const wsMembers = teamMembers.filter(m => {
        if (m.team_category !== cat.value) return false;
        if (selectedArtistId === 'all' || selectedArtistId === '00-management') return true;
        // Artista concreto: solo incluir si el miembro tiene binding con ese artista
        return (m.artist_ids || []).includes(selectedArtistId);
      });
      
      const rawContacts = teamContacts.filter(c => {
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

      // Separar contactos que en realidad representan a un artista del roster.
      // Prioridad: linked_artist_id (FK exacto) > matching por nombre normalizado.
      const promotedArtists = new Map<string, { artist: typeof artists[number]; role?: string }>();
      const contacts = rawContacts.filter(c => {
        const linkedId = (c as any).linked_artist_id as string | null | undefined;
        let match = linkedId ? artists.find(a => a.id === linkedId) : undefined;
        if (!match) {
          match =
            artistByName.get(norm(c.stage_name || '')) ||
            artistByName.get(norm(c.name || ''));
        }
        if (!match) return true;
        // Respetar el filtro de artista seleccionado
        if (selectedArtistId !== 'all' && selectedArtistId !== '00-management' && match.id !== selectedArtistId) {
          return true;
        }
        const existing = promotedArtists.get(match.id);
        const mergedRole = [existing?.role, c.role].filter(Boolean).join(', ');
        promotedArtists.set(match.id, { artist: match, role: mergedRole || c.role || undefined });
        return false; // excluir de la lista de contactos
      });

      let artistMembers: any[] = [];

      // Inyección automática de "Artista principal" en categorías artistico/banda.
      // Importante: si el artista ya está promocionado en CUALQUIER categoría
      // (no solo en esta), omitimos la inyección genérica para evitar duplicados.
      // El rol "Artista principal" se compondrá en el bloque de promocionados.
      if (cat.value === 'artistico' || cat.value === 'banda') {
        if (selectedArtistId === 'all' && artists && artists.length > 0) {
          artists.forEach(a => {
            if (globallyPromotedArtistIds.has(a.id)) return;
            artistMembers.push({
              id: `artist-${a.id}`,
              isArtist: true,
              name: a.stage_name || a.name,
              role: 'Artista principal',
              artistId: a.id,
              avatarUrl: a.avatar_url,
            });
          });
        } else if (selectedArtist && !globallyPromotedArtistIds.has(selectedArtist.id)) {
          artistMembers.push({
            id: `artist-${selectedArtist.id}`,
            isArtist: true,
            name: selectedArtist.stage_name || selectedArtist.name,
            role: 'Artista principal',
            artistId: selectedArtist.id,
            avatarUrl: selectedArtist.avatar_url,
          });
        }
      }

      // Añadir artistas promocionados desde contactos (con su rol real, ej. "Compositor, Productor").
      // Usamos un id estable `artist-<uuid>` (sin sufijo de categoría) para que la
      // deduplicación por id en `allMembersFlattened` colapse las apariciones del
      // mismo artista en distintas categorías. Si además forma parte del roster
      // (categorías artístico/banda lo cubrirían), anteponemos "Artista principal · ".
      promotedArtists.forEach(({ artist, role }) => {
        const isRosterArtist = artists.some(a => a.id === artist.id);
        const baseRole = role || cat.label;
        const finalRole = isRosterArtist
          ? (baseRole && baseRole !== 'Artista principal'
              ? `Artista principal · ${baseRole}`
              : 'Artista principal')
          : baseRole;
        artistMembers.push({
          id: `artist-${artist.id}`,
          isArtist: true,
          name: artist.stage_name || artist.name,
          role: finalRole,
          artistId: artist.id,
          avatarUrl: artist.avatar_url,
        });
      });

      return {
        ...cat,
        members: wsMembers,
        contacts: contacts,
        artistMembers,
        total: wsMembers.length + contacts.length + artistMembers.length,
      };
    }).filter(cat => cat.total > 0);
  }, [allCategoriesForDisplay, teamMembers, teamContacts, selectedArtistId, selectedArtist, artists]);

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

    // Add artists if present
    if (category.artistMembers) {
      category.artistMembers.forEach((am: any) => {
        members.push({
          id: am.id,
          name: am.name,
          role: am.role,
          avatarUrl: am.avatarUrl,
          type: 'artist' as MemberType,
          currentCategory: categoryValue,
          rawData: am,
        });
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
        avatarUrl: contact.avatar_url,
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

    // Filter by search query (search across all available fields)
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase();
      
      // Helper to safely convert any value to searchable string
      const toSearchString = (val: unknown): string => {
        if (val == null) return '';
        if (typeof val === 'string') return val.toLowerCase();
        if (Array.isArray(val)) return val.map(v => toSearchString(v)).join(' ');
        if (typeof val === 'object') return Object.values(val).map(v => toSearchString(v)).join(' ');
        return String(val).toLowerCase();
      };
      
      return members.filter(m => {
        const raw = m.rawData || {};
        const fieldConfig = raw.field_config as Record<string, any> | null;
        
        // Build a single searchable string from all fields
        const searchableFields = [
          m.name,
          raw.name,
          raw.stage_name,
          m.email,
          raw.email,
          m.role,
          raw.role,
          raw.functional_role,
          raw.company,
          raw.phone,
          raw.website,
          raw.address,
          raw.city,
          raw.country,
          raw.postal_code,
          raw.iban,
          raw.bank_name,
          fieldConfig?.full_name,
          fieldConfig?.dni,
          fieldConfig?.social_security,
          fieldConfig?.allergies,
          fieldConfig?.observations,
        ];
        
        const searchableText = searchableFields.map(toSearchString).join(' ');
        return searchableText.includes(searchLower);
      });
    }

    return members;
  }, [allTeamByCategory, buildGridMembers, debouncedSearch]);

  // Build selected profiles info for dashboard
  const selectedProfiles = useMemo(() => {
    return allMembersFlattened
      .filter(m => selectedMemberIds.has(m.id))
      .map(m => {
        const isArtist = m.type === 'artist';
        const contactArtistId = m.type === 'profile' ? m.rawData?.artist_id : undefined;
        const cleanArtistId = isArtist ? m.rawData?.artistId : contactArtistId;
        // For artists, strip the "artist-" prefix to get the real UUID for contact queries
        const cleanId = isArtist
          ? (m.rawData?.artistId || m.id.replace(/^artist-/, ''))
          : (m.rawData?.id || m.id);
        return {
          id: cleanId,
          name: m.name,
          avatarUrl: m.avatarUrl,
          role: m.role,
          artistId: cleanArtistId,
        };
      });
  }, [selectedMemberIds, allMembersFlattened]);

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
    <div className={`p-6 space-y-4 ${viewMode === 'free' ? 'max-w-full' : 'container mx-auto'}`}>
      {/* Header row: title + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Equipos</h1>
          <Badge variant="secondary" className="text-xs">
            {allMembersFlattened.length}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => navigate('/teams/roles')}
            title="Ver y configurar permisos por rol funcional"
          >
            <Shield className="w-3.5 h-3.5 mr-1.5" />
            Roles y permisos
          </Button>
          <Button
            variant={selectionMode ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              if (selectionMode) clearSelection();
              else setSelectionMode(true);
            }}
            className="h-8"
          >
            <MousePointerClick className="w-3.5 h-3.5 mr-1.5" />
            {selectionMode ? 'Cancelar' : 'Seleccionar'}
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={() => setAddContactDialogOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Perfil
          </Button>
          <Button size="sm" className="h-8" onClick={() => setInviteDialogOpen(true)} disabled={!workspaceId}>
            <Mail className="w-3.5 h-3.5 mr-1.5" />
            Invitar
          </Button>
        </div>
      </div>

      {/* Filters row: dropdowns + search + view toggle */}
      <div className="flex items-center gap-2 flex-wrap">
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
            allCount={allMembersFlattened.length}
            onManageCategories={() => setCategoryManagerOpen(true)}
          />
        )}

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 w-40 h-8 text-sm"
          />
        </div>
        
        {/* View Toggle */}
        <div className="flex gap-0.5 border rounded-lg p-0.5">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('grid')}
            className="h-7 w-7"
            title="Cuadrícula"
          >
            <Grid3X3 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
            className="h-7 w-7"
            title="Lista"
          >
            <List className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === 'free' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('free')}
            className="h-7 w-7"
            title="Vista libre"
          >
            <Move className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={viewMode === 'permissions' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('permissions')}
            className="h-7 w-7"
            title="Permisos por rol"
          >
            <Shield className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Owner indicator */}
      {ownerInfo && (
        <p className="text-xs text-muted-foreground">
          Gestionado por: <span className="font-medium">{ownerInfo.name}</span>
        </p>
      )}

      {/* Permissions tab — separated UI */}
      {viewMode === 'permissions' ? (
        <PermissionsByRoleTab
          rolesInUse={Array.from(
            teamMembers.reduce((acc, m) => {
              const role = (m.functional_role || '').trim();
              if (!role) return acc;
              acc.set(role, (acc.get(role) ?? 0) + 1);
              return acc;
            }, new Map<string, number>()),
          ).map(([role, count]) => ({ role, count }))}
        />
      ) : teamMembers.length === 0 && teamContacts.length === 0 ? (
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
          {viewMode === 'grid' && (
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
                } else if (member.type === 'artist') {
                  setArtistInfoDialog({ open: true, artistId: member.rawData?.artistId });
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
              onToggleCategory={(memberId, category) => toggleMemberCategory(memberId, category)}
              getMemberCategories={getMemberCategories}
              categories={allCategoriesForDisplay.map(c => ({ value: c.value, label: c.label }))}
              showActions
              selectable={selectionMode}
              selectedIds={selectedMemberIds}
              onSelect={handleToggleSelect}
            />
          )}
          {viewMode === 'list' && (
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
                } else if (member.type === 'artist') {
                  setArtistInfoDialog({ open: true, artistId: member.rawData?.artistId });
                }
              }}
              onMemberRemove={(member) => {
                if (member.type === 'profile') {
                  handleRemoveFromTeam(member.rawData.id);
                }
              }}
              categories={allCategoriesForDisplay.map(c => ({ value: c.value, label: c.label }))}
              showActions
              selectable={selectionMode}
              selectedIds={selectedMemberIds}
              onSelect={handleToggleSelect}
            />
          )}
          {viewMode === 'free' && (
            <TeamMemberFreeCanvas
              members={allMembersFlattened}
              contextKey={selectedArtistId === 'all' ? 'all' : selectedArtistId}
              onMemberDoubleClick={(member) => {
                if (member.type === 'profile') {
                  setSelectedContactId(member.rawData?.id || member.id);
                }
              }}
              onMemberEdit={(member) => {
                if (member.type === 'profile') {
                  setEditingContact(member.rawData);
                } else if (member.type === 'artist') {
                  setArtistInfoDialog({ open: true, artistId: member.rawData?.artistId });
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
              onToggleCategory={(memberId, category) => toggleMemberCategory(memberId, category)}
              getMemberCategories={getMemberCategories}
              categories={allCategoriesForDisplay.map(c => ({ value: c.value, label: c.label }))}
              showActions
              selectable={selectionMode}
              selectedIds={selectedMemberIds}
              onSelect={handleToggleSelect}
            />
          )}
        </div>
      ) : (
        /* Filtered view - show only selected category */
        <div className="space-y-4">
          {filteredCategories.map((category) => {
            const CategoryIcon = category.icon;
            let gridMembers = buildGridMembers(category.value);
            
            // Filter by search query (search in name, stage_name, company from rawData)
            if (debouncedSearch.trim()) {
              const searchLower = debouncedSearch.toLowerCase();
              gridMembers = gridMembers.filter(m => {
                const displayName = m.name?.toLowerCase() || '';
                const rawName = m.rawData?.name?.toLowerCase() || '';
                const stageName = m.rawData?.stage_name?.toLowerCase() || '';
                const company = m.rawData?.company?.toLowerCase() || '';
                return displayName.includes(searchLower) || 
                       rawName.includes(searchLower) || 
                       stageName.includes(searchLower) ||
                       company.includes(searchLower);
              });
            }
            return (
              <div key={category.value} className="space-y-4">
                <div className="flex items-center gap-2">
                  <CategoryIcon className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">{category.label}</h3>
                  <Badge variant="secondary">{category.total}</Badge>
                </div>
                
                {viewMode === 'grid' && (
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
                      } else if (member.type === 'artist') {
                        setArtistInfoDialog({ open: true, artistId: member.rawData?.artistId });
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
                    onToggleCategory={(memberId, category) => toggleMemberCategory(memberId, category)}
                    getMemberCategories={getMemberCategories}
                    categories={allCategoriesForDisplay.map(c => ({ value: c.value, label: c.label }))}
                    showActions
                    selectable={selectionMode}
                    selectedIds={selectedMemberIds}
                    onSelect={handleToggleSelect}
                  />
                )}
                {viewMode === 'list' && (
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
                      } else if (member.type === 'artist') {
                        setArtistInfoDialog({ open: true, artistId: member.rawData?.artistId });
                      }
                    }}
                    onMemberRemove={(member) => {
                      if (member.type === 'profile') {
                        handleRemoveFromTeam(member.rawData.id);
                      }
                    }}
                    categories={allCategoriesForDisplay.map(c => ({ value: c.value, label: c.label }))}
                    showActions
                    selectable={selectionMode}
                    selectedIds={selectedMemberIds}
                    onSelect={handleToggleSelect}
                  />
                )}
                {viewMode === 'free' && (
                  <TeamMemberFreeCanvas
                    members={gridMembers}
                    contextKey={`${selectedArtistId}_${category.value}`}
                    onMemberDoubleClick={(member) => {
                      if (member.type === 'profile') {
                        setSelectedContactId(member.rawData?.id || member.id);
                      }
                    }}
                    onMemberEdit={(member) => {
                      if (member.type === 'profile') {
                        setEditingContact(member.rawData);
                      } else if (member.type === 'artist') {
                        setArtistInfoDialog({ open: true, artistId: member.rawData?.artistId });
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
                    onToggleCategory={(memberId, category) => toggleMemberCategory(memberId, category)}
                    getMemberCategories={getMemberCategories}
                    categories={allCategoriesForDisplay.map(c => ({ value: c.value, label: c.label }))}
                    showActions
                    selectable={selectionMode}
                    selectedIds={selectedMemberIds}
                    onSelect={handleToggleSelect}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Floating selection bar */}
      {selectionMode && selectedMemberIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-xl shadow-xl px-4 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedMemberIds.size} perfil{selectedMemberIds.size > 1 ? 'es' : ''} seleccionado{selectedMemberIds.size > 1 ? 's' : ''}
          </span>
          <Button
            size="sm"
            onClick={() => setDashboardOpen(true)}
          >
            <LayoutDashboard className="w-4 h-4 mr-2" />
            Ver Dashboard
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearSelection}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Contact Dashboard Dialog */}
      <ContactDashboardDialog
        open={dashboardOpen}
        onOpenChange={(open) => {
          setDashboardOpen(open);
          if (!open) setRestoredProfiles(null);
        }}
        profiles={restoredProfiles || selectedProfiles}
      />

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
        onOpenChange={(open) => {
          if (!open) {
            setSelectedContactId(null);
            fetchTeamContacts();
          }
        }}
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

      <ArtistInfoDialog
        artistId={artistInfoDialog.artistId}
        open={artistInfoDialog.open}
        onOpenChange={(open) => setArtistInfoDialog({ open, artistId: open ? artistInfoDialog.artistId : null })}
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
              <FunctionalRoleCombobox
                value={newFunctionalRole}
                onChange={setNewFunctionalRole}
              />
              <p className="text-xs text-muted-foreground">
                Elige uno de la lista o escribe uno personalizado en el buscador.
              </p>
              {newFunctionalRole.trim() && (
                <RolePermissionSummary roleName={newFunctionalRole.trim()} />
              )}
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => {
                  setEditingMemberRole(null);
                  setViewMode('permissions');
                }}
              >
                Ver matriz completa de permisos →
              </button>
            </div>

            <div className="border-t pt-4 space-y-2">
              <Label>Acceso a artistas</Label>
              <p className="text-xs text-muted-foreground">
                Define a qué artistas puede acceder este miembro. Solo verá la información de los artistas seleccionados.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  if (editingMemberRole) {
                    setManageArtistAccessFor({
                      userId: editingMemberRole.userId,
                      name: editingMemberRole.name,
                    });
                  }
                }}
              >
                <Users className="h-4 w-4 mr-2" />
                Gestionar acceso a artistas
              </Button>
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

      <ManageArtistAccessDialog
        open={!!manageArtistAccessFor}
        onOpenChange={(open) => !open && setManageArtistAccessFor(null)}
        userId={manageArtistAccessFor?.userId ?? null}
        userName={manageArtistAccessFor?.name ?? ''}
        onSaved={fetchTeamMembers}
      />
    </div>
  );
}
