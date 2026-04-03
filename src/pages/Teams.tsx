import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, X, LayoutDashboard } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { TeamMemberGrid } from '@/components/TeamMemberGrid';
import { TeamMemberList } from '@/components/TeamMemberList';
import { TeamMemberFreeCanvas } from '@/components/TeamMemberFreeCanvas';
import { TEAM_CATEGORIES } from '@/lib/teamCategories';
import { MemberType } from '@/components/TeamMemberCard';
import { TeamsHeader } from '@/components/teams/TeamsHeader';
import { TeamsFilters } from '@/components/teams/TeamsFilters';
import { TeamsDialogs } from '@/components/teams/TeamsDialogs';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'free'>('grid');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [artists, setArtists] = useState<Array<{ id: string; name: string; stage_name?: string | null; description?: string | null; avatar_url?: string | null }>>([]);
  const artistIdFromUrl = searchParams.get('artistId');
  const [selectedArtistId, setSelectedArtistId] = useState<string>(artistIdFromUrl || 'all');
  const [activityMember, setActivityMember] = useState<{ id: string; name: string; email?: string; phone?: string; role?: string; type: 'contact' | 'profile' } | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactRefreshTrigger, setContactRefreshTrigger] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [restoredProfiles, setRestoredProfiles] = useState<any[] | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<{ name: string; avatarUrl?: string } | null>(null);
  const [artistInfoDialog, setArtistInfoDialog] = useState<{ open: boolean; artistId: string | null }>({ open: false, artistId: null });
  const [editingMemberRole, setEditingMemberRole] = useState<{ memberId: string; userId: string; name: string; currentRole?: string; mirrorContactId?: string } | null>(null);
  const [newFunctionalRole, setNewFunctionalRole] = useState('');
  const [categoryOrderVersion, setCategoryOrderVersion] = useState(0);

  // Restore dashboard state
  useEffect(() => {
    const saved = sessionStorage.getItem('contactDashboardProfiles');
    if (saved) {
      sessionStorage.removeItem('contactDashboardProfiles');
      try { const profiles = JSON.parse(saved); if (Array.isArray(profiles) && profiles.length > 0) { setRestoredProfiles(profiles); setDashboardOpen(true); } } catch {}
    }
  }, []);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedMemberIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }, []);

  const clearSelection = useCallback(() => { setSelectedMemberIds(new Set()); setSelectionMode(false); }, []);

  // Load custom categories
  useEffect(() => {
    const stored = localStorage.getItem('custom_team_categories');
    if (stored) { try { const parsed = JSON.parse(stored); setCustomCategories(parsed.map((c: any) => ({ ...c, icon: Users, isCustom: true }))); } catch {} }
  }, []);

  const fetchArtists = async () => {
    const { data } = await supabase.from('artists').select('id, name, stage_name, description, avatar_url').order('name');
    const storedOrder = localStorage.getItem('team_order');
    if (storedOrder && data) {
      try { const orderIds: string[] = JSON.parse(storedOrder); setArtists([...data].sort((a, b) => { const ai = orderIds.indexOf(a.id); const bi = orderIds.indexOf(b.id); if (ai === -1 && bi === -1) return 0; if (ai === -1) return 1; if (bi === -1) return -1; return ai - bi; })); } catch { setArtists(data || []); }
    } else { setArtists(data || []); }
  };

  useEffect(() => { fetchArtists(); }, []);
  useEffect(() => { fetchTeamMembers(); fetchTeamContacts(); }, []);

  const handleAddCustomCategory = (category: { value: string; label: string }) => {
    const newCat = { ...category, icon: Users, isCustom: true };
    setCustomCategories(prev => { const updated = [...prev, newCat]; localStorage.setItem('custom_team_categories', JSON.stringify(updated.map(c => ({ value: c.value, label: c.label })))); return updated; });
    toast({ title: 'Categoría creada' });
  };

  const handleRenameCategory = (value: string, newLabel: string) => {
    setCustomCategories(prev => { const updated = prev.map(c => c.value === value ? { ...c, label: newLabel } : c); localStorage.setItem('custom_team_categories', JSON.stringify(updated.map(c => ({ value: c.value, label: c.label })))); return updated; });
    toast({ title: 'Categoría actualizada' });
  };

  const handleDeleteCategory = (value: string) => {
    setCustomCategories(prev => { const updated = prev.filter(c => c.value !== value); localStorage.setItem('custom_team_categories', JSON.stringify(updated.map(c => ({ value: c.value, label: c.label })))); return updated; });
    toast({ title: 'Categoría eliminada' });
  };

  const allCategoriesForDisplay = useMemo(() => {
    const labelOverrides: Record<string, string> = {};
    const storedLabels = localStorage.getItem('category_label_overrides');
    if (storedLabels) { try { Object.assign(labelOverrides, JSON.parse(storedLabels)); } catch {} }
    const systemWithLabels = TEAM_CATEGORIES.map(cat => ({ ...cat, label: labelOverrides[cat.value] || cat.label }));
    const allCategories = [...systemWithLabels, ...customCategories];
    const savedOrder = localStorage.getItem('category_order');
    if (savedOrder) {
      try { const orderIds: string[] = JSON.parse(savedOrder); return [...allCategories].sort((a, b) => { const ai = orderIds.indexOf(a.value); const bi = orderIds.indexOf(b.value); if (ai === -1 && bi === -1) return 0; if (ai === -1) return 1; if (bi === -1) return -1; return ai - bi; }); } catch { return allCategories; }
    }
    return allCategories;
  }, [customCategories, categoryOrderVersion]);

  const fetchTeamContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('contacts').select('*').eq('created_by', user.id).order('name');
      if (error) throw error;
      const teamContactsList = (data || []).filter(c => { const config = c.field_config as Record<string, any> | null; return config?.is_team_member === true; });
      if (teamContactsList.length > 0) {
        const contactIds = teamContactsList.map(c => c.id);
        const { data: assignments } = await supabase.from('contact_artist_assignments').select('contact_id, artist_id').in('contact_id', contactIds);
        if (assignments) {
          const assignmentMap = new Map<string, string[]>();
          assignments.forEach(a => { if (!assignmentMap.has(a.contact_id)) assignmentMap.set(a.contact_id, []); assignmentMap.get(a.contact_id)!.push(a.artist_id); });
          teamContactsList.forEach(c => { (c as any).assigned_artist_ids = assignmentMap.get(c.id) || []; });
        }
      }
      setTeamContacts(teamContactsList);
    } catch (error) { console.error('Error fetching team contacts:', error); }
  };

  const fetchTeamMembers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('user_id', user.id).single();
      if (!profile?.workspace_id) { setLoading(false); return; }
      setWorkspaceId(profile.workspace_id);
      const { data: workspace } = await supabase.from('workspaces').select('created_by').eq('id', profile.workspace_id).single();
      let { data: members, error } = await supabase.from('workspace_memberships').select('id, user_id, role, team_category').eq('workspace_id', profile.workspace_id);
      if (error) throw error;
      if ((!members || members.length === 0) && workspace?.created_by === user.id) {
        const { data: newMembership, error: insertError } = await supabase.from('workspace_memberships').insert({ workspace_id: profile.workspace_id, user_id: user.id, role: 'OWNER', team_category: 'management' }).select('id, user_id, role, team_category').single();
        if (!insertError && newMembership) members = [newMembership];
      }
      if (!members || members.length === 0) { setTeamMembers([]); setLoading(false); return; }
      const userIds = members.map(m => m.user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, full_name, stage_name, email, avatar_url').in('user_id', userIds);
      const { data: mirrorContacts } = await supabase.from('contacts').select('id, name, role, field_config').filter('field_config->>workspace_user_id', 'in', `(${userIds.join(',')})`);
      const mirrorContactMap = new Map<string, any>();
      (mirrorContacts || []).forEach((c: any) => { const config = c.field_config as Record<string, any> | null; if (config?.workspace_user_id) mirrorContactMap.set(config.workspace_user_id, c); });
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));
      const formattedMembers: TeamMember[] = members.map((m: any) => {
        const memberProfile = profileMap.get(m.user_id);
        const mirrorContact = mirrorContactMap.get(m.user_id);
        return {
          id: m.id, user_id: m.user_id, role: m.role, functional_role: mirrorContact?.role || undefined,
          team_category: m.team_category || 'management', full_name: memberProfile?.stage_name || memberProfile?.full_name || 'Sin nombre',
          email: memberProfile?.email || '', avatar_url: memberProfile?.avatar_url, mirror_contact_id: mirrorContact?.id,
          permissions: { documents: 'view', solicitudes: 'view', carpetas: 'view', booking: 'view', presupuestos: 'view' },
        };
      });
      const ownerMember = formattedMembers.find(m => m.role === 'OWNER');
      if (ownerMember) { setOwnerInfo({ name: ownerMember.full_name, avatarUrl: ownerMember.avatar_url }); setTeamMembers(formattedMembers.filter(m => m.role !== 'OWNER')); }
      else { setOwnerInfo(null); setTeamMembers(formattedMembers); }
    } catch (error) { console.error('Error fetching team members:', error); } finally { setLoading(false); }
  };

  const handleRemoveFromTeam = async (contactId: string) => {
    try {
      const contact = teamContacts.find(c => c.id === contactId);
      if (!contact) return;
      const currentConfig = (contact.field_config as Record<string, any>) || {};
      const { is_team_member, team_categories, team_category, ...restConfig } = currentConfig;
      await supabase.from('contacts').update({ field_config: restConfig }).eq('id', contactId);
      setTeamContacts(prev => prev.filter(c => c.id !== contactId));
      toast({ title: 'Perfil eliminado del equipo' });
    } catch { toast({ title: 'Error al eliminar', variant: 'destructive' }); }
  };

  const toggleMemberCategory = async (memberId: string, category: string) => {
    const contact = teamContacts.find(c => c.id === memberId);
    if (contact) {
      try {
        const config = (contact.field_config as Record<string, any>) || {};
        const currentCategories: string[] = config.team_categories || [];
        const singleCategory = config.team_category || contact.category;
        const allCurrentCats = new Set(currentCategories);
        if (singleCategory && !allCurrentCats.has(singleCategory)) allCurrentCats.add(singleCategory);
        if (allCurrentCats.has(category)) { if (allCurrentCats.size <= 1) return; allCurrentCats.delete(category); } else { allCurrentCats.add(category); }
        const newCategories = Array.from(allCurrentCats);
        await supabase.from('contacts').update({ field_config: { ...config, team_categories: newCategories, team_category: newCategories[0] } }).eq('id', memberId);
        setTeamContacts(prev => prev.map(c => c.id === memberId ? { ...c, field_config: { ...config, team_categories: newCategories, team_category: newCategories[0] } } : c));
        toast({ title: 'Categorías actualizadas' });
      } catch { toast({ title: 'Error al actualizar', variant: 'destructive' }); }
      return;
    }
    const wsMember = teamMembers.find(m => m.id === memberId);
    if (wsMember) {
      const currentPrimary = wsMember.team_category;
      let mirrorCategories: string[] = [];
      if (wsMember.mirror_contact_id) {
        const { data: mirrorContact } = await supabase.from('contacts').select('field_config').eq('id', wsMember.mirror_contact_id).single();
        mirrorCategories = (mirrorContact?.field_config as Record<string, any>)?.team_categories || [];
      }
      const allCurrentCats = new Set([currentPrimary, ...mirrorCategories]);
      if (allCurrentCats.has(category)) { if (allCurrentCats.size <= 1) return; allCurrentCats.delete(category); } else { allCurrentCats.add(category); }
      const newCategories = Array.from(allCurrentCats);
      const newPrimary = newCategories[0];
      try {
        if (newPrimary !== currentPrimary) await supabase.from('workspace_memberships').update({ team_category: newPrimary as any }).eq('id', memberId);
        if (wsMember.mirror_contact_id) {
          const { data: mc } = await supabase.from('contacts').select('field_config').eq('id', wsMember.mirror_contact_id).single();
          await supabase.from('contacts').update({ field_config: { ...(mc?.field_config as any || {}), team_categories: newCategories } }).eq('id', wsMember.mirror_contact_id);
        }
        setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, team_category: newPrimary } : m));
        toast({ title: 'Categorías actualizadas' });
      } catch { toast({ title: 'Error al actualizar', variant: 'destructive' }); }
    }
  };

  const getMemberCategories = useCallback((member: { id: string; type: MemberType; rawData?: any; currentCategory?: string }) => {
    if (member.type === 'profile') {
      const config = member.rawData?.field_config as Record<string, any> | null;
      const categories: string[] = config?.team_categories || [];
      const singleCategory = config?.team_category || member.rawData?.category;
      const allCats = new Set(categories);
      if (singleCategory) allCats.add(singleCategory);
      return Array.from(allCats);
    }
    if (member.type === 'user') { const ws = teamMembers.find(m => m.id === member.id); if (ws) return [ws.team_category]; }
    return member.currentCategory ? [member.currentCategory] : [];
  }, [teamMembers]);

  const updateFunctionalRole = async () => {
    if (!editingMemberRole || !newFunctionalRole.trim()) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (editingMemberRole.mirrorContactId) {
        await supabase.from('contacts').update({ role: newFunctionalRole.trim() }).eq('id', editingMemberRole.mirrorContactId);
      } else {
        await supabase.from('contacts').insert({ name: editingMemberRole.name, role: newFunctionalRole.trim(), category: 'management', created_by: user.id, field_config: { workspace_user_id: editingMemberRole.userId, mirror_type: 'workspace_member', is_team_member: true } });
      }
      setTeamMembers(prev => prev.map(m => m.user_id === editingMemberRole.userId ? { ...m, functional_role: newFunctionalRole.trim() } : m));
      toast({ title: 'Rol funcional actualizado' });
      setEditingMemberRole(null); setNewFunctionalRole(''); fetchTeamMembers();
    } catch { toast({ title: 'Error al actualizar rol', variant: 'destructive' }); }
  };

  const handleEditTeam = (teamId: string) => { setEditingTeamId(teamId); setEditTeamDialogOpen(true); };
  const handleDeleteTeam = async (teamId: string) => {
    try { await supabase.from('artists').delete().eq('id', teamId); toast({ title: 'Equipo eliminado correctamente' }); fetchArtists(); if (selectedArtistId === teamId) setSelectedArtistId('all'); } catch (error: any) { toast({ title: 'Error al eliminar equipo', description: error.message, variant: 'destructive' }); }
  };
  const handleDuplicateTeam = async (teamId: string) => {
    try {
      const team = artists.find(a => a.id === teamId); if (!team) return;
      const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('workspace_id').eq('user_id', user.id).single();
      if (!profile?.workspace_id) return;
      await supabase.from('artists').insert({ name: `${team.name} (copia)`, stage_name: team.stage_name ? `${team.stage_name} (copia)` : null, description: team.description, workspace_id: profile.workspace_id, created_by: user.id });
      toast({ title: 'Equipo duplicado correctamente' }); fetchArtists();
    } catch (error: any) { toast({ title: 'Error al duplicar equipo', description: error.message, variant: 'destructive' }); }
  };
  const handleTeamReorder = (orderedIds: string[]) => { localStorage.setItem('team_order', JSON.stringify(orderedIds)); setArtists(orderedIds.map(id => artists.find(a => a.id === id)).filter(Boolean) as typeof artists); };
  const handleCategoryReorder = (orderedValues: string[]) => {
    localStorage.setItem('category_order', JSON.stringify(orderedValues));
    const reorderedCustom = orderedValues.filter(v => customCategories.some(c => c.value === v)).map(v => customCategories.find(c => c.value === v)).filter(Boolean) as typeof customCategories;
    setCustomCategories(reorderedCustom);
    localStorage.setItem('custom_team_categories', JSON.stringify(reorderedCustom.map(c => ({ value: c.value, label: c.label }))));
    setCategoryOrderVersion(v => v + 1);
  };

  const teamMemberCounts = useMemo(() => {
    const counts = new Map<string, number>();
    teamContacts.forEach(contact => { ((contact as any).assigned_artist_ids || []).forEach((id: string) => { counts.set(id, (counts.get(id) || 0) + 1); }); });
    return counts;
  }, [teamContacts]);

  const editingTeam = editingTeamId ? artists.find(a => a.id === editingTeamId) : null;
  const selectedArtist = selectedArtistId !== 'all' && selectedArtistId !== '00-management' ? artists.find(a => a.id === selectedArtistId) : null;

  const allTeamByCategory = useMemo(() => {
    return allCategoriesForDisplay.map(cat => {
      const wsMembers = teamMembers.filter(m => m.team_category === cat.value);
      const contacts = teamContacts.filter(c => {
        const config = c.field_config as Record<string, any> | null;
        if (config?.mirror_type === 'workspace_member' || config?.workspace_user_id) return false;
        const isManagementTeam = config?.is_management_team === true;
        const categories = config?.team_categories || [];
        const singleCategory = config?.team_category || c.category;
        if (selectedArtistId === '00-management') { if (!isManagementTeam) return false; return categories.includes(cat.value) || singleCategory === cat.value; }
        if (selectedArtistId !== 'all') { const assigned = (c as any).assigned_artist_ids || []; if (!assigned.includes(selectedArtistId)) return false; }
        return categories.includes(cat.value) || singleCategory === cat.value;
      });
      let artistMembers: any[] = [];
      if (cat.value === 'artistico' || cat.value === 'banda') {
        if (selectedArtistId === 'all' && artists.length > 0) artistMembers = artists.map(a => ({ id: `artist-${a.id}`, isArtist: true, name: a.stage_name || a.name, role: 'Artista principal', artistId: a.id, avatarUrl: a.avatar_url }));
        else if (selectedArtist) artistMembers = [{ id: `artist-${selectedArtist.id}`, isArtist: true, name: selectedArtist.stage_name || selectedArtist.name, role: 'Artista principal', artistId: selectedArtist.id, avatarUrl: selectedArtist.avatar_url }];
      }
      return { ...cat, members: wsMembers, contacts, artistMembers, total: wsMembers.length + contacts.length + artistMembers.length };
    }).filter(cat => cat.total > 0);
  }, [allCategoriesForDisplay, teamMembers, teamContacts, selectedArtistId, selectedArtist, artists]);

  const buildGridMembers = (categoryValue: string) => {
    const category = allTeamByCategory.find(c => c.value === categoryValue);
    if (!category) return [];
    const members: Array<{ id: string; name: string; email?: string; role?: string; avatarUrl?: string; type: MemberType; currentCategory?: string; rawData: any }> = [];
    category.artistMembers?.forEach((am: any) => { members.push({ id: am.id, name: am.name, role: am.role, avatarUrl: am.avatarUrl, type: 'artist' as MemberType, currentCategory: categoryValue, rawData: am }); });
    category.members.forEach(member => { members.push({ id: member.id, name: member.full_name, email: member.email, role: member.functional_role || member.role, avatarUrl: member.avatar_url, type: 'user' as MemberType, currentCategory: member.team_category, rawData: member }); });
    category.contacts.forEach((contact: any) => {
      const config = contact.field_config as Record<string, any> | null;
      const categories = config?.team_categories || [];
      const formattedRole = contact.role ? contact.role : categories.length > 0 ? categories.slice(0, 2).map((c: string) => allCategoriesForDisplay.find(cat => cat.value === c)?.label || c).join(' · ') : undefined;
      members.push({ id: contact.id, name: contact.stage_name || contact.name, email: contact.email, role: formattedRole, avatarUrl: contact.avatar_url, type: 'profile' as MemberType, currentCategory: categoryValue, rawData: contact });
    });
    return members;
  };

  const categoryPillsData = useMemo(() => {
    const countsMap = new Map<string, number>();
    allTeamByCategory.forEach(cat => countsMap.set(cat.value, cat.total));
    return allCategoriesForDisplay.map(cat => ({ value: cat.value, label: cat.label, count: countsMap.get(cat.value) || 0, icon: cat.icon }));
  }, [allCategoriesForDisplay, allTeamByCategory]);

  const filteredCategories = selectedCategoryFilter === 'all' ? allTeamByCategory : allTeamByCategory.filter(c => c.value === selectedCategoryFilter);

  const allMembersFlattened = useMemo(() => {
    const members: Array<{ id: string; name: string; email?: string; role?: string; avatarUrl?: string; type: MemberType; currentCategory?: string; rawData: any }> = [];
    const addedIds = new Set<string>();
    allTeamByCategory.forEach(category => {
      buildGridMembers(category.value).forEach(member => { if (!addedIds.has(member.id)) { addedIds.add(member.id); members.push({ ...member, role: member.role || category.label }); } });
    });
    if (debouncedSearch.trim()) {
      const searchLower = debouncedSearch.toLowerCase();
      const toSearchString = (val: unknown): string => {
        if (val == null) return ''; if (typeof val === 'string') return val.toLowerCase();
        if (Array.isArray(val)) return val.map(v => toSearchString(v)).join(' ');
        if (typeof val === 'object') return Object.values(val as object).map(v => toSearchString(v)).join(' ');
        return String(val).toLowerCase();
      };
      return members.filter(m => {
        const raw = m.rawData || {};
        const fieldConfig = raw.field_config as Record<string, any> | null;
        const searchableFields = [m.name, raw.name, raw.stage_name, m.email, raw.email, m.role, raw.role, raw.functional_role, raw.company, raw.phone, raw.website, raw.address, raw.city, raw.country, raw.postal_code, raw.iban, raw.bank_name, fieldConfig?.full_name, fieldConfig?.dni, fieldConfig?.social_security, fieldConfig?.allergies, fieldConfig?.observations];
        return searchableFields.map(toSearchString).join(' ').includes(searchLower);
      });
    }
    return members;
  }, [allTeamByCategory, buildGridMembers, debouncedSearch]);

  const selectedProfiles = useMemo(() => {
    return allMembersFlattened.filter(m => selectedMemberIds.has(m.id)).map(m => {
      const isArtist = m.type === 'artist';
      const cleanId = isArtist ? (m.rawData?.artistId || m.id.replace(/^artist-/, '')) : (m.rawData?.id || m.id);
      return { id: cleanId, name: m.name, avatarUrl: m.avatarUrl, role: m.role, artistId: isArtist ? m.rawData?.artistId : m.rawData?.artist_id };
    });
  }, [selectedMemberIds, allMembersFlattened]);

  // Common member click/edit/remove handlers
  const handleMemberClick = (member: any) => {
    if (member.type === 'user') setActivityMember({ id: member.rawData.user_id, name: member.name, email: member.email, role: member.rawData.role, type: 'profile' });
    else if (member.type === 'profile') setSelectedContactId(member.rawData.id);
  };
  const handleMemberEdit = (member: any) => {
    if (member.type === 'profile') setEditingContact(member.rawData);
    else if (member.type === 'artist') setArtistInfoDialog({ open: true, artistId: member.rawData?.artistId });
  };
  const handleMemberRemove = (member: any) => { if (member.type === 'profile') handleRemoveFromTeam(member.rawData.id); };
  const handleMemberEditRole = (member: any) => {
    if (member.type === 'user') {
      setEditingMemberRole({ memberId: member.rawData.id, userId: member.rawData.user_id, name: member.name, currentRole: member.rawData.functional_role, mirrorContactId: member.rawData.mirror_contact_id });
      setNewFunctionalRole(member.rawData.functional_role || '');
    }
  };

  const commonGridProps = {
    onMemberClick: handleMemberClick,
    onMemberEdit: handleMemberEdit,
    onMemberRemove: handleMemberRemove,
    onMemberEditRole: handleMemberEditRole,
    onToggleCategory: (memberId: string, category: string) => toggleMemberCategory(memberId, category),
    getMemberCategories,
    categories: allCategoriesForDisplay.map(c => ({ value: c.value, label: c.label })),
    showActions: true,
    selectable: selectionMode,
    selectedIds: selectedMemberIds,
    onSelect: handleToggleSelect,
  };

  if (loading) return <div className="container mx-auto p-6"><div className="animate-pulse space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-muted rounded-lg"></div>)}</div></div>;

  return (
    <div className={`p-6 space-y-4 ${viewMode === 'free' ? 'max-w-full' : 'container mx-auto'}`}>
      <TeamsHeader memberCount={allMembersFlattened.length} selectionMode={selectionMode}
        onToggleSelectionMode={() => { if (selectionMode) clearSelection(); else setSelectionMode(true); }}
        onAddContact={() => setAddContactDialogOpen(true)} onInvite={() => setInviteDialogOpen(true)} workspaceId={workspaceId} />

      <TeamsFilters artists={artists} selectedArtistId={selectedArtistId} onArtistChange={setSelectedArtistId}
        teamMemberCounts={teamMemberCounts} managementMemberCount={teamMembers.length} onManageTeams={() => setTeamManagerOpen(true)}
        categoryPillsData={categoryPillsData} selectedCategoryFilter={selectedCategoryFilter} onCategoryChange={setSelectedCategoryFilter}
        allMembersCount={allMembersFlattened.length} onManageCategories={() => setCategoryManagerOpen(true)}
        searchQuery={searchQuery} onSearchChange={setSearchQuery} viewMode={viewMode} onViewModeChange={setViewMode} />

      {ownerInfo && <p className="text-xs text-muted-foreground">Gestionado por: <span className="font-medium">{ownerInfo.name}</span></p>}

      {teamMembers.length === 0 && teamContacts.length === 0 ? (
        <Card><CardContent className="py-12 text-center">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Sin miembros de equipo</h3>
          <p className="text-muted-foreground mb-4">Añade personas a tu equipo (con o sin cuenta de usuario)</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => setAddContactDialogOpen(true)}>Añadir Perfil</Button>
            <Button onClick={() => setInviteDialogOpen(true)} disabled={!workspaceId}>Invitar Usuario</Button>
          </div>
        </CardContent></Card>
      ) : selectedCategoryFilter === 'all' ? (
        <div className="space-y-4">
          {viewMode === 'grid' && <TeamMemberGrid members={allMembersFlattened} {...commonGridProps} />}
          {viewMode === 'list' && <TeamMemberList members={allMembersFlattened} {...commonGridProps} />}
          {viewMode === 'free' && <TeamMemberFreeCanvas members={allMembersFlattened} contextKey={selectedArtistId === 'all' ? 'all' : selectedArtistId}
            onMemberDoubleClick={(member) => { if (member.type === 'profile') setSelectedContactId(member.rawData?.id || member.id); }}
            {...commonGridProps} />}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCategories.map(category => {
            const CategoryIcon = category.icon;
            let gridMembers = buildGridMembers(category.value);
            if (debouncedSearch.trim()) {
              const sl = debouncedSearch.toLowerCase();
              gridMembers = gridMembers.filter(m => [m.name, m.rawData?.name, m.rawData?.stage_name, m.rawData?.company].some(f => f?.toLowerCase().includes(sl)));
            }
            return (
              <div key={category.value} className="space-y-4">
                <div className="flex items-center gap-2">
                  <CategoryIcon className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">{category.label}</h3>
                  <Badge variant="secondary">{category.total}</Badge>
                </div>
                {viewMode === 'grid' && <TeamMemberGrid members={gridMembers} {...commonGridProps} />}
                {viewMode === 'list' && <TeamMemberList members={gridMembers} {...commonGridProps} />}
                {viewMode === 'free' && <TeamMemberFreeCanvas members={gridMembers} contextKey={`${selectedArtistId}_${category.value}`}
                  onMemberDoubleClick={(member) => { if (member.type === 'profile') setSelectedContactId(member.rawData?.id || member.id); }}
                  {...commonGridProps} />}
              </div>
            );
          })}
        </div>
      )}

      {selectionMode && selectedMemberIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background border rounded-xl shadow-xl px-4 py-3 flex items-center gap-4">
          <span className="text-sm font-medium">{selectedMemberIds.size} perfil{selectedMemberIds.size > 1 ? 'es' : ''} seleccionado{selectedMemberIds.size > 1 ? 's' : ''}</span>
          <Button size="sm" onClick={() => setDashboardOpen(true)}>
            <LayoutDashboard className="w-4 h-4 mr-2" />Ver Dashboard
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearSelection}><X className="h-4 w-4" /></Button>
        </div>
      )}

      <TeamsDialogs
        workspaceId={workspaceId} inviteDialogOpen={inviteDialogOpen} setInviteDialogOpen={setInviteDialogOpen}
        onMemberInvited={fetchTeamMembers} addContactDialogOpen={addContactDialogOpen} setAddContactDialogOpen={setAddContactDialogOpen}
        onContactAdded={fetchTeamContacts} customCategories={customCategories} onAddCustomCategory={handleAddCustomCategory}
        selectedArtistId={selectedArtistId} editingContact={editingContact} setEditingContact={setEditingContact}
        onContactUpdated={() => { const id = editingContact?.id; setEditingContact(null); fetchTeamContacts(); setContactRefreshTrigger(p => p + 1); if (id) setSelectedContactId(id); }}
        activityMember={activityMember} setActivityMember={setActivityMember}
        selectedContactId={selectedContactId} setSelectedContactId={setSelectedContactId}
        contactRefreshTrigger={contactRefreshTrigger}
        onEditContact={(contactId) => { const c = teamContacts.find(c => c.id === contactId); if (c) setEditingContact(c); }}
        onProfileSheetClose={() => { setSelectedContactId(null); fetchTeamContacts(); }}
        createTeamDialogOpen={createTeamDialogOpen} setCreateTeamDialogOpen={setCreateTeamDialogOpen}
        onTeamCreated={() => { setCreateTeamDialogOpen(false); fetchArtists(); }}
        editTeamDialogOpen={editTeamDialogOpen} setEditTeamDialogOpen={setEditTeamDialogOpen}
        editingTeamId={editingTeamId} setEditingTeamId={setEditingTeamId}
        editingTeamData={editingTeam ? { name: editingTeam.name, stage_name: editingTeam.stage_name, description: editingTeam.description } : undefined}
        onTeamEdited={() => { setEditTeamDialogOpen(false); setEditingTeamId(null); fetchArtists(); }}
        teamManagerOpen={teamManagerOpen} setTeamManagerOpen={setTeamManagerOpen}
        teams={artists.map(a => ({ id: a.id, name: a.name, stageName: a.stage_name, avatarUrl: a.avatar_url, memberCount: teamMemberCounts.get(a.id) || 0, description: a.description }))}
        onCreateNewTeam={() => { setTeamManagerOpen(false); setCreateTeamDialogOpen(true); }}
        onEditTeam={(teamId) => { setTeamManagerOpen(false); handleEditTeam(teamId); }}
        onDuplicateTeam={handleDuplicateTeam} onDeleteTeam={handleDeleteTeam} onReorderTeams={handleTeamReorder}
        categoryManagerOpen={categoryManagerOpen} setCategoryManagerOpen={setCategoryManagerOpen}
        categoryCounts={new Map(categoryPillsData.map(c => [c.value, c.count]))}
        onCreateCategory={(name) => handleAddCustomCategory({ value: name.toLowerCase().replace(/\s+/g, '_'), label: name })}
        onRenameCategory={handleRenameCategory} onDeleteCategory={handleDeleteCategory} onReorderCategories={handleCategoryReorder}
        dashboardOpen={dashboardOpen} setDashboardOpen={setDashboardOpen} dashboardProfiles={selectedProfiles}
        restoredProfiles={restoredProfiles} setRestoredProfiles={setRestoredProfiles}
        artistInfoDialog={artistInfoDialog} setArtistInfoDialog={setArtistInfoDialog}
        editingMemberRole={editingMemberRole} setEditingMemberRole={setEditingMemberRole}
        newFunctionalRole={newFunctionalRole} setNewFunctionalRole={setNewFunctionalRole}
        onUpdateFunctionalRole={updateFunctionalRole}
      />
    </div>
  );
}
