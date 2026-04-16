import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { User, Globe, Building2, CheckCircle2, X, Loader2, Save, Music, Heart, Ruler, StickyNote } from 'lucide-react';
import mooditaLogo from '@/assets/moodita-logo.png';

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

  const [formData, setFormData] = useState<ArtistFormData>({
    name: '', stage_name: '', description: '', genre: '',
    instagram_url: '', spotify_url: '', tiktok_url: '',
    company_name: '', legal_name: '', tax_id: '', nif: '', tipo_entidad: '',
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
        })
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
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

        <form onSubmit={handleSubmit} className="space-y-6">
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
                <div className="space-y-2">
                  <Label htmlFor="stage_name">Nombre artístico</Label>
                  <Input id="stage_name" value={formData.stage_name} onChange={(e) => updateField('stage_name', e.target.value)} placeholder="Nombre artístico" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="genre">Género musical</Label>
                <Input id="genre" value={formData.genre} onChange={(e) => updateField('genre', e.target.value)} placeholder="Ej: Pop, Indie, Electrónica..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={formData.email} onChange={(e) => updateField('email', e.target.value)} placeholder="email@ejemplo.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" value={formData.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+34 600 000 000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" value={formData.address} onChange={(e) => updateField('address', e.target.value)} placeholder="Dirección completa" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Biografía</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Breve descripción del artista..." rows={4} />
              </div>
            </CardContent>
          </Card>

          {/* Social Media */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5" />Redes Sociales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instagram_url">Instagram</Label>
                <Input id="instagram_url" value={formData.instagram_url} onChange={(e) => updateField('instagram_url', e.target.value)} placeholder="https://instagram.com/..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spotify_url">Spotify</Label>
                <Input id="spotify_url" value={formData.spotify_url} onChange={(e) => updateField('spotify_url', e.target.value)} placeholder="https://open.spotify.com/artist/..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tiktok_url">TikTok</Label>
                <Input id="tiktok_url" value={formData.tiktok_url} onChange={(e) => updateField('tiktok_url', e.target.value)} placeholder="https://tiktok.com/@..." />
              </div>
            </CardContent>
          </Card>

          {/* Sizes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Ruler className="h-5 w-5" />Tallas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clothing_size">Talla de ropa</Label>
                  <Input id="clothing_size" value={formData.clothing_size} onChange={(e) => updateField('clothing_size', e.target.value)} placeholder="Ej: M, L, XL..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shoe_size">Talla de calzado</Label>
                  <Input id="shoe_size" value={formData.shoe_size} onChange={(e) => updateField('shoe_size', e.target.value)} placeholder="Ej: 42, 43..." />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Heart className="h-5 w-5" />Salud y Necesidades
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="allergies">Alergias / Intolerancias</Label>
                <Textarea id="allergies" value={formData.allergies} onChange={(e) => updateField('allergies', e.target.value)} placeholder="Alergias alimentarias, medicamentos, etc." rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="special_needs">Necesidades especiales</Label>
                <Textarea id="special_needs" value={formData.special_needs} onChange={(e) => updateField('special_needs', e.target.value)} placeholder="Cualquier necesidad especial..." rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* Fiscal Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" />Datos Fiscales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company_name">Empresa / Razón social</Label>
                  <Input id="company_name" value={formData.company_name} onChange={(e) => updateField('company_name', e.target.value)} placeholder="Nombre de la empresa" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal_name">Nombre legal</Label>
                  <Input id="legal_name" value={formData.legal_name} onChange={(e) => updateField('legal_name', e.target.value)} placeholder="Nombre completo legal" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax_id">CIF / NIF</Label>
                  <Input id="tax_id" value={formData.tax_id} onChange={(e) => updateField('tax_id', e.target.value)} placeholder="Número de identificación fiscal" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nif">NIF personal</Label>
                  <Input id="nif" value={formData.nif} onChange={(e) => updateField('nif', e.target.value)} placeholder="NIF personal" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo_entidad">Tipo de entidad</Label>
                <Input id="tipo_entidad" value={formData.tipo_entidad} onChange={(e) => updateField('tipo_entidad', e.target.value)} placeholder="Ej: Autónomo, S.L., S.A...." />
              </div>
            </CardContent>
          </Card>

          {/* Banking */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" />Datos Bancarios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="iban">IBAN</Label>
                <Input id="iban" value={formData.iban} onChange={(e) => updateField('iban', e.target.value)} placeholder="ES00 0000 0000 0000 0000 0000" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bank_name">Banco</Label>
                  <Input id="bank_name" value={formData.bank_name} onChange={(e) => updateField('bank_name', e.target.value)} placeholder="Nombre del banco" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="swift_code">SWIFT / BIC</Label>
                  <Input id="swift_code" value={formData.swift_code} onChange={(e) => updateField('swift_code', e.target.value)} placeholder="Código SWIFT" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
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

          {/* Submit */}
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
