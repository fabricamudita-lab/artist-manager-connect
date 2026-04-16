import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { User, CheckCircle2, Loader2, Save, Puzzle } from 'lucide-react';
import mooditaLogo from '@/assets/moodita-logo.png';
import { loadCustomFieldsForEntity, type CustomField } from '@/hooks/useCustomFields';

const FIELD_LABELS: Record<string, string> = {
  stage_name: 'Nombre artístico',
  legal_name: 'Nombre legal',
  email: 'Email',
  phone: 'Teléfono',
  address: 'Dirección',
  bank_info: 'Banco',
  iban: 'IBAN',
  clothing_size: 'Talla de ropa',
  shoe_size: 'Talla de calzado',
  allergies: 'Alergias',
  special_needs: 'Necesidades especiales',
  contract_url: 'Contrato (URL)',
  preferred_hours: 'Horarios preferidos',
  company: 'Empresa',
  role: 'Rol',
  notes: 'Notas',
};

const TEXTAREA_FIELDS = ['address', 'allergies', 'special_needs', 'preferred_hours', 'notes'];

export default function PublicContactForm() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactId, setContactId] = useState<string | null>(null);
  const [fieldConfig, setFieldConfig] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customData, setCustomData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (token) loadContact();
  }, [token]);

  const loadContact = async () => {
    try {
      // Validate token
      const { data: tokenData, error: tokenError } = await supabase
        .from('contact_form_tokens')
        .select('contact_id, created_by')
        .eq('token', token)
        .eq('is_active', true)
        .maybeSingle();

      if (tokenError) throw tokenError;
      if (!tokenData) {
        setError('Este enlace no es válido o ha expirado.');
        setLoading(false);
        return;
      }

      // Load contact data
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', tokenData.contact_id)
        .single();

      if (contactError) throw contactError;

      setContactId(contact.id);
      setContactName(contact.name || 'Contacto');
      const config = (contact.field_config as Record<string, boolean>) || {};
      setFieldConfig(config);

      // Populate form with existing data
      const data: Record<string, string> = {};
      Object.keys(FIELD_LABELS).forEach(field => {
        if (config[field]) {
          data[field] = (contact as any)[field] || '';
        }
      });
      setFormData(data);
      setCustomData(((contact as any).custom_data as Record<string, string>) || {});

      // Load custom fields via creator's workspace
      if (tokenData.created_by) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('workspace_id')
          .eq('user_id', tokenData.created_by)
          .maybeSingle();
        if (profileData?.workspace_id) {
          const cf = await loadCustomFieldsForEntity(profileData.workspace_id, 'contact');
          // Only show custom fields that are enabled in field_config (or all if no config set)
          setCustomFields(cf);
        }
      }
    } catch (err) {
      console.error('Error loading contact form:', err);
      setError('Error al cargar el formulario.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!contactId) return;
    setSaving(true);
    try {
      const updateData: Record<string, any> = {};
      Object.keys(formData).forEach(field => {
        if (fieldConfig[field]) {
          updateData[field] = formData[field] || null;
        }
      });
      // Include custom_data - only allow keys that exist in custom_fields
      if (customFields.length > 0) {
        const sanitized: Record<string, string> = {};
        customFields.forEach(cf => {
          const val = customData[cf.field_key];
          if (val !== undefined) sanitized[cf.field_key] = val.trim().slice(0, 5000);
        });
        updateData.custom_data = sanitized;
      }

      const { error } = await supabase
        .from('contacts')
        .update(updateData)
        .eq('id', contactId);

      if (error) throw error;

      setSaved(true);
      toast({ title: 'Guardado', description: 'Tu información se ha guardado correctamente.' });
    } catch (err) {
      console.error('Error saving contact form:', err);
      toast({ title: 'Error', description: 'No se pudo guardar la información.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const activeFields = Object.keys(FIELD_LABELS).filter(f => fieldConfig[f]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <User className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-lg font-medium">{error}</p>
            <p className="text-sm text-muted-foreground">Contacta con quien te envió este enlace.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
            <p className="text-lg font-medium">¡Información guardada!</p>
            <p className="text-sm text-muted-foreground">Gracias, {contactName}. Tu información ha sido actualizada correctamente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <img src={mooditaLogo} alt="Moodita" className="h-8 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Hola, {contactName}</h1>
          <p className="text-muted-foreground">
            Por favor, completa la siguiente información.
          </p>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Tu información
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeFields.map(field => {
              const isTextarea = TEXTAREA_FIELDS.includes(field);
              const Component = isTextarea ? Textarea : Input;
              return (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field}>{FIELD_LABELS[field]}</Label>
                  <Component
                    id={field}
                    value={formData[field] || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
                    placeholder={`Introduce ${FIELD_LABELS[field].toLowerCase()}`}
                    {...(isTextarea ? { rows: 3 } : {})}
                  />
                </div>
              );
            })}

            {activeFields.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay campos configurados para este formulario.
              </p>
            )}
          </CardContent>
        </Card>

        {activeFields.length > 0 && (
          <div className="flex justify-center">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" />Guardar información</>
              )}
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Powered by Moodita
        </p>
      </div>
    </div>
  );
}
