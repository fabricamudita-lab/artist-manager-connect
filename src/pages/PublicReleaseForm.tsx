import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
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
  audio_link: string | null;
  instruments: string | null;
  artist_photos_link: string | null;
  video_link: string | null;
  spotify_photos_link: string | null;
  additional_info: string | null;
  artist_bio: string | null;
  pitch_status: string;
  pitch_deadline: string | null;
  pitch_token: string;
  pitch_config: PitchConfig;
  pitch_type?: string;
  track_id?: string | null;
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

const MOOD_OPTIONS = ['Chill', 'Energetic', 'Happy', 'Fierce', 'Meditative', 'Romantic', 'Sad', 'Sexy', 'None of these'];

// Fields that live on the pitch vs read-only from release
const PITCH_OWNED_FIELDS = [
  'synopsis', 'mood', 'country', 'spotify_strategy',
  'spotify_monthly_listeners', 'spotify_followers', 'spotify_milestones',
  'general_strategy', 'social_links',
  'audio_link', 'instruments', 'artist_photos_link', 'video_link',
  'spotify_photos_link', 'additional_info', 'artist_bio',
];

const RELEASE_READONLY_FIELDS = [
  'description', 'genre', 'secondary_genre', 'language', 'label', 'upc', 'copyright',
];

const NUMBER_FIELDS = ['spotify_monthly_listeners', 'spotify_followers'];

// Section definitions matching Ditto order
const SECTIONS = [
  {
    key: 'info',
    title: 'Información básica',
    icon: '📋',
    fields: ['country', 'description', 'genre', 'secondary_genre', 'language', 'label', 'upc', 'copyright'],
  },
  {
    key: 'content',
    title: 'Contenido',
    icon: '✍️',
    fields: ['audio_link', 'synopsis', 'mood', 'instruments', 'artist_photos_link', 'video_link'],
  },
  {
    key: 'spotify',
    title: 'Spotify',
    icon: '🎵',
    fields: ['spotify_strategy', 'spotify_milestones', 'spotify_photos_link', 'spotify_monthly_listeners', 'spotify_followers'],
  },
  {
    key: 'strategy',
    title: 'Estrategia & RRSS',
    icon: '📱',
    fields: ['general_strategy', 'social_links', 'additional_info', 'artist_bio'],
  },
];

const FIELD_LABELS: Record<string, string> = {
  country: 'País en que reside el artista',
  synopsis: 'Sinopsis (max 500 caracteres)',
  mood: 'Mood / Estado de ánimo',
  audio_link: 'Link Audio MP3 (link de Drive)',
  instruments: 'Instrumentos involucrados',
  artist_photos_link: 'Fotos del artista (link de Drive)',
  video_link: 'Video (link YouTube/Drive)',
  spotify_strategy: 'Estrategia dirigida a Spotify',
  spotify_monthly_listeners: 'Oyentes mensuales en Spotify',
  spotify_followers: 'Seguidores en Spotify',
  spotify_milestones: 'Hitos en Spotify',
  spotify_photos_link: 'Fotos exclusivas para Spotify (link Drive)',
  general_strategy: 'Estrategia general de lanzamiento',
  social_links: 'Links de redes sociales',
  additional_info: 'Otros datos relevantes',
  artist_bio: 'Biografía del artista',
  description: 'Descripción',
  genre: 'Género principal',
  secondary_genre: 'Género secundario',
  language: 'Idioma',
  label: 'Sello',
  upc: 'UPC',
  copyright: 'Copyright ©',
};

const FIELD_PLACEHOLDERS: Record<string, string> = {
  country: 'Ej: España',
  synopsis: "Escribe una sinopsis del lanzamiento explicando la temática, inspiración, concepto...",
  audio_link: 'https://drive.google.com/...',
  instruments: 'Ej: Guitarra, bajo, sintetizador, batería, voz',
  artist_photos_link: 'https://drive.google.com/...',
  video_link: 'https://youtube.com/... o https://drive.google.com/...',
  spotify_strategy: '¿A qué playlists editoriales aspiras? ¿Tienes playlists propias o de terceros confirmadas?',
  spotify_milestones: 'Ej: 1M streams en primer single, Top 50 Viral España...',
  spotify_photos_link: 'https://drive.google.com/...',
  spotify_monthly_listeners: '0',
  spotify_followers: '0',
  general_strategy: 'Describe tu plan completo: PR, marketing, contenido en redes, colaboraciones, eventos, radio...',
  social_links: 'Instagram, TikTok, YouTube, Twitter... Un link por línea',
  additional_info: 'Cualquier información adicional relevante para la distribuidora...',
  artist_bio: 'Biografía breve pero poderosa del artista. Incluye trayectoria, logros y estilo.',
};

const FIELD_HELP: Record<string, string> = {
  artist_photos_link: 'Mínimo 3000x3000px. Sin logos, sin close-ups extremos, sin texto superpuesto. Fondo limpio.',
  spotify_photos_link: 'Fotos específicas para canvas, header y perfil de Spotify. Mínimo 2660x1140px para header.',
};

