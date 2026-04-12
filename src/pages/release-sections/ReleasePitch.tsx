import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { INTERPRETE_ROLES, getRoleLabel } from '@/lib/creditRoles';
import { ArrowLeft, Send, Copy, Check, Link as LinkIcon, Loader2, Plus, Trash2, CopyPlus, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { useRelease, useTracks } from '@/hooks/useReleases';
import { usePitchesByRelease, useCreatePitch, useUpdatePitch, useDeletePitch, useDuplicatePitch, Pitch } from '@/hooks/usePitches';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useDebounce } from '@/hooks/useDebounce';

const PITCH_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  sent: 'Enviado',
  in_progress: 'En Progreso',
  completed: 'Completado',
  reviewed: 'Revisado',
};

const PITCH_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/20 text-blue-600',
  in_progress: 'bg-yellow-500/20 text-yellow-600',
  completed: 'bg-green-500/20 text-green-600',
  reviewed: 'bg-purple-500/20 text-purple-600',
};

const MOOD_OPTIONS = ['Chill', 'Energetic', 'Happy', 'Fierce', 'Meditative', 'Romantic', 'Sad', 'Sexy', 'None of these'];

const PITCH_FIELDS = [
  { key: 'country', label: 'País', section: 'info' },
  { key: 'audio_link', label: 'Link Audio MP3', section: 'content' },
  { key: 'mood', label: 'Mood / Estilo', section: 'content' },
  { key: 'general_strategy', label: 'Estrategia general', section: 'strategy' },
  { key: 'instruments', label: 'Instrumentos', section: 'content' },
  { key: 'artist_photos_link', label: 'Fotos del artista', section: 'content' },
  { key: 'video_link', label: 'Video', section: 'content' },
  { key: 'synopsis', label: 'Sinopsis', section: 'content' },
  { key: 'spotify_strategy', label: 'Estrategia Spotify', section: 'spotify' },
  { key: 'spotify_milestones', label: 'Hitos Spotify', section: 'spotify' },
  { key: 'spotify_photos_link', label: 'Fotos Spotify', section: 'spotify' },
  { key: 'spotify_monthly_listeners', label: 'Oyentes mensuales', section: 'spotify' },
  { key: 'spotify_followers', label: 'Seguidores Spotify', section: 'spotify' },
  { key: 'social_links', label: 'Redes sociales', section: 'strategy' },
  { key: 'additional_info', label: 'Otros datos', section: 'strategy' },
  { key: 'future_planning', label: 'Proyección futura', section: 'strategy' },
  { key: 'artist_bio', label: 'Biografía artista', section: 'strategy' },
  { key: 'vevo_content_type', label: 'Vevo - Tipo contenido', section: 'vevo' },
  { key: 'vevo_premiere_date', label: 'Vevo - Fecha premier', section: 'vevo' },
  { key: 'vevo_is_new_edit', label: 'Vevo - Nueva edición', section: 'vevo' },
  { key: 'vevo_brand_notes', label: 'Vevo - Notas marca', section: 'vevo' },
  { key: 'vevo_link', label: 'Vevo - Link previo', section: 'vevo' },
  { key: 'description', label: 'Descripción', section: 'info' },
  { key: 'genre', label: 'Género principal', section: 'info' },
  { key: 'secondary_genre', label: 'Género secundario', section: 'info' },
  { key: 'language', label: 'Idioma', section: 'info' },
  { key: 'label', label: 'Sello', section: 'info' },
  { key: 'upc', label: 'UPC', section: 'info' },
  { key: 'copyright', label: 'Copyright ©', section: 'info' },
];

const PITCH_LOCAL_KEYS = [
  'synopsis', 'mood', 'country', 'spotify_strategy',
  'spotify_monthly_listeners', 'spotify_followers', 'spotify_milestones',
  'general_strategy', 'social_links',
  'audio_link', 'instruments', 'artist_photos_link', 'video_link',
  'spotify_photos_link', 'additional_info', 'artist_bio',
  'future_planning', 'vevo_content_type', 'vevo_premiere_date',
  'vevo_is_new_edit', 'vevo_brand_notes', 'vevo_link',
];

const normalize = (v: any) => (v === null || v === undefined || v === '' ? '' : String(v));

type PitchConfig = Record<string, { visible: boolean; editable: boolean }>;

