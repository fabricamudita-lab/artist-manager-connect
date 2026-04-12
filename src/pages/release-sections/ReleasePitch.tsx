import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Copy, Check, Link as LinkIcon, Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react';
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
import { useRelease, useUpdateRelease } from '@/hooks/useReleases';
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

// All configurable pitch fields
const PITCH_FIELDS = [
  { key: 'synopsis', label: 'Sinopsis', section: 'content' },
  { key: 'mood', label: 'Mood / Estilo', section: 'content' },
  { key: 'country', label: 'País', section: 'info' },
  { key: 'spotify_strategy', label: 'Estrategia Spotify', section: 'spotify' },
  { key: 'spotify_monthly_listeners', label: 'Oyentes mensuales', section: 'spotify' },
  { key: 'spotify_followers', label: 'Seguidores Spotify', section: 'spotify' },
  { key: 'spotify_milestones', label: 'Hitos Spotify', section: 'spotify' },
  { key: 'general_strategy', label: 'Estrategia general', section: 'strategy' },
  { key: 'social_links', label: 'Redes sociales', section: 'strategy' },
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
];

const normalize = (v: any) => (v === null || v === undefined || v === '' ? '' : String(v));

type PitchConfig = Record<string, { visible: boolean; editable: boolean }>;

export default function ReleasePitch() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: release, isLoading } = useRelease(id);
  const updateRelease = useUpdateRelease({ silent: true });
  const [copied, setCopied] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const hasInitialized = useRef(false);

  // Local form state for pitch-specific fields
  const [localData, setLocalData] = useState<Record<string, any>>({});
  const [pitchConfig, setPitchConfig] = useState<PitchConfig>({});
  const [pitchDeadline, setPitchDeadline] = useState('');

  // Initialize from release — only once
  useEffect(() => {
    if (release && !hasInitialized.current) {
      hasInitialized.current = true;
      const initial: Record<string, any> = {};
      PITCH_LOCAL_KEYS.forEach(k => {
        initial[k] = (release as any)[k] ?? '';
      });
      setLocalData(initial);
      setPitchConfig((release.pitch_config as PitchConfig) || {});
      setPitchDeadline(release.pitch_deadline || '');
    }
  }, [release]);

  const debouncedData = useDebounce(localData, 1500);

  // Auto-save pitch fields — only real changes
  useEffect(() => {
    if (!id || !release || !hasInitialized.current) return;

    const numericFields = ['spotify_monthly_listeners', 'spotify_followers'];
    const updates: Record<string, any> = {};

    for (const k of PITCH_LOCAL_KEYS) {
      const dbVal = normalize((release as any)[k]);
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
      updateRelease.mutate({ id, ...updates });
    }
  }, [debouncedData]);

  const handleFieldChange = (key: string, value: any) => {
    setLocalData(prev => ({ ...prev, [key]: value }));
  };

  const handleConfigToggle = (fieldKey: string, prop: 'visible' | 'editable') => {
    setPitchConfig(prev => {
      const current = prev[fieldKey] || { visible: true, editable: false };
      const updated = { ...prev, [fieldKey]: { ...current, [prop]: !current[prop] } };
      // Save config
      if (id) {
        updateRelease.mutate({ id, pitch_config: updated as any });
      }
      return updated;
    });
  };

  const generateToken = async () => {
    if (!id) return;
    setGeneratingToken(true);
    try {
      const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
      const { error } = await supabase
        .from('releases')
        .update({ pitch_token: token, pitch_status: 'sent' as any })
        .eq('id', id);
      if (error) throw error;
      toast.success('Enlace de pitch generado');
      // Refresh
      window.location.reload();
    } catch {
      toast.error('Error al generar el enlace');
    } finally {
      setGeneratingToken(false);
    }
  };

  const copyLink = () => {
    if (!release?.pitch_token) return;
    const url = `${window.location.origin}/release-form/${release.pitch_token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Enlace copiado');
    setTimeout(() => setCopied(false), 2000);
  };

  const updatePitchStatus = (status: string) => {
    if (!id) return;
    updateRelease.mutate({ id, pitch_status: status as any });
  };

  const savePitchDeadline = () => {
    if (!id) return;
    updateRelease.mutate({ id, pitch_deadline: pitchDeadline || null } as any);
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

  const pitchStatus = (release as any).pitch_status || 'draft';
  const pitchToken = (release as any).pitch_token;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/releases/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Pitch de Distribución</h1>
          <p className="text-sm text-muted-foreground">{release.title}</p>
        </div>
        <Badge className={PITCH_STATUS_COLORS[pitchStatus]}>
          {PITCH_STATUS_LABELS[pitchStatus] || pitchStatus}
        </Badge>
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
          {pitchToken ? (
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/release-form/${pitchToken}`}
                className="font-mono text-xs"
              />
              <Button variant="outline" size="icon" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          ) : (
            <Button onClick={generateToken} disabled={generatingToken}>
              {generatingToken ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Generar enlace de pitch
            </Button>
          )}

          <div className="flex flex-wrap gap-2">
            <Label className="text-sm text-muted-foreground self-center mr-2">Estado:</Label>
            {Object.entries(PITCH_STATUS_LABELS).map(([key, label]) => (
              <Button
                key={key}
                variant={pitchStatus === key ? 'default' : 'outline'}
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

      {/* Pitch form fields (manager view) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos del Pitch</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pre-rellena la información. Se guarda automáticamente.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info section - read-only from release */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Info Básica (del release)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Título</Label>
                <p className="text-sm font-medium">{release.title}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <p className="text-sm font-medium capitalize">{release.type}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fecha de lanzamiento</Label>
                <p className="text-sm font-medium">{release.release_date || '—'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Género</Label>
                <p className="text-sm font-medium">{release.genre || '—'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Sello</Label>
                <p className="text-sm font-medium">{release.label || '—'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">UPC</Label>
                <p className="text-sm font-medium">{release.upc || '—'}</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Pitch-specific editable fields */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Contenido</h3>
            <div className="space-y-4">
              <div>
                <Label>Sinopsis (max 500 caracteres)</Label>
                <Textarea
                  value={localData.synopsis || ''}
                  onChange={e => handleFieldChange('synopsis', e.target.value.slice(0, 500))}
                  maxLength={500}
                  rows={3}
                  placeholder="Breve descripción del lanzamiento..."
                />
                <p className="text-xs text-muted-foreground mt-1">{(localData.synopsis || '').length}/500</p>
              </div>
              <div>
                <Label>Mood / Estado de ánimo</Label>
                <Select value={localData.mood || ''} onValueChange={v => handleFieldChange('mood', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un mood..." />
                  </SelectTrigger>
                  <SelectContent>
                    {['Chill', 'Energetic', 'Happy', 'Fierce', 'Meditative', 'Romantic', 'Sad', 'Sexy', 'None of these'].map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>País</Label>
                <Input
                  value={localData.country || ''}
                  onChange={e => handleFieldChange('country', e.target.value)}
                  placeholder="País de origen"
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Spotify</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Oyentes mensuales</Label>
                <Input
                  type="number"
                  value={localData.spotify_monthly_listeners || ''}
                  onChange={e => handleFieldChange('spotify_monthly_listeners', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div>
                <Label>Seguidores</Label>
                <Input
                  type="number"
                  value={localData.spotify_followers || ''}
                  onChange={e => handleFieldChange('spotify_followers', e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Hitos destacados</Label>
                <Textarea
                  value={localData.spotify_milestones || ''}
                  onChange={e => handleFieldChange('spotify_milestones', e.target.value)}
                  rows={2}
                  placeholder="Ej: 1M streams en primer single, Top 50 Viral..."
                />
              </div>
              <div className="md:col-span-2">
                <Label>Estrategia Spotify</Label>
                <Textarea
                  value={localData.spotify_strategy || ''}
                  onChange={e => handleFieldChange('spotify_strategy', e.target.value)}
                  rows={3}
                  placeholder="Playlists objetivo, plan de lanzamiento..."
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Estrategia & RRSS</h3>
            <div className="space-y-4">
              <div>
                <Label>Estrategia general</Label>
                <Textarea
                  value={localData.general_strategy || ''}
                  onChange={e => handleFieldChange('general_strategy', e.target.value)}
                  rows={3}
                  placeholder="Plan de marketing, PR, contenido..."
                />
              </div>
              <div>
                <Label>Redes sociales</Label>
                <Textarea
                  value={localData.social_links || ''}
                  onChange={e => handleFieldChange('social_links', e.target.value)}
                  rows={2}
                  placeholder="Links de redes sociales, una por línea..."
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
