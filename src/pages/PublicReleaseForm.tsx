import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
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

interface ReleaseData {
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
  pitch_status: string;
  pitch_deadline: string | null;
  pitch_config: PitchConfig;
  pitch_token: string;
  country: string | null;
  mood: string | null;
  synopsis: string | null;
  spotify_strategy: string | null;
  spotify_monthly_listeners: number | null;
  spotify_followers: number | null;
  spotify_milestones: string | null;
  general_strategy: string | null;
  social_links: string | null;
  artist?: { name: string; avatar_url: string | null } | null;
}

const FIELD_LABELS: Record<string, string> = {
  synopsis: 'Sinopsis (max 500 caracteres)',
  mood: 'Mood / Estilo',
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

const TEXTAREA_FIELDS = ['synopsis', 'description', 'spotify_strategy', 'spotify_milestones', 'general_strategy', 'social_links'];
const NUMBER_FIELDS = ['spotify_monthly_listeners', 'spotify_followers'];

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
  const [release, setRelease] = useState<ReleaseData | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const hasInitialized = useRef(false);

  // Fetch release by token
  useEffect(() => {
    async function fetchRelease() {
      if (!token) {
        setError('Token no válido');
        setLoading(false);
        return;
      }
      try {
        const { data, error: fetchErr } = await supabase
          .from('releases')
          .select('*, artist:artists!releases_artist_id_fkey(name, avatar_url)')
          .eq('pitch_token', token)
          .single();

        if (fetchErr || !data) {
          setError('Formulario no encontrado o enlace inválido');
          setLoading(false);
          return;
        }

        const releaseData = data as any as ReleaseData;
        setRelease(releaseData);

        // Initialize form with current values — only first load
        if (!hasInitialized.current) {
          hasInitialized.current = true;
          const initial: Record<string, any> = {};
          Object.keys(FIELD_LABELS).forEach(key => {
            initial[key] = (releaseData as any)[key] ?? '';
          });
          setFormData(initial);
        }

        if (releaseData.pitch_status === 'completed') {
          setSubmitted(true);
        }
      } catch {
        setError('Error al cargar el formulario');
      } finally {
        setLoading(false);
      }
    }
    fetchRelease();
  }, [token]);

  // Auto-save with debounce
  const debouncedForm = useDebounce(formData, 2000);

  useEffect(() => {
    if (!release || submitted || loading || !hasInitialized.current) return;
    
    const normalize = (v: any) => (v === null || v === undefined || v === '' ? '' : String(v));
    const hasChanges = Object.keys(debouncedForm).some(k => {
      return normalize((release as any)[k]) !== normalize(debouncedForm[k]);
    });

    if (hasChanges) {
      autoSave(debouncedForm);
    }
  }, [debouncedForm]);

  const autoSave = async (data: Record<string, any>) => {
    if (!release) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = {};
      const config = release.pitch_config || {};

      Object.keys(data).forEach(key => {
        const fieldConfig = config[key];
        // Only save fields that are editable
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
          .from('releases')
          .update(updates)
          .eq('pitch_token', token);
        if (error) console.error('Auto-save error:', error);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!release) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = { pitch_status: 'completed' };
      const config = release.pitch_config || {};

      Object.keys(formData).forEach(key => {
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
        .from('releases')
        .update(updates)
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

  // Calculate completion
  const getCompletion = () => {
    if (!release) return 0;
    const config = release.pitch_config || {};
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

  if (error || !release) {
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

  const config = release.pitch_config || {};
  const completion = getCompletion();

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
            <h1 className="text-lg font-bold">{release.title}</h1>
            <p className="text-xs text-muted-foreground">
              {release.artist?.name} · Pitch de distribución
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
        {release.pitch_deadline && (
          <p className="text-xs text-muted-foreground mt-1">
            Fecha límite: {new Date(release.pitch_deadline).toLocaleDateString('es-ES')}
          </p>
        )}
      </div>

      {/* Cover image */}
      {release.cover_image_url && (
        <div className="max-w-2xl mx-auto px-4 pb-4">
          <img
            src={release.cover_image_url}
            alt={release.title}
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
                  const isEditable = fieldConfig.editable;
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