const PITCH_TYPE_LABELS: Record<string, string> = {
  single: 'Single',
  ep: 'EP',
  album: 'Album',
};

export default function ReleasePitch() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: release, isLoading: releaseLoading } = useRelease(id);
  const { data: pitches = [], isLoading: pitchesLoading } = usePitchesByRelease(id);
  const { data: tracks = [] } = useTracks(id);
  const createPitch = useCreatePitch();
  const updatePitch = useUpdatePitch({ silent: true });
  const deletePitch = useDeletePitch();
  const duplicatePitch = useDuplicatePitch();

  const [selectedPitchId, setSelectedPitchId] = useState<string | null>(null);

  const isLoading = releaseLoading || pitchesLoading;

  useEffect(() => {
    if (pitches.length > 0 && !selectedPitchId) {
      // Don't auto-navigate into editor
    }
    if (selectedPitchId && !pitches.find(p => p.id === selectedPitchId)) {
      setSelectedPitchId(null);
    }
  }, [pitches, selectedPitchId]);

  const handleCreatePitch = async () => {
    if (!id) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (tracks.length === 1) {
      createPitch.mutate({ release_id: id, created_by: user.id, pitch_type: 'single', track_id: tracks[0].id, name: tracks[0].title });
    } else {
      createPitch.mutate({ release_id: id, created_by: user.id, name: release?.title || 'Nuevo Pitch' });
    }
  };

  const getTrackName = (trackId: string | null) => {
    if (!trackId) return null;
    return tracks.find(t => t.id === trackId)?.title || null;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!release) {
    return <div className="p-6">Release no encontrado</div>;
  }

  const selectedPitch = pitches.find(p => p.id === selectedPitchId);

  if (selectedPitch) {
    return (
      <PitchEditor
        pitch={selectedPitch}
        release={release}
        releaseId={id!}
        tracks={tracks}
        onBack={() => setSelectedPitchId(null)}
        onDelete={() => {
          deletePitch.mutate({ id: selectedPitch.id, release_id: id! });
          setSelectedPitchId(null);
        }}
        onDuplicate={() => duplicatePitch.mutate(selectedPitch)}
      />
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/releases/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Pitch de Distribución</h1>
          <p className="text-sm text-muted-foreground">{release.title}</p>
        </div>
        <Button onClick={handleCreatePitch} disabled={createPitch.isPending}>
          {createPitch.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Nuevo Pitch
        </Button>
      </div>

      {pitches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <Send className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">Sin pitches</h3>
              <p className="text-sm text-muted-foreground">
                Crea tu primer pitch para preparar la información de distribución.
              </p>
            </div>
            <Button onClick={handleCreatePitch} disabled={createPitch.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              Crear primer pitch
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pitches.map(pitch => (
            <Card
              key={pitch.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setSelectedPitchId(pitch.id)}
            >
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{pitch.name}</h3>
                    <Badge className={PITCH_STATUS_COLORS[pitch.pitch_status] || ''}>
                      {PITCH_STATUS_LABELS[pitch.pitch_status] || pitch.pitch_status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {PITCH_TYPE_LABELS[pitch.pitch_type] || 'Album'}
                    {pitch.track_id && getTrackName(pitch.track_id) ? `: ${getTrackName(pitch.track_id)}` : ''}
                    {' · '}Creado {new Date(pitch.created_at).toLocaleDateString('es-ES')}
                    {pitch.pitch_deadline && ` · Límite: ${new Date(pitch.pitch_deadline).toLocaleDateString('es-ES')}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={e => { e.stopPropagation(); duplicatePitch.mutate(pitch); }}
                  >
                    <CopyPlus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={e => { e.stopPropagation(); deletePitch.mutate({ id: pitch.id, release_id: id! }); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Pitch Editor ────────────────────────────────────────────

interface PitchEditorProps {
  pitch: Pitch;
  release: any;
  releaseId: string;
  tracks: Array<{ id: string; title: string; track_number: number | null; isrc: string | null }>;
  onBack: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function PitchEditor({ pitch, release, releaseId, tracks, onBack, onDelete, onDuplicate }: PitchEditorProps) {
  const updatePitch = useUpdatePitch({ silent: true });
  const [copied, setCopied] = useState(false);
  const hasInitialized = useRef(false);

  const [localData, setLocalData] = useState<Record<string, any>>({});
  const [pitchConfig, setPitchConfig] = useState<PitchConfig>({});
  const [pitchDeadline, setPitchDeadline] = useState('');
  const [pitchName, setPitchName] = useState('');
  const [pitchType, setPitchType] = useState(pitch.pitch_type || 'album');
  const [trackId, setTrackId] = useState<string | null>(pitch.track_id || null);

  useEffect(() => {
    hasInitialized.current = false;
  }, [pitch.id]);

  useEffect(() => {
    if (pitch) {
      hasInitialized.current = true;
      const initial: Record<string, any> = {};
      PITCH_LOCAL_KEYS.forEach(k => {
        initial[k] = (pitch as any)[k] ?? '';
      });
      setLocalData(initial);
      setPitchConfig((pitch.pitch_config as PitchConfig) || {});
      setPitchDeadline(pitch.pitch_deadline || '');
      setPitchName(pitch.name);
      setPitchType(pitch.pitch_type || 'album');
      setTrackId(pitch.track_id || null);
    }
  }, [pitch.id]);

  // Auto-suggest country from artist and instruments from credits
  useEffect(() => {
    if (!pitch.id || !releaseId) return;

    const suggestFields = async () => {
      // 1. Country from artist address
      if (!localData.country) {
        const { data: releaseArtists } = await supabase
          .from('release_artists')
          .select('artist_id, artists(address)')
          .eq('release_id', releaseId)
          .limit(1);
        const artistAddress = (releaseArtists?.[0] as any)?.artists?.address;
        if (artistAddress) {
          setLocalData(prev => prev.country ? prev : { ...prev, country: artistAddress });
        }
      }

      // 2. Instruments from track credits
      if (!localData.instruments) {
        const trackIds = tracks.map(t => t.id);
        if (trackIds.length === 0) return;
        const { data: credits } = await supabase
          .from('track_credits')
          .select('role, notes')
          .in('track_id', trackIds);
        if (credits && credits.length > 0) {
          const interpreteValues = new Set(INTERPRETE_ROLES.map(r => r.value));
          const instrumentSet = new Set<string>();
          credits.forEach(c => {
            if (interpreteValues.has(c.role)) {
              instrumentSet.add(getRoleLabel(c.role));
            }
            if (c.role === 'otro_instrumento' && c.notes) {
              instrumentSet.add(c.notes);
            }
          });
          if (instrumentSet.size > 0) {
            const instrumentStr = Array.from(instrumentSet).join(', ');
            setLocalData(prev => prev.instruments ? prev : { ...prev, instruments: instrumentStr });
          }
        }
      }
    };

    suggestFields();
  }, [pitch.id, releaseId, tracks.length]);

  const debouncedData = useDebounce(localData, 1500);

  useEffect(() => {
    if (!pitch || !hasInitialized.current) return;
    const numericFields = ['spotify_monthly_listeners', 'spotify_followers'];
    const updates: Record<string, any> = {};

    for (const k of PITCH_LOCAL_KEYS) {
      const dbVal = normalize((pitch as any)[k]);
      const localVal = normalize(debouncedData[k]);
      if (localVal !== dbVal) {
        if (numericFields.includes(k)) {
          updates[k] = debouncedData[k] === '' ? null : Number(debouncedData[k]);
        } else {
          updates[k] = debouncedData[k] || null;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      updatePitch.mutate({ id: pitch.id, release_id: releaseId, ...updates });
    }
  }, [debouncedData]);

  const handleFieldChange = (key: string, value: any) => {
    setLocalData(prev => ({ ...prev, [key]: value }));
  };

  const handleMoodToggle = (mood: string) => {
    const current = (localData.mood || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    const updated = current.includes(mood)
      ? current.filter((m: string) => m !== mood)
      : [...current, mood];
    handleFieldChange('mood', updated.join(', '));
  };

  const getMoodList = (): string[] => {
    return (localData.mood || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  };

  const handleConfigToggle = (fieldKey: string, prop: 'visible' | 'editable') => {
    setPitchConfig(prev => {
      const current = prev[fieldKey] || { visible: true, editable: false };
      const updated = { ...prev, [fieldKey]: { ...current, [prop]: !current[prop] } };
      updatePitch.mutate({ id: pitch.id, release_id: releaseId, pitch_config: updated });
      return updated;
    });
  };

  const copyLink = () => {
    if (!pitch.pitch_token) return;
    const url = `${window.location.origin}/release-form/${pitch.pitch_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Enlace copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  const updatePitchStatus = (status: string) => {
    updatePitch.mutate({ id: pitch.id, release_id: releaseId, pitch_status: status });
  };

  const savePitchDeadline = () => {
    updatePitch.mutate({ id: pitch.id, release_id: releaseId, pitch_deadline: pitchDeadline || null });
  };

  const savePitchName = () => {
    if (pitchName.trim() && pitchName !== pitch.name) {
      updatePitch.mutate({ id: pitch.id, release_id: releaseId, name: pitchName.trim() });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <Input
            value={pitchName}
            onChange={e => setPitchName(e.target.value)}
            onBlur={savePitchName}
            className="text-xl font-bold border-none p-0 h-auto focus-visible:ring-0 bg-transparent"
          />
          <p className="text-sm text-muted-foreground">{release.title}</p>
        </div>
        <Badge className={PITCH_STATUS_COLORS[pitch.pitch_status]}>
          {PITCH_STATUS_LABELS[pitch.pitch_status] || pitch.pitch_status}
        </Badge>
        <Button variant="ghost" size="icon" onClick={onDuplicate} title="Duplicar pitch">
          <CopyPlus className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-destructive" onClick={onDelete} title="Eliminar pitch">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Link & Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LinkIcon className="h-4 w-4" />
            Enlace público
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pitch.pitch_token ? (
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/release-form/${pitch.pitch_token}`}
                className="font-mono text-xs"
              />
              <Button variant="outline" size="icon" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              El enlace se generó automáticamente al crear el pitch. Si no aparece, contacta soporte.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <Label className="text-sm text-muted-foreground self-center mr-2">Estado:</Label>
            {Object.entries(PITCH_STATUS_LABELS).map(([key, label]) => (
              <Button
                key={key}
                variant={pitch.pitch_status === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => updatePitchStatus(key)}
              >
                {label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Label className="text-sm whitespace-nowrap">Fecha límite:</Label>
            <Input
              type="date"
              value={pitchDeadline}
              onChange={e => setPitchDeadline(e.target.value)}
              onBlur={savePitchDeadline}
              className="w-auto"
            />
          </div>
        </CardContent>
      </Card>




      {/* Field visibility config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuración de campos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Decide qué campos ve y puede editar el artista en el formulario público
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_80px_80px] gap-2 text-xs font-medium text-muted-foreground px-1">
              <span>Campo</span>
              <span className="text-center">Visible</span>
              <span className="text-center">Editable</span>
            </div>
            <Separator />
            {PITCH_FIELDS.map(field => {
              const config = pitchConfig[field.key] || { visible: true, editable: false };
              return (
                <div key={field.key} className="grid grid-cols-[1fr_80px_80px] gap-2 items-center py-1">
                  <span className="text-sm">{field.label}</span>
                  <div className="flex justify-center">
                    <Switch
                      checked={config.visible}
                      onCheckedChange={() => handleConfigToggle(field.key, 'visible')}
                    />
                  </div>
                  <div className="flex justify-center">
                    <Switch
                      checked={config.editable}
                      onCheckedChange={() => handleConfigToggle(field.key, 'editable')}
                      disabled={!config.visible}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pitch form fields — Ditto order */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del Pitch</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pre-rellena la información. Se guarda automáticamente.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* 1. País */}
          <div>
            <Label>País en que reside *</Label>
            <Input
              value={localData.country || ''}
              onChange={e => handleFieldChange('country', e.target.value)}
              placeholder="Ej: Colombia"
              maxLength={40}
            />
          </div>

          {/* 2. Artista (read-only from release) */}
          <div>
            <Label className="text-xs text-muted-foreground">Nombre del artista(s) — Si tiene featuring, indicarlo</Label>
            <p className="text-sm font-medium">{release.title ? release.title : '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">Se toma del release. Edítalo en la ficha del release si necesitas cambiarlo.</p>
          </div>

          {/* 3. Título de lanzamiento (read-only) */}
          <div>
            <Label className="text-xs text-muted-foreground">Título de lanzamiento *</Label>
            <p className="text-sm font-medium">{release.title}</p>
          </div>

          {/* 4. Audio MP3 */}
          <div>
            <Label>Audio MP3 — Link de descarga en Drive *</Label>
            <Input
              value={localData.audio_link || ''}
              onChange={e => handleFieldChange('audio_link', e.target.value)}
              placeholder="https://drive.google.com/..."
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground mt-1">Agrega un link de descarga de la canción en Drive.</p>
          </div>

          {/* 5. UPC / ISRC (dinámico según tipo) */}
          <div>
            {pitchType === 'single' ? (
              <>
                <Label className="text-xs text-muted-foreground">ISRC</Label>
                <p className="text-sm font-medium">
                  {trackId
                    ? (tracks.find(t => t.id === trackId)?.isrc || '—')
                    : 'Selecciona una canción para ver el ISRC'}
                </p>
              </>
            ) : (
              <>
                <Label className="text-xs text-muted-foreground">UPC</Label>
                <p className="text-sm font-medium">{release.upc || '—'}</p>
              </>
            )}
            <p className="text-xs text-muted-foreground mt-1">Si la plataforma ya lo asignó, completarlo en la ficha del release. Si no se tiene, dejar en blanco.</p>
          </div>

          {/* 6. Focus Track (for EP/Album) */}
          {(pitchType === 'ep' || pitchType === 'album') && tracks.length > 1 && (
            <div>
              <Label>Focus Track — Track destacado del lanzamiento</Label>
              <Select
                value={trackId || ''}
                onValueChange={(v) => {
                  setTrackId(v);
                  updatePitch.mutate({ id: pitch.id, release_id: releaseId, track_id: v });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el track destacado..." />
                </SelectTrigger>
                <SelectContent>
                  {tracks.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.track_number ? `${t.track_number}. ` : ''}{t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">Si es un EP o álbum, indicar el nombre del track destacado del lanzamiento.</p>
            </div>
          )}

          {/* 7. Tipo de lanzamiento (inline) */}
          <div>
            <Label>Tipo de lanzamiento</Label>
            {tracks.length <= 1 ? (
              <p className="text-sm font-medium mt-1">Single{tracks.length === 1 ? `: ${tracks[0].title}` : ''}</p>
            ) : (
              <Select
                value={pitchType}
                onValueChange={(v) => {
                  setPitchType(v);
                  if (v === 'album' || v === 'ep') {
                    setTrackId(null);
                    const newName = release?.title || pitchName;
                    setPitchName(newName);
                    updatePitch.mutate({ id: pitch.id, release_id: releaseId, pitch_type: v, track_id: null, name: newName });
                  } else {
                    const selectedTrack = trackId ? tracks.find(t => t.id === trackId) : null;
                    const newName = selectedTrack ? selectedTrack.title : pitchName;
                    setPitchName(newName);
                    updatePitch.mutate({ id: pitch.id, release_id: releaseId, pitch_type: v, track_id: trackId, name: newName });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="ep">EP</SelectItem>
                  <SelectItem value="album">Album</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Track selector for Single */}
          {pitchType === 'single' && tracks.length > 1 && (
            <div>
              <Label>Canción</Label>
              <Select
                value={trackId || ''}
                onValueChange={(v) => {
                  setTrackId(v);
                  const selectedTrack = tracks.find(t => t.id === v);
                  const newName = selectedTrack ? selectedTrack.title : pitchName;
                  setPitchName(newName);
                  updatePitch.mutate({ id: pitch.id, release_id: releaseId, track_id: v, name: newName });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una canción..." />
                </SelectTrigger>
                <SelectContent>
                  {tracks.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.track_number ? `${t.track_number}. ` : ''}{t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 8. Fecha de lanzamiento (read-only) */}
          <div>
            <Label className="text-xs text-muted-foreground">Fecha de lanzamiento *</Label>
            <p className="text-sm font-medium">{release.release_date || '—'}</p>
          </div>

          {/* 9. Género (read-only) */}
          <div>
            <Label className="text-xs text-muted-foreground">Género musical *</Label>
            <p className="text-sm font-medium">{release.genre || '—'}</p>
          </div>

          <Separator />

          {/* 10. Mood */}
          <div>
            <Label>Mood / Estado de ánimo (selección múltiple)</Label>
            <p className="text-xs text-muted-foreground mb-2">Corresponde a nuevos criterios editoriales de plataformas.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {MOOD_OPTIONS.map(mood => (
                <label key={mood} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={getMoodList().includes(mood)}
                    onCheckedChange={() => handleMoodToggle(mood)}
                  />
                  {mood}
                </label>
              ))}
            </div>
          </div>

          <Separator />

          {/* 11. Estrategia general */}
          <div>
            <Label>Estrategia general de lanzamiento</Label>
            <Textarea
              value={localData.general_strategy || ''}
              onChange={e => handleFieldChange('general_strategy', e.target.value)}
              rows={4}
              placeholder="Acciones de marketing convencional (Prensa/Radio/Tv) y digital (Internet/Social Media). Campaña de expectativa, lanzamiento, posts, pauta y/o direccionamiento a cada plataforma."
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground mt-1">{(localData.general_strategy || '').length}/1000</p>
          </div>

          {/* 12. Instrumentos */}
          <div>
            <Label>Instrumentos involucrados *</Label>
            <Input
              value={localData.instruments || ''}
              onChange={e => handleFieldChange('instruments', e.target.value)}
              placeholder="Ej: Guitarra, bajo, sintetizador, batería, voz"
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground mt-1">Listado de instrumentos involucrados en la creación del lanzamiento.</p>
          </div>

          {/* 13. Fotos del artista */}
          <div>
            <Label>Fotos del artista o proyecto (link Drive)</Label>
            <Input
              value={localData.artist_photos_link || ''}
              onChange={e => handleFieldChange('artist_photos_link', e.target.value)}
              placeholder="https://drive.google.com/..."
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Anexa link de la carpeta de Drive con las fotos para todas las tiendas. Recuerda dejar la carpeta con acceso público.
            </p>
          </div>

          {/* 14. Video */}
          <div>
            <Label>Video (link YouTube/Drive)</Label>
            <Input
              value={localData.video_link || ''}
              onChange={e => handleFieldChange('video_link', e.target.value)}
              placeholder="https://youtube.com/... o https://drive.google.com/..."
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground mt-1">Si el lanzamiento incluye video, anexa el link privado en YouTube o link al archivo en Drive.</p>
          </div>

          <Separator />

          {/* 15. Sinopsis */}
          <div>
            <Label>Sinopsis (max 500 caracteres) *</Label>
            <Textarea
              value={localData.synopsis || ''}
              onChange={e => handleFieldChange('synopsis', e.target.value.slice(0, 500))}
              maxLength={500}
              rows={3}
              placeholder="Texto breve para presentar el lanzamiento a editores curatoriales. ¿En qué se destaca esta canción y tu proyecto?"
            />
            <p className="text-xs text-muted-foreground mt-1">{(localData.synopsis || '').length}/500</p>
          </div>

          <Separator />

          {/* 16. Estrategia Spotify */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Spotify</h3>
            <div className="space-y-4">
              <div>
                <Label>Estrategia dirigida a Spotify</Label>
                <Textarea
                  value={localData.spotify_strategy || ''}
                  onChange={e => handleFieldChange('spotify_strategy', e.target.value)}
                  rows={3}
                  placeholder="Texto corto presentando la estrategia específica para dirigir al público a Spotify. Puede incluir o no presupuesto."
                  maxLength={600}
                />
                <p className="text-xs text-muted-foreground mt-1">{(localData.spotify_strategy || '').length}/600</p>
              </div>

              {/* 17. Hitos Spotify */}
              <div>
                <Label>Hitos en Spotify *</Label>
                <Textarea
                  value={localData.spotify_milestones || ''}
                  onChange={e => handleFieldChange('spotify_milestones', e.target.value)}
                  rows={2}
                  placeholder="Picos de audiencia, incorporación en alguna playlist que haya tenido impacto. Escribir en tercera persona."
                  maxLength={350}
                />
                <p className="text-xs text-muted-foreground mt-1">{(localData.spotify_milestones || '').length}/350</p>
              </div>

              {/* 18. Fotos Spotify */}
              <div>
                <Label>Fotos exclusivas para Spotify (link Drive) *</Label>
                <Input
                  value={localData.spotify_photos_link || ''}
                  onChange={e => handleFieldChange('spotify_photos_link', e.target.value)}
                  placeholder="https://drive.google.com/..."
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Fotos específicas para canvas, header y perfil de Spotify. Mínimo 2660x1140px para header. Carpeta con acceso público.
                </p>
              </div>

              {/* 19-20. Oyentes y Seguidores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Oyentes mensuales Spotify *</Label>
                  <Input
                    type="number"
                    value={localData.spotify_monthly_listeners || ''}
                    onChange={e => handleFieldChange('spotify_monthly_listeners', e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Seguidores en Spotify *</Label>
                  <Input
                    type="number"
                    value={localData.spotify_followers || ''}
                    onChange={e => handleFieldChange('spotify_followers', e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* 21. Redes sociales */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Estrategia & RRSS</h3>
            <div className="space-y-4">
              <div>
                <Label>Links de redes sociales *</Label>
                <Textarea
                  value={localData.social_links || ''}
                  onChange={e => handleFieldChange('social_links', e.target.value)}
                  rows={2}
                  placeholder="Incluyendo TikTok si tiene. Separar por comas cada link."
                  maxLength={300}
                />
              </div>

              {/* 22. Otros datos */}
              <div>
                <Label>Otros datos relevantes del lanzamiento</Label>
                <Textarea
                  value={localData.additional_info || ''}
                  onChange={e => handleFieldChange('additional_info', e.target.value)}
                  rows={2}
                  placeholder="Breve descripción del contenido, productores musicales, compositores, giras o alguna otra información importante."
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">{(localData.additional_info || '').length}/500</p>
              </div>

              {/* 23. Proyección futura */}
              <div>
                <Label>Proyección futura y planeación de lanzamientos</Label>
                <Textarea
                  value={localData.future_planning || ''}
                  onChange={e => handleFieldChange('future_planning', e.target.value)}
                  rows={3}
                  placeholder="Una proyección de lo que viene a futuro y la planeación de lanzamientos con Ditto a lo largo del año."
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">{(localData.future_planning || '').length}/500</p>
              </div>

              {/* 24. Biografía */}
              <div>
                <Label>Biografía del o los artistas *</Label>
                <Textarea
                  value={localData.artist_bio || ''}
                  onChange={e => handleFieldChange('artist_bio', e.target.value)}
                  rows={3}
                  placeholder="Biografía breve pero poderosa del artista. Incluye trayectoria, logros y estilo."
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground mt-1">{(localData.artist_bio || '').length}/500</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* 25-29. Vevo Feature Request (OPCIONAL) */}
          <div>
            <h3 className="text-sm font-semibold mb-1 text-muted-foreground uppercase tracking-wider">Vevo Feature Request (US/ROW) — OPCIONAL</h3>
            <p className="text-xs text-muted-foreground mb-3">Completa esta sección solo si aplica para tu lanzamiento.</p>
            <div className="space-y-4">
              <div>
                <Label>Tipo de contenido</Label>
                <Input
                  value={localData.vevo_content_type || ''}
                  onChange={e => handleFieldChange('vevo_content_type', e.target.value)}
                  placeholder="Ej: Official Music Video, Lyric Video, Visualizer..."
                  maxLength={100}
                />
              </div>
              <div>
                <Label>Fecha premier exclusiva para Vevo</Label>
                <Input
                  type="date"
                  value={localData.vevo_premiere_date || ''}
                  onChange={e => handleFieldChange('vevo_premiere_date', e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={!!localData.vevo_is_new_edit}
                  onCheckedChange={(checked) => handleFieldChange('vevo_is_new_edit', checked)}
                />
                <Label>¿Es este video una nueva edición?</Label>
              </div>
              <div>
                <Label>Marca asociada, restricciones o notas adicionales</Label>
                <Textarea
                  value={localData.vevo_brand_notes || ''}
                  onChange={e => handleFieldChange('vevo_brand_notes', e.target.value)}
                  rows={2}
                  placeholder="Alguna marca asociada, restricciones de categoría, exhibición de marca en el video o notas adicionales."
                  maxLength={300}
                />
              </div>
              <div>
                <Label>Link previo</Label>
                <Input
                  value={localData.vevo_link || ''}
                  onChange={e => handleFieldChange('vevo_link', e.target.value)}
                  placeholder="https://..."
                  maxLength={200}
                />
              </div>
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
