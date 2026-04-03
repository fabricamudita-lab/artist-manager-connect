import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, MessageSquare } from 'lucide-react';
import { SolicitudesKanban } from '@/components/SolicitudesKanban';
import { SolicitudesStats } from '@/components/SolicitudesStats';
import { useSolicitudesKeyboard } from '@/hooks/useSolicitudesKeyboard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useConfetti } from '@/hooks/useConfetti';
import { SolicitudesHeader } from '@/components/solicitudes/SolicitudesHeader';
import { SolicitudesFiltersBar } from '@/components/solicitudes/SolicitudesFiltersBar';
import { SolicitudListItem } from '@/components/solicitudes/SolicitudListItem';
import { SolicitudesDialogs } from '@/components/solicitudes/SolicitudesDialogs';

interface Solicitud {
  id: string;
  tipo: 'entrevista' | 'booking' | 'consulta' | 'informacion' | 'licencia' | 'otro';
  nombre_solicitante: string;
  email?: string;
  telefono?: string;
  observaciones?: string;
  notas_internas?: string;
  estado: 'pendiente' | 'aprobada' | 'denegada';
  archived?: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
  created_by: string;
  artist_id?: string;
  fecha_limite_respuesta?: string;
  comentario_estado?: string | null;
  decision_por?: string | null;
  decision_fecha?: string | null;
  medio?: string;
  nombre_entrevistador?: string;
  nombre_programa?: string;
  hora_entrevista?: string;
  informacion_programa?: string;
  hora_show?: string;
  nombre_festival?: string;
  lugar_concierto?: string;
  ciudad?: string;
  booking_id?: string | null;
  descripcion_libre?: string;
  profiles?: { full_name: string } | null;
  project_id?: string | null;
  project?: { id: string; name: string } | null;
  decision_has_new_comment?: boolean;
}

