import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useDebounce } from '@/hooks/useDebounce';
import { Music, CheckCircle2, Loader2, Save } from 'lucide-react';
import mooditaLogo from '@/assets/moodita-logo.png';

interface PitchConfig {
  [key: string]: { visible: boolean; editable: boolean };
}

interface PitchData {
  id: string;
  release_id: string;
  name: string;
  synopsis: string | null;
  mood: string | null;
  country: string | null;
  spotify_strategy: string | null;
  spotify_monthly_listeners: number | null;
  spotify_followers: number | null;
  spotify_milestones: string | null;
  general_strategy: string | null;
  social_links: string | null;
  pitch_status: string;
  pitch_deadline: string | null;
  pitch_token: string;
  pitch_config: PitchConfig;
}

interface ReleaseInfo {
  id: string;
  title: string;
  type: string;
  release_date: string | null;
  cover_image_url: string | null;
  genre: string | null;
  secondary_genre: string | null;
  label: string | null;
  upc: string | null;
  copyright: string | null;
  language: string | null;
  production_year: number | null;
  description: string | null;
  artist?: { name: string; avatar_url: string | null } | null;
}

const FIELD_LABELS: Record<string, string> = {
  synopsis: 'Sinopsis (max 500 caracteres)',
  mood: 'Mood / Estado de ánimo',
  country: 'País',
  description: 'Descripción',
  genre: 'Género principal',
  secondary_genre: 'Género secundario',
  language: 'Idioma',
  label: 'Sello',
  upc: 'UPC',
  copyright: 'Copyright ©',
  spotify_strategy: 'Estrategia Spotify',
  spotify_monthly_listeners: 'Oyentes mensuales',
  spotify_followers: 'Seguidores Spotify',
  spotify_milestones: 'Hitos Spotify',
  general_strategy: 'Estrategia general',
  social_links: 'Redes sociales',
};

// Fields that live on the pitch vs read-only from release
const PITCH_OWNED_FIELDS = [
  'synopsis', 'mood', 'country', 'spotify_strategy',
  'spotify_monthly_listeners', 'spotify_followers', 'spotify_milestones',
  'general_strategy', 'social_links',
];

const RELEASE_READONLY_FIELDS = [
  'description', 'genre', 'secondary_genre', 'language', 'label', 'upc', 'copyright',
];

const TEXTAREA_FIELDS = ['synopsis', 'description', 'spotify_strategy', 'spotify_milestones', 'general_strategy', 'social_links'];
const NUMBER_FIELDS = ['spotify_monthly_listeners', 'spotify_followers'];
const SELECT_FIELDS: Record<string, string[]> = {
  mood: ['Chill', 'Energetic', 'Happy', 'Fierce', 'Meditative', 'Romantic', 'Sad', 'Sexy', 'None of these'],
};

const SECTION_MAP: Record<string, { title: string; icon: string }> = {
  info: { title: 'Información básica', icon: '📋' },
  content: { title: 'Contenido', icon: '✍️' },
  spotify: { title: 'Spotify', icon: '🎵' },
  strategy: { title: 'Estrategia & RRSS', icon: '📱' },
};

const FIELD_SECTIONS: Record<string, string> = {
  synopsis: 'content', mood: 'content', country: 'info',
  description: 'info', genre: 'info', secondary_genre: 'info',
  language: 'info', label: 'info', upc: 'info', copyright: 'info',
  spotify_strategy: 'spotify', spotify_monthly_listeners: 'spotify',
  spotify_followers: 'spotify', spotify_milestones: 'spotify',
  general_strategy: 'strategy', social_links: 'strategy',
};

