import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Users, UserCheck, FileUser, Camera, LayoutGrid, CreditCard, FolderOpen, User, Shield, BookOpen, Mail, Phone, MapPin, Building, Edit2, Settings, Upload, X, FileImage, Eye, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreateContactDialog } from '@/components/CreateContactDialog';
import { EditContactDialog } from '@/components/EditContactDialog';
import { ContactShareDialog } from '@/components/ContactShareDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { RolodexView } from '@/components/RolodexView';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ManageContactGroupsDialog } from '@/components/ManageContactGroupsDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';

interface Contact {
  id: string;
  name: string;
  stage_name?: string;
  legal_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  bank_info?: string;
  iban?: string;
  clothing_size?: string;
  shoe_size?: string;
  allergies?: string;
  special_needs?: string;
  contract_url?: string;
  preferred_hours?: string;
  company?: string;
  role?: string;
  category: string;
  city?: string;
  country?: string;
  notes?: string;
  field_config: any;
  is_public: boolean;
  public_slug?: string;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  emergency_contact?: string;
  team_contacts?: string;
  internal_notes?: string;
  // New extended fields
  stage_name?: string;
  first_name?: string;
  last_name?: string;
  second_last_name?: string;
  dni_nie?: string;
  birth_date?: string;
  social_security?: string;
  street?: string;
  postal_code?: string;
  province?: string;
  city?: string;
  country?: string;
  shoe_size?: string;
  pants_size?: string;
  shirt_size?: string;
  jacket_size?: string;
  height?: string;
  allergies?: string;
  is_smoker?: boolean;
  license_type?: string;
  home_phone?: string;
  iban?: string;
  observations?: string;
  // Document photos
  dni_photo_url?: string;
  passport_photo_url?: string;
  drivers_license_photo_url?: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  permissions: {
    documents: 'none' | 'view' | 'edit' | 'owner';
    solicitudes: 'none' | 'view' | 'edit' | 'owner';
    carpetas: 'none' | 'view' | 'edit' | 'owner';
    booking: 'none' | 'view' | 'edit' | 'owner';
    presupuestos: 'none' | 'view' | 'edit' | 'owner';
  };
}

const CATEGORIES = [
  { value: 'artistas', label: 'Artistas', icon: Users },
  { value: 'tecnicos', label: 'Técnicos', icon: UserCheck },
  { value: 'contables', label: 'Contables', icon: FileUser },
  { value: 'prensa', label: 'Prensa', icon: Camera },
  { value: 'produccion', label: 'Producción', icon: Users },
  { value: 'disenadores', label: 'Diseñadores', icon: Camera },
  { value: 'general', label: 'General', icon: Users },
];