export default function Solicitudes() {
  const { fireCelebration } = useConfetti();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const artistIdFromUrl = searchParams.get('artistId');
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [filteredSolicitudes, setFilteredSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [profileSearchTerm, setProfileSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterArtist, setFilterArtist] = useState(artistIdFromUrl || 'all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'stats'>('list');
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showResponseTemplates, setShowResponseTemplates] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null);
  const [selectedSolicitudForDetails, setSelectedSolicitudForDetails] = useState<Solicitud | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; solicitudId: string; nombre: string }>({ open: false, solicitudId: '', nombre: '' });
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; solicitudId: string; newStatus: 'aprobada' | 'denegada' | 'pendiente' }>({ open: false, solicitudId: '', newStatus: 'aprobada' });
  const [encuentroDialog, setEncuentroDialog] = useState<{ open: boolean; solicitud: Solicitud | null }>({ open: false, solicitud: null });
  const [profileSuggestions, setProfileSuggestions] = useState<{ id: string; full_name: string; email?: string | null; type: 'artist' | 'contact' }[]>([]);
  const [showProfileSuggestions, setShowProfileSuggestions] = useState(false);
  const [artists, setArtists] = useState<{ id: string; name: string; stage_name?: string | null }[]>([]);
  const [solicitudContacts, setSolicitudContacts] = useState<{ id: string; name: string; email?: string | null }[]>([]);
  const [associateDialog, setAssociateDialog] = useState<{ open: boolean; solicitud: Solicitud | null }>({ open: false, solicitud: null });
  const [createProjectForSolicitud, setCreateProjectForSolicitud] = useState<{ open: boolean; solicitud: Solicitud | null }>({ open: false, solicitud: null });
  const [availabilityDialog, setAvailabilityDialog] = useState({
    open: false, solicitudId: '', bookingId: null as string | null, bookingName: '',
    hasAvailability: true, unavailableMembers: [] as string[], comment: '',
  });

  useSolicitudesKeyboard({
    onNewSolicitud: () => setShowTemplateDialog(true),
    onToggleView: setViewMode,
    onExport: () => setShowExportDialog(true),
  });

  useEffect(() => { fetchSolicitudes(); fetchArtistsAndContacts(); updateExistingSolicitudesNames(); }, []);
  useEffect(() => { if (artistIdFromUrl) setFilterArtist(artistIdFromUrl); }, [artistIdFromUrl]);
  useEffect(() => { filterSolicitudes(); }, [solicitudes, searchTerm, profileSearchTerm, filterStatus, filterType, filterArtist]);

  // Profile suggestions
  useEffect(() => {
    const term = profileSearchTerm.trim().toLowerCase();
    const suggestions: typeof profileSuggestions = [];
    
    artists.filter(a => !term || a.name.toLowerCase().includes(term) || a.stage_name?.toLowerCase().includes(term))
      .forEach(a => suggestions.push({ id: a.id, full_name: a.stage_name || a.name, email: null, type: 'artist' }));

    if (term) {
      solicitudContacts.filter(c => c.name.toLowerCase().includes(term) || c.email?.toLowerCase().includes(term))
        .forEach(c => {
          if (!suggestions.find(s => s.full_name.toLowerCase() === c.name.toLowerCase()))
            suggestions.push({ id: c.id, full_name: c.name, email: c.email, type: 'contact' });
        });
    }
    setProfileSuggestions(suggestions.slice(0, 10));
  }, [profileSearchTerm, artists, solicitudContacts]);

  const fetchArtistsAndContacts = async () => {
    try {
      const { data: artistsData } = await supabase.from('artists').select('id, name, stage_name').order('name');
      setArtists(artistsData || []);
      const { data: solicitudesData } = await supabase.from('solicitudes').select('nombre_solicitante, email');
      const contactsMap = new Map<string, { id: string; name: string; email?: string | null }>();
      solicitudesData?.forEach((s: any) => {
        const key = (s.email || s.nombre_solicitante || '').toLowerCase();
        if (key && !contactsMap.has(key)) contactsMap.set(key, { id: key, name: s.nombre_solicitante || '', email: s.email || null });
      });
      setSolicitudContacts(Array.from(contactsMap.values()));
    } catch (error) { console.error('Error fetching artists/contacts:', error); }
  };

  const fetchSolicitudes = async () => {
    try {
      const { data, error } = await supabase.from('solicitudes').select('*').order('fecha_creacion', { ascending: false });
      if (error) throw error;
      const rows = (data as any) || [];
      setSolicitudes(rows);
      await recalcMissingDueDates(rows);
    } catch (error) {
      console.error('Error fetching solicitudes:', error);
      toast({ title: "Error", description: "No se pudieron cargar las solicitudes.", variant: "destructive" });
    } finally { setLoading(false); }
  };

  // --- Name generation helpers ---
  const extractKeyContent = (text: string): string => {
    if (!text) return '';
    let content = text.replace(/^(Solicitud de |Tema\/proyecto:\s*|Asunto principal:\s*|Detalle\/contexto:\s*|Detalle de la solicitud:\s*|Consulta|Información)/i, '');
    const lines = content.split('\n').filter(line => line.trim().length > 3);
    if (lines.length > 0) content = lines[0];
    content = content.replace(/^[:\s\-–]+/, '').trim();
    return content.split(' ').filter(word => word.length > 2 && !['hauriem', 'hauríem', 'de', 'el', 'la', 'que', 'per', 'amb', 'una', 'un', 'les', 'els', 'del', 'al', 'com', 'quan', 'per', 'sobre', 'si', 'saber', 'decidir', 'treiem'].includes(word.toLowerCase())).slice(0, 3).join(' ');
  };

  const generateSolicitudName = (solicitud: any) => {
    const { tipo } = solicitud;
    switch (tipo) {
      case 'entrevista': return solicitud.nombre_programa ? `Entrevista ${solicitud.nombre_programa}` : solicitud.medio ? `Entrevista ${solicitud.medio}` : 'Entrevista';
      case 'booking': return solicitud.nombre_festival ? `Booking ${solicitud.nombre_festival}` : solicitud.lugar_concierto ? `Booking ${solicitud.lugar_concierto}` : solicitud.ciudad ? `Booking ${solicitud.ciudad}` : 'Booking';
      case 'consulta': { const kc = extractKeyContent(solicitud.descripcion_libre || ''); return kc ? `Consulta: ${kc}` : 'Consulta'; }
      case 'informacion': { const kc = extractKeyContent(solicitud.descripcion_libre || ''); return kc ? `Información: ${kc}` : 'Información'; }
      case 'otro': { const kc = extractKeyContent(solicitud.descripcion_libre || ''); return kc || 'Solicitud'; }
      case 'licencia': return 'Licencia';
      default: return 'Solicitud';
    }
  };

  const updateExistingSolicitudesNames = async () => {
    try {
      const { data: allSolicitudes, error } = await supabase.from('solicitudes').select('*');
      if (error) throw error;
      const updates: any[] = [];
      allSolicitudes?.forEach((s: any) => {
        const cn = s.nombre_solicitante?.toLowerCase() || '';
        const generics = ['sin nombre', 'test', 'test 01', 'nueva solicitud', 'solicitud general'];
        const needsUpdate = generics.includes(cn) || cn === '' || cn.startsWith('test') || cn.match(/^[a-z0-9\s]{1,10}$/i) || s.nombre_solicitante?.length < 15;
        if (needsUpdate) {
          const newName = generateSolicitudName(s);
          if (newName !== s.nombre_solicitante) updates.push({ id: s.id, nombre_solicitante: newName });
        }
      });
      if (updates.length > 0) {
        for (const u of updates) await supabase.from('solicitudes').update({ nombre_solicitante: u.nombre_solicitante }).eq('id', u.id);
        fetchSolicitudes();
      }
    } catch (error) { console.error('Error updating solicitudes names:', error); }
  };

  // --- Priority / Due date helpers ---
  const priorityToDays = (p?: string | null) => {
    const key = (p || '').toLowerCase();
    if (key === 'urgente') return 1; if (key === 'alta') return 3; if (key === 'media') return 7; if (key === 'baja') return 14;
    return null;
  };

  const parsePriorityFromDescripcion = (text?: string | null): string | null => {
    if (!text) return null;
    const match = text.match(/prioridad:\s*(urgente|alta|media|baja)/i);
    return match ? match[1].toLowerCase() : null;
  };

  const recalcMissingDueDates = async (rows: any[]) => {
    const updates: { id: string; fecha: string }[] = [];
    for (const s of rows) {
      const p = parsePriorityFromDescripcion(s.descripcion_libre);
      const dfd = priorityToDays(p);
      let expectedISO: string | null = null;
      if (dfd) expectedISO = new Date(new Date(s.fecha_creacion).getTime() + dfd * 86400000).toISOString();
      else if (!s.fecha_limite_respuesta) expectedISO = new Date(new Date(s.fecha_creacion).getTime() + 7 * 86400000).toISOString();
      if (!expectedISO) continue;
      const currentTs = s.fecha_limite_respuesta ? new Date(s.fecha_limite_respuesta).getTime() : null;
      if (!currentTs || Math.abs(currentTs - new Date(expectedISO).getTime()) > 12 * 3600000) {
        const { error } = await supabase.from('solicitudes').update({ fecha_limite_respuesta: expectedISO }).eq('id', s.id);
        if (!error) updates.push({ id: s.id, fecha: expectedISO });
      }
    }
    if (updates.length) setSolicitudes(prev => prev.map(s => { const u = updates.find(u2 => u2.id === s.id); return u ? { ...s, fecha_limite_respuesta: u.fecha } : s; }));
  };

  // --- Filtering ---
  const filterSolicitudes = () => {
    let filtered = [...solicitudes];
    if (filterStatus !== 'all') {
      if (filterStatus === 'archivadas') filtered = filtered.filter(s => s.archived);
      else filtered = filtered.filter(s => s.estado === filterStatus && !s.archived);
    } else filtered = filtered.filter(s => !s.archived);
    if (filterType !== 'all') filtered = filtered.filter(s => s.tipo === filterType);
    if (filterArtist !== 'all') filtered = filtered.filter(s => s.artist_id === filterArtist);
    if (searchTerm) filtered = filtered.filter(s => s.nombre_solicitante.toLowerCase().includes(searchTerm.toLowerCase()) || s.observaciones?.toLowerCase().includes(searchTerm.toLowerCase()));
    if (profileSearchTerm) {
      const term = profileSearchTerm.toLowerCase();
      filtered = filtered.filter(s => {
        if (s.profiles?.full_name?.toLowerCase().includes(term)) return true;
        if (s.nombre_solicitante?.toLowerCase().includes(term)) return true;
        if (s.artist_id) {
          const a = artists.find(a => a.id === s.artist_id);
          if (a?.name.toLowerCase().includes(term) || a?.stage_name?.toLowerCase().includes(term)) return true;
        }
        return false;
      });
    }
    const statusOrder: Record<string, number> = { pendiente: 0, aprobada: 1, denegada: 2 };
    const priorityRank = (s: Solicitud) => {
      const p = parsePriorityFromDescripcion((s as any).descripcion_libre);
      switch (p) { case 'urgente': return 0; case 'alta': return 1; case 'media': return 2; case 'baja': return 3; default: return 4; }
    };
    filtered.sort((a, b) => {
      const bs = (statusOrder[a.estado] || 0) - (statusOrder[b.estado] || 0);
      if (bs !== 0) return bs;
      const pr = priorityRank(a) - priorityRank(b);
      if (pr !== 0) return pr;
      const dueA = a.fecha_limite_respuesta ? new Date(a.fecha_limite_respuesta).getTime() : Infinity;
      const dueB = b.fecha_limite_respuesta ? new Date(b.fecha_limite_respuesta).getTime() : Infinity;
      if (dueA !== dueB) return dueA - dueB;
      return new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime();
    });
    setFilteredSolicitudes(filtered);
  };

  // --- Actions ---
  const handleStatusChange = async (solicitudId: string, newStatus: 'pendiente' | 'aprobada' | 'denegada', currentStatus?: 'pendiente' | 'aprobada' | 'denegada') => {
    if (newStatus === 'aprobada' || newStatus === 'denegada' || (newStatus === 'pendiente' && currentStatus && currentStatus !== 'pendiente')) {
      setStatusDialog({ open: true, solicitudId, newStatus });
      return;
    }
    try {
      const { error } = await supabase.from('solicitudes').update({ estado: newStatus }).eq('id', solicitudId);
      if (error) throw error;
      toast({ title: "Estado actualizado", description: "El estado se ha actualizado correctamente." });
      fetchSolicitudes();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar el estado.", variant: "destructive" });
    }
  };

  const confirmStatusChange = async (comment: string) => {
    const { solicitudId, newStatus } = statusDialog;
    if (!solicitudId) return;
    
    if (newStatus === 'aprobada') {
      const solicitud = solicitudes.find(s => s.id === solicitudId);
      if (solicitud?.tipo === 'booking') {
        const { data: solicitudData } = await supabase.from('solicitudes').select('booking_id, nombre_festival').eq('id', solicitudId).single();
        if (solicitudData?.booking_id) {
          const { data: availabilityRequest } = await supabase.from('booking_availability_requests').select('id, status').eq('booking_id', solicitudData.booking_id).order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (availabilityRequest) {
            const { data: responses } = await supabase.from('booking_availability_responses').select('status, responder_name').eq('request_id', availabilityRequest.id);
            const unavailableMembers = responses?.filter(r => r.status === 'unavailable').map(r => r.responder_name || 'Miembro') || [];
            const allAvailable = unavailableMembers.length === 0;
            const hasResponses = (responses?.length || 0) > 0;
            if (!hasResponses || !allAvailable) {
              setStatusDialog({ open: false, solicitudId: '', newStatus: 'aprobada' });
              setAvailabilityDialog({ open: true, solicitudId, bookingId: solicitudData.booking_id, bookingName: solicitudData.nombre_festival || solicitud.nombre_festival || 'Booking', hasAvailability: allAvailable && hasResponses, unavailableMembers, comment });
              return;
            }
            try {
              await supabase.from('solicitudes').update({ estado: 'aprobada', comentario_estado: comment || null, decision_por: profile?.user_id || null, decision_fecha: new Date().toISOString() } as any).eq('id', solicitudId);
              await supabase.from('booking_offers').update({ phase: 'negociacion' }).eq('id', solicitudData.booking_id);
              toast({ title: 'Solicitud aprobada', description: 'Booking movido a Negociación.' });
              setStatusDialog({ open: false, solicitudId: '', newStatus: 'aprobada' });
              fetchSolicitudes();
              fireCelebration();
              return;
            } catch { toast({ title: 'Error', description: 'No se pudo aprobar.', variant: 'destructive' }); return; }
          }
        }
      }
    }
    
    try {
      await supabase.from('solicitudes').update({ estado: newStatus, comentario_estado: comment || null, decision_por: profile?.user_id || null, decision_fecha: new Date().toISOString() } as any).eq('id', solicitudId);
      toast({ title: 'Estado actualizado', description: 'El estado y comentario han sido guardados.' });
      setStatusDialog({ open: false, solicitudId: '', newStatus: 'aprobada' });
      fetchSolicitudes();
      if (newStatus === 'aprobada') fireCelebration();
    } catch { toast({ title: 'Error', description: 'No se pudo actualizar el estado.', variant: 'destructive' }); }
  };

  const handleDelete = async () => {
    const id = deleteDialog.solicitudId;
    try {
      const { data: snapshot } = await supabase.from('solicitudes').select('*').eq('id', id).single();
      const { error } = await supabase.from('solicitudes').delete().eq('id', id);
      if (error) throw error;
      setDeleteDialog({ open: false, solicitudId: '', nombre: '' });
      fetchSolicitudes();
      if (snapshot) {
        const { toast: sonnerToast } = await import('sonner');
        sonnerToast.success('Solicitud eliminada', {
          duration: 5000,
          action: { label: 'Deshacer', onClick: async () => {
            const { error: insertError } = await (supabase as any).from('solicitudes').insert(snapshot);
            if (insertError) sonnerToast.error('Error al deshacer');
            else { sonnerToast.success('Acción revertida'); fetchSolicitudes(); }
          }},
        });
      }
    } catch { toast({ title: "Error", description: "No se pudo eliminar la solicitud.", variant: "destructive" }); }
  };

  const handleArchive = async (id: string) => {
    try {
      await supabase.from('solicitudes').update({ archived: true }).eq('id', id);
      toast({ title: "Solicitud archivada" });
      fetchSolicitudes();
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  const handleUnarchive = async (id: string) => {
    try {
      await supabase.from('solicitudes').update({ archived: false }).eq('id', id);
      toast({ title: "Solicitud desarchivada" });
      fetchSolicitudes();
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  const pendientesCount = solicitudes.filter(s => s.estado === 'pendiente' && !s.archived).length;
  const aprobadasCount = solicitudes.filter(s => s.estado === 'aprobada' && !s.archived).length;
  const denegadasCount = solicitudes.filter(s => s.estado === 'denegada' && !s.archived).length;
  const archivadasCount = solicitudes.filter(s => s.archived).length;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <SolicitudesHeader
        pendientesCount={pendientesCount}
        aprobadasCount={aprobadasCount}
        denegadasCount={denegadasCount}
        archivadasCount={archivadasCount}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onExport={() => setShowExportDialog(true)}
        onTemplates={() => setShowResponseTemplates(true)}
        onNewSolicitud={() => setShowTemplateDialog(true)}
      />

      <SolicitudesFiltersBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        profileSearchTerm={profileSearchTerm}
        setProfileSearchTerm={setProfileSearchTerm}
        filterType={filterType}
        setFilterType={setFilterType}
        showProfileSuggestions={showProfileSuggestions}
        setShowProfileSuggestions={setShowProfileSuggestions}
        profileSuggestions={profileSuggestions}
      />

      {viewMode === 'stats' && <SolicitudesStats solicitudes={solicitudes} />}

      {viewMode === 'kanban' && (
        <SolicitudesKanban
          solicitudes={solicitudes}
          onRefresh={fetchSolicitudes}
          onOpenDetails={(solicitud) => { setSelectedSolicitudForDetails(solicitud); setShowDetailsDialog(true); }}
          onStatusChange={(id, status) => { const s = solicitudes.find(s => s.id === id); handleStatusChange(id, status, s?.estado); }}
        />
      )}

      {viewMode === 'list' && (
        <>
          {filteredSolicitudes.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay solicitudes</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || filterStatus !== 'all' || filterType !== 'all'
                    ? 'No se encontraron solicitudes que coincidan con los filtros seleccionados.'
                    : 'Aún no tienes solicitudes. ¡Crea la primera!'}
                </p>
                <Button onClick={() => setShowTemplateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primera Solicitud
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-card border rounded-lg overflow-hidden">
              {filteredSolicitudes.map((solicitud) => (
                <SolicitudListItem
                  key={solicitud.id}
                  solicitud={solicitud}
                  onOpenDetails={(s) => { setSelectedSolicitudForDetails(s as any); setShowDetailsDialog(true); }}
                  onEdit={(s) => { setSelectedSolicitud(s as any); setShowEditDialog(true); }}
                  onDelete={(id, name) => setDeleteDialog({ open: true, solicitudId: id, nombre: name })}
                  onArchive={handleArchive}
                  onUnarchive={handleUnarchive}
                  onStatusChange={handleStatusChange}
                  onScheduleEncounter={(s) => setEncuentroDialog({ open: true, solicitud: s as any })}
                  onAssociateProject={(s) => setAssociateDialog({ open: true, solicitud: s as any })}
                  onCreateProject={(s) => setCreateProjectForSolicitud({ open: true, solicitud: s as any })}
                />
              ))}
            </div>
          )}
        </>
      )}

      <SolicitudesDialogs
        showCreateDialog={showCreateDialog} setShowCreateDialog={setShowCreateDialog}
        showTemplateDialog={showTemplateDialog} setShowTemplateDialog={setShowTemplateDialog}
        showEditDialog={showEditDialog} setShowEditDialog={setShowEditDialog} selectedSolicitud={selectedSolicitud as any}
        showDetailsDialog={showDetailsDialog} setShowDetailsDialog={setShowDetailsDialog} selectedSolicitudForDetails={selectedSolicitudForDetails as any}
        deleteDialog={deleteDialog} setDeleteDialog={setDeleteDialog} onDelete={handleDelete}
        statusDialog={statusDialog} setStatusDialog={setStatusDialog} onConfirmStatusChange={confirmStatusChange}
        encuentroDialog={encuentroDialog as any} setEncuentroDialog={setEncuentroDialog as any}
        associateDialog={associateDialog as any} setAssociateDialog={setAssociateDialog as any}
        createProjectForSolicitud={createProjectForSolicitud as any} setCreateProjectForSolicitud={setCreateProjectForSolicitud as any}
        showExportDialog={showExportDialog} setShowExportDialog={setShowExportDialog} solicitudes={solicitudes as any}
        showResponseTemplates={showResponseTemplates} setShowResponseTemplates={setShowResponseTemplates}
        availabilityDialog={availabilityDialog} setAvailabilityDialog={setAvailabilityDialog}
        selectedIds={selectedIds} setSelectedIds={setSelectedIds}
        onRefresh={fetchSolicitudes} onCelebration={fireCelebration} userId={profile?.user_id}
      />
    </div>
  );
}
