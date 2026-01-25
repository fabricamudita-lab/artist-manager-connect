import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Music, Play, Pause, Upload, Trash2, ChevronDown, FileAudio, FileText, Copy, Check, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRelease, useTracks, useTrackVersions, useTrackCredits, TrackVersion, Track } from '@/hooks/useReleases';
import { usePublishingSplits, useMasterSplits, PUBLISHING_ROLES, MASTER_ROLES } from '@/hooks/useTrackRightsSplits';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export default function ReleaseAudio() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: release, isLoading: loadingRelease } = useRelease(id);
  const { data: tracks, isLoading: loadingTracks } = useTracks(id);

  if (loadingRelease) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/releases/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <p className="text-sm text-muted-foreground">{release?.title}</p>
          <h1 className="text-2xl font-bold">Audio</h1>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tracklist</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTracks ? (
            <Skeleton className="h-32 w-full" />
          ) : tracks && tracks.length > 0 ? (
            <div className="space-y-3">
              {tracks.map((track) => (
                <TrackAudioCard key={track.id} track={track} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Music className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sin canciones</h3>
              <p className="text-muted-foreground mb-4">
                Añade las canciones desde la sección de Créditos y Autoría
              </p>
              <Button onClick={() => navigate(`/releases/${id}/creditos`)}>
                Ir a Créditos y Autoría
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TrackAudioCard({ track }: { track: Track }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: versions = [], isLoading } = useTrackVersions(track.id);
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [playingVersionId, setPlayingVersionId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentVersion = versions.find((v) => v.is_current_version) || versions[0];

  const uploadVersion = useMutation({
    mutationFn: async ({ file, name }: { file: File; name: string }) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${track.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-tracks')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('audio-tracks')
        .getPublicUrl(fileName);

      // If this is the first version, make it current
      const isFirstVersion = versions.length === 0;

      const { error: insertError } = await supabase
        .from('track_versions')
        .insert({
          track_id: track.id,
          version_name: name,
          file_url: publicUrl,
          file_bucket: 'audio-tracks',
          is_current_version: isFirstVersion,
          uploaded_by: user?.id,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-versions', track.id] });
      toast.success('Versión subida correctamente');
      setIsUploadDialogOpen(false);
      setVersionName('');
      setSelectedFile(null);
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast.error('Error al subir el archivo');
    },
  });

  const deleteVersion = useMutation({
    mutationFn: async (version: TrackVersion) => {
      // Extract file path from URL
      const urlParts = version.file_url.split('/audio-tracks/');
      if (urlParts[1]) {
        await supabase.storage.from('audio-tracks').remove([urlParts[1]]);
      }

      const { error } = await supabase
        .from('track_versions')
        .delete()
        .eq('id', version.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-versions', track.id] });
      toast.success('Versión eliminada');
    },
  });

  const setCurrentVersion = useMutation({
    mutationFn: async (versionId: string) => {
      // First, unset all current versions for this track
      await supabase
        .from('track_versions')
        .update({ is_current_version: false })
        .eq('track_id', track.id);

      // Then set the new current version
      const { error } = await supabase
        .from('track_versions')
        .update({ is_current_version: true })
        .eq('id', versionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['track-versions', track.id] });
      toast.success('Versión actual actualizada');
    },
  });

  const handleUpload = () => {
    if (!selectedFile || !versionName.trim()) {
      toast.error('Selecciona un archivo y proporciona un nombre');
      return;
    }
    setIsUploading(true);
    uploadVersion.mutate(
      { file: selectedFile, name: versionName.trim() },
      { onSettled: () => setIsUploading(false) }
    );
  };

  const togglePlay = (version: TrackVersion) => {
    if (playingVersionId === version.id) {
      audioRef.current?.pause();
      setPlayingVersionId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = version.file_url;
        audioRef.current.play();
      }
      setPlayingVersionId(version.id);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <audio
        ref={audioRef}
        onEnded={() => setPlayingVersionId(null)}
        className="hidden"
      />
      <div className="border rounded-lg">
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-4 p-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <span className="text-muted-foreground w-6 text-right">
              {track.track_number}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                if (currentVersion) {
                  togglePlay(currentVersion);
                }
              }}
              disabled={!currentVersion}
            >
              {playingVersionId === currentVersion?.id ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{track.title}</p>
              {track.isrc && (
                <p className="text-xs text-muted-foreground">ISRC: {track.isrc}</p>
              )}
            </div>
            <TrackCreditsDialog track={track} />
            <span className="text-sm text-muted-foreground">
              {formatDuration(track.duration)}
            </span>
            <Badge variant="outline" className="text-xs">
              {versions.length} {versions.length === 1 ? 'versión' : 'versiones'}
            </Badge>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-4 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Versiones de Audio</Label>
              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Upload className="h-4 w-4 mr-1" />
                    Subir Versión
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Subir nueva versión de "{track.title}"</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nombre de la versión</Label>
                      <Input
                        placeholder="ej: Master Final, Mix v2, Demo..."
                        value={versionName}
                        onChange={(e) => setVersionName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Archivo de audio</Label>
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />
                      {selectedFile && (
                        <p className="text-xs text-muted-foreground">
                          {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={handleUpload}
                      disabled={isUploading || !selectedFile || !versionName.trim()}
                      className="w-full"
                    >
                      {isUploading ? 'Subiendo...' : 'Subir'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : versions.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <FileAudio className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay versiones de audio</p>
              </div>
            ) : (
              <div className="space-y-2">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      version.is_current_version ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'
                    }`}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => togglePlay(version)}
                    >
                      {playingVersionId === version.id ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{version.version_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(version.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {version.is_current_version ? (
                      <Badge className="bg-primary">Actual</Badge>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentVersion.mutate(version.id)}
                      >
                        Usar como actual
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => deleteVersion.mutate(version)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Track Credits Dialog Component
function TrackCreditsDialog({ track }: { track: Track }) {
  const [copiedLyrics, setCopiedLyrics] = useState(false);
  const [copiedCredits, setCopiedCredits] = useState(false);
  const { data: credits = [] } = useTrackCredits(track.id);
  const { data: publishingSplits = [] } = usePublishingSplits(track.id);
  const { data: masterSplits = [] } = useMasterSplits(track.id);

  const handleCopyLyrics = () => {
    if (track.lyrics) {
      navigator.clipboard.writeText(track.lyrics);
      setCopiedLyrics(true);
      toast.success('Letra copiada');
      setTimeout(() => setCopiedLyrics(false), 2000);
    }
  };

  const handleCopyCredits = () => {
    if (credits.length === 0) return;
    
    // Group credits by role
    const groupedByRole: Record<string, string[]> = {};
    credits.forEach((credit) => {
      const role = credit.role || 'Otro';
      if (!groupedByRole[role]) {
        groupedByRole[role] = [];
      }
      groupedByRole[role].push(credit.name);
    });
    
    // Format: "Rol: Name1 & Name2"
    const formattedCredits = Object.entries(groupedByRole)
      .map(([role, names]) => `${role}: ${names.join(' & ')}`)
      .join('\n');
    
    navigator.clipboard.writeText(formattedCredits);
    setCopiedCredits(true);
    toast.success('Créditos copiados');
    setTimeout(() => setCopiedCredits(false), 2000);
  };

  const getRoleLabel = (role: string, type: 'publishing' | 'master') => {
    const roles = type === 'publishing' ? PUBLISHING_ROLES : MASTER_ROLES;
    return roles.find(r => r.value === role)?.label || role;
  };

  const hasContent = track.lyrics || credits.length > 0 || publishingSplits.length > 0 || masterSplits.length > 0;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <FileText className="h-3.5 w-3.5" />
          Ver créditos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            {track.title}
          </DialogTitle>
        </DialogHeader>

        {!hasContent ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay créditos ni letra disponibles</p>
          </div>
        ) : (
          <Tabs defaultValue={track.lyrics ? "lyrics" : "credits"} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="lyrics" disabled={!track.lyrics}>
                Letra
              </TabsTrigger>
              <TabsTrigger value="credits" disabled={credits.length === 0}>
                Créditos
              </TabsTrigger>
              <TabsTrigger value="splits" disabled={publishingSplits.length === 0 && masterSplits.length === 0}>
                Derechos
              </TabsTrigger>
            </TabsList>

            {/* Lyrics Tab */}
            <TabsContent value="lyrics" className="mt-4">
              {track.lyrics ? (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLyrics}
                      className="gap-2"
                    >
                      {copiedLyrics ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copiada
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copiar letra
                        </>
                      )}
                    </Button>
                  </div>
                  <ScrollArea className="h-[400px] rounded-lg border p-4">
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {track.lyrics}
                    </pre>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay letra disponible</p>
                </div>
              )}
            </TabsContent>

            {/* Credits Tab */}
            <TabsContent value="credits" className="mt-4">
              {credits.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyCredits}
                      className="gap-2"
                    >
                      {copiedCredits ? (
                        <>
                          <Check className="h-4 w-4" />
                          Copiados
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copiar créditos
                        </>
                      )}
                    </Button>
                  </div>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {credits.map((credit) => (
                        <div
                          key={credit.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{credit.name}</p>
                            <p className="text-sm text-muted-foreground">{credit.role}</p>
                          </div>
                          {credit.percentage && (
                            <Badge variant="secondary">{credit.percentage}%</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay créditos disponibles</p>
                </div>
              )}
            </TabsContent>

            {/* Splits Tab */}
            <TabsContent value="splits" className="mt-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-6">
                  {/* Publishing Splits */}
                  {publishingSplits.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-amber-500/10">
                          <FileText className="h-4 w-4 text-amber-600" />
                        </div>
                        <h4 className="font-medium">Derechos de Autor</h4>
                      </div>
                      <div className="space-y-2">
                        {publishingSplits.map((split) => (
                          <div
                            key={split.id}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-amber-500/5"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{split.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-xs">
                                  {getRoleLabel(split.role, 'publishing')}
                                </Badge>
                                {split.pro_name && <span>{split.pro_name}</span>}
                              </div>
                            </div>
                            <Badge className="bg-amber-500">{split.percentage}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Master Splits */}
                  {masterSplits.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded bg-blue-500/10">
                          <Music className="h-4 w-4 text-blue-600" />
                        </div>
                        <h4 className="font-medium">Royalties Master</h4>
                      </div>
                      <div className="space-y-2">
                        {masterSplits.map((split) => (
                          <div
                            key={split.id}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-blue-500/5"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-sm">{split.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-xs">
                                  {getRoleLabel(split.role, 'master')}
                                </Badge>
                                {split.label_name && <span>{split.label_name}</span>}
                              </div>
                            </div>
                            <Badge className="bg-blue-500">{split.percentage}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {publishingSplits.length === 0 && masterSplits.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No hay derechos configurados</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
