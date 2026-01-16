import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Film, Music, Send, CheckCircle2, X, Loader2 } from 'lucide-react';

const PRODUCTION_TYPES = [
  { value: 'cine', label: 'Cine' },
  { value: 'publicidad', label: 'Publicidad' },
  { value: 'serie', label: 'Serie TV' },
  { value: 'evento', label: 'Evento' },
  { value: 'videojuego', label: 'Videojuego' },
  { value: 'podcast', label: 'Podcast' },
  { value: 'otro', label: 'Otro' },
];

const TERRITORIES = [
  { value: 'España', label: 'España' },
  { value: 'Europa', label: 'Europa' },
  { value: 'Mundo', label: 'Mundo' },
  { value: 'LATAM', label: 'Latinoamérica' },
  { value: 'USA', label: 'Estados Unidos' },
];

const MEDIA_OPTIONS = [
  'TV', 'Internet', 'Cine', 'RRSS', 'Radio', 'OOH', 'Streaming'
];

const USAGE_TYPES = [
  { value: 'background', label: 'Background / Incidental' },
  { value: 'featured', label: 'Featured / Destacada' },
  { value: 'main_title', label: 'Main Title / Cabecera' },
  { value: 'end_credits', label: 'End Credits / Créditos finales' },
  { value: 'trailer', label: 'Trailer / Promo' },
  { value: 'promo', label: 'Promocional' },
];

interface FormLink {
  id: string;
  title?: string;
  description?: string;
  is_active: boolean;
}