export default function PublicReleaseForm() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pitch, setPitch] = useState<PitchData | null>(null);
  const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const hasInitialized = useRef(false);

  // Fetch pitch by token, then load associated release info
  useEffect(() => {
    async function fetchData() {
      if (!token) {
        setError('Token no válido');
        setLoading(false);
        return;
      }
      try {
        // First try pitches table
        const { data: pitchData, error: pitchErr } = await supabase
          .from('pitches')
          .select('*')
          .eq('pitch_token', token)
          .single();

        if (pitchErr || !pitchData) {
          // Fallback: try legacy releases table for old tokens
          const { data: releaseData, error: releaseErr } = await supabase
            .from('releases')
            .select('*, artist:artists!releases_artist_id_fkey(name, avatar_url)')
            .eq('pitch_token', token)
            .single();

          if (releaseErr || !releaseData) {
            setError('Formulario no encontrado o enlace inválido');
            setLoading(false);
            return;
          }

          // Legacy mode: treat release as both pitch and release
          const rd = releaseData as any;
          setReleaseInfo(rd);
          const legacyPitch: PitchData = {
            id: rd.id,
            release_id: rd.id,
            name: 'Pitch principal',
            synopsis: rd.synopsis,
            mood: rd.mood,
            country: rd.country,
            spotify_strategy: rd.spotify_strategy,
            spotify_monthly_listeners: rd.spotify_monthly_listeners,
            spotify_followers: rd.spotify_followers,
            spotify_milestones: rd.spotify_milestones,
            general_strategy: rd.general_strategy,
            social_links: rd.social_links,
            pitch_status: rd.pitch_status || 'draft',
            pitch_deadline: rd.pitch_deadline,
            pitch_token: rd.pitch_token,
            pitch_config: rd.pitch_config || {},
          };
          setPitch(legacyPitch);

          if (!hasInitialized.current) {
            hasInitialized.current = true;
            const initial: Record<string, any> = {};
            Object.keys(FIELD_LABELS).forEach(key => {
              initial[key] = rd[key] ?? '';
            });
            setFormData(initial);
          }

          if (rd.pitch_status === 'completed') setSubmitted(true);
          setLoading(false);
          return;
        }

        // New pitches table flow
        const pd = pitchData as any as PitchData;
        setPitch(pd);

        // Load release info
        const { data: relData } = await supabase
          .from('releases')
          .select('*, artist:artists!releases_artist_id_fkey(name, avatar_url)')
          .eq('id', pd.release_id)
          .single();

        if (relData) {
          setReleaseInfo(relData as any);
        }

        if (!hasInitialized.current) {
          hasInitialized.current = true;
          const initial: Record<string, any> = {};
          // Pitch-owned fields from pitch
          PITCH_OWNED_FIELDS.forEach(key => {
            initial[key] = (pd as any)[key] ?? '';
          });
          // Release read-only fields from release
          RELEASE_READONLY_FIELDS.forEach(key => {
            initial[key] = relData ? (relData as any)[key] ?? '' : '';
          });
          setFormData(initial);
        }

        if (pd.pitch_status === 'completed') setSubmitted(true);
      } catch {
        setError('Error al cargar el formulario');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [token]);

  // Auto-save with debounce
  const debouncedForm = useDebounce(formData, 2000);

  useEffect(() => {
    if (!pitch || submitted || loading || !hasInitialized.current) return;

    const normalize = (v: any) => (v === null || v === undefined || v === '' ? '' : String(v));
    const hasChanges = PITCH_OWNED_FIELDS.some(k => {
      return normalize((pitch as any)[k]) !== normalize(debouncedForm[k]);
    });

    if (hasChanges) {
      autoSave(debouncedForm);
    }
  }, [debouncedForm]);

  const autoSave = async (data: Record<string, any>) => {
    if (!pitch) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = {};
      const config = pitch.pitch_config || {};

      PITCH_OWNED_FIELDS.forEach(key => {
        const fieldConfig = config[key];
        if (fieldConfig?.editable) {
          if (NUMBER_FIELDS.includes(key)) {
            updates[key] = data[key] === '' ? null : Number(data[key]);
          } else {
            updates[key] = data[key] || null;
          }
        }
      });

      if (Object.keys(updates).length > 0) {
        updates.pitch_status = 'in_progress';
        const { error } = await supabase
          .from('pitches')
          .update(updates as any)
          .eq('pitch_token', token);
        if (error) console.error('Auto-save error:', error);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!pitch) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = { pitch_status: 'completed' };
      const config = pitch.pitch_config || {};

      PITCH_OWNED_FIELDS.forEach(key => {
        const fieldConfig = config[key];
        if (fieldConfig?.editable) {
          if (NUMBER_FIELDS.includes(key)) {
            updates[key] = formData[key] === '' ? null : Number(formData[key]);
          } else {
            updates[key] = formData[key] || null;
          }
        }
      });

      const { error } = await supabase
        .from('pitches')
        .update(updates as any)
        .eq('pitch_token', token);

      if (error) throw error;
      setSubmitted(true);
    } catch {
      // error handled
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: any) => {
    if (key === 'synopsis' && typeof value === 'string') {
      value = value.slice(0, 500);
    }
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const getCompletion = () => {
    if (!pitch) return 0;
    const config = pitch.pitch_config || {};
    const visibleFields = Object.keys(FIELD_LABELS).filter(k => {
      const c = config[k];
      return c?.visible !== false;
    });
    if (visibleFields.length === 0) return 100;
    const filled = visibleFields.filter(k => {
      const val = formData[k];
      return val !== '' && val !== null && val !== undefined;
    });
    return Math.round((filled.length / visibleFields.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-xl px-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !pitch) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <Music className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-lg font-medium">{error || 'Formulario no encontrado'}</p>
            <p className="text-sm text-muted-foreground">
              Verifica que el enlace sea correcto o contacta con tu manager.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
            <h2 className="text-2xl font-bold">¡Enviado!</h2>
            <p className="text-muted-foreground">
              Tu información ha sido guardada correctamente. El equipo la revisará pronto.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = pitch.pitch_config || {};
  const completion = getCompletion();
  const title = releaseInfo?.title || pitch.name;
  const artistName = releaseInfo?.artist?.name;
  const coverUrl = releaseInfo?.cover_image_url;

  // Group visible fields by section
  const sectionGroups: Record<string, string[]> = {};
  Object.keys(FIELD_LABELS).forEach(key => {
    const c = config[key];
    if (c?.visible === false) return;
    const section = FIELD_SECTIONS[key] || 'info';
    if (!sectionGroups[section]) sectionGroups[section] = [];
    sectionGroups[section].push(key);
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <img src={mooditaLogo} alt="Moodita" className="h-8 w-8" />
          <div className="flex-1">
            <h1 className="text-lg font-bold">{title}</h1>
            <p className="text-xs text-muted-foreground">
              {artistName && `${artistName} · `}Pitch de distribución
            </p>
          </div>
          {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {!saving && <Save className="h-4 w-4 text-green-500" />}
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Completitud</span>
          <span className="text-sm font-medium">{completion}%</span>
        </div>
        <Progress value={completion} className="h-2" />
        {pitch.pitch_deadline && (
          <p className="text-xs text-muted-foreground mt-1">
            Fecha límite: {new Date(pitch.pitch_deadline).toLocaleDateString('es-ES')}
          </p>
        )}
      </div>

      {/* Cover image */}
      {coverUrl && (
        <div className="max-w-2xl mx-auto px-4 pb-4">
          <img
            src={coverUrl}
            alt={title}
            className="w-32 h-32 object-cover rounded-lg shadow"
          />
        </div>
      )}

      {/* Form sections */}
      <div className="max-w-2xl mx-auto px-4 pb-8 space-y-6">
        {Object.entries(sectionGroups).map(([sectionKey, fields]) => {
          const sectionInfo = SECTION_MAP[sectionKey] || { title: sectionKey, icon: '📝' };
          return (
            <Card key={sectionKey}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span>{sectionInfo.icon}</span>
                  {sectionInfo.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map(key => {
                  const fieldConfig = config[key] || { visible: true, editable: false };
                  const isEditable = fieldConfig.editable && PITCH_OWNED_FIELDS.includes(key);
                  const label = FIELD_LABELS[key];
                  const value = formData[key] ?? '';

                  if (TEXTAREA_FIELDS.includes(key)) {
                    return (
                      <div key={key}>
                        <Label>{label}</Label>
                        <Textarea
                          value={value}
                          onChange={e => handleChange(key, e.target.value)}
                          disabled={!isEditable}
                          rows={3}
                          className={!isEditable ? 'opacity-60' : ''}
                        />
                        {key === 'synopsis' && isEditable && (
                          <p className="text-xs text-muted-foreground mt-1">{String(value).length}/500</p>
                        )}
                      </div>
                    );
                  }

                  if (SELECT_FIELDS[key]) {
                    return (
                      <div key={key}>
                        <Label>{label}</Label>
                        <Select value={value || ''} onValueChange={v => handleChange(key, v)} disabled={!isEditable}>
                          <SelectTrigger className={!isEditable ? 'opacity-60' : ''}>
                            <SelectValue placeholder="Selecciona..." />
                          </SelectTrigger>
                          <SelectContent>
                            {SELECT_FIELDS[key].map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }

                  return (
                    <div key={key}>
                      <Label>{label}</Label>
                      <Input
                        type={NUMBER_FIELDS.includes(key) ? 'number' : 'text'}
                        value={value}
                        onChange={e => handleChange(key, e.target.value)}
                        disabled={!isEditable}
                        className={!isEditable ? 'opacity-60' : ''}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

        {/* Submit */}
        <div className="flex justify-center pt-4">
          <Button size="lg" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Enviar información
          </Button>
        </div>
      </div>
    </div>
  );
}
