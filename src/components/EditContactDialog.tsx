import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
  city?: string;
  country?: string;
  category: string;
  notes?: string;
  field_config: Record<string, boolean>;
  is_public: boolean;
  public_slug?: string;
}

interface EditContactDialogProps {
  contact: Contact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactUpdated: () => void;
}

const CATEGORIES = [
  { value: 'artistas', label: 'Artistas' },
  { value: 'tecnicos', label: 'Técnicos' },
  { value: 'contables', label: 'Contables' },
  { value: 'prensa', label: 'Prensa' },
  { value: 'general', label: 'General' },
];

const FIELD_LABELS = {
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

export function EditContactDialog({ contact, open, onOpenChange, onContactUpdated }: EditContactDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fieldConfig, setFieldConfig] = useState(contact.field_config);
  const [formData, setFormData] = useState({
    name: contact.name || '',
    stage_name: contact.stage_name || '',
    legal_name: contact.legal_name || '',
    email: contact.email || '',
    phone: contact.phone || '',
    address: contact.address || '',
    bank_info: contact.bank_info || '',
    iban: contact.iban || '',
    clothing_size: contact.clothing_size || '',
    shoe_size: contact.shoe_size || '',
    allergies: contact.allergies || '',
    special_needs: contact.special_needs || '',
    contract_url: contact.contract_url || '',
    preferred_hours: contact.preferred_hours || '',
    company: contact.company || '',
    role: contact.role || '',
    city: contact.city || '',
    country: contact.country || '',
    category: contact.category || 'general',
    notes: contact.notes || '',
    is_public: contact.is_public || false,
  });

  useEffect(() => {
    setFieldConfig(contact.field_config);
    setFormData({
      name: contact.name || '',
      stage_name: contact.stage_name || '',
      legal_name: contact.legal_name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      address: contact.address || '',
      bank_info: contact.bank_info || '',
      iban: contact.iban || '',
      clothing_size: contact.clothing_size || '',
      shoe_size: contact.shoe_size || '',
      allergies: contact.allergies || '',
      special_needs: contact.special_needs || '',
      contract_url: contact.contract_url || '',
      preferred_hours: contact.preferred_hours || '',
      company: contact.company || '',
      role: contact.role || '',
      city: contact.city || '',
      country: contact.country || '',
      category: contact.category || 'general',
      notes: contact.notes || '',
      is_public: contact.is_public || false,
    });
  }, [contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre es obligatorio",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('contacts')
        .update({
          ...formData,
          field_config: fieldConfig,
        })
        .eq('id', contact.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Contacto actualizado correctamente",
      });

      onContactUpdated();
    } catch (error) {
      console.error('Error updating contact:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el contacto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFieldConfig = (field: string, enabled: boolean) => {
    setFieldConfig(prev => ({ ...prev, [field]: enabled }));
  };

  const renderField = (field: keyof typeof formData, type: 'input' | 'textarea' = 'input') => {
    if (field === 'is_public' || field === 'category') return null;
    if (!fieldConfig[field as keyof typeof fieldConfig]) return null;

    const Component = type === 'textarea' ? Textarea : Input;
    
    return (
      <div key={field} className="space-y-2">
        <Label htmlFor={field}>{FIELD_LABELS[field as keyof typeof FIELD_LABELS]}</Label>
        <Component
          id={field}
          value={formData[field]}
          onChange={(e) => setFormData(prev => ({ ...prev, [field]: e.target.value }))}
          placeholder={`Introduce ${FIELD_LABELS[field as keyof typeof FIELD_LABELS]?.toLowerCase()}`}
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Contacto</DialogTitle>
          <DialogDescription>
            Modifica la información y configura los campos visibles
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuración de Campos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(FIELD_LABELS).map(([field, label]) => (
                <div key={field} className="flex items-center justify-between">
                  <Label htmlFor={`config-${field}`} className="text-sm">
                    {label}
                  </Label>
                  <Switch
                    id={`config-${field}`}
                    checked={fieldConfig[field as keyof typeof fieldConfig]}
                    onCheckedChange={(checked) => updateFieldConfig(field, checked)}
                  />
                </div>
              ))}
              
              <hr className="my-4" />
              
              <div className="flex items-center justify-between">
                <Label htmlFor="is-public" className="text-sm">
                  Hacer público
                </Label>
                <Switch
                  id="is-public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Form Panel */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Info - Always Required */}
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre principal del contacto"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {renderField('role')}
              </div>

              {/* Personal Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField('stage_name')}
                {renderField('legal_name')}
                {renderField('email')}
                {renderField('phone')}
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    placeholder="Ciudad"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">País</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                    placeholder="País"
                  />
                </div>
              </div>

              {renderField('address', 'textarea')}
              {renderField('company')}

              {/* Financial Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField('bank_info')}
                {renderField('iban')}
              </div>

              {/* Personal Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField('clothing_size')}
                {renderField('shoe_size')}
              </div>

              {renderField('allergies', 'textarea')}
              {renderField('special_needs', 'textarea')}
              {renderField('contract_url')}
              {renderField('preferred_hours', 'textarea')}
              {renderField('notes', 'textarea')}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}