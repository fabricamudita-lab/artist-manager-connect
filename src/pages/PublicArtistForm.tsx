import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { User, Globe, Building2, CheckCircle2, X, Loader2, Save, Music, Heart, Ruler, StickyNote, Puzzle } from 'lucide-react';
import mooditaLogo from '@/assets/moodita-logo.png';
import { loadCustomFieldsForEntity, type CustomField } from '@/hooks/useCustomFields';
import { isArtistFieldVisible, type ArtistFieldConfig } from '@/lib/artistFieldConfigPresets';
import { SocialLinksEditor } from '@/components/SocialLinksEditor';
import type { SocialLink } from '@/lib/social-platforms';

interface ArtistFormData {
  name: string;
  stage_name: string;
  description: string;
  genre: string;
  instagram_url: string;
  spotify_url: string;
  tiktok_url: string;
  company_name: string;
  legal_name: string;
  tax_id: string;
  nif: string;
  tipo_entidad: string;
  irpf_type: string;
  irpf_porcentaje: string;
  actividad_inicio: string;
  iban: string;
  bank_name: string;
  swift_code: string;
  clothing_size: string;
  shoe_size: string;
  allergies: string;
  special_needs: string;
  notes: string;
  email: string;
  phone: string;
  address: string;
}

export default function PublicArtistForm() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [artistId, setArtistId] = useState<string | null>(null);
  const [artistName, setArtistName] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customData, setCustomData] = useState<Record<string, string>>({});
  const [fieldConfig, setFieldConfig] = useState<ArtistFieldConfig>({});
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  const [formData, setFormData] = useState<ArtistFormData>({
    name: '', stage_name: '', description: '', genre: '',
    instagram_url: '', spotify_url: '', tiktok_url: '',
    company_name: '', legal_name: '', tax_id: '', nif: '', tipo_entidad: '',
    irpf_type: '', irpf_porcentaje: '', actividad_inicio: '',
    iban: '', bank_name: '', swift_code: '',
    clothing_size: '', shoe_size: '',
    allergies: '', special_needs: '',
    notes: '', email: '', phone: '', address: '',
  });

  useEffect(() => {
    if (token) validateAndLoad();
  }, [token]);

  const validateAndLoad = async () => {
    try {
      setLoading(true);
      const { data: tokenData, error: tokenError } = await supabase
        .from('artist_form_tokens' as any)
        .select('artist_id, is_active, expires_at')
        .eq('token', token)
        .single();

      if (tokenError || !tokenData) { setError('Este enlace no es válido.'); return; }
      const td = tokenData as any;
      if (!td.is_active) { setError('Este formulario ya no está activo.'); return; }
      if (td.expires_at && new Date(td.expires_at) < new Date()) { setError('Este enlace ha expirado.'); return; }

      const { data: artist, error: artistError } = await supabase
        .from('artists').select('*').eq('id', td.artist_id).single();

      if (artistError || !artist) { setError('No se encontró el artista asociado.'); return; }

      setArtistId(artist.id);
      setArtistName(artist.stage_name || artist.name);
      console.log('[PublicArtistForm] field_config recibido:', (artist as any).field_config);
      console.log('[PublicArtistForm] artist data:', artist);
      setFieldConfig(((artist as any).field_config as ArtistFieldConfig) || {});
      setFormData({
        name: artist.name || '',
        stage_name: artist.stage_name || '',
        description: artist.description || '',
        genre: artist.genre || '',
        instagram_url: artist.instagram_url || '',
        spotify_url: artist.spotify_url || '',
        tiktok_url: artist.tiktok_url || '',
        company_name: artist.company_name || '',
        legal_name: artist.legal_name || '',
        tax_id: artist.tax_id || '',
        nif: artist.nif || '',
        tipo_entidad: artist.tipo_entidad || '',
        irpf_type: (artist as any).irpf_type || '',
        irpf_porcentaje: (artist as any).irpf_porcentaje?.toString() || '',
        actividad_inicio: (artist as any).actividad_inicio || '',
        iban: artist.iban || '',
        bank_name: artist.bank_name || '',
        swift_code: artist.swift_code || '',
        clothing_size: artist.clothing_size || '',
        shoe_size: artist.shoe_size || '',
        allergies: artist.allergies || '',
        special_needs: artist.special_needs || '',
        notes: artist.notes || '',
        email: artist.email || '',
        phone: artist.phone || '',
        address: artist.address || '',
      });
      setCustomData(((artist as any).custom_data as Record<string, string>) || {});
      const rawSocial = (artist as any).social_links;
      setSocialLinks(Array.isArray(rawSocial) ? (rawSocial as SocialLink[]) : []);

      if (artist.workspace_id) {
        const cf = await loadCustomFieldsForEntity(artist.workspace_id, 'artist');
        setCustomFields(cf);
      }
    } catch (err) {
      console.error('Error loading form:', err);
      setError('Error al cargar el formulario.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistId) return;
    try {
      setSaving(true);
      const toNull = (v: string) => v.trim() || null;
      const { error: updateError } = await supabase
        .from('artists')
        .update({
          name: formData.name.trim() || undefined,
          stage_name: toNull(formData.stage_name),
          description: toNull(formData.description),
          genre: toNull(formData.genre),
          instagram_url: toNull(formData.instagram_url),
          spotify_url: toNull(formData.spotify_url),
          tiktok_url: toNull(formData.tiktok_url),
          company_name: toNull(formData.company_name),
          legal_name: toNull(formData.legal_name),
          tax_id: toNull(formData.tax_id),
          nif: toNull(formData.nif),
          tipo_entidad: toNull(formData.tipo_entidad),
          irpf_type: toNull(formData.irpf_type),
          irpf_porcentaje: formData.irpf_porcentaje ? parseFloat(formData.irpf_porcentaje) : null,
          actividad_inicio: toNull(formData.actividad_inicio),
          iban: toNull(formData.iban),
          bank_name: toNull(formData.bank_name),
          swift_code: toNull(formData.swift_code),
          clothing_size: toNull(formData.clothing_size),
          shoe_size: toNull(formData.shoe_size),
          allergies: toNull(formData.allergies),
          special_needs: toNull(formData.special_needs),
          notes: toNull(formData.notes),
          email: toNull(formData.email),
          phone: toNull(formData.phone),
          address: toNull(formData.address),
          custom_data: customData,
          social_links: socialLinks.filter((l) => l.url.trim()),
        } as any)
        .eq('id', artistId);

      if (updateError) throw updateError;
      setSaved(true);
      toast({ title: "Información actualizada", description: "Los datos se han guardado correctamente." });
    } catch (err) {
      console.error('Error saving:', err);
      toast({ title: "Error", description: "No se pudieron guardar los cambios.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof ArtistFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const v = (field: string) => isArtistFieldVisible(fieldConfig, field);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />Cargando formulario...
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

  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">¡Información guardada!</h2>
            <p className="text-muted-foreground">
              Los datos de {artistName} se han actualizado correctamente. Puedes cerrar esta página.
            </p>
            <Button variant="outline" className="mt-4" onClick={() => setSaved(false)}>
              Editar de nuevo
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderInput = (field: keyof ArtistFormData, label: string, placeholder?: string, type = 'text') => {
    if (!v(field)) return null;
    return (
      <div className="space-y-2" key={field}>
        <Label htmlFor={field}>{label}</Label>
        <Input id={field} type={type} value={formData[field]} onChange={(e) => updateField(field, e.target.value)} placeholder={placeholder || label} />
      </div>
    );
  };

  const renderTextarea = (field: keyof ArtistFormData, label: string, placeholder?: string, rows = 3) => {
    if (!v(field)) return null;
    return (
      <div className="space-y-2" key={field}>
        <Label htmlFor={field}>{label}</Label>
        <Textarea id={field} value={formData[field]} onChange={(e) => updateField(field, e.target.value)} placeholder={placeholder || label} rows={rows} />
      </div>
    );
  };

  // Debug mode via ?debug=1
  const isDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1';
  const formKey = JSON.stringify(fieldConfig);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <img src={mooditaLogo} alt="MOODITA" className="h-10 mx-auto mb-4" />
          <div className="inline-flex items-center gap-2 p-3 bg-primary/10 rounded-xl mb-4">
            <Music className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Ficha de Artista</h1>
          <p className="text-muted-foreground">
            Completa o actualiza la información de <strong>{artistName}</strong>
          </p>
        </div>

        {isDebug && (
          <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
            <CardContent className="p-4 text-xs font-mono space-y-1">
              <div><strong>DEBUG MODE</strong></div>
              <div>field_config: {JSON.stringify(fieldConfig)}</div>
              <div>social={String(v('instagram_url') || v('spotify_url') || v('tiktok_url'))} | sizes={String(v('clothing_size') || v('shoe_size'))} | health={String(v('allergies') || v('special_needs'))} | fiscal={String(v('company_name') || v('legal_name') || v('tax_id') || v('nif') || v('tipo_entidad') || v('irpf_type') || v('irpf_porcentaje') || v('actividad_inicio'))} | bank={String(v('iban') || v('bank_name') || v('swift_code'))} | notes={String(v('notes'))}</div>
            </CardContent>
          </Card>
        )}

        <form key={formKey} onSubmit={handleSubmit} className="space-y-6">
          {/* General Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre completo</Label>
                  <Input id="name" value={formData.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Nombre real" />
                </div>
                {renderInput('stage_name', 'Nombre artístico', 'Nombre artístico')}
              </div>
              {renderInput('genre', 'Género musical', 'Ej: Pop, Indie, Electrónica...')}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {renderInput('email', 'Email', 'email@ejemplo.com', 'email')}
                {renderInput('phone', 'Teléfono', '+34 600 000 000')}
              </div>
              {renderInput('address', 'Dirección', 'Dirección completa')}
              {renderTextarea('description', 'Biografía', 'Breve descripción del artista...', 4)}
            </CardContent>
          </Card>

          {/* Social Media */}
          {(v('instagram_url') || v('spotify_url') || v('tiktok_url')) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="h-5 w-5" />Redes Sociales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderInput('instagram_url', 'Instagram', 'https://instagram.com/...')}
                {renderInput('spotify_url', 'Spotify', 'https://open.spotify.com/artist/...')}
                {renderInput('tiktok_url', 'TikTok', 'https://tiktok.com/@...')}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Otras redes</Label>
                  <SocialLinksEditor value={socialLinks} onChange={setSocialLinks} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sizes */}
          {(v('clothing_size') || v('shoe_size')) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Ruler className="h-5 w-5" />Tallas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderInput('clothing_size', 'Talla de ropa', 'Ej: M, L, XL...')}
                  {renderInput('shoe_size', 'Talla de calzado', 'Ej: 42, 43...')}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Health */}
          {(v('allergies') || v('special_needs')) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Heart className="h-5 w-5" />Salud y Necesidades
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderTextarea('allergies', 'Alergias / Intolerancias', 'Alergias alimentarias, medicamentos, etc.', 3)}
                {renderTextarea('special_needs', 'Necesidades especiales', 'Cualquier necesidad especial...', 3)}
              </CardContent>
            </Card>
          )}

          {/* Fiscal */}
          {(v('company_name') || v('legal_name') || v('tax_id') || v('nif') || v('tipo_entidad') || v('irpf_type') || v('irpf_porcentaje') || v('actividad_inicio')) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />Datos Fiscales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderInput('company_name', 'Empresa / Razón social', 'Nombre de la empresa')}
                  {renderInput('legal_name', 'Nombre legal', 'Nombre completo legal')}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderInput('tax_id', 'CIF / NIF', 'Número de identificación fiscal')}
                  {renderInput('nif', 'NIF personal', 'NIF personal')}
                </div>
                {renderInput('tipo_entidad', 'Tipo de entidad', 'Ej: Autónomo, S.L., S.A....')}
                {renderInput('irpf_type', 'Tipo de IRPF', 'Ej: Artista, Profesional...')}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderInput('irpf_porcentaje', '% IRPF', 'Ej: 15', 'number')}
                  {renderInput('actividad_inicio', 'Inicio de actividad', '', 'date')}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Banking */}
          {(v('iban') || v('bank_name') || v('swift_code')) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" />Datos Bancarios
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderInput('iban', 'IBAN', 'ES00 0000 0000 0000 0000 0000')}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {renderInput('bank_name', 'Banco', 'Nombre del banco')}
                  {renderInput('swift_code', 'SWIFT / BIC', 'Código SWIFT')}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {v('notes') && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <StickyNote className="h-5 w-5" />Notas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea id="notes" value={formData.notes} onChange={(e) => updateField('notes', e.target.value)} placeholder="Notas adicionales..." rows={4} />
              </CardContent>
            </Card>
          )}

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Puzzle className="h-5 w-5" />Información adicional
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customFields.map((field) => {
                  const value = customData[field.field_key] || '';
                  const isTextarea = field.field_type === 'textarea';
                  const inputType = field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : field.field_type === 'email' ? 'email' : field.field_type === 'url' ? 'url' : field.field_type === 'phone' ? 'tel' : 'text';
                  return (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.field_key}>{field.label}</Label>
                      {isTextarea ? (
                        <Textarea id={field.field_key} value={value} onChange={(e) => setCustomData(prev => ({ ...prev, [field.field_key]: e.target.value }))} placeholder={field.label} rows={3} />
                      ) : (
                        <Input id={field.field_key} type={inputType} value={value} onChange={(e) => setCustomData(prev => ({ ...prev, [field.field_key]: e.target.value }))} placeholder={field.label} />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={saving}>
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
            ) : (
              <><Save className="h-4 w-4 mr-2" />Guardar Información</>
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground pb-8">
          Powered by MOODITA
        </p>
      </div>
    </div>
  );
}