const FIELD_MAX_CHARS: Record<string, number> = {
  country: 20,
  synopsis: 500,
  audio_link: 80,
  instruments: 60,
  artist_photos_link: 80,
  video_link: 80,
  spotify_strategy: 600,
  spotify_milestones: 350,
  spotify_photos_link: 80,
  general_strategy: 1000,
  social_links: 100,
  additional_info: 200,
  artist_bio: 300,
};

const TEXTAREA_FIELDS = [
  'synopsis', 'description', 'spotify_strategy', 'spotify_milestones',
  'general_strategy', 'social_links', 'additional_info', 'artist_bio',
];

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

  useEffect(() => {
    async function fetchData() {
      if (!token) {
        setError('Token no válido');
        setLoading(false);
        return;
      }
      try {
        const { data: pitchData, error: pitchErr } = await supabase
          .from('pitches')
          .select('*')
          .eq('pitch_token', token)
          .single();

        if (pitchErr || !pitchData) {
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
            audio_link: null,
            instruments: null,
            artist_photos_link: null,
            video_link: null,
            spotify_photos_link: null,
            additional_info: null,
            artist_bio: null,
            pitch_status: rd.pitch_status || 'draft',
            pitch_deadline: rd.pitch_deadline,
            pitch_token: rd.pitch_token,
            pitch_config: rd.pitch_config || {},
          };
          setPitch(legacyPitch);

          if (!hasInitialized.current) {
            hasInitialized.current = true;
            const initial: Record<string, any> = {};
            [...PITCH_OWNED_FIELDS, ...RELEASE_READONLY_FIELDS].forEach(key => {
              initial[key] = rd[key] ?? '';
            });
            setFormData(initial);
          }

          if (rd.pitch_status === 'completed') setSubmitted(true);
          setLoading(false);
          return;
        }

        const pd = pitchData as any as PitchData;
        setPitch(pd);

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
          PITCH_OWNED_FIELDS.forEach(key => {
            initial[key] = (pd as any)[key] ?? '';
          });
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
    const maxChars = FIELD_MAX_CHARS[key];
    if (maxChars && typeof value === 'string') {
      value = value.slice(0, maxChars);
    }
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleMoodToggle = (mood: string) => {
    const current = (formData.mood || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    const updated = current.includes(mood)
      ? current.filter((m: string) => m !== mood)
      : [...current, mood];
    handleChange('mood', updated.join(', '));
  };

  const getMoodList = (): string[] => {
    return (formData.mood || '').split(',').map((s: string) => s.trim()).filter(Boolean);
  };

  const getCompletion = () => {
    if (!pitch) return 0;
    const config = pitch.pitch_config || {};
    const allFields = SECTIONS.flatMap(s => s.fields);
    const visibleFields = allFields.filter(k => {
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
  const pitchTypeLabel = pitch.pitch_type === 'single' ? 'Single' : pitch.pitch_type === 'ep' ? 'EP' : 'Album';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <img src={mooditaLogo} alt="Moodita" className="h-8 w-8" />
          <div className="flex-1">
            <h1 className="text-lg font-bold">{title}</h1>
            <p className="text-xs text-muted-foreground">
              {artistName && `${artistName} · `}{pitchTypeLabel} · Pitch de distribución
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
        {SECTIONS.map(section => {
          const visibleFields = section.fields.filter(k => {
            const c = config[k];
            return c?.visible !== false;
          });
          if (visibleFields.length === 0) return null;

          return (
            <Card key={section.key}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <span>{section.icon}</span>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {visibleFields.map(key => {
                  const fieldConfig = config[key] || { visible: true, editable: false };
                  const isEditable = fieldConfig.editable && PITCH_OWNED_FIELDS.includes(key);
                  const label = FIELD_LABELS[key] || key;
                  const value = formData[key] ?? '';
                  const placeholder = FIELD_PLACEHOLDERS[key] || '';
                  const help = FIELD_HELP[key];
                  const maxChars = FIELD_MAX_CHARS[key];

                  // Mood multi-select
                  if (key === 'mood') {
                    return (
                      <div key={key}>
                        <Label>{label}</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                          {MOOD_OPTIONS.map(mood => (
                            <label key={mood} className={`flex items-center gap-2 text-sm ${!isEditable ? 'opacity-60 pointer-events-none' : 'cursor-pointer'}`}>
                              <Checkbox
                                checked={getMoodList().includes(mood)}
                                onCheckedChange={() => handleMoodToggle(mood)}
                                disabled={!isEditable}
                              />
                              {mood}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  }

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
                          placeholder={placeholder}
                          maxLength={maxChars}
                        />
                        {maxChars && isEditable && (
                          <p className="text-xs text-muted-foreground mt-1">{String(value).length}/{maxChars}</p>
                        )}
                        {help && <p className="text-xs text-muted-foreground mt-1">{help}</p>}
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
                        placeholder={placeholder}
                        maxLength={maxChars}
                      />
                      {help && <p className="text-xs text-muted-foreground mt-1">{help}</p>}
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