export default function PublicSyncRequestForm() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formLink, setFormLink] = useState<FormLink | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [productionTitle, setProductionTitle] = useState('');
  const [productionType, setProductionType] = useState('');
  const [productionCompany, setProductionCompany] = useState('');
  const [director, setDirector] = useState('');
  const [territory, setTerritory] = useState('España');
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [durationYears, setDurationYears] = useState(1);
  
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [usageType, setUsageType] = useState('');
  const [usageDuration, setUsageDuration] = useState('');
  const [sceneDescription, setSceneDescription] = useState('');
  
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail, setRequesterEmail] = useState('');
  const [requesterCompany, setRequesterCompany] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  
  const [totalBudget, setTotalBudget] = useState('');
  const [musicBudget, setMusicBudget] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (token) {
      validateFormLink();
    }
  }, [token]);

  const validateFormLink = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sync_form_links')
        .select('id, title, description, is_active, expires_at, max_uses, use_count')
        .eq('token', token)
        .single();

      if (error || !data) {
        setError('Este enlace no es válido o ha expirado.');
        return;
      }

      if (!data.is_active) {
        setError('Este formulario ya no está activo.');
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setError('Este enlace ha expirado.');
        return;
      }

      if (data.max_uses && data.use_count >= data.max_uses) {
        setError('Este formulario ha alcanzado el límite de respuestas.');
        return;
      }

      setFormLink(data);
    } catch (err) {
      console.error('Error validating form link:', err);
      setError('Error al validar el enlace.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMedia = (media: string) => {
    setSelectedMedia(prev =>
      prev.includes(media)
        ? prev.filter(m => m !== media)
        : [...prev, media]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!productionTitle || !productionType || !songTitle || !requesterName || !requesterEmail) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa todos los campos obligatorios.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      // Create the sync offer as an external submission
      const { error: insertError } = await supabase
        .from('sync_offers')
        .insert({
          production_title: productionTitle,
          production_type: productionType,
          production_company: productionCompany || null,
          director: director || null,
          territory,
          media: selectedMedia,
          duration_years: durationYears,
          song_title: songTitle,
          song_artist: songArtist || null,
          usage_type: usageType || null,
          usage_duration: usageDuration || null,
          scene_description: sceneDescription || null,
          requester_name: requesterName,
          requester_email: requesterEmail,
          requester_company: requesterCompany || null,
          requester_phone: requesterPhone || null,
          total_budget: totalBudget ? parseFloat(totalBudget) : null,
          music_budget: musicBudget ? parseFloat(musicBudget) : null,
          notes: notes || null,
          phase: 'solicitud',
          is_external_submission: true,
          form_link_id: formLink?.id,
          review_status: 'pending',
          created_by: '00000000-0000-0000-0000-000000000000', // Anonymous user placeholder
        });

      if (insertError) throw insertError;

      // Update use count
      if (formLink?.id) {
        await supabase
          .from('sync_form_links')
          .update({ use_count: (formLink as any).use_count + 1 })
          .eq('id', formLink.id);
      }

      setSubmitted(true);
      toast({
        title: "Solicitud enviada",
        description: "Tu solicitud ha sido enviada correctamente. Nos pondremos en contacto pronto.",
      });
    } catch (err) {
      console.error('Error submitting form:', err);
      toast({
        title: "Error",
        description: "No se pudo enviar la solicitud. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando formulario...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="p-4 rounded-full bg-destructive/10 w-fit mx-auto mb-4">
              <X className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Enlace no válido</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="p-4 rounded-full bg-success/10 w-fit mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-semibold mb-2">¡Solicitud enviada!</h2>
            <p className="text-muted-foreground">
              Tu solicitud de sincronización ha sido recibida correctamente. 
              Nos pondremos en contacto contigo pronto para discutir los detalles.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 p-3 bg-primary/10 rounded-xl mb-4">
            <Film className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">
            {formLink?.title || 'Solicitud de Sincronización'}
          </h1>
          <p className="text-muted-foreground">
            {formLink?.description || 'Completa el siguiente formulario para solicitar una licencia de sincronización.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Production Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Film className="h-5 w-5" />
                Detalles de la Producción
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="production-title">Título de la Producción *</Label>
                <Input
                  id="production-title"
                  value={productionTitle}
                  onChange={(e) => setProductionTitle(e.target.value)}
                  placeholder="Ej: La Casa de Papel - Temporada 5"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Producción *</Label>
                  <Select value={productionType} onValueChange={setProductionType} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Territorio</Label>
                  <Select value={territory} onValueChange={setTerritory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar territorio" />
                    </SelectTrigger>
                    <SelectContent>
                      {TERRITORIES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="production-company">Productora</Label>
                  <Input
                    id="production-company"
                    value={productionCompany}
                    onChange={(e) => setProductionCompany(e.target.value)}
                    placeholder="Nombre de la productora"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="director">Director</Label>
                  <Input
                    id="director"
                    value={director}
                    onChange={(e) => setDirector(e.target.value)}
                    placeholder="Nombre del director"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Medios</Label>
                <div className="flex flex-wrap gap-2">
                  {MEDIA_OPTIONS.map((media) => (
                    <Badge
                      key={media}
                      variant={selectedMedia.includes(media) ? "default" : "outline"}
                      className="cursor-pointer hover:bg-primary/90"
                      onClick={() => toggleMedia(media)}
                    >
                      {media}
                      {selectedMedia.includes(media) && (
                        <X className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Duración de la Licencia: {durationYears} {durationYears === 1 ? 'año' : 'años'}</Label>
                <Slider
                  value={[durationYears]}
                  onValueChange={(v) => setDurationYears(v[0])}
                  min={1}
                  max={10}
                  step={1}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          {/* Music Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Music className="h-5 w-5" />
                Información de la Música
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="song-title">Título de la Canción *</Label>
                  <Input
                    id="song-title"
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    placeholder="Nombre de la canción"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="song-artist">Artista</Label>
                  <Input
                    id="song-artist"
                    value={songArtist}
                    onChange={(e) => setSongArtist(e.target.value)}
                    placeholder="Nombre del artista"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Uso</Label>
                  <Select value={usageType} onValueChange={setUsageType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {USAGE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usage-duration">Duración del Uso</Label>
                  <Input
                    id="usage-duration"
                    value={usageDuration}
                    onChange={(e) => setUsageDuration(e.target.value)}
                    placeholder="Ej: 30 segundos, 1 minuto..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scene-description">Descripción de la Escena</Label>
                <Textarea
                  id="scene-description"
                  value={sceneDescription}
                  onChange={(e) => setSceneDescription(e.target.value)}
                  placeholder="Describe brevemente cómo se usará la música en la escena..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requester-name">Nombre *</Label>
                  <Input
                    id="requester-name"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    placeholder="Tu nombre completo"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requester-email">Email *</Label>
                  <Input
                    id="requester-email"
                    type="email"
                    value={requesterEmail}
                    onChange={(e) => setRequesterEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requester-company">Empresa</Label>
                  <Input
                    id="requester-company"
                    value={requesterCompany}
                    onChange={(e) => setRequesterCompany(e.target.value)}
                    placeholder="Nombre de tu empresa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="requester-phone">Teléfono</Label>
                  <Input
                    id="requester-phone"
                    value={requesterPhone}
                    onChange={(e) => setRequesterPhone(e.target.value)}
                    placeholder="+34 600 000 000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Budget Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Presupuesto (Opcional)</CardTitle>
              <CardDescription>
                Si tienes un presupuesto definido, indícalo aquí.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total-budget">Presupuesto Total (€)</Label>
                  <Input
                    id="total-budget"
                    type="number"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="music-budget">Presupuesto Música (€)</Label>
                  <Input
                    id="music-budget"
                    type="number"
                    value={musicBudget}
                    onChange={(e) => setMusicBudget(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas Adicionales</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Cualquier información adicional que quieras compartir..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full gap-2"
            size="lg"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar Solicitud
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