// Profile Tab Component
function ProfileTab() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    stage_name: '',
    first_name: '',
    last_name: '',
    second_last_name: '',
    phone: '',
    home_phone: '',
    emergency_contact: '',
    email: '',
    dni_nie: '',
    birth_date: '',
    social_security: '',
    street: '',
    postal_code: '',
    province: '',
    city: '',
    country: '',
    shoe_size: '',
    pants_size: '',
    shirt_size: '',
    jacket_size: '',
    height: '',
    allergies: '',
    is_smoker: false,
    license_type: '',
    iban: '',
    observations: '',
    team_contacts: '',
    internal_notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const dniInputRef = useRef<HTMLInputElement>(null);
  const passportInputRef = useRef<HTMLInputElement>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setProfile(data);
      if (data) {
        setEditForm({
          full_name: data.full_name || '',
          stage_name: data.stage_name || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          second_last_name: data.second_last_name || '',
          phone: data.phone || '',
          home_phone: data.home_phone || '',
          emergency_contact: data.emergency_contact || '',
          email: data.email || '',
          dni_nie: data.dni_nie || '',
          birth_date: data.birth_date || '',
          social_security: data.social_security || '',
          street: data.street || '',
          postal_code: data.postal_code || '',
          province: data.province || '',
          city: data.city || '',
          country: data.country || '',
          shoe_size: data.shoe_size || '',
          pants_size: data.pants_size || '',
          shirt_size: data.shirt_size || '',
          jacket_size: data.jacket_size || '',
          height: data.height || '',
          allergies: data.allergies || '',
          is_smoker: data.is_smoker || false,
          license_type: data.license_type || '',
          iban: data.iban || '',
          observations: data.observations || '',
          team_contacts: data.team_contacts || '',
          internal_notes: data.internal_notes || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name || null,
          stage_name: editForm.stage_name || null,
          first_name: editForm.first_name || null,
          last_name: editForm.last_name || null,
          second_last_name: editForm.second_last_name || null,
          phone: editForm.phone || null,
          home_phone: editForm.home_phone || null,
          emergency_contact: editForm.emergency_contact || null,
          dni_nie: editForm.dni_nie || null,
          birth_date: editForm.birth_date || null,
          social_security: editForm.social_security || null,
          street: editForm.street || null,
          postal_code: editForm.postal_code || null,
          province: editForm.province || null,
          city: editForm.city || null,
          country: editForm.country || null,
          shoe_size: editForm.shoe_size || null,
          pants_size: editForm.pants_size || null,
          shirt_size: editForm.shirt_size || null,
          jacket_size: editForm.jacket_size || null,
          height: editForm.height || null,
          allergies: editForm.allergies || null,
          is_smoker: editForm.is_smoker,
          license_type: editForm.license_type || null,
          iban: editForm.iban || null,
          observations: editForm.observations || null,
          team_contacts: editForm.team_contacts || null,
          internal_notes: editForm.internal_notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Perfil actualizado',
        description: 'Los cambios se han guardado correctamente',
      });
      setIsEditing(false);
      fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el perfil',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDocumentUpload = async (
    file: File,
    docType: 'dni' | 'passport' | 'drivers_license'
  ) => {
    if (!user) return;
    setUploadingDoc(docType);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${docType}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('identity-documents')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Store the path, not public URL (bucket is private)
      const columnName = `${docType}_photo_url`;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [columnName]: fileName })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: 'Documento subido',
        description: 'El documento se ha guardado correctamente',
      });
      fetchProfile();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: 'Error',
        description: 'No se pudo subir el documento',
        variant: 'destructive',
      });
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleDeleteDocument = async (docType: 'dni' | 'passport' | 'drivers_license') => {
    if (!user) return;
    try {
      const columnName = `${docType}_photo_url`;
      const { error } = await supabase
        .from('profiles')
        .update({ [columnName]: null })
        .eq('user_id', user.id);

      if (error) throw error;
      toast({ title: 'Documento eliminado' });
      fetchProfile();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const getSignedUrl = async (filePath: string): Promise<string | null> => {
    if (!filePath) return null;
    // If it's already a full URL (legacy data), return as is
    if (filePath.startsWith('http')) return filePath;
    
    const { data, error } = await supabase.storage
      .from('identity-documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry
    
    if (error) {
      console.error('Error getting signed URL:', error);
      return null;
    }
    return data.signedUrl;
  };

  const handleDownloadDocument = async (filePath: string, fileName: string) => {
    try {
      const signedUrl = await getSignedUrl(filePath);
      if (!signedUrl) {
        toast({ title: 'Error', description: 'No se pudo obtener el documento', variant: 'destructive' });
        return;
      }
      
      const response = await fetch(signedUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      toast({ title: 'Error', description: 'No se pudo descargar el documento', variant: 'destructive' });
    }
  };

  const DocumentUploadCard = ({ 
    label, 
    docType, 
    filePath, 
    inputRef 
  }: { 
    label: string; 
    docType: 'dni' | 'passport' | 'drivers_license'; 
    filePath?: string | null; 
    inputRef: React.RefObject<HTMLInputElement>;
  }) => {
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [loadingUrl, setLoadingUrl] = useState(false);

    useEffect(() => {
      if (filePath) {
        setLoadingUrl(true);
        getSignedUrl(filePath).then(url => {
          setSignedUrl(url);
          setLoadingUrl(false);
        });
      } else {
        setSignedUrl(null);
      }
    }, [filePath]);

    return (
      <div className="border rounded-lg p-3 space-y-2">
        <Label className="text-sm">{label}</Label>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleDocumentUpload(file, docType);
          }}
        />
        {filePath ? (
          <div className="relative group">
            {loadingUrl ? (
              <div className="w-full h-24 bg-muted rounded flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Cargando...</span>
              </div>
            ) : signedUrl ? (
              <img src={signedUrl} alt={label} className="w-full h-24 object-cover rounded" />
            ) : (
              <div className="w-full h-24 bg-muted rounded flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Error al cargar</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded">
              <Button size="sm" variant="secondary" onClick={async () => {
                const url = await getSignedUrl(filePath);
                if (url) setPreviewImage(url);
              }}>
                <Eye className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleDownloadDocument(filePath, `${label}.jpg`)}>
                <Download className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDeleteDocument(docType)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full h-24 flex flex-col items-center justify-center gap-2"
            onClick={() => inputRef.current?.click()}
            disabled={uploadingDoc === docType}
          >
            {uploadingDoc === docType ? (
              <span className="text-xs">Subiendo...</span>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                <span className="text-xs">Subir foto</span>
              </>
            )}
          </Button>
        )}
      </div>
    );
  };

  // Component for displaying documents in profile view (read-only with download)
  const DocumentDisplayCard = ({ 
    label, 
    filePath,
    getSignedUrl,
    onPreview,
    onDownload
  }: { 
    label: string; 
    filePath: string;
    getSignedUrl: (path: string) => Promise<string | null>;
    onPreview: (url: string) => void;
    onDownload: (path: string, name: string) => void;
  }) => {
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      getSignedUrl(filePath).then(url => {
        setSignedUrl(url);
        setLoading(false);
      });
    }, [filePath]);

    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="relative group">
          {loading ? (
            <div className="w-full h-24 bg-muted rounded flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Cargando...</span>
            </div>
          ) : signedUrl ? (
            <img
              src={signedUrl}
              alt={label}
              className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80 transition"
              onClick={async () => {
                const url = await getSignedUrl(filePath);
                if (url) onPreview(url);
              }}
            />
          ) : (
            <div className="w-full h-24 bg-muted rounded flex items-center justify-center">
              <span className="text-xs text-muted-foreground">Error al cargar</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded">
            <Button size="sm" variant="secondary" onClick={async () => {
              const url = await getSignedUrl(filePath);
              if (url) onPreview(url);
            }}>
              <Eye className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onDownload(filePath, `${label}.jpg`)}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Helper to show field only if it has a value
  const ProfileField = ({ label, value }: { label: string; value?: string | null }) => {
    if (!value) return null;
    return (
      <div>
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
        <p className="text-sm">{value}</p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-muted rounded-lg"></div>
        <div className="h-48 bg-muted rounded-lg"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Edit Profile Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Actualiza tu información personal
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {/* Identificación */}
            <div className="md:col-span-2">
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Identificación</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stage_name">Nombre Artístico</Label>
              <Input id="stage_name" value={editForm.stage_name} onChange={(e) => setEditForm({ ...editForm, stage_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input id="email" value={editForm.email} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="first_name">Nombre</Label>
              <Input id="first_name" value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dni_nie">DNI/NIE</Label>
              <Input id="dni_nie" value={editForm.dni_nie} onChange={(e) => setEditForm({ ...editForm, dni_nie: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Primer Apellido</Label>
              <Input id="last_name" value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
              <Input id="birth_date" type="date" value={editForm.birth_date} onChange={(e) => setEditForm({ ...editForm, birth_date: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="second_last_name">Segundo Apellido</Label>
              <Input id="second_last_name" value={editForm.second_last_name} onChange={(e) => setEditForm({ ...editForm, second_last_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="social_security">Seguridad Social</Label>
              <Input id="social_security" value={editForm.social_security} onChange={(e) => setEditForm({ ...editForm, social_security: e.target.value })} />
            </div>

            {/* Dirección */}
            <div className="md:col-span-2 mt-4">
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Dirección</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="street">Calle</Label>
              <Input id="street" value={editForm.street} onChange={(e) => setEditForm({ ...editForm, street: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">Código Postal</Label>
              <Input id="postal_code" value={editForm.postal_code} onChange={(e) => setEditForm({ ...editForm, postal_code: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Población</Label>
              <Input id="city" value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="province">Provincia</Label>
              <Input id="province" value={editForm.province} onChange={(e) => setEditForm({ ...editForm, province: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">País</Label>
              <Input id="country" value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} />
            </div>

            {/* Tallas */}
            <div className="md:col-span-2 mt-4">
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Tallas</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shoe_size">Zapato</Label>
              <Input id="shoe_size" value={editForm.shoe_size} onChange={(e) => setEditForm({ ...editForm, shoe_size: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pants_size">Pantalón</Label>
              <Input id="pants_size" value={editForm.pants_size} onChange={(e) => setEditForm({ ...editForm, pants_size: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shirt_size">Camisa</Label>
              <Input id="shirt_size" value={editForm.shirt_size} onChange={(e) => setEditForm({ ...editForm, shirt_size: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jacket_size">Chaqueta</Label>
              <Input id="jacket_size" value={editForm.jacket_size} onChange={(e) => setEditForm({ ...editForm, jacket_size: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Altura</Label>
              <Input id="height" value={editForm.height} onChange={(e) => setEditForm({ ...editForm, height: e.target.value })} placeholder="ej: 175 cm" />
            </div>

            {/* Salud y otros */}
            <div className="md:col-span-2 mt-4">
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Salud y Otros</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="allergies">Alergias (alimentarias/medicamentos)</Label>
              <Textarea id="allergies" value={editForm.allergies} onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="license_type">Carné/Tipo</Label>
              <Input id="license_type" value={editForm.license_type} onChange={(e) => setEditForm({ ...editForm, license_type: e.target.value })} placeholder="ej: B, B+E, C" />
            </div>
            <div className="space-y-2 flex items-center gap-3 pt-6">
              <input type="checkbox" id="is_smoker" checked={editForm.is_smoker} onChange={(e) => setEditForm({ ...editForm, is_smoker: e.target.checked })} className="w-4 h-4" />
              <Label htmlFor="is_smoker">Fumador/a</Label>
            </div>

            {/* Contacto */}
            <div className="md:col-span-2 mt-4">
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Contacto</h3>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono Móvil</Label>
              <Input id="phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="home_phone">Teléfono Casa</Label>
              <Input id="home_phone" value={editForm.home_phone} onChange={(e) => setEditForm({ ...editForm, home_phone: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergency_contact">Contacto de Emergencia</Label>
              <Input id="emergency_contact" value={editForm.emergency_contact} onChange={(e) => setEditForm({ ...editForm, emergency_contact: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN</Label>
              <Input id="iban" value={editForm.iban} onChange={(e) => setEditForm({ ...editForm, iban: e.target.value })} />
            </div>

            {/* Documentos de Identidad */}
            <div className="md:col-span-2 mt-4">
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Documentos de Identidad</h3>
            </div>
            <div className="md:col-span-2 grid grid-cols-3 gap-4">
              <DocumentUploadCard label="DNI" docType="dni" filePath={profile?.dni_photo_url} inputRef={dniInputRef} />
              <DocumentUploadCard label="Pasaporte" docType="passport" filePath={profile?.passport_photo_url} inputRef={passportInputRef} />
              <DocumentUploadCard label="Carné de Conducir" docType="drivers_license" filePath={profile?.drivers_license_photo_url} inputRef={licenseInputRef} />
            </div>

            {/* Observaciones */}
            <div className="md:col-span-2 mt-4">
              <h3 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Observaciones</h3>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="observations">Observaciones</Label>
              <Textarea id="observations" value={editForm.observations} onChange={(e) => setEditForm({ ...editForm, observations: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile?.avatar_url || ''} />
              <AvatarFallback className="text-2xl">
                {(profile?.stage_name || profile?.full_name)?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{profile?.stage_name || profile?.full_name || 'Sin nombre'}</h2>
                  {profile?.stage_name && profile?.full_name && (
                    <p className="text-muted-foreground">{profile.full_name}</p>
                  )}
                  <p className="text-muted-foreground text-sm">{profile?.email}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar Perfil
                </Button>
              </div>
              <div className="flex flex-wrap gap-4 mt-4">
                {profile?.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    {profile.phone}
                  </div>
                )}
                {profile?.city && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {[profile.city, profile.province, profile.country].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details - Only show cards with data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identificación */}
        {(profile?.first_name || profile?.last_name || profile?.dni_nie || profile?.birth_date || profile?.social_security) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5" />
                Identificación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ProfileField label="Nombre" value={profile?.first_name} />
              <ProfileField label="Primer Apellido" value={profile?.last_name} />
              <ProfileField label="Segundo Apellido" value={profile?.second_last_name} />
              <ProfileField label="DNI/NIE" value={profile?.dni_nie} />
              <ProfileField label="Fecha de Nacimiento" value={profile?.birth_date} />
              <ProfileField label="Seguridad Social" value={profile?.social_security} />
            </CardContent>
          </Card>
        )}

        {/* Dirección */}
        {(profile?.street || profile?.postal_code || profile?.city || profile?.province || profile?.country) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Dirección
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ProfileField label="Calle" value={profile?.street} />
              <ProfileField label="Código Postal" value={profile?.postal_code} />
              <ProfileField label="Población" value={profile?.city} />
              <ProfileField label="Provincia" value={profile?.province} />
              <ProfileField label="País" value={profile?.country} />
            </CardContent>
          </Card>
        )}

        {/* Tallas */}
        {(profile?.shoe_size || profile?.pants_size || profile?.shirt_size || profile?.jacket_size || profile?.height) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tallas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ProfileField label="Zapato" value={profile?.shoe_size} />
              <ProfileField label="Pantalón" value={profile?.pants_size} />
              <ProfileField label="Camisa" value={profile?.shirt_size} />
              <ProfileField label="Chaqueta" value={profile?.jacket_size} />
              <ProfileField label="Altura" value={profile?.height} />
            </CardContent>
          </Card>
        )}

        {/* Salud */}
        {(profile?.allergies || profile?.is_smoker || profile?.license_type) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Salud y Otros
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ProfileField label="Alergias" value={profile?.allergies} />
              {profile?.is_smoker && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fumador/a</label>
                  <p className="text-sm">Sí</p>
                </div>
              )}
              <ProfileField label="Carné/Tipo" value={profile?.license_type} />
            </CardContent>
          </Card>
        )}

        {/* Contacto y Financiero */}
        {(profile?.phone || profile?.home_phone || profile?.emergency_contact || profile?.iban) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ProfileField label="Teléfono Móvil" value={profile?.phone} />
              <ProfileField label="Teléfono Casa" value={profile?.home_phone} />
              <ProfileField label="Contacto de Emergencia" value={profile?.emergency_contact} />
              <ProfileField label="IBAN" value={profile?.iban} />
            </CardContent>
          </Card>
        )}

        {/* Documentos de Identidad */}
        {(profile?.dni_photo_url || profile?.passport_photo_url || profile?.drivers_license_photo_url) && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileImage className="w-5 h-5" />
                Documentos de Identidad
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {profile?.dni_photo_url && (
                  <DocumentDisplayCard 
                    label="DNI" 
                    filePath={profile.dni_photo_url} 
                    getSignedUrl={getSignedUrl}
                    onPreview={setPreviewImage}
                    onDownload={handleDownloadDocument}
                  />
                )}
                {profile?.passport_photo_url && (
                  <DocumentDisplayCard 
                    label="Pasaporte" 
                    filePath={profile.passport_photo_url} 
                    getSignedUrl={getSignedUrl}
                    onPreview={setPreviewImage}
                    onDownload={handleDownloadDocument}
                  />
                )}
                {profile?.drivers_license_photo_url && (
                  <DocumentDisplayCard 
                    label="Carné de Conducir" 
                    filePath={profile.drivers_license_photo_url} 
                    getSignedUrl={getSignedUrl}
                    onPreview={setPreviewImage}
                    onDownload={handleDownloadDocument}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Observaciones */}
        {profile?.observations && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Observaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{profile.observations}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Vista previa</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <img src={previewImage} alt="Documento" className="w-full h-auto rounded" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Teams Tab Component
function TeamsTab() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      // Fetch workspace members with their profiles
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('workspace_id')
        .eq('user_id', user.id)
        .single();

      if (!profile?.workspace_id) {
        setLoading(false);
        return;
      }

      const { data: members, error } = await supabase
        .from('workspace_memberships')
        .select(`
          id,
          user_id,
          role,
          profiles!inner(full_name, email, avatar_url)
        `)
        .eq('workspace_id', profile.workspace_id);

      if (error) throw error;

      const formattedMembers: TeamMember[] = (members || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        full_name: m.profiles?.full_name || 'Sin nombre',
        email: m.profiles?.email || '',
        avatar_url: m.profiles?.avatar_url,
        permissions: {
          documents: 'view',
          solicitudes: 'view',
          carpetas: 'view',
          booking: 'view',
          presupuestos: 'view',
        }
      }));

      setTeamMembers(formattedMembers);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const permissionLabels = {
    none: { label: 'Sin acceso', color: 'bg-muted text-muted-foreground' },
    view: { label: 'Ver', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
    edit: { label: 'Editar', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
    owner: { label: 'Propietario', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' },
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Gestión de Equipos</h2>
          <p className="text-sm text-muted-foreground">
            Administra los accesos y permisos de tu equipo
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Invitar Miembro
        </Button>
      </div>

      {teamMembers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Sin miembros de equipo</h3>
            <p className="text-muted-foreground mb-4">
              Invita a personas a tu equipo para colaborar
            </p>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Invitar Primer Miembro
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {teamMembers.map((member) => (
            <Card key={member.id}>
              <CardContent className="py-4">
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarImage src={member.avatar_url || ''} />
                    <AvatarFallback>
                      {member.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{member.full_name}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {member.role}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>

                <Separator className="my-4" />

                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {Object.entries(member.permissions).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <p className="text-xs text-muted-foreground capitalize mb-1">{key}</p>
                      <Badge className={`text-xs ${permissionLabels[value].color}`}>
                        {permissionLabels[value].label}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Agenda Tab Component (existing contacts functionality)
function AgendaTab() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCity, setSelectedCity] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [sharingContact, setSharingContact] = useState<Contact | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'rolodex'>('grid');
  const [isManageGroupsOpen, setIsManageGroupsOpen] = useState(false);
  const [groups, setGroups] = useState<Array<{ id: string; name: string; color: string }>>([]);

  const cities = Array.from(new Set(contacts.map(c => c.city).filter(Boolean))).sort();

  useEffect(() => {
    fetchContacts();
    fetchGroups();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchTerm, selectedCategory, selectedCity, selectedGroup]);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los contactos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('contact_groups')
        .select('id, name, color')
        .order('name');

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const filterContacts = async () => {
    let filtered = contacts;

    if (searchTerm) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(contact => {
        const searchableFields: string[] = [contact.name];
        if (contact.stage_name) searchableFields.push(contact.stage_name);
        if (contact.legal_name) searchableFields.push(contact.legal_name);
        if (contact.role) searchableFields.push(contact.role);
        if (contact.company) searchableFields.push(contact.company);
        if (contact.email) searchableFields.push(contact.email);
        if (contact.phone) searchableFields.push(contact.phone);
        if (contact.city) searchableFields.push(contact.city);
        if (contact.country) searchableFields.push(contact.country);
        return searchableFields.some(field => field.toLowerCase().includes(term));
      });
    }

    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(contact => contact.category === selectedCategory);
    }

    if (selectedCity && selectedCity !== 'all') {
      filtered = filtered.filter(contact => contact.city === selectedCity);
    }

    if (selectedGroup && selectedGroup !== 'all') {
      try {
        const { data } = await supabase
          .from('contact_group_members')
          .select('contact_id')
          .eq('group_id', selectedGroup);

        const contactIdsInGroup = new Set(data?.map(m => m.contact_id) || []);
        filtered = filtered.filter(contact => contactIdsInGroup.has(contact.id));
      } catch (error) {
        console.error('Error filtering by group:', error);
      }
    }

    setFilteredContacts(filtered);
  };

  const handleContactCreated = () => {
    fetchContacts();
    setIsCreateDialogOpen(false);
  };

  const handleContactUpdated = () => {
    fetchContacts();
    setEditingContact(null);
  };

  const getCategoryInfo = (category: string) => {
    return CATEGORIES.find(cat => cat.value === category) || CATEGORIES[6];
  };

  const getContactDisplayName = (contact: Contact) => {
    if (contact.field_config?.stage_name && contact.stage_name) {
      return contact.stage_name;
    }
    return contact.name;
  };

  const getContactSecondaryName = (contact: Contact) => {
    if (contact.field_config?.legal_name && contact.legal_name && contact.stage_name && contact.legal_name !== contact.stage_name) {
      return contact.legal_name;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-muted rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Agenda de Contactos</h2>
          <p className="text-sm text-muted-foreground">
            {filteredContacts.length} contactos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsManageGroupsOpen(true)}>
            <FolderOpen className="w-4 h-4 mr-2" />
            Grupos
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Contacto
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por nombre, rol, ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {CATEGORIES.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Ciudad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {cities.map((city) => (
              <SelectItem key={`city-${city}`} value={city as string}>
                {city}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Grupo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: group.color || '#3b82f6' }}
                  />
                  {group.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <ToggleGroup type="single" value={viewMode} onValueChange={(value) => value && setViewMode(value as 'grid' | 'rolodex')}>
          <ToggleGroupItem value="grid" aria-label="Vista en cuadrícula">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="rolodex" aria-label="Vista Rolodex">
            <CreditCard className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => {
            const categoryInfo = getCategoryInfo(contact.category);
            const displayName = getContactDisplayName(contact);
            const secondaryName = getContactSecondaryName(contact);
            
            return (
              <Card key={contact.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src="" />
                        <AvatarFallback>
                          {displayName.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{displayName}</CardTitle>
                        {secondaryName && (
                          <p className="text-sm text-muted-foreground">{secondaryName}</p>
                        )}
                        {contact.role && (
                          <Badge variant="secondary" className="mt-1">
                            {contact.role}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">•••</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditingContact(contact)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSharingContact(contact)}>
                          Compartir
                        </DropdownMenuItem>
                        <DropdownMenuItem>Exportar vCard</DropdownMenuItem>
                        <DropdownMenuItem>Exportar PDF</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <categoryInfo.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{categoryInfo.label}</span>
                  </div>
                  
                  {contact.email && contact.field_config?.email && (
                    <p className="text-sm">{contact.email}</p>
                  )}
                  
                  {contact.phone && contact.field_config?.phone && (
                    <p className="text-sm">{contact.phone}</p>
                  )}
                  
                  {contact.city && (
                    <p className="text-sm text-muted-foreground">{contact.city}</p>
                  )}
                  
                  {contact.company && contact.field_config?.company && (
                    <p className="text-sm text-muted-foreground">{contact.company}</p>
                  )}

                  {contact.is_public && (
                    <Badge variant="outline" className="text-xs">Público</Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filteredContacts.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay contactos</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || selectedCategory !== 'all' || selectedCity !== 'all'
              ? "No se encontraron contactos con los filtros aplicados"
              : "Comienza agregando tu primer contacto"}
          </p>
          {!searchTerm && selectedCategory === 'all' && selectedCity === 'all' && (
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear primer contacto
            </Button>
          )}
        </div>
      )}

      <CreateContactDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onContactCreated={handleContactCreated}
      />

      {editingContact && (
        <EditContactDialog
          contact={editingContact}
          open={!!editingContact}
          onOpenChange={(open) => !open && setEditingContact(null)}
          onContactUpdated={handleContactUpdated}
        />
      )}

      {sharingContact && (
        <ContactShareDialog
          contact={sharingContact}
          open={!!sharingContact}
          onOpenChange={(open) => !open && setSharingContact(null)}
        />
      )}

      <ManageContactGroupsDialog
        open={isManageGroupsOpen}
        onOpenChange={setIsManageGroupsOpen}
      />

      {viewMode === 'rolodex' && filteredContacts.length > 0 && (
        <RolodexView
          contacts={filteredContacts}
          onClose={() => setViewMode('grid')}
        />
      )}
    </div>
  );
}

export default function Contacts() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Artistas & Equipos</h1>
        <p className="text-muted-foreground">
          Gestiona tu perfil, equipo y agenda de contactos
        </p>
      </div>

      <Tabs defaultValue="perfil" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="perfil" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="equipos" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Equipos
          </TabsTrigger>
          <TabsTrigger value="agenda" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Agenda
          </TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="mt-6">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="equipos" className="mt-6">
          <TeamsTab />
        </TabsContent>

        <TabsContent value="agenda" className="mt-6">
          <AgendaTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
