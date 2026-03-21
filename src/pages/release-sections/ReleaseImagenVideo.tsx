import { useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, LayoutGrid, List, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useRelease } from '@/hooks/useReleases';
import { toast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';

import { DAM_SECTIONS, SECTION_LABELS, ASSET_STATUSES, STATUS_LABELS, STAGE_LABELS } from '@/components/dam/DAMConstants';
import type { DAMAsset, PhotoSession } from '@/components/dam/DAMTypes';
import DAMSectionComponent from '@/components/dam/DAMSection';
import PhotoSessionPipeline from '@/components/dam/PhotoSessionPipeline';
import AssetDetailPanel from '@/components/dam/AssetDetailPanel';
import AddAssetDialog from '@/components/dam/AddAssetDialog';
import CreateSessionDialog from '@/components/dam/CreateSessionDialog';

export default function ReleaseImagenVideo() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: release, isLoading: loadingRelease } = useRelease(id);

  // Filters
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Panels & dialogs
  const [selectedAsset, setSelectedAsset] = useState<DAMAsset | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addDialogSection, setAddDialogSection] = useState('artwork');
  const [addDialogSessionId, setAddDialogSessionId] = useState<string | undefined>();
  const [addDialogStage, setAddDialogStage] = useState<string | undefined>();
  const [createSessionOpen, setCreateSessionOpen] = useState(false);

  // Fetch assets
  const { data: allAssets = [], isLoading: loadingAssets } = useQuery({
    queryKey: ['dam-assets', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('release_assets')
        .select('*')
        .eq('release_id', id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data || []) as DAMAsset[];
    },
    enabled: !!id,
  });

  // Fetch photo sessions
  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['dam-sessions', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('release_photo_sessions')
        .select('*')
        .eq('release_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as PhotoSession[];
    },
    enabled: !!id,
  });

  // Filter assets
  const filteredAssets = useMemo(() => {
    let filtered = allAssets;
    if (sectionFilter !== 'all') {
      filtered = filtered.filter(a => a.section === sectionFilter);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => a.status === statusFilter);
    }
    return filtered;
  }, [allAssets, sectionFilter, statusFilter]);

  const getAssetsForSection = useCallback((section: string) => {
    return filteredAssets.filter(a => a.section === section && !a.session_id);
  }, [filteredAssets]);

  const getAssetsForSession = useCallback((sessionId: string) => {
    return filteredAssets.filter(a => a.session_id === sessionId);
  }, [filteredAssets]);

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['dam-assets', id] });
    queryClient.invalidateQueries({ queryKey: ['dam-sessions', id] });
    queryClient.invalidateQueries({ queryKey: ['release-assets', id] });
  };

  const handleDeleteAsset = async (asset: DAMAsset) => {
    try {
      // Snapshot for undo
      const snapshot = { ...asset };

      if (asset.file_bucket) {
        await supabase.storage.from('release-assets').remove([asset.file_bucket]);
      }
      const { error } = await supabase.from('release_assets').delete().eq('id', asset.id);
      if (error) throw error;
      if (selectedAsset?.id === asset.id) setSelectedAsset(null);
      refreshData();

      sonnerToast.success('Archivo eliminado', {
        duration: 5000,
        action: {
          label: 'Deshacer',
          onClick: async () => {
            const { error: insertError } = await (supabase as any)
              .from('release_assets')
              .insert(snapshot);
            if (insertError) {
              sonnerToast.error('Error al deshacer');
            } else {
              sonnerToast.success('Acción revertida');
              refreshData();
            }
          },
        },
      });
    } catch (e) {
      toast({ title: 'Error al eliminar', variant: 'destructive' });
    }
  };

  const handleDeleteSession = async (session: PhotoSession) => {
    try {
      const snapshot = { ...session };
      const { error } = await supabase.from('release_photo_sessions').delete().eq('id', session.id);
      if (error) throw error;
      refreshData();

      sonnerToast.success('Sesión eliminada', {
        duration: 5000,
        action: {
          label: 'Deshacer',
          onClick: async () => {
            const { error: insertError } = await (supabase as any)
              .from('release_photo_sessions')
              .insert(snapshot);
            if (insertError) {
              sonnerToast.error('Error al deshacer');
            } else {
              sonnerToast.success('Acción revertida');
              refreshData();
            }
          },
        },
      });
    } catch (e) {
      toast({ title: 'Error al eliminar sesión', variant: 'destructive' });
    }
  };

  const handleAddAsset = (section: string) => {
    if (section === 'fotografia') {
      setCreateSessionOpen(true);
    } else {
      setAddDialogSection(section);
      setAddDialogSessionId(undefined);
      setAddDialogStage(undefined);
      setAddDialogOpen(true);
    }
  };

  const handleUploadToStage = (sessionId: string, stage: string) => {
    setAddDialogSection('fotografia');
    setAddDialogSessionId(sessionId);
    setAddDialogStage('backup'); // Always upload to backup
    setAddDialogOpen(true);
  };

  const handlePromoteAsset = async (asset: DAMAsset, newStage: string) => {
    try {
      const { error } = await supabase
        .from('release_assets')
        .update({ stage: newStage })
        .eq('id', asset.id);
      if (error) throw error;
      toast({ title: `Movido a ${STAGE_LABELS[newStage] || newStage}` });
      refreshData();
    } catch {
      toast({ title: 'Error al cambiar etapa', variant: 'destructive' });
    }
  };

  if (loadingRelease) {
    return <Skeleton className="h-64 w-full" />;
  }

  const sectionsToShow = sectionFilter === 'all' ? [...DAM_SECTIONS] : [sectionFilter as typeof DAM_SECTIONS[number]];

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 space-y-6 overflow-auto p-0">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/releases/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-sm text-muted-foreground">{release?.title}</p>
            <h1 className="text-2xl font-bold">Imagen & Video</h1>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* Section filter */}
            <ToggleGroup type="single" value={sectionFilter} onValueChange={v => setSectionFilter(v || 'all')} className="bg-muted rounded-lg p-0.5">
              <ToggleGroupItem value="all" className="text-xs h-7 px-3 rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm">Todo</ToggleGroupItem>
              {DAM_SECTIONS.map(s => (
                <ToggleGroupItem key={s} value={s} className="text-xs h-7 px-3 rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm">
                  {SECTION_LABELS[s]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>

            {/* Status filter */}
            <ToggleGroup type="single" value={statusFilter} onValueChange={v => setStatusFilter(v || 'all')} className="bg-muted rounded-lg p-0.5">
              <ToggleGroupItem value="all" className="text-xs h-7 px-2.5 rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm">Todos</ToggleGroupItem>
              {ASSET_STATUSES.map(s => (
                <ToggleGroupItem key={s} value={s} className="text-xs h-7 px-2.5 rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm">
                  {STATUS_LABELS[s]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <ToggleGroup type="single" value={viewMode} onValueChange={v => v && setViewMode(v as 'grid' | 'list')} className="bg-muted rounded-lg p-0.5">
              <ToggleGroupItem value="grid" className="h-7 w-7 p-0 rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm">
                <LayoutGrid className="h-3.5 w-3.5" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" className="h-7 w-7 p-0 rounded-md data-[state=on]:bg-background data-[state=on]:shadow-sm">
                <List className="h-3.5 w-3.5" />
              </ToggleGroupItem>
            </ToggleGroup>

            <Button size="sm" onClick={() => { setAddDialogSection('artwork'); setAddDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Subir
            </Button>
          </div>
        </div>

        {/* Loading */}
        {(loadingAssets || loadingSessions) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando assets...
          </div>
        )}

        {/* Sections */}
        <div className="space-y-4">
          {sectionsToShow.map(section => {
            const sectionAssets = getAssetsForSection(section);

            if (section === 'fotografia') {
              const photoSessions = sessions;
              return (
                <DAMSectionComponent
                  key={section}
                  sectionKey={section}
                  assets={sectionAssets}
                  viewMode={viewMode}
                  onSelectAsset={setSelectedAsset}
                  onDeleteAsset={handleDeleteAsset}
                  onAddAsset={handleAddAsset}
                >
                  {photoSessions.length > 0 && (
                    <div className="space-y-3 mb-4">
                      {photoSessions.map(session => (
                        <PhotoSessionPipeline
                          key={session.id}
                          session={session}
                          assets={getAssetsForSession(session.id)}
                          viewMode={viewMode}
                          onSelectAsset={setSelectedAsset}
                          onDeleteAsset={handleDeleteAsset}
                          onUploadToStage={handleUploadToStage}
                          onDeleteSession={handleDeleteSession}
                          onPromoteAsset={handlePromoteAsset}
                        />
                      ))}
                    </div>
                  )}
                </DAMSectionComponent>
              );
            }

            return (
              <DAMSectionComponent
                key={section}
                sectionKey={section}
                assets={sectionAssets}
                viewMode={viewMode}
                onSelectAsset={setSelectedAsset}
                onDeleteAsset={handleDeleteAsset}
                onAddAsset={handleAddAsset}
                defaultOpen={section !== 'formatos_fisicos'}
              />
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      {selectedAsset && (
        <AssetDetailPanel
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onUpdate={() => {
            refreshData();
            // Refresh the selected asset
            supabase.from('release_assets').select('*').eq('id', selectedAsset.id).single()
              .then(({ data }) => { if (data) setSelectedAsset(data as DAMAsset); });
          }}
        />
      )}

      {/* Add asset dialog */}
      <AddAssetDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        releaseId={id || ''}
        defaultSection={addDialogSection}
        sessionId={addDialogSessionId}
        stage={addDialogStage}
        onSuccess={refreshData}
      />

      {/* Create session dialog */}
      <CreateSessionDialog
        open={createSessionOpen}
        onOpenChange={setCreateSessionOpen}
        releaseId={id || ''}
        onSuccess={refreshData}
      />
    </div>
  );
}
