import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import * as tus from 'tus-js-client';
import { ArrowLeft, Music, Play, Pause, Upload, Trash2, ChevronDown, FileAudio, FileText, Copy, Check, User, AlertTriangle } from 'lucide-react';
import { compressAudioToMp3, needsConversion, formatFileSize } from '@/utils/audioConverter';
import { AudioWaveformPlayer } from '@/components/releases/AudioWaveformPlayer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useRelease, useTracks, useTrackVersions, useTrackCredits, TrackVersion, Track } from '@/hooks/useReleases';
import { usePublishingSplits, useMasterSplits, useTrackRightsStats, PUBLISHING_ROLES, MASTER_ROLES } from '@/hooks/useTrackRightsSplits';
import { TrackRightsSplitsManager } from '@/components/releases/TrackRightsSplitsManager';
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

function formatVersionName(fileName: string): string {
  const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
  const spaced = nameWithoutExt.replace(/[_-]/g, ' ');
  return spaced.split(' ')
    .filter(Boolean)
    .map(word => {
      if (/^[A-Z0-9]+$/.test(word) && word.length <= 5) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function TrackAudioCard({ track }: { track: Track }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: versions = [], isLoading } = useTrackVersions(track.id);
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [conversionStatus, setConversionStatus] = useState<'idle' | 'converting' | 'uploading'>('idle');
  const [compressedSize, setCompressedSize] = useState<number | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [manuallyEditedName, setManuallyEditedName] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [playingVersionId, setPlayingVersionId] = useState<string | null>(null);
  const currentVersion = versions.find((v) => v.is_current_version) || versions[0];

  const uploadVersion = useMutation({
    mutationFn: async ({ file, name }: { file: File; name: string }) => {
      let fileToUpload = file;

      // Auto-convert large files to MP3
      if (needsConversion(file)) {
        setConversionStatus('converting');
        setProgressLabel('Convirtiendo a MP3 (320kbps)...');
        setUploadProgress(0);
        fileToUpload = await compressAudioToMp3(file, (pct) => {
          setUploadProgress(pct);
          setProgressLabel(`Convirtiendo a MP3... ${pct}%`);
        });
        setCompressedSize(fileToUpload.size);
      }

      setConversionStatus('uploading');
      setProgressLabel('Subiendo...');
      setUploadProgress(0);

      const fileExt = fileToUpload.name.split('.').pop();
      const fileName = `${track.id}/${Date.now()}.${fileExt}`;

      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      if (!accessToken) throw new Error('No autenticado');

      const supabaseUrl = (supabase as any).supabaseUrl || import.meta.env.VITE_SUPABASE_URL;

      await new Promise<void>((resolve, reject) => {
        const upload = new tus.Upload(fileToUpload, {
          endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: {
            authorization: `Bearer ${accessToken}`,
            'x-upsert': 'false',
          },
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          metadata: {
            bucketName: 'audio-tracks',
            objectName: fileName,
            contentType: fileToUpload.type || 'audio/mpeg',
            cacheControl: '3600',
          },
          chunkSize: 6 * 1024 * 1024,
          onError: (error) => reject(error),
          onProgress: (bytesUploaded, bytesTotal) => {
            const pct = Math.round((bytesUploaded / bytesTotal) * 100);
            setUploadProgress(pct);
            setProgressLabel(`Subiendo... ${pct}%`);
          },
          onSuccess: () => resolve(),
        });
        upload.start();
      });

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
      setManuallyEditedName(false);
      setSelectedFile(null);
      setUploadProgress(0);
      setConversionStatus('idle');
      setProgressLabel('');
      setCompressedSize(null);
    },
    onError: (error: any) => {
      console.error('Upload error:', error);
      const msg = error?.statusCode === 413 || error?.message?.includes('Payload too large')
        ? 'El archivo excede el tamaño máximo permitido (250 MB)'
        : 'Error al subir el archivo';
      toast.error(msg);
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

  const togglePlay = (versionId: string) => {
    if (playingVersionId === versionId) {
      setPlayingVersionId(null);
    } else {
      setPlayingVersionId(versionId);
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
                  togglePlay(currentVersion.id);
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
                        onChange={(e) => {
                          setVersionName(e.target.value);
                          setManuallyEditedName(true);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Archivo de audio</Label>
                      <Input
                        type="file"
                        accept="audio/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setSelectedFile(file);
                          if (file && !manuallyEditedName) {
                            setVersionName(formatVersionName(file.name));
                          }
                        }}
                      />
                      {selectedFile && (
                        <p className="text-xs text-muted-foreground">
                          {selectedFile.name} ({formatFileSize(selectedFile.size)})
                        </p>
                      )}
                      {selectedFile && needsConversion(selectedFile) && conversionStatus === 'idle' && (
                        <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                          <p className="text-xs text-destructive">
                            El archivo supera 50 MB. Se convertirá automáticamente a MP3 (320kbps) antes de subir.
                          </p>
                        </div>
                      )}
                    </div>
                    {isUploading && (
                      <div className="space-y-2">
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-xs text-muted-foreground text-center">{progressLabel || `${uploadProgress}%`}</p>
                        {compressedSize && selectedFile && (
                          <p className="text-xs text-muted-foreground text-center">
                            {formatFileSize(selectedFile.size)} → {formatFileSize(compressedSize)}
                          </p>
                        )}
                      </div>
                    )}
                    <Button
                      onClick={handleUpload}
                      disabled={isUploading || !selectedFile || !versionName.trim()}
                      className="w-full"
                    >
                      {isUploading 
                        ? (conversionStatus === 'converting' ? 'Convirtiendo...' : 'Subiendo...') 
                        : 'Subir'}
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
                  <div key={version.id} className="space-y-0">
                    <div
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        version.is_current_version ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'
                      } ${playingVersionId === version.id ? 'rounded-b-none border-b-0' : ''}`}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => togglePlay(version.id)}
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
                    {playingVersionId === version.id && (
                      <div className={`border border-t-0 rounded-b-lg overflow-hidden ${
                        version.is_current_version ? 'border-primary/30' : ''
                      }`}>
                        <AudioWaveformPlayer
                          src={version.file_url}
                          isPlaying={true}
                          onTogglePlay={() => togglePlay(version.id)}
                          versionName={version.version_name}
                        />
                      </div>
                    )}
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
  const stats = useTrackRightsStats(track.id);

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

  // Check if percentages are not 100% for error display
  const publishingHasError = stats.publishingCount > 0 && !stats.publishingComplete;
  const masterHasError = stats.masterCount > 0 && !stats.masterComplete;

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

        <Tabs defaultValue="splits" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="lyrics" disabled={!track.lyrics}>
              Letra
            </TabsTrigger>
            <TabsTrigger value="credits" disabled={credits.length === 0}>
              Créditos
            </TabsTrigger>
            <TabsTrigger value="splits" className="relative">
              Derechos
              {(publishingHasError || masterHasError) && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
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
                <div className="space-y-4">
                  {/* Publishing Splits */}
                  <TrackRightsSplitsManager track={track} type="publishing" />
                  
                  {/* Master Splits */}
                  <TrackRightsSplitsManager track={track} type="master" />
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
      </DialogContent>
    </Dialog>
  );
}
