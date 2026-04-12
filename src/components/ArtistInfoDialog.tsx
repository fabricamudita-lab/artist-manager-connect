import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { User, Music, Globe, Edit, Save, X, Share2, Instagram, Loader2, Camera, Phone, MapPin, Mail, Shirt, Heart, Landmark, StickyNote, Receipt, ChevronDown, AlertTriangle, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { ImageCropperDialog } from '@/components/ui/image-cropper-dialog';
import { GenreCombobox } from '@/components/GenreCombobox';
import { cn } from '@/lib/utils';
import { IRPF_TYPE_OPTIONS, getIrpfForArtist } from '@/utils/irpf';

interface ArtistData {
  id: string;
  name: string;
  stage_name: string | null;
  description: string | null;
  genre: string | null;
  avatar_url: string | null;
  instagram_url: string | null;
  spotify_url: string | null;
  tiktok_url: string | null;
  company_name: string | null;
  legal_name: string | null;
  tax_id: string | null;
  brand_color: string | null;
  created_at: string;
  // Contact fields
  email: string | null;
  phone: string | null;
  address: string | null;
  // Sizes
  clothing_size: string | null;
  shoe_size: string | null;
  // Health
  allergies: string | null;
  special_needs: string | null;
  // Bank
  bank_name: string | null;
  iban: string | null;
  swift_code: string | null;
  // Notes
  notes: string | null;
}

const FORM_FIELDS = [
  'name', 'stage_name', 'description', 'genre',
  'email', 'phone', 'address',
  'instagram_url', 'spotify_url', 'tiktok_url',
  'clothing_size', 'shoe_size',
  'allergies', 'special_needs',
  'company_name', 'legal_name', 'tax_id',
  'bank_name', 'iban', 'swift_code',
  'notes',
  // Fiscal profile fields
  'irpf_type', 'irpf_porcentaje', 'actividad_inicio', 'nif', 'tipo_entidad',
] as const;

type FormData = Record<typeof FORM_FIELDS[number], string>;

const emptyForm = (): FormData => Object.fromEntries(FORM_FIELDS.map(f => [f, ''])) as FormData;

interface ArtistInfoDialogProps {
  artistId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ArtistInfoDialog({ artistId, open, onOpenChange }: ArtistInfoDialogProps) {
  const { profile: currentProfile } = useAuth();
  const navigate = useNavigate();
  const [artistData, setArtistData] = useState<ArtistData | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<FormData>(emptyForm());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Avatar upload states
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open && artistId) {
      fetchArtist();
    }
  }, [open, artistId]);

  const fetchArtist = async () => {
    if (!artistId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('artists')
        .select('*')
        .eq('id', artistId)
        .maybeSingle();

      if (error) throw error;
      if (!data) { setArtistData(null); return; }

      setArtistData(data as unknown as ArtistData);
      const fd = emptyForm();
      for (const key of FORM_FIELDS) {
        fd[key] = (data as any)[key] || '';
      }
      setFormData(fd);
    } catch (error) {
      console.error('Error fetching artist:', error);
      toast({ title: "Error", description: "No se pudo cargar la información del artista.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!artistId) return;
    try {
      const updateData: Record<string, string | null> = {};
      for (const key of FORM_FIELDS) {
        updateData[key] = formData[key] || null;
      }
      // name is required
      updateData.name = formData.name;

      const { error } = await supabase
        .from('artists')
        .update(updateData)
        .eq('id', artistId);

      if (error) throw error;
      toast({ title: "Éxito", description: "Información del artista actualizada." });
      setEditing(false);
      fetchArtist();
      queryClient.invalidateQueries({ queryKey: ['artists'] });
    } catch (error) {
      toast({ title: "Error", description: "No se pudo actualizar la información.", variant: "destructive" });
    }
  };

  const canEdit = currentProfile?.active_role === 'management';

  const handleDeleteArtist = async () => {
    if (!artistId) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('artists')
        .delete()
        .eq('id', artistId);

      if (error) throw error;

      toast({ title: "Artista eliminado", description: "El perfil del artista y todos sus datos asociados han sido eliminados." });
      setShowDeleteConfirm(false);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['artists'] });
      queryClient.invalidateQueries({ queryKey: ['management-artists'] });
      navigate('/mi-management');
    } catch (error) {
      console.error('Error deleting artist:', error);
      toast({ title: "Error", description: "No se pudo eliminar el artista.", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Solo se permiten archivos de imagen.", variant: "destructive" });
      return;
    }
    setCropFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAvatarUpload = async (blob: Blob) => {
    if (!artistId) return;
    setUploadingAvatar(true);
    setCropFile(null);
    try {
      const filePath = `${artistId}/${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('artist-assets')
        .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('artist-assets')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('artists')
        .update({ avatar_url: publicUrl.publicUrl })
        .eq('id', artistId);
      if (updateError) throw updateError;

      setArtistData(prev => prev ? { ...prev, avatar_url: publicUrl.publicUrl } : prev);
      queryClient.invalidateQueries({ queryKey: ['artists'] });
      toast({ title: "Éxito", description: "Imagen del artista actualizada." });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ title: "Error", description: "No se pudo subir la imagen.", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const [generatingLink, setGeneratingLink] = useState(false);

  const handleGenerateFormLink = async () => {
    if (!artistId) return;
    setGeneratingLink(true);
    try {
      const { data: existing } = await supabase
        .from('artist_form_tokens' as any)
        .select('token')
        .eq('artist_id', artistId)
        .eq('is_active', true)
        .maybeSingle();

      let tokenValue: string;
      if (existing && (existing as any).token) {
        tokenValue = (existing as any).token;
      } else {
        const { data: newToken, error } = await supabase
          .from('artist_form_tokens' as any)
          .insert({ artist_id: artistId, created_by: currentProfile?.user_id } as any)
          .select('token')
          .single();
        if (error) throw error;
        tokenValue = (newToken as any).token;
      }

      const url = `${window.location.origin}/artist-form/${tokenValue}`;
      await navigator.clipboard.writeText(url);
      toast({ title: "Enlace copiado", description: "El enlace del formulario se ha copiado al portapapeles." });
    } catch (err) {
      console.error('Error generating form link:', err);
      toast({ title: "Error", description: "No se pudo generar el enlace.", variant: "destructive" });
    } finally {
      setGeneratingLink(false);
    }
  };

  const set = (key: typeof FORM_FIELDS[number]) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setFormData(prev => ({ ...prev, [key]: e.target.value }));

  const renderField = (label: string, field: typeof FORM_FIELDS[number], icon?: React.ReactNode, placeholder?: string, forceDisabled?: boolean) => (
    <div className="space-y-2" key={field}>
      <Label className={icon ? "flex items-center gap-2" : ""}>{icon}{label}</Label>
      {editing && !forceDisabled ? (
        <Input value={formData[field]} onChange={set(field)} placeholder={placeholder || label} />
      ) : (
        <Input value={(artistData as any)?.[field] || 'No especificado'} disabled />
      )}
    </div>
  );

  const renderTextareaField = (label: string, field: typeof FORM_FIELDS[number], placeholder?: string, rows = 3) => (
    <div className="space-y-2" key={field}>
      <Label>{label}</Label>
      {editing ? (
        <Textarea value={formData[field]} onChange={set(field)} placeholder={placeholder || label} rows={rows} />
      ) : (
        <Textarea value={(artistData as any)?.[field] || 'Sin información'} disabled rows={rows} />
      )}
    </div>
  );

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent><div className="text-center py-8">Cargando información del artista...</div></DialogContent>
      </Dialog>
    );
  }

  if (!artistData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent><div className="text-center py-8">No se encontró información del artista.</div></DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Ficha del Artista
          </DialogTitle>
          <DialogDescription>Información detallada del artista</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={cn('relative group', canEdit && 'cursor-pointer')}
                    onClick={() => canEdit && fileInputRef.current?.click()}
                  >
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={artistData.avatar_url || ''} />
                      <AvatarFallback><User className="h-8 w-8" /></AvatarFallback>
                    </Avatar>
                    {canEdit && !uploadingAvatar && (
                      <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="h-5 w-5 text-white" />
                      </div>
                    )}
                    {uploadingAvatar && (
                      <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div>
                    <CardTitle>{artistData.name}</CardTitle>
                    {artistData.stage_name && <p className="text-sm text-muted-foreground">{artistData.stage_name}</p>}
                    {artistData.genre && <Badge variant="secondary">{artistData.genre}</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {canEdit && (
                    <Button variant="outline" size="sm" onClick={handleGenerateFormLink} disabled={generatingLink}>
                      {generatingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4 mr-2" />}
                      {!generatingLink && 'Formulario'}
                    </Button>
                  )}
                  {canEdit && (
                    <Button variant="outline" size="sm" onClick={() => setEditing(!editing)}>
                      {editing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

          {/* Image Cropper Dialog */}
          <ImageCropperDialog
            file={cropFile}
            open={!!cropFile}
            onConfirm={handleAvatarUpload}
            onCancel={() => setCropFile(null)}
            aspectRatio={1}
            circular
            title="Ajustar foto del artista"
          />

          {/* Información General */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Music className="h-5 w-5" />Información General</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField("Nombre", "name")}
                {renderField("Nombre artístico", "stage_name", undefined, "Nombre artístico")}
              </div>
              <div className="space-y-2">
                <Label>Género musical</Label>
                {editing ? (
                  <GenreCombobox value={formData.genre} onValueChange={(v) => setFormData(prev => ({ ...prev, genre: v }))} />
                ) : (
                  <Input value={artistData.genre || 'No especificado'} disabled />
                )}
              </div>
              {renderTextareaField("Descripción / Bio", "description", "Biografía del artista")}
            </CardContent>
          </Card>

          {/* Contacto */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Phone className="h-5 w-5" />Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField("Email", "email", <Mail className="h-4 w-4" />, "email@ejemplo.com")}
                {renderField("Teléfono", "phone", <Phone className="h-4 w-4" />, "+34 600 000 000")}
              </div>
              {renderField("Dirección", "address", <MapPin className="h-4 w-4" />, "Dirección completa")}
            </CardContent>
          </Card>

          {/* Redes Sociales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />Redes Sociales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderField("Instagram", "instagram_url", <Instagram className="h-4 w-4" />, "https://instagram.com/...")}
              {renderField("Spotify", "spotify_url", undefined, "https://open.spotify.com/...")}
              {renderField("TikTok", "tiktok_url", undefined, "https://tiktok.com/...")}
            </CardContent>
          </Card>

          {/* Tallas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Shirt className="h-5 w-5" />Tallas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField("Talla de ropa", "clothing_size", undefined, "M, L, XL...")}
                {renderField("Talla de calzado", "shoe_size", undefined, "42, 43...")}
              </div>
            </CardContent>
          </Card>

          {/* Salud y Necesidades */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Heart className="h-5 w-5" />Salud y Necesidades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderTextareaField("Alergias", "allergies", "Alergias alimentarias, medicamentos...", 2)}
              {renderTextareaField("Necesidades especiales", "special_needs", "Requisitos especiales...", 2)}
            </CardContent>
          </Card>

          {/* Datos Fiscales (solo management) */}
          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Datos Fiscales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {renderField("Empresa", "company_name", undefined, "Nombre de empresa")}
                  {renderField("Nombre legal", "legal_name", undefined, "Nombre legal")}
                </div>
                {renderField("CIF / NIF", "tax_id", undefined, "CIF o NIF")}
              </CardContent>
            </Card>
          )}

          {/* Perfil Fiscal — IRPF dinámico */}
          {canEdit && (
            <Card>
              <Collapsible defaultOpen={false}>
                <CardHeader className="pb-2">
                  <CollapsibleTrigger asChild>
                    <button className="flex items-center justify-between w-full text-left">
                      <CardTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5" />
                        Perfil Fiscal
                      </CardTitle>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                    </button>
                  </CollapsibleTrigger>
                  <p className="text-xs text-muted-foreground mt-1">Información fiscal — usada en presupuestos y liquidaciones</p>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4 pt-2">
                    {/* Tipo de IRPF */}
                    <div className="space-y-2">
                      <Label>Tipo de IRPF</Label>
                      {editing ? (
                        <Select
                          value={formData.irpf_type || 'profesional_establecido'}
                          onValueChange={(v) => setFormData(prev => ({ ...prev, irpf_type: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {IRPF_TYPE_OPTIONS.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div>
                                  <span>{opt.label}</span>
                                  <span className="text-muted-foreground ml-2 text-xs">— {opt.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={IRPF_TYPE_OPTIONS.find(o => o.value === (artistData as any)?.irpf_type)?.label || 'Profesional establecido'}
                          disabled
                        />
                      )}
                    </div>

                    {/* % personalizado — solo visible si tipo = personalizado */}
                    {(editing ? formData.irpf_type : (artistData as any)?.irpf_type) === 'personalizado' && (
                      <div className="space-y-2">
                        <Label>Porcentaje IRPF personalizado (%)</Label>
                        {editing ? (
                          <Input
                            type="number"
                            value={formData.irpf_porcentaje || '15'}
                            onChange={(e) => setFormData(prev => ({ ...prev, irpf_porcentaje: e.target.value }))}
                            min={0}
                            max={100}
                          />
                        ) : (
                          <Input value={`${(artistData as any)?.irpf_porcentaje ?? 15}%`} disabled />
                        )}
                      </div>
                    )}

                    {/* Fecha inicio actividad */}
                    <div className="space-y-2">
                      <Label>Fecha inicio actividad</Label>
                      {editing ? (
                        <Input
                          type="date"
                          value={formData.actividad_inicio || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, actividad_inicio: e.target.value }))}
                        />
                      ) : (
                        <Input value={(artistData as any)?.actividad_inicio || 'No especificada'} disabled />
                      )}
                    </div>

                    {/* Graduated warning */}
                    {(() => {
                      const result = getIrpfForArtist(artistData as any);
                      return result.warning ? (
                        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-foreground">
                          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                          <span>{result.warning}</span>
                        </div>
                      ) : null;
                    })()}

                    {/* NIF */}
                    {renderField("NIF / NIE", "nif", undefined, "12345678A")}

                    {/* Tipo de entidad */}
                    <div className="space-y-2">
                      <Label>Tipo de entidad</Label>
                      {editing ? (
                        <Select
                          value={formData.tipo_entidad || 'persona_fisica'}
                          onValueChange={(v) => setFormData(prev => ({ ...prev, tipo_entidad: v }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="persona_fisica">Persona física</SelectItem>
                            <SelectItem value="sociedad">Sociedad</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={(artistData as any)?.tipo_entidad === 'sociedad' ? 'Sociedad' : 'Persona física'}
                          disabled
                        />
                      )}
                    </div>

                    {/* IRPF calculation preview */}
                    {!editing && (
                      <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
                        IRPF aplicable: <span className="font-medium text-foreground">{getIrpfForArtist(artistData as any).percentage}%</span>
                        {' — '}
                        {getIrpfForArtist(artistData as any).label}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}

          {/* Datos Bancarios (solo management) */}
          {canEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Landmark className="h-5 w-5" />Datos Bancarios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {renderField("Banco", "bank_name", undefined, "Nombre del banco")}
                {renderField("IBAN", "iban", undefined, "ES00 0000 0000 0000 0000 0000")}
                {renderField("Código SWIFT", "swift_code", undefined, "BBVAESMMXXX")}
              </CardContent>
            </Card>
          )}

          {/* Observaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><StickyNote className="h-5 w-5" />Observaciones</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTextareaField("Notas", "notes", "Notas adicionales sobre el artista...", 3)}
            </CardContent>
          </Card>

          {/* Botones */}
          {editing && (
            <div className="flex gap-2 justify-end">
              <Button onClick={handleSave}><Save className="h-4 w-4 mr-2" />Guardar Cambios</Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
            </div>
          )}

          {/* Zona de peligro - Eliminar artista */}
          {canEdit && !editing && (
            <div className="border-t border-destructive/20 pt-4 mt-4">
              <Button
                variant="outline"
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar artista
              </Button>
            </div>
          )}
        </div>

        <ConfirmationDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="¿Eliminar artista?"
          description={`Se eliminará permanentemente "${artistData?.stage_name || artistData?.name}" y todos sus datos asociados (bookings, proyectos, releases, archivos, etc.). Esta acción no se puede deshacer.`}
          confirmText="Eliminar artista"
          cancelText="Cancelar"
          variant="destructive"
          icon="delete"
          onConfirm={handleDeleteArtist}
        />
      </DialogContent>
    </Dialog>
  );
}
